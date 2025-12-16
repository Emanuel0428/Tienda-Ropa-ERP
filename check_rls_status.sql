-- ============================================
-- VERIFICAR ESTADO ACTUAL DE RLS EN USUARIOS
-- ============================================

-- 1. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'usuarios';

-- 2. Ver todas las políticas actuales
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
ORDER BY policyname;

-- 3. Ver los roles de los usuarios actuales
SELECT 
  id_usuario,
  nombre,
  rol,
  id_tienda
FROM public.usuarios
ORDER BY rol, nombre;
