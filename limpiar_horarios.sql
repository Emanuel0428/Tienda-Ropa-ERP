-- =========================================================================
-- LIMPIEZA Y SIMPLIFICACIÓN DEL SISTEMA DE HORARIOS
-- =========================================================================

-- 1. ELIMINAR horarios del usuario admin (no debería tener horarios rotativos)
DELETE FROM employee_schedules 
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE rol = 'admin'
);

-- 2. Ver qué quedó limpio
SELECT 
  es.id,
  u.nombre,
  u.rol,
  es.schedule_date,
  es.check_in_deadline
FROM employee_schedules es
JOIN usuarios u ON es.id_usuario = u.id_usuario
ORDER BY u.nombre, es.schedule_date;

-- =========================================================================
-- EXPLICACIÓN SIMPLE DEL SISTEMA:
-- =========================================================================
-- 
-- Solo hay 2 tablas importantes:
--
-- 1. schedule_templates (4 plantillas fijas):
--    - Administradora Semana 1
--    - Administradora Semana 2
--    - Asesora Semana 1
--    - Asesora Semana 2
--
-- 2. employee_schedules (horarios aplicados):
--    - Cuando haces clic en "Aplicar Horarios"
--    - Copia las plantillas a cada empleado para cada día del mes
--    - Solo para usuarios con rol 'administradora' y 'asesora'
--    - El admin (tú) NO tiene horarios rotativos
--
-- =========================================================================
