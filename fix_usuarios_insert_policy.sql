-- ============================================
-- DIAGNÓSTICO: Verificar políticas RLS actuales
-- ============================================

-- 1. Ver si RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'usuarios';

-- 2. Ver todas las políticas actuales en usuarios
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY cmd, policyname;

-- ============================================
-- SOLUCIÓN: Agregar políticas para INSERT y SELECT
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admin puede crear usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden registrarse" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.usuarios;

-- Política 1: Permitir que usuarios autenticados creen su propio registro
CREATE POLICY "Usuarios pueden registrarse"
ON public.usuarios
FOR INSERT
WITH CHECK (
  id = auth.uid()
);

-- Política 2: Permitir que usuarios autenticados lean su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON public.usuarios
FOR SELECT
USING (
  id = auth.uid()
);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Ver políticas después del cambio
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY cmd, policyname;
