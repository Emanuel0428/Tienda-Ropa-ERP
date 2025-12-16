-- =========================================================================
-- ACTUALIZAR FUNCIÓN: apply_rotating_schedules_to_month
-- =========================================================================
-- Esta función es la que aplica las plantillas de horarios rotativos
-- a los usuarios. Necesita actualizarse para usar 'administradora' en vez de 'admin'

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
  
  -- Procesar cada usuario de la tienda (administradora y asesoras)
  -- CAMBIO: 'admin' -> 'administradora'
  FOR v_user IN 
    SELECT id_usuario, rol 
    FROM public.usuarios 
    WHERE id_tienda = p_id_tienda 
      AND rol IN ('administradora', 'asesora')  -- <- AQUÍ ESTÁ EL CAMBIO
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

COMMENT ON FUNCTION apply_rotating_schedules_to_month IS 'Aplica horarios rotativos alternando entre Semana 1 y Semana 2 según el número de semana del mes. Procesa todos los usuarios (administradora y asesoras) de la tienda automáticamente.';

-- =========================================================================
-- CREAR FUNCIÓN: apply_rotating_schedules_to_all_stores
-- =========================================================================
-- Esta función aplica los horarios a TODAS las tiendas del sistema
-- Es la que se llama desde el botón "Aplicar Horarios" en el frontend

CREATE OR REPLACE FUNCTION apply_rotating_schedules_to_all_stores(
  p_target_month DATE
)
RETURNS TABLE (
  tiendas_procesadas INTEGER,
  usuarios_procesados INTEGER,
  dias_creados INTEGER
) AS $$
DECLARE
  v_tienda RECORD;
  v_result RECORD;
  v_total_tiendas INTEGER := 0;
  v_total_usuarios INTEGER := 0;
  v_total_dias INTEGER := 0;
BEGIN
  -- Procesar cada tienda
  FOR v_tienda IN 
    SELECT id_tienda 
    FROM public.tiendas
  LOOP
    -- Aplicar horarios para esta tienda
    SELECT * INTO v_result
    FROM apply_rotating_schedules_to_month(v_tienda.id_tienda, p_target_month);
    
    v_total_tiendas := v_total_tiendas + 1;
    v_total_usuarios := v_total_usuarios + v_result.usuarios_procesados;
    v_total_dias := v_total_dias + v_result.dias_creados;
  END LOOP;
  
  RETURN QUERY SELECT v_total_tiendas, v_total_usuarios, v_total_dias;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_rotating_schedules_to_all_stores IS 'Aplica horarios rotativos a todas las tiendas del sistema para el mes especificado.';

-- =========================================================================
-- NOTAS:
-- =========================================================================
-- Después de ejecutar este script:
-- 1. Las plantillas en "Horarios Rotativos" aparecerán correctamente
-- 2. Necesitas hacer clic en "Aplicar Horarios" para regenerar los horarios
--    del mes actual con las plantillas actualizadas
-- 3. Entonces "Mi Horario" mostrará los horarios correctos
-- =========================================================================
