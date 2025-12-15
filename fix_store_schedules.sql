-- ============================================
-- AGREGAR COLUMNAS DE HORARIOS SEMANALES A store_schedules
-- ============================================
-- Este script agrega las columnas necesarias para los horarios por día de la semana
-- Ejecuta esto en Supabase SQL Editor

-- Agregar columnas de horarios por día
ALTER TABLE public.store_schedules
ADD COLUMN IF NOT EXISTS monday_check_in_deadline TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS tuesday_check_in_deadline TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS wednesday_check_in_deadline TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS thursday_check_in_deadline TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS friday_check_in_deadline TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS saturday_check_in_deadline TIME DEFAULT '10:00:00',
ADD COLUMN IF NOT EXISTS sunday_check_in_deadline TIME DEFAULT '10:00:00';

-- Actualizar registros existentes para usar el valor de check_in_deadline
-- si las nuevas columnas están en NULL
UPDATE public.store_schedules
SET 
  monday_check_in_deadline = COALESCE(monday_check_in_deadline, check_in_deadline),
  tuesday_check_in_deadline = COALESCE(tuesday_check_in_deadline, check_in_deadline),
  wednesday_check_in_deadline = COALESCE(wednesday_check_in_deadline, check_in_deadline),
  thursday_check_in_deadline = COALESCE(thursday_check_in_deadline, check_in_deadline),
  friday_check_in_deadline = COALESCE(friday_check_in_deadline, check_in_deadline),
  saturday_check_in_deadline = COALESCE(saturday_check_in_deadline, check_in_deadline),
  sunday_check_in_deadline = COALESCE(sunday_check_in_deadline, check_in_deadline)
WHERE monday_check_in_deadline IS NULL;

-- Verificar cambios
SELECT 
  id_tienda, 
  check_in_deadline,
  monday_check_in_deadline,
  tuesday_check_in_deadline,
  wednesday_check_in_deadline,
  thursday_check_in_deadline,
  friday_check_in_deadline,
  saturday_check_in_deadline,
  sunday_check_in_deadline,
  latitude,
  longitude,
  location_radius_meters
FROM public.store_schedules
ORDER BY id_tienda;
