-- =========================================================================
-- Agregar columna late_note a attendance_records
-- =========================================================================
-- PROPÓSITO: Permitir registrar anotaciones cuando un empleado llega tarde
-- =========================================================================

-- Agregar columna para anotaciones de llegadas tarde
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS late_note TEXT;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN public.attendance_records.late_note IS 
'Anotación del motivo por el cual el empleado llegó tarde. Visible en el monitor de asistencia.';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
AND column_name = 'late_note';

-- =========================================================================
-- ✅ DESPUÉS DE EJECUTAR:
-- 1. La columna late_note estará disponible en attendance_records
-- 2. Coordinadores y admins podrán agregar anotaciones en el Monitor de Tiendas
-- 3. Las anotaciones quedarán registradas permanentemente
-- =========================================================================
