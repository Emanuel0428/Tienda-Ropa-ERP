-- =========================================================================
-- SOLUCIÓN COMPLETA: Migrar de 'admin' a 'administradora'
-- =========================================================================
-- Este script soluciona ambos problemas:
-- 1. ✅ Las plantillas para administradoras no aparecen
-- 2. ✅ Los horarios en "Mi Horario" no coinciden con las plantillas

-- =========================================================================
-- PASO 1: Actualizar CHECK constraints
-- =========================================================================

-- 1.1: Constraint de tabla usuarios
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'coordinador', 'administradora', 'asesora', 'auditor', 'gerencia'));

-- 1.2: Constraint de tabla schedule_templates
ALTER TABLE public.schedule_templates 
DROP CONSTRAINT IF EXISTS schedule_templates_target_role_check;

ALTER TABLE public.schedule_templates
ADD CONSTRAINT schedule_templates_target_role_check 
CHECK (target_role IN ('admin', 'coordinador', 'administradora', 'asesora'));

-- =========================================================================
-- PASO 2: Migrar plantillas existentes de 'admin' a 'administradora'
-- =========================================================================

-- 2.1: Actualizar target_role en plantillas rotativas
UPDATE public.schedule_templates
SET target_role = 'administradora'
WHERE target_role = 'admin' 
  AND is_rotating_template = TRUE;

-- 2.2: Actualizar nombres de plantillas
UPDATE public.schedule_templates
SET template_name = REPLACE(template_name, 'Admin', 'Administradora')
WHERE is_rotating_template = TRUE 
  AND target_role = 'administradora';

-- =========================================================================
-- PASO 3: Actualizar función que aplica horarios (fix crítico)
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
  
  -- CAMBIO PRINCIPAL: 'admin' -> 'administradora'
  FOR v_user IN 
    SELECT id_usuario, rol 
    FROM public.usuarios 
    WHERE id_tienda = p_id_tienda 
      AND rol IN ('administradora', 'asesora')
  LOOP
    BEGIN
      SELECT * INTO v_template_week1
      FROM public.schedule_templates
      WHERE id_tienda = p_id_tienda
        AND is_rotating_template = TRUE
        AND week_number = 1
        AND target_role = v_user.rol
      LIMIT 1;
      
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
-- PASO 4: Crear función para aplicar a todas las tiendas
-- =========================================================================

-- Eliminar la función existente primero
DROP FUNCTION IF EXISTS apply_rotating_schedules_to_all_stores(date);

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
  FOR v_tienda IN 
    SELECT id_tienda FROM public.tiendas
  LOOP
    SELECT * INTO v_result
    FROM apply_rotating_schedules_to_month(v_tienda.id_tienda, p_target_month);
    
    v_total_tiendas := v_total_tiendas + 1;
    v_total_usuarios := v_total_usuarios + v_result.usuarios_procesados;
    v_total_dias := v_total_dias + v_result.dias_creados;
  END LOOP;
  
  RETURN QUERY SELECT v_total_tiendas, v_total_usuarios, v_total_dias;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- PASO 5: Verificar cambios
-- =========================================================================

SELECT 
  '===== PLANTILLAS ACTUALIZADAS =====' as seccion,
  id,
  template_name,
  target_role,
  week_number,
  monday_time,
  tuesday_time,
  wednesday_time,
  thursday_time,
  friday_time,
  saturday_time,
  sunday_time
FROM public.schedule_templates
WHERE is_rotating_template = TRUE
ORDER BY target_role, week_number;

-- =========================================================================
-- ✅ LISTO - Siguiente paso:
-- =========================================================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Ve a la página "Horarios Rotativos" en tu aplicación
-- 3. Verifica que ahora aparezcan las plantillas para "Administradoras"
-- 4. Haz clic en "Aplicar Horarios" seleccionando el mes actual
-- 5. Ve a "Mi Horario" y verifica que los horarios sean correctos
-- =========================================================================
