-- Migración: Función para eliminar usuario completo (DB + Auth)
-- Ejecutar en Supabase SQL Editor como superusuario (postgres)

CREATE OR REPLACE FUNCTION public.delete_user_completely(p_id_usuario integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Obtener el UUID de auth del usuario
  SELECT id INTO v_auth_id FROM public.usuarios WHERE id_usuario = p_id_usuario;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con id_usuario % no encontrado', p_id_usuario;
  END IF;

  -- 1. Desvincular de tiendas donde sea admin o asesora (no eliminar la tienda)
  UPDATE public.tiendas SET id_admin = NULL  WHERE id_admin  = p_id_usuario;
  UPDATE public.tiendas SET id_asesora = NULL WHERE id_asesora = p_id_usuario;

  -- 2. Eliminar registros dependientes
  DELETE FROM public.attendance_records  WHERE id_usuario = p_id_usuario;
  DELETE FROM public.employee_schedules  WHERE id_usuario = p_id_usuario;
  DELETE FROM public.schedule_templates  WHERE id_usuario = p_id_usuario;
  DELETE FROM public.tareas_asignadas    WHERE id_usuario = p_id_usuario;

  -- 3. Las auditorías creadas por este usuario quedan (id_auditor apunta a auth.users),
  --    solo desvinculamos el auditor para no perder el historial
  UPDATE public.auditorias SET id_auditor = NULL WHERE id_auditor = v_auth_id;

  -- 4. Eliminar de la tabla pública usuarios
  DELETE FROM public.usuarios WHERE id_usuario = p_id_usuario;

  -- 5. Eliminar de auth.users (requiere SECURITY DEFINER con propietario superusuario)
  DELETE FROM auth.users WHERE id = v_auth_id;

END;
$$;

-- Otorgar permiso de ejecución solo a usuarios autenticados con rol service_role o a la aplicación
-- Ajustar según el rol que usa la aplicación en Supabase
GRANT EXECUTE ON FUNCTION public.delete_user_completely(integer) TO authenticated;
