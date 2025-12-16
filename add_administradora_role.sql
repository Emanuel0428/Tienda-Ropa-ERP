-- ============================================
-- AGREGAR ROL "administradora" AL SISTEMA
-- ============================================
-- Ejecuta este script en Supabase SQL Editor

-- PASO 1: Eliminar el constraint existente que limita los roles en USUARIOS
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- PASO 2: Crear nuevo constraint en USUARIOS que incluya 'administradora'
ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'coordinador', 'administradora', 'asesora', 'auditor', 'gerencia'));

-- PASO 3: Eliminar el constraint existente en SCHEDULE_TEMPLATES
ALTER TABLE public.schedule_templates 
DROP CONSTRAINT IF EXISTS schedule_templates_target_role_check;

-- PASO 4: Crear nuevo constraint en SCHEDULE_TEMPLATES que incluya 'administradora'
ALTER TABLE public.schedule_templates
ADD CONSTRAINT schedule_templates_target_role_check 
CHECK (target_role IN ('admin', 'coordinador', 'administradora', 'asesora'));

-- PASO 5: Actualizar las plantillas rotativas existentes 
-- que usan 'admin' para que usen 'administradora'
UPDATE public.schedule_templates
SET target_role = 'administradora'
WHERE target_role = 'admin' 
  AND is_rotating_template = TRUE;

-- PASO 6: Actualizar la descripción en las plantillas
UPDATE public.schedule_templates
SET template_name = REPLACE(template_name, 'Admin', 'Administradora')
WHERE is_rotating_template = TRUE 
  AND target_role = 'administradora';

-- PASO 7: Verificar los cambios
SELECT 
  id,
  template_name,
  target_role,
  week_number,
  is_rotating_template,
  id_tienda
FROM public.schedule_templates
WHERE is_rotating_template = TRUE
ORDER BY target_role, week_number;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- • El rol "admin" (tú) sigue existiendo para administrar el sistema
-- • El nuevo rol "administradora" es para las administradoras de tienda
-- • Los horarios rotativos se aplican a "administradora" y "asesora"
-- • El rol "admin" (sistema) NO tiene horarios rotativos
