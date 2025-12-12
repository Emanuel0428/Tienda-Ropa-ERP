-- ========================================
-- MIGRACION: HORARIOS SEMANALES
-- ========================================
-- Agrega soporte para configurar diferentes horarios por día de la semana
-- Cada tienda puede tener un horario diferente para Lunes, Martes, Miércoles, etc.

-- ========================================
-- 1. AGREGAR COLUMNAS DE HORARIOS POR DÍA
-- ========================================

DO $$
BEGIN
  -- Lunes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='monday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN monday_check_in_deadline TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ Campo monday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo monday_check_in_deadline ya existe';
  END IF;

  -- Martes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='tuesday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN tuesday_check_in_deadline TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ Campo tuesday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo tuesday_check_in_deadline ya existe';
  END IF;

  -- Miércoles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='wednesday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN wednesday_check_in_deadline TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ Campo wednesday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo wednesday_check_in_deadline ya existe';
  END IF;

  -- Jueves
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='thursday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN thursday_check_in_deadline TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ Campo thursday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo thursday_check_in_deadline ya existe';
  END IF;

  -- Viernes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='friday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN friday_check_in_deadline TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ Campo friday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo friday_check_in_deadline ya existe';
  END IF;

  -- Sábado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='saturday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN saturday_check_in_deadline TIME DEFAULT '10:00:00';
    RAISE NOTICE '✅ Campo saturday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo saturday_check_in_deadline ya existe';
  END IF;

  -- Domingo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_schedules' AND column_name='sunday_check_in_deadline') THEN
    ALTER TABLE public.store_schedules ADD COLUMN sunday_check_in_deadline TIME DEFAULT '10:00:00';
    RAISE NOTICE '✅ Campo sunday_check_in_deadline agregado';
  ELSE
    RAISE NOTICE '⚠️ Campo sunday_check_in_deadline ya existe';
  END IF;

END $$;

-- ========================================
-- 2. COPIAR HORARIO ACTUAL A TODOS LOS DÍAS
-- ========================================
-- Esto copia el horario existente en check_in_deadline a todos los días de la semana
-- Solo si los nuevos campos están en su valor por defecto

UPDATE public.store_schedules
SET 
  monday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  tuesday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  wednesday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  thursday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  friday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  saturday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00'),
  sunday_check_in_deadline = COALESCE(check_in_deadline::TIME, '09:00:00')
WHERE 
  monday_check_in_deadline = '09:00:00' AND
  tuesday_check_in_deadline = '09:00:00' AND
  wednesday_check_in_deadline = '09:00:00';

-- ========================================
-- 3. CREAR FUNCIÓN PARA OBTENER HORARIO DEL DÍA
-- ========================================
-- Esta función devuelve el horario límite según el día de la semana actual

CREATE OR REPLACE FUNCTION get_check_in_deadline_for_day(
  p_store_id INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TIME
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_deadline TIME;
BEGIN
  -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Obtener el horario correspondiente
  SELECT 
    CASE 
      WHEN v_day_of_week = 0 THEN sunday_check_in_deadline
      WHEN v_day_of_week = 1 THEN monday_check_in_deadline
      WHEN v_day_of_week = 2 THEN tuesday_check_in_deadline
      WHEN v_day_of_week = 3 THEN wednesday_check_in_deadline
      WHEN v_day_of_week = 4 THEN thursday_check_in_deadline
      WHEN v_day_of_week = 5 THEN friday_check_in_deadline
      WHEN v_day_of_week = 6 THEN saturday_check_in_deadline
    END
  INTO v_deadline
  FROM public.store_schedules
  WHERE id_tienda = p_store_id;
  
  RETURN COALESCE(v_deadline, '09:00:00');
END;
$$;

COMMENT ON FUNCTION get_check_in_deadline_for_day IS 'Obtiene el horario límite de entrada para un día específico de la semana';

-- ========================================
-- 4. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_store_schedules_id_tienda 
ON public.store_schedules(id_tienda);

-- ========================================
-- 5. VERIFICACIÓN
-- ========================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  
  -- Verificar que las columnas existen
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_name = 'store_schedules' 
  AND column_name IN (
    'monday_check_in_deadline',
    'tuesday_check_in_deadline', 
    'wednesday_check_in_deadline',
    'thursday_check_in_deadline',
    'friday_check_in_deadline',
    'saturday_check_in_deadline',
    'sunday_check_in_deadline'
  );
  
  IF v_count = 7 THEN
    RAISE NOTICE '✅ Todas las columnas de horarios semanales están presentes';
  ELSE
    RAISE NOTICE '⚠️ Solo % de 7 columnas encontradas', v_count;
  END IF;
  
  -- Verificar que la función existe
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_check_in_deadline_for_day') THEN
    RAISE NOTICE '✅ Función get_check_in_deadline_for_day creada correctamente';
  ELSE
    RAISE NOTICE '❌ Función get_check_in_deadline_for_day no encontrada';
  END IF;
  
  -- Mostrar ejemplo de uso
  RAISE NOTICE '';
  RAISE NOTICE 'Ejemplo de uso:';
  RAISE NOTICE 'SELECT get_check_in_deadline_for_day(1, CURRENT_DATE);';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 
-- 1. El campo check_in_deadline original se mantiene por compatibilidad
-- 2. Los nuevos campos permiten horarios diferentes por día
-- 3. Por defecto, Lunes-Viernes usan 09:00 y Sábado-Domingo usan 10:00
-- 4. La función get_check_in_deadline_for_day facilita obtener el horario del día actual
-- 5. Los horarios existentes se copian automáticamente a todos los días
--
-- Para configurar horarios diferentes por día, actualiza directamente:
-- UPDATE store_schedules SET 
--   monday_check_in_deadline = '08:00:00',
--   friday_check_in_deadline = '09:30:00',
--   saturday_check_in_deadline = '10:00:00'
-- WHERE id_tienda = 1;
