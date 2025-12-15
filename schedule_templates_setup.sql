-- ============================================
-- CREACIÓN DE TABLA SCHEDULE_TEMPLATES
-- ============================================
-- Ejecuta esto en Supabase SQL Editor

-- 1. Crear tabla de plantillas de horarios
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
  
  CONSTRAINT fk_schedule_templates_usuario 
    FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_templates_tienda 
    FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda) ON DELETE CASCADE
);

-- 2. Habilitar RLS
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- 3. Política RLS para admin
CREATE POLICY "Admin puede gestionar plantillas" ON public.schedule_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
  );

-- 4. Función para aplicar plantilla respetando calendario real
CREATE OR REPLACE FUNCTION apply_template_to_month(
  p_user_id INTEGER,
  p_template_id INTEGER,
  p_target_month DATE
) RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_day_of_week INTEGER;
  v_count INTEGER := 0;
  v_time TIME;
  v_is_off BOOLEAN;
BEGIN
  -- Obtener plantilla
  SELECT * INTO v_template FROM public.schedule_templates 
  WHERE id = p_template_id AND id_usuario = p_user_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Plantilla no encontrada'; 
  END IF;
  
  -- Calcular rango del mes
  v_current_date := DATE_TRUNC('month', p_target_month);
  v_end_date := (DATE_TRUNC('month', p_target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Iterar cada día del mes
  WHILE v_current_date <= v_end_date LOOP
    -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Mapear día de la semana a configuración de plantilla
    CASE v_day_of_week
      WHEN 1 THEN 
        v_time := v_template.monday_time; 
        v_is_off := v_template.monday_is_off;
      WHEN 2 THEN 
        v_time := v_template.tuesday_time; 
        v_is_off := v_template.tuesday_is_off;
      WHEN 3 THEN 
        v_time := v_template.wednesday_time; 
        v_is_off := v_template.wednesday_is_off;
      WHEN 4 THEN 
        v_time := v_template.thursday_time; 
        v_is_off := v_template.thursday_is_off;
      WHEN 5 THEN 
        v_time := v_template.friday_time; 
        v_is_off := v_template.friday_is_off;
      WHEN 6 THEN 
        v_time := v_template.saturday_time; 
        v_is_off := v_template.saturday_is_off;
      WHEN 0 THEN 
        v_time := v_template.sunday_time; 
        v_is_off := v_template.sunday_is_off;
    END CASE;
    
    -- Insertar o actualizar horario si hay configuración
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
        'Plantilla: ' || v_template.template_name
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

-- 5. Verificar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'schedule_templates') THEN
    RAISE NOTICE '✅ Tabla schedule_templates creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_template_to_month') THEN
    RAISE NOTICE '✅ Función apply_template_to_month creada';
  END IF;
  
  RAISE NOTICE '🎉 Sistema de plantillas listo';
END $$;
