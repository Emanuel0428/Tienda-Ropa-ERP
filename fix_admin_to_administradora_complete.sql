-- =========================================================================
-- SOLUCIÓN COMPLETA: Cambiar 'admin' a 'administradora' en sistema de horarios
-- =========================================================================

-- Este script soluciona dos problemas:
-- 1. Las plantillas de administradoras no aparecen (usan 'admin' en vez de 'administradora')
-- 2. Los horarios mostrados en "Mi Horario" no coinciden con las plantillas configuradas

-- ===========================
-- PASO 1: Actualizar constraints
-- ===========================

-- 1.1: Actualizar constraint de usuarios
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'coordinador', 'administradora', 'asesora', 'auditor', 'gerencia'));

-- 1.2: Actualizar constraint de schedule_templates  
ALTER TABLE public.schedule_templates 
DROP CONSTRAINT IF EXISTS schedule_templates_target_role_check;

ALTER TABLE public.schedule_templates
ADD CONSTRAINT schedule_templates_target_role_check 
CHECK (target_role IN ('admin', 'coordinador', 'administradora', 'asesora'));

-- ===========================
-- PASO 2: Migrar datos existentes
-- ===========================

-- 2.1: Cambiar plantillas rotativas de 'admin' a 'administradora'
UPDATE public.schedule_templates
SET target_role = 'administradora'
WHERE target_role = 'admin' 
  AND is_rotating_template = TRUE;

-- 2.2: Actualizar nombres de plantillas
UPDATE public.schedule_templates
SET template_name = REPLACE(template_name, 'Admin', 'Administradora')
WHERE is_rotating_template = TRUE 
  AND target_role = 'administradora';

-- 2.3: Actualizar horarios ya aplicados en employee_schedules
-- Esto es importante para que "Mi Horario" muestre los datos correctos
UPDATE public.employee_schedules es
SET check_in_deadline = (
  -- Aquí necesitamos saber qué día de la semana es y obtener el horario correcto de la plantilla
  CASE EXTRACT(DOW FROM es.schedule_date)
    WHEN 1 THEN (SELECT st.monday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 2 THEN (SELECT st.tuesday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 3 THEN (SELECT st.wednesday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 4 THEN (SELECT st.thursday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 5 THEN (SELECT st.friday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 6 THEN (SELECT st.saturday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
    WHEN 0 THEN (SELECT st.sunday_time FROM schedule_templates st WHERE st.target_role = 'administradora' AND st.is_rotating_template = TRUE AND st.week_number = (EXTRACT(WEEK FROM es.schedule_date) % 2 + 1) LIMIT 1)
  END
)
WHERE es.id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE rol = 'administradora'
)
AND es.schedule_date >= CURRENT_DATE;

-- ===========================
-- PASO 3: Verificar cambios
-- ===========================

-- 3.1: Ver plantillas actualizadas
SELECT 
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

-- 3.2: Ver horarios de administradoras esta semana
SELECT 
  u.nombre,
  u.rol,
  es.schedule_date,
  TO_CHAR(es.schedule_date, 'Day') as dia_semana,
  es.check_in_deadline,
  es.is_day_off
FROM employee_schedules es
JOIN usuarios u ON es.id_usuario = u.id_usuario
WHERE u.rol = 'administradora'
  AND es.schedule_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY es.schedule_date;

-- =========================================================================
-- NOTAS IMPORTANTES
-- =========================================================================
-- 
-- • Después de ejecutar este script, las administradoras verán sus horarios
--   correctos en la página "Mi Horario"
-- 
-- • Si los horarios siguen sin aparecer correctamente, necesitas ejecutar
--   el botón "Aplicar Horarios" en la página de Horarios Rotativos para
--   regenerar los horarios del mes actual
-- 
-- • El rol "admin" del sistema (federico) NO tiene horarios rotativos
-- 
-- • El rol "administradora" es para las administradoras de tienda que sí
--   tienen horarios rotativos
-- =========================================================================
