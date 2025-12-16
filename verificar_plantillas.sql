-- Ver todas las plantillas rotativas que existen
SELECT 
  id,
  template_name,
  target_role,
  week_number,
  is_rotating_template,
  id_tienda,
  monday_time,
  tuesday_time
FROM schedule_templates
WHERE is_rotating_template = TRUE
ORDER BY target_role, week_number;
