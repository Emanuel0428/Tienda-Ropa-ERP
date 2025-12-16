-- ============================================
-- SOLUCIÓN: Agregar 'administradora' al constraint de roles
-- ============================================

-- Eliminar el constraint existente
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Crear nuevo constraint que incluya 'administradora'
ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'coordinador', 'administradora', 'asesora', 'auditor', 'gerencia'));

-- Verificar
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'usuarios_rol_check';
