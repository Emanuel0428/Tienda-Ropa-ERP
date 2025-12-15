-- ============================================
-- SISTEMA COMPLETO DE HORARIOS ROTATIVOS
-- ============================================
-- Este script crea TODO el sistema desde cero:
-- 1. Tabla employee_schedules
-- 2. Tabla schedule_templates
-- 3. Sistema de plantillas rotativas semanales

-- ============================================
-- PARTE 1: CREAR TABLA DE HORARIOS INDIVIDUALES
-- ============================================

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
  
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (id_usuario, schedule_date),
  
  CONSTRAINT fk_employee_schedules_usuario 
    FOREIGN KEY (id_usuario) 
    REFERENCES public.usuarios(id_usuario) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_employee_schedules_tienda 
    FOREIGN KEY (id_tienda) 
    REFERENCES public.tiendas(id_tienda) 
    ON DELETE CASCADE
);

-- Índices para employee_schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedules_usuario 
  ON public.employee_schedules(id_usuario);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_tienda 
  ON public.employee_schedules(id_tienda);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_date 
  ON public.employee_schedules(schedule_date);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_usuario_date 
  ON public.employee_schedules(id_usuario, schedule_date);

-- Trigger para actualizar updated_at
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

-- RLS para employee_schedules
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PARTE 2: CREAR TABLA DE PLANTILLAS CON CAMPOS ROTATIVOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER,  -- Nullable para plantillas rotativas maestras
  id_tienda INTEGER NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  
  -- Campos para sistema rotativo
  is_rotating_template BOOLEAN DEFAULT FALSE,
  week_number INTEGER CHECK (week_number IN (1, 2)),
  target_role VARCHAR(20) CHECK (target_role IN ('admin', 'coordinador', 'asesora')),
  
  -- Horarios por día
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

-- Índices para schedule_templates
CREATE INDEX IF NOT EXISTS idx_schedule_templates_usuario 
  ON public.schedule_templates(id_usuario);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_rotating 
  ON public.schedule_templates(is_rotating_template, week_number, target_role, id_tienda);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_schedule_templates_updated_at ON public.schedule_templates;
CREATE TRIGGER trigger_update_schedule_templates_updated_at
  BEFORE UPDATE ON public.schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_schedules_updated_at();

-- RLS para schedule_templates
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.usuarios 
      WHERE id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- ============================================
-- PARTE 3: FUNCIONES DEL SISTEMA ROTATIVO
-- ============================================

-- 3.1: Función para obtener número de semana del mes
CREATE OR REPLACE FUNCTION get_week_of_month(p_date DATE)
RETURNS INTEGER AS $$
DECLARE
  v_first_day_of_month DATE;
  v_days_from_start INTEGER;
  v_week_number INTEGER;
BEGIN
  -- Primer día del mes
  v_first_day_of_month := DATE_TRUNC('month', p_date)::DATE;
  
  -- Días transcurridos desde inicio del mes
  v_days_from_start := p_date - v_first_day_of_month;
  
  -- Calcular número de semana (1-5)
  v_week_number := FLOOR(v_days_from_start / 7) + 1;
  
  RETURN v_week_number;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_week_of_month IS 'Devuelve el número de semana dentro del mes (1-5)';

-- 3.2: Función para aplicar horarios rotativos a un mes completo
CREATE OR REPLACE FUNCTION apply_rotating_schedules_to_month(
  p_id_tienda INTEGER,
  p_target_month DATE
)
RETURNS TABLE (
  usuarios_procesados INTEGER,
  dias_creados INTEGER,
  errores TEXT[]
) AS $$
DECLARE
  v_user RECORD;
  v_template_week1 RECORD;
  v_template_week2 RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_week_of_month INTEGER;
  v_day_of_week INTEGER;
  v_template_to_use RECORD;
  v_time TIME;
  v_is_off BOOLEAN;
  v_usuarios_count INTEGER := 0;
  v_dias_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calcular inicio y fin del mes
  v_current_date := DATE_TRUNC('month', p_target_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Procesar cada usuario de la tienda (admin y asesoras)
  FOR v_user IN 
    SELECT id_usuario, rol 
    FROM public.usuarios 
    WHERE id_tienda = p_id_tienda 
      AND rol IN ('admin', 'asesora')
      AND nombre != 'Fede' -- Excluir casos especiales
  LOOP
    BEGIN
      -- Buscar plantilla Semana 1 para este rol
      SELECT * INTO v_template_week1
      FROM public.schedule_templates
      WHERE id_tienda = p_id_tienda
        AND is_rotating_template = TRUE
        AND week_number = 1
        AND target_role = v_user.rol
      LIMIT 1;
      
      -- Buscar plantilla Semana 2 para este rol
      SELECT * INTO v_template_week2
      FROM public.schedule_templates
      WHERE id_tienda = p_id_tienda
        AND is_rotating_template = TRUE
        AND week_number = 2
        AND target_role = v_user.rol
      LIMIT 1;
      
      IF v_template_week1.id IS NULL OR v_template_week2.id IS NULL THEN
        v_errors := array_append(v_errors, 'No hay plantillas rotativas para rol ' || v_user.rol || ' en tienda ' || p_id_tienda);
        CONTINUE;
      END IF;
      
      -- Iterar cada día del mes
      v_current_date := DATE_TRUNC('month', p_target_month)::DATE;
      
      WHILE v_current_date <= v_end_date LOOP
        -- Obtener semana del mes
        v_week_of_month := get_week_of_month(v_current_date);
        
        -- Alternar plantilla según semana (impar usa semana 1, par usa semana 2)
        IF v_week_of_month % 2 = 1 THEN
          v_template_to_use := v_template_week1;
        ELSE
          v_template_to_use := v_template_week2;
        END IF;
        
        -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
        v_day_of_week := EXTRACT(DOW FROM v_current_date);
        
        -- Mapear día de la semana a configuración de plantilla
        CASE v_day_of_week
          WHEN 1 THEN 
            v_time := v_template_to_use.monday_time; 
            v_is_off := v_template_to_use.monday_is_off;
          WHEN 2 THEN 
            v_time := v_template_to_use.tuesday_time; 
            v_is_off := v_template_to_use.tuesday_is_off;
          WHEN 3 THEN 
            v_time := v_template_to_use.wednesday_time; 
            v_is_off := v_template_to_use.wednesday_is_off;
          WHEN 4 THEN 
            v_time := v_template_to_use.thursday_time; 
            v_is_off := v_template_to_use.thursday_is_off;
          WHEN 5 THEN 
            v_time := v_template_to_use.friday_time; 
            v_is_off := v_template_to_use.friday_is_off;
          WHEN 6 THEN 
            v_time := v_template_to_use.saturday_time; 
            v_is_off := v_template_to_use.saturday_is_off;
          WHEN 0 THEN 
            v_time := v_template_to_use.sunday_time; 
            v_is_off := v_template_to_use.sunday_is_off;
        END CASE;
        
        -- Insertar horario si hay configuración
        IF v_time IS NOT NULL OR v_is_off THEN
          INSERT INTO public.employee_schedules (
            id_usuario, 
            id_tienda, 
            schedule_date, 
            check_in_deadline, 
            is_day_off, 
            notes
          ) VALUES (
            v_user.id_usuario, 
            p_id_tienda, 
            v_current_date, 
            COALESCE(v_time, '09:00:00'), 
            v_is_off,
            'Rotativo S' || v_week_of_month || ' (' || v_template_to_use.template_name || ')'
          ) 
          ON CONFLICT (id_usuario, schedule_date) 
          DO UPDATE SET
            check_in_deadline = EXCLUDED.check_in_deadline,
            is_day_off = EXCLUDED.is_day_off,
            notes = EXCLUDED.notes;
          
          v_dias_count := v_dias_count + 1;
        END IF;
        
        v_current_date := v_current_date + INTERVAL '1 day';
      END LOOP;
      
      v_usuarios_count := v_usuarios_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error procesando usuario ' || v_user.id_usuario || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_usuarios_count, v_dias_count, v_errors;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_rotating_schedules_to_month IS 'Aplica horarios rotativos alternando entre Semana 1 y Semana 2 según el número de semana del mes. Procesa todos los usuarios (admin y asesoras) de la tienda automáticamente.';

-- 3.3: Función helper para crear plantillas rotativas por defecto
CREATE OR REPLACE FUNCTION create_default_rotating_templates(
  p_id_tienda INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_template_admin_s1 INTEGER;
  v_template_admin_s2 INTEGER;
  v_template_asesora_s1 INTEGER;
  v_template_asesora_s2 INTEGER;
BEGIN
  -- Admin Semana 1 (trabaja)
  INSERT INTO public.schedule_templates (
    id_usuario, id_tienda, template_name, is_rotating_template, week_number, target_role,
    monday_time, monday_is_off,
    tuesday_time, tuesday_is_off,
    wednesday_time, wednesday_is_off,
    thursday_time, thursday_is_off,
    friday_time, friday_is_off,
    saturday_time, saturday_is_off,
    sunday_time, sunday_is_off
  ) VALUES (
    NULL, p_id_tienda, 'Admin Semana 1', TRUE, 1, 'admin',
    '09:30:00', FALSE,  -- Lunes
    '08:00:00', FALSE,  -- Martes
    '08:00:00', FALSE,  -- Miércoles
    '08:00:00', FALSE,  -- Jueves
    '09:30:00', FALSE,  -- Viernes
    '10:30:00', FALSE,  -- Sábado
    NULL, TRUE          -- Domingo (día libre)
  ) RETURNING id INTO v_template_admin_s1;
  
  -- Admin Semana 2 (descansa o turno reducido)
  INSERT INTO public.schedule_templates (
    id_usuario, id_tienda, template_name, is_rotating_template, week_number, target_role,
    monday_time, monday_is_off,
    tuesday_time, tuesday_is_off,
    wednesday_time, wednesday_is_off,
    thursday_time, thursday_is_off,
    friday_time, friday_is_off,
    saturday_time, saturday_is_off,
    sunday_time, sunday_is_off
  ) VALUES (
    NULL, p_id_tienda, 'Admin Semana 2', TRUE, 2, 'admin',
    NULL, TRUE,         -- Lunes (día libre)
    '10:30:00', FALSE,  -- Martes
    '09:30:00', FALSE,  -- Miércoles
    '09:30:00', FALSE,  -- Jueves
    '13:30:00', FALSE,  -- Viernes
    '09:30:00', FALSE,  -- Sábado
    NULL, TRUE          -- Domingo (día libre)
  ) RETURNING id INTO v_template_admin_s2;
  
  -- Asesora Semana 1 (complemento de admin)
  INSERT INTO public.schedule_templates (
    id_usuario, id_tienda, template_name, is_rotating_template, week_number, target_role,
    monday_time, monday_is_off,
    tuesday_time, tuesday_is_off,
    wednesday_time, wednesday_is_off,
    thursday_time, thursday_is_off,
    friday_time, friday_is_off,
    saturday_time, saturday_is_off,
    sunday_time, sunday_is_off
  ) VALUES (
    NULL, p_id_tienda, 'Asesora Semana 1', TRUE, 1, 'asesora',
    NULL, TRUE,         -- Lunes (día libre)
    '10:30:00', FALSE,  -- Martes
    '09:30:00', FALSE,  -- Miércoles
    '09:30:00', FALSE,  -- Jueves
    '13:30:00', FALSE,  -- Viernes
    '09:30:00', FALSE,  -- Sábado
    NULL, TRUE          -- Domingo (día libre)
  ) RETURNING id INTO v_template_asesora_s1;
  
  -- Asesora Semana 2 (complemento inverso)
  INSERT INTO public.schedule_templates (
    id_usuario, id_tienda, template_name, is_rotating_template, week_number, target_role,
    monday_time, monday_is_off,
    tuesday_time, tuesday_is_off,
    wednesday_time, wednesday_is_off,
    thursday_time, thursday_is_off,
    friday_time, friday_is_off,
    saturday_time, saturday_is_off,
    sunday_time, sunday_is_off
  ) VALUES (
    NULL, p_id_tienda, 'Asesora Semana 2', TRUE, 2, 'asesora',
    '09:30:00', FALSE,  -- Lunes
    '08:00:00', FALSE,  -- Martes
    '08:00:00', FALSE,  -- Miércoles
    '08:00:00', FALSE,  -- Jueves
    '09:30:00', FALSE,  -- Viernes
    '10:30:00', FALSE,  -- Sábado
    NULL, TRUE          -- Domingo (día libre)
  ) RETURNING id INTO v_template_asesora_s2;
  
  RETURN 'Plantillas rotativas creadas: Admin S1(' || v_template_admin_s1 || '), Admin S2(' || v_template_admin_s2 || 
         '), Asesora S1(' || v_template_asesora_s1 || '), Asesora S2(' || v_template_asesora_s2 || ')';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_rotating_templates IS 'Crea las 4 plantillas rotativas por defecto (Admin S1, Admin S2, Asesora S1, Asesora S2) con horarios de ejemplo. Ajustar según necesidad.';

-- ============================================
-- PARTE 4: VISTAS Y VERIFICACIÓN
-- ============================================

-- 4.1: Vista para horarios aplicados con detalle
CREATE OR REPLACE VIEW v_rotating_schedules_detail AS
SELECT 
  es.id,
  es.id_usuario,
  u.nombre as employee_name,
  u.rol as employee_role,
  es.id_tienda,
  t.nombre as store_name,
  es.schedule_date,
  TO_CHAR(es.schedule_date, 'Day') as day_name,
  get_week_of_month(es.schedule_date) as week_of_month,
  es.check_in_deadline,
  es.is_day_off,
  es.notes
FROM public.employee_schedules es
JOIN public.usuarios u ON es.id_usuario = u.id_usuario
JOIN public.tiendas t ON es.id_tienda = t.id_tienda
WHERE es.notes LIKE 'Rotativo%'
ORDER BY es.id_tienda, es.schedule_date, u.rol DESC, u.nombre;

COMMENT ON VIEW v_rotating_schedules_detail IS 'Vista detallada de horarios rotativos aplicados con información completa';

-- 4.2: Verificación final del sistema
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SISTEMA DE HORARIOS ROTATIVOS INSTALADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabla employee_schedules creada';
  RAISE NOTICE '✅ Tabla schedule_templates creada';
  RAISE NOTICE '✅ Función get_week_of_month creada';
  RAISE NOTICE '✅ Función apply_rotating_schedules_to_month creada';
  RAISE NOTICE '✅ Función create_default_rotating_templates creada';
  RAISE NOTICE '✅ Vista v_rotating_schedules_detail creada';
  RAISE NOTICE '✅ Políticas RLS configuradas';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CÓMO USAR:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a la aplicación → Asistencia → Horarios Rotativos';
  RAISE NOTICE '2. Selecciona la tienda';
  RAISE NOTICE '3. El sistema creará 4 plantillas automáticamente';
  RAISE NOTICE '4. Edita los horarios de cada plantilla';
  RAISE NOTICE '5. Guarda las plantillas';
  RAISE NOTICE '6. Selecciona un mes y aplica los horarios';
  RAISE NOTICE '';
  RAISE NOTICE 'El sistema alternará automáticamente:';
  RAISE NOTICE '- Semanas impares (1,3,5) → Usa plantillas "Semana 1"';
  RAISE NOTICE '- Semanas pares (2,4)     → Usa plantillas "Semana 2"';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 LISTO PARA USAR';
  RAISE NOTICE '========================================';
END $$;
