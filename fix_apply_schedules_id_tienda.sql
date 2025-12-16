-- =========================================================================
-- FIX: apply_rotating_schedules_to_month - Buscar plantillas globales (id_tienda NULL)
-- =========================================================================
-- PROBLEMA: Las plantillas rotativas tienen id_tienda = NULL (son globales)
-- pero la función busca WHERE id_tienda = p_id_tienda
-- SOLUCIÓN: Cambiar la búsqueda a id_tienda IS NULL
-- =========================================================================

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
  v_current_date := DATE_TRUNC('month', p_target_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  FOR v_user IN 
    SELECT id_usuario, rol 
    FROM public.usuarios 
    WHERE id_tienda = p_id_tienda 
      AND rol IN ('administradora', 'asesora')
  LOOP
    BEGIN
      -- ✅ FIX: Cambiar id_tienda = p_id_tienda a id_tienda IS NULL
      SELECT * INTO v_template_week1
      FROM public.schedule_templates
      WHERE id_tienda IS NULL  -- ← CAMBIO AQUÍ
        AND is_rotating_template = TRUE
        AND week_number = 1
        AND target_role = v_user.rol
      LIMIT 1;
      
      -- ✅ FIX: Cambiar id_tienda = p_id_tienda a id_tienda IS NULL
      SELECT * INTO v_template_week2
      FROM public.schedule_templates
      WHERE id_tienda IS NULL  -- ← CAMBIO AQUÍ
        AND is_rotating_template = TRUE
        AND week_number = 2
        AND target_role = v_user.rol
      LIMIT 1;
      
      IF v_template_week1.id IS NULL OR v_template_week2.id IS NULL THEN
        v_errors := array_append(v_errors, 'No hay plantillas rotativas para rol ' || v_user.rol);
        CONTINUE;
      END IF;
      
      v_current_date := DATE_TRUNC('month', p_target_month)::DATE;
      
      WHILE v_current_date <= v_end_date LOOP
        v_week_of_month := get_week_of_month(v_current_date);
        
        IF v_week_of_month % 2 = 1 THEN
          v_template_to_use := v_template_week1;
        ELSE
          v_template_to_use := v_template_week2;
        END IF;
        
        v_day_of_week := EXTRACT(DOW FROM v_current_date);
        
        CASE v_day_of_week
          WHEN 1 THEN v_time := v_template_to_use.monday_time; v_is_off := v_template_to_use.monday_is_off;
          WHEN 2 THEN v_time := v_template_to_use.tuesday_time; v_is_off := v_template_to_use.tuesday_is_off;
          WHEN 3 THEN v_time := v_template_to_use.wednesday_time; v_is_off := v_template_to_use.wednesday_is_off;
          WHEN 4 THEN v_time := v_template_to_use.thursday_time; v_is_off := v_template_to_use.thursday_is_off;
          WHEN 5 THEN v_time := v_template_to_use.friday_time; v_is_off := v_template_to_use.friday_is_off;
          WHEN 6 THEN v_time := v_template_to_use.saturday_time; v_is_off := v_template_to_use.saturday_is_off;
          WHEN 0 THEN v_time := v_template_to_use.sunday_time; v_is_off := v_template_to_use.sunday_is_off;
        END CASE;
        
        IF v_time IS NOT NULL OR v_is_off THEN
          INSERT INTO public.employee_schedules (
            id_usuario, id_tienda, schedule_date, check_in_deadline, is_day_off, notes
          ) VALUES (
            v_user.id_usuario, p_id_tienda, v_current_date, 
            COALESCE(v_time, '09:00:00'), v_is_off,
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

-- =========================================================================
-- VERIFICAR: Ejecutar para confirmar que ahora encuentra las plantillas
-- =========================================================================

-- Ver plantillas (deben tener id_tienda = NULL)
SELECT id, template_name, target_role, week_number, id_tienda
FROM schedule_templates
WHERE is_rotating_template = TRUE;

-- Ver usuarios que deberían tener horarios
SELECT id_usuario, nombre, rol, id_tienda
FROM usuarios
WHERE rol IN ('administradora', 'asesora');

-- =========================================================================
-- ✅ DESPUÉS DE EJECUTAR:
-- 1. Ve a "Horarios Rotativos"
-- 2. Haz clic en "Aplicar Horarios" para Diciembre 2025
-- 3. Debe mostrar: X tiendas, Y usuarios, Z días creados
-- 4. Ve a "Mi Horario" y verifica los horarios
-- =========================================================================
