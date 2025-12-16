-- 1. Ver usuarios que deberían tener horarios
SELECT 
  id_usuario,
  nombre,
  rol,
  id_tienda
FROM usuarios
WHERE rol IN ('administradora', 'asesora')
ORDER BY rol, nombre;

-- 2. Ver plantillas que existen
SELECT 
  id,
  template_name,
  target_role,
  week_number,
  monday_time,
  tuesday_time,
  id_tienda
FROM schedule_templates
WHERE is_rotating_template = TRUE
ORDER BY target_role, week_number;

-- 3. Ver TODOS los registros en employee_schedules (sin filtros)
SELECT 
  COUNT(*) as total_registros
FROM employee_schedules;
