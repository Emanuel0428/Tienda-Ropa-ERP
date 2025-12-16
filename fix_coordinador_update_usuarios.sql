-- =========================================================================
-- FIX: Permitir a coordinador actualizar usuarios
-- =========================================================================
-- PROBLEMA: El coordinador no puede cambiar el rol de los usuarios
-- SOLUCIÓN: Agregar política RLS para permitir UPDATE a coordinador
-- =========================================================================

-- Verificar políticas actuales en la tabla usuarios
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'usuarios';

-- Eliminar políticas existentes de UPDATE si existen
DROP POLICY IF EXISTS "Coordinador puede actualizar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Admin puede actualizar usuarios" ON public.usuarios;

-- Crear política para que admin pueda actualizar cualquier usuario
CREATE POLICY "Admin puede actualizar usuarios"
ON public.usuarios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = 'admin'
  )
);

-- Crear política para que coordinador pueda actualizar usuarios
CREATE POLICY "Coordinador puede actualizar usuarios"
ON public.usuarios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = 'coordinador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = 'coordinador'
  )
);

-- Crear política para que usuarios puedan actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su perfil"
ON public.usuarios
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Verificar que las políticas se crearon correctamente
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'usuarios'
AND cmd = 'UPDATE';

-- =========================================================================
-- ✅ DESPUÉS DE EJECUTAR:
-- 1. El coordinador podrá editar roles y datos de usuarios
-- 2. Los usuarios seguirán pudiendo editar su propio perfil
-- 3. Los admins mantienen acceso total
-- =========================================================================
