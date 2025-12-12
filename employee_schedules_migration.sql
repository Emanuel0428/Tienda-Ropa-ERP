-- ========================================
-- MIGRACIÓN: HORARIOS INDIVIDUALES POR EMPLEADO Y DÍA
-- ========================================
-- Permite configurar horarios específicos para cada empleado en fechas concretas
-- Útil para horarios que cambian semana a semana

-- ========================================
-- 1. CREAR TABLA DE HORARIOS INDIVIDUALES
-- ========================================

CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  id_tienda INTEGER NOT NULL,
  schedule_date DATE NOT NULL,
  check_in_deadline TIME NOT NULL DEFAULT '09:00:00',
  is_day_off BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Restricción única: un empleado solo puede tener un horario por día
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (id_usuario, schedule_date),
  
  -- Foreign keys
  CONSTRAINT fk_employee_schedules_usuario 
    FOREIGN KEY (id_usuario) 
    REFERENCES public.usuarios(id_usuario) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_employee_schedules_tienda 
    FOREIGN KEY (id_tienda) 
    REFERENCES public.tiendas(id_tienda) 
    ON DELETE CASCADE
);

COMMENT ON TABLE public.employee_schedules IS 'Horarios individuales por empleado y fecha específica';
COMMENT ON COLUMN public.employee_schedules.id_usuario IS 'ID del empleado';
COMMENT ON COLUMN public.employee_schedules.id_tienda IS 'ID de la tienda donde trabaja ese día';
COMMENT ON COLUMN public.employee_schedules.schedule_date IS 'Fecha específica del horario';
COMMENT ON COLUMN public.employee_schedules.check_in_deadline IS 'Hora límite de entrada para ese día';
COMMENT ON COLUMN public.employee_schedules.is_day_off IS 'Si es true, el empleado tiene el día libre';
COMMENT ON COLUMN public.employee_schedules.notes IS 'Notas adicionales (ej: turno doble, medio día, etc)';

-- ========================================
-- 2. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_employee_schedules_usuario 
  ON public.employee_schedules(id_usuario);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_tienda 
  ON public.employee_schedules(id_tienda);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_date 
  ON public.employee_schedules(schedule_date);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_usuario_date 
  ON public.employee_schedules(id_usuario, schedule_date);

-- ========================================
-- 3. TRIGGER PARA ACTUALIZAR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_employee_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_employee_schedules_updated_at ON public.employee_schedules;

CREATE TRIGGER trigger_update_employee_schedules_updated_at
  BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_schedules_updated_at();

-- ========================================
-- 4. FUNCIÓN PARA OBTENER HORARIO DE UN EMPLEADO EN UNA FECHA
-- ========================================

CREATE OR REPLACE FUNCTION get_employee_check_in_deadline(
  p_user_id INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  check_in_deadline TIME,
  is_day_off BOOLEAN,
  notes TEXT,
  source VARCHAR(20)
) AS $$
DECLARE
  v_store_id INTEGER;
  v_day_of_week INTEGER;
BEGIN
  -- Buscar si existe un horario individual para ese día
  RETURN QUERY
  SELECT 
    es.check_in_deadline,
    es.is_day_off,
    es.notes,
    'individual'::VARCHAR(20) as source
  FROM public.employee_schedules es
  WHERE es.id_usuario = p_user_id 
    AND es.schedule_date = p_date
  LIMIT 1;
  
  -- Si no hay resultado, usar horario de la tienda según día de semana
  IF NOT FOUND THEN
    -- Obtener la tienda del empleado
    SELECT u.id_tienda INTO v_store_id
    FROM public.usuarios u
    WHERE u.id_usuario = p_user_id;
    
    -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Retornar horario de la tienda según el día
    RETURN QUERY
    SELECT 
      CASE 
        WHEN v_day_of_week = 0 THEN COALESCE(ss.sunday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 1 THEN COALESCE(ss.monday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 2 THEN COALESCE(ss.tuesday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 3 THEN COALESCE(ss.wednesday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 4 THEN COALESCE(ss.thursday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 5 THEN COALESCE(ss.friday_check_in_deadline, ss.check_in_deadline)
        WHEN v_day_of_week = 6 THEN COALESCE(ss.saturday_check_in_deadline, ss.check_in_deadline)
        ELSE ss.check_in_deadline
      END as check_in_deadline,
      FALSE as is_day_off,
      NULL::TEXT as notes,
      'store_default'::VARCHAR(20) as source
    FROM public.store_schedules ss
    WHERE ss.id_tienda = v_store_id
    LIMIT 1;
  END IF;
  
  -- Si tampoco hay configuración de tienda, usar default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      '09:00:00'::TIME as check_in_deadline,
      FALSE as is_day_off,
      NULL::TEXT as notes,
      'system_default'::VARCHAR(20) as source;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_employee_check_in_deadline IS 'Obtiene el horario de entrada para un empleado en una fecha específica. Prioridad: 1) Horario individual, 2) Horario de tienda, 3) Default del sistema';

-- ========================================
-- 5. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ========================================

ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Los empleados solo pueden ver sus propios horarios
DROP POLICY IF EXISTS "Empleados pueden ver sus propios horarios" ON public.employee_schedules;
CREATE POLICY "Empleados pueden ver sus propios horarios"
  ON public.employee_schedules
  FOR SELECT
  USING (
    id_usuario = (
      SELECT id_usuario 
      FROM public.usuarios 
      WHERE id = auth.uid()
    )
  );

-- Admin y coordinadores pueden ver todos los horarios
DROP POLICY IF EXISTS "Admin y coordinadores pueden ver todos los horarios" ON public.employee_schedules;
CREATE POLICY "Admin y coordinadores pueden ver todos los horarios"
  ON public.employee_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.usuarios 
      WHERE id = auth.uid() 
        AND rol IN ('admin', 'coordinador')
    )
  );

-- Solo admin puede insertar/actualizar/eliminar horarios
DROP POLICY IF EXISTS "Admin puede gestionar horarios" ON public.employee_schedules;
CREATE POLICY "Admin puede gestionar horarios"
  ON public.employee_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM public.usuarios 
      WHERE id = auth.uid() 
        AND rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.usuarios 
      WHERE id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- ========================================
-- 6. FUNCIÓN HELPER: COPIAR HORARIOS DEL MES ANTERIOR
-- ========================================

CREATE OR REPLACE FUNCTION copy_schedules_from_previous_month(
  p_target_month DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_source_month DATE;
BEGIN
  -- Calcular el mes anterior
  v_source_month := p_target_month - INTERVAL '1 month';
  
  -- Copiar horarios del mes anterior al mes objetivo
  INSERT INTO public.employee_schedules (id_usuario, id_tienda, schedule_date, check_in_deadline, is_day_off, notes)
  SELECT 
    id_usuario,
    id_tienda,
    schedule_date + INTERVAL '1 month' as new_date,
    check_in_deadline,
    is_day_off,
    notes
  FROM public.employee_schedules
  WHERE schedule_date >= DATE_TRUNC('month', v_source_month)
    AND schedule_date < DATE_TRUNC('month', v_source_month) + INTERVAL '1 month'
  ON CONFLICT (id_usuario, schedule_date) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION copy_schedules_from_previous_month IS 'Copia los horarios del mes anterior al mes especificado. Útil para replicar patrones mensuales';

-- ========================================
-- 6B. TABLA DE PLANTILLAS DE HORARIOS SEMANALES
-- ========================================

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  id_tienda INTEGER NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  monday_time TIME,
  monday_is_off BOOLEAN DEFAULT FALSE,
  tuesday_time TIME,
  tuesday_is_off BOOLEAN DEFAULT FALSE,
  wednesday_time TIME,
  wednesday_is_off BOOLEAN DEFAULT FALSE,
  thursday_time TIME,
  thursday_is_off BOOLEAN DEFAULT FALSE,
  friday_time TIME,
  friday_is_off BOOLEAN DEFAULT FALSE,
  saturday_time TIME,
  saturday_is_off BOOLEAN DEFAULT FALSE,
  sunday_time TIME,
  sunday_is_off BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_schedule_templates_usuario 
    FOREIGN KEY (id_usuario) 
    REFERENCES public.usuarios(id_usuario) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_schedule_templates_tienda 
    FOREIGN KEY (id_tienda) 
    REFERENCES public.tiendas(id_tienda) 
    ON DELETE CASCADE
);

COMMENT ON TABLE public.schedule_templates IS 'Plantillas de horarios semanales reutilizables por empleado';
COMMENT ON COLUMN public.schedule_templates.template_name IS 'Nombre descriptivo de la plantilla (ej: "Turno mañana", "Turno rotativo")';

CREATE INDEX IF NOT EXISTS idx_schedule_templates_usuario 
  ON public.schedule_templates(id_usuario);

-- Trigger para updated_at
CREATE TRIGGER trigger_update_schedule_templates_updated_at
  BEFORE UPDATE ON public.schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_schedules_updated_at();

-- RLS para plantillas
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin puede gestionar plantillas" ON public.schedule_templates;
CREATE POLICY "Admin puede gestionar plantillas"
  ON public.schedule_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM public.usuarios 
      WHERE id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- ========================================
-- 6C. FUNCIÓN: APLICAR PLANTILLA A UN MES
-- ========================================

CREATE OR REPLACE FUNCTION apply_template_to_month(
  p_user_id INTEGER,
  p_template_id INTEGER,
  p_target_month DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_count INTEGER := 0;
  v_time TIME;
  v_is_off BOOLEAN;
BEGIN
  -- Obtener la plantilla
  SELECT * INTO v_template
  FROM public.schedule_templates
  WHERE id = p_template_id AND id_usuario = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plantilla no encontrada';
  END IF;
  
  -- Calcular inicio y fin del mes
  v_start_date := DATE_TRUNC('month', p_target_month);
  v_end_date := (DATE_TRUNC('month', p_target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Iterar por cada día del mes
  v_current_date := v_start_date;
  
  WHILE v_current_date <= v_end_date LOOP
    -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Determinar horario según el día de la semana
    CASE v_day_of_week
      WHEN 1 THEN -- Lunes
        v_time := v_template.monday_time;
        v_is_off := v_template.monday_is_off;
      WHEN 2 THEN -- Martes
        v_time := v_template.tuesday_time;
        v_is_off := v_template.tuesday_is_off;
      WHEN 3 THEN -- Miércoles
        v_time := v_template.wednesday_time;
        v_is_off := v_template.wednesday_is_off;
      WHEN 4 THEN -- Jueves
        v_time := v_template.thursday_time;
        v_is_off := v_template.thursday_is_off;
      WHEN 5 THEN -- Viernes
        v_time := v_template.friday_time;
        v_is_off := v_template.friday_is_off;
      WHEN 6 THEN -- Sábado
        v_time := v_template.saturday_time;
        v_is_off := v_template.saturday_is_off;
      WHEN 0 THEN -- Domingo
        v_time := v_template.sunday_time;
        v_is_off := v_template.sunday_is_off;
    END CASE;
    
    -- Insertar solo si hay configuración para ese día
    IF v_time IS NOT NULL OR v_is_off THEN
      INSERT INTO public.employee_schedules (
        id_usuario, 
        id_tienda, 
        schedule_date, 
        check_in_deadline, 
        is_day_off,
        notes
      ) VALUES (
        p_user_id,
        v_template.id_tienda,
        v_current_date,
        COALESCE(v_time, '09:00:00'),
        v_is_off,
        'Aplicado desde plantilla: ' || v_template.template_name
      )
      ON CONFLICT (id_usuario, schedule_date) 
      DO UPDATE SET
        check_in_deadline = EXCLUDED.check_in_deadline,
        is_day_off = EXCLUDED.is_day_off,
        notes = EXCLUDED.notes;
      
      v_count := v_count + 1;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_month IS 'Aplica una plantilla de horarios semanales a todos los días del mes especificado, respetando el calendario real (Lunes, Martes, etc.)';

-- ========================================
-- 7. VISTA PARA HORARIOS DEL MES ACTUAL
-- ========================================

CREATE OR REPLACE VIEW v_current_month_schedules AS
SELECT 
  es.*,
  u.nombre as employee_name,
  u.rol as employee_role,
  t.nombre as store_name
FROM public.employee_schedules es
JOIN public.usuarios u ON es.id_usuario = u.id_usuario
JOIN public.tiendas t ON es.id_tienda = t.id_tienda
WHERE es.schedule_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND es.schedule_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY es.schedule_date, u.nombre;

COMMENT ON VIEW v_current_month_schedules IS 'Vista de todos los horarios del mes actual con información del empleado y tienda';

-- ========================================
-- 8. DATOS DE EJEMPLO (OPCIONAL)
-- ========================================

-- Ejemplo: Configurar horarios para la primera semana de diciembre 2025
-- Descomenta si quieres insertar datos de prueba

/*
INSERT INTO public.employee_schedules (id_usuario, id_tienda, schedule_date, check_in_deadline, is_day_off, notes)
VALUES
  -- Empleado 1: horarios variados primera semana
  (1, 1, '2025-12-15', '08:00:00', FALSE, 'Turno mañana'),
  (1, 1, '2025-12-16', '14:00:00', FALSE, 'Turno tarde'),
  (1, 1, '2025-12-17', '09:00:00', FALSE, 'Turno regular'),
  (1, 1, '2025-12-18', '09:00:00', TRUE, 'Día libre'),
  
  -- Empleado 2: horario fijo
  (2, 1, '2025-12-15', '09:00:00', FALSE, NULL),
  (2, 1, '2025-12-16', '09:00:00', FALSE, NULL)
ON CONFLICT (id_usuario, schedule_date) DO NOTHING;
*/

-- ========================================
-- 9. VERIFICACIÓN
-- ========================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_templates_table_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_apply_template_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  
  -- Verificar tabla employee_schedules
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'employee_schedules'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    RAISE NOTICE '✅ Tabla employee_schedules creada correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Tabla employee_schedules no encontrada';
  END IF;
  
  -- Verificar tabla schedule_templates
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'schedule_templates'
  ) INTO v_templates_table_exists;
  
  IF v_templates_table_exists THEN
    RAISE NOTICE '✅ Tabla schedule_templates creada correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Tabla schedule_templates no encontrada';
  END IF;
  
  -- Verificar función principal
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_employee_check_in_deadline'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ Función get_employee_check_in_deadline creada correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Función get_employee_check_in_deadline no encontrada';
  END IF;
  
  -- Verificar función de aplicar plantilla
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'apply_template_to_month'
  ) INTO v_apply_template_exists;
  
  IF v_apply_template_exists THEN
    RAISE NOTICE '✅ Función apply_template_to_month creada correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Función apply_template_to_month no encontrada';
  END IF;
  
  -- Verificar políticas RLS
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_schedules') THEN
    RAISE NOTICE '✅ Políticas RLS configuradas';
  ELSE
    RAISE NOTICE '⚠️ Advertencia: No se encontraron políticas RLS';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Ejemplos de uso:';
  RAISE NOTICE '1. Obtener horario de empleado hoy:';
  RAISE NOTICE '   SELECT * FROM get_employee_check_in_deadline(1, CURRENT_DATE);';
  RAISE NOTICE '';
  RAISE NOTICE '2. Ver horarios del mes actual:';
  RAISE NOTICE '   SELECT * FROM v_current_month_schedules;';
  RAISE NOTICE '';
  RAISE NOTICE '3. Copiar horarios del mes anterior:';
  RAISE NOTICE '   SELECT copy_schedules_from_previous_month(''2025-12-01'');';
  RAISE NOTICE '';
  RAISE NOTICE '4. Aplicar plantilla a un mes (calendario real):';
  RAISE NOTICE '   SELECT apply_template_to_month(1, 1, ''2026-01-01'');';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
END $$;
