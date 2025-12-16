-- Ver qué horarios tiene el usuario actualmente en employee_schedules
SELECT 
  es.id,
  u.nombre,
  u.rol,
  es.schedule_date,
  TO_CHAR(es.schedule_date, 'Day') as dia_semana,
  es.check_in_deadline,
  es.is_day_off,
  es.notes
FROM employee_schedules es
JOIN usuarios u ON es.id_usuario = u.id_usuario
WHERE u.rol IN ('administradora', 'asesora')
  AND es.schedule_date >= CURRENT_DATE
ORDER BY u.nombre, es.schedule_date
LIMIT 20;
