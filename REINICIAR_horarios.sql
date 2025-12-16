-- =========================================================================
-- REINICIO COMPLETO DEL SISTEMA DE HORARIOS
-- =========================================================================

-- PASO 1: ELIMINAR TODO
DELETE FROM employee_schedules;
DELETE FROM schedule_templates WHERE is_rotating_template = TRUE;

-- Reiniciar secuencia de IDs
ALTER SEQUENCE schedule_templates_id_seq RESTART WITH 1;

-- PASO 2: CREAR LAS 4 PLANTILLAS CORRECTAS
INSERT INTO schedule_templates (
  template_name,
  is_rotating_template,
  week_number,
  target_role,
  id_tienda,
  monday_time, monday_is_off,
  tuesday_time, tuesday_is_off,
  wednesday_time, wednesday_is_off,
  thursday_time, thursday_is_off,
  friday_time, friday_is_off,
  saturday_time, saturday_is_off,
  sunday_time, sunday_is_off
) VALUES
-- Administradora Semana 1
('Administradora Semana 1', TRUE, 1, 'administradora', NULL,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE, '09:00', FALSE,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE),

-- Administradora Semana 2  
('Administradora Semana 2', TRUE, 2, 'administradora', NULL,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE, '09:00', FALSE,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE),

-- Asesora Semana 1
('Asesora Semana 1', TRUE, 1, 'asesora', NULL,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE, '09:00', FALSE,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE),

-- Asesora Semana 2
('Asesora Semana 2', TRUE, 2, 'asesora', NULL,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE, '09:00', FALSE,
 '09:00', FALSE, '09:00', FALSE, '09:00', FALSE);

-- PASO 3: VERIFICAR
SELECT 
  id,
  template_name,
  target_role,
  week_number,
  is_rotating_template
FROM schedule_templates
WHERE is_rotating_template = TRUE
ORDER BY target_role, week_number;

-- =========================================================================
-- ✅ LISTO - Ahora deberías ver exactamente 4 plantillas
-- =========================================================================
