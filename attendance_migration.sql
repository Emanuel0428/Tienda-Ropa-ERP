-- ============================================
-- MIGRACIÓN: ACTUALIZACIÓN SISTEMA DE ASISTENCIA CON GPS
-- Fecha: Diciembre 2025
-- Descripción: Agrega campos GPS a tablas existentes
-- ============================================

-- ============================================
-- AGREGAR CAMPOS GPS A TABLA EXISTENTE
-- ============================================

-- Verificar y agregar campos GPS a store_schedules
DO $$ 
BEGIN
  -- Agregar latitude si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_schedules' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.store_schedules 
    ADD COLUMN latitude DOUBLE PRECISION;
    RAISE NOTICE '✅ Campo latitude agregado a store_schedules';
  ELSE
    RAISE NOTICE '⚠️ Campo latitude ya existe en store_schedules';
  END IF;

  -- Agregar longitude si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_schedules' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.store_schedules 
    ADD COLUMN longitude DOUBLE PRECISION;
    RAISE NOTICE '✅ Campo longitude agregado a store_schedules';
  ELSE
    RAISE NOTICE '⚠️ Campo longitude ya existe en store_schedules';
  END IF;

  -- Agregar location_radius_meters si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_schedules' 
    AND column_name = 'location_radius_meters'
  ) THEN
    ALTER TABLE public.store_schedules 
    ADD COLUMN location_radius_meters INTEGER DEFAULT 100;
    RAISE NOTICE '✅ Campo location_radius_meters agregado a store_schedules';
  ELSE
    RAISE NOTICE '⚠️ Campo location_radius_meters ya existe en store_schedules';
  END IF;
END $$;

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_usuario ON public.attendance_records(id_usuario);
CREATE INDEX IF NOT EXISTS idx_attendance_tienda ON public.attendance_records(id_tienda);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(check_in);
CREATE INDEX IF NOT EXISTS idx_attendance_active ON public.attendance_records(id_usuario, check_out) WHERE check_out IS NULL;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance_records;
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_updated_at();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.store_schedules;
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON public.store_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_updated_at();

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_schedules ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios registros" ON public.attendance_records;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios registros" ON public.attendance_records;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios registros" ON public.attendance_records;
DROP POLICY IF EXISTS "Todos pueden ver configuraciones" ON public.store_schedules;
DROP POLICY IF EXISTS "Solo admin puede modificar configuraciones" ON public.store_schedules;

-- Política para que usuarios vean solo sus propios registros (excepto admin/coordinador)
CREATE POLICY "Usuarios pueden ver sus propios registros"
  ON public.attendance_records
  FOR SELECT
  USING (
    id_usuario IN (
      SELECT u.id_usuario 
      FROM public.usuarios u
      WHERE u.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador')
    )
  );

-- Política para insertar registros (solo el propio usuario)
CREATE POLICY "Usuarios pueden crear sus propios registros"
  ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    id_usuario IN (
      SELECT u.id_usuario 
      FROM public.usuarios u
      WHERE u.id = auth.uid()
    )
  );

-- Política para actualizar registros (solo el propio usuario puede dar salida)
CREATE POLICY "Usuarios pueden actualizar sus propios registros"
  ON public.attendance_records
  FOR UPDATE
  USING (
    id_usuario IN (
      SELECT u.id_usuario 
      FROM public.usuarios u
      WHERE u.id = auth.uid()
    )
  );

-- Política para ver configuraciones de horarios (todos pueden ver)
CREATE POLICY "Todos pueden ver configuraciones"
  ON public.store_schedules
  FOR SELECT
  USING (true);

-- Política para modificar configuraciones (solo admin)
CREATE POLICY "Solo admin puede modificar configuraciones"
  ON public.store_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

-- ============================================
-- DATOS INICIALES (OPCIONAL)
-- ============================================
-- Actualiza o inserta configuraciones para tiendas existentes
-- Solo se insertan si no existen (ON CONFLICT DO NOTHING)

INSERT INTO public.store_schedules (id_tienda, check_in_deadline, notification_enabled, location_radius_meters)
SELECT 
  id_tienda,
  '09:00:00'::TIME,
  true,
  100
FROM public.tiendas
WHERE id_tienda NOT IN (SELECT id_tienda FROM public.store_schedules)
ON CONFLICT (id_tienda) DO NOTHING;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
DECLARE
  campo_count INTEGER;
BEGIN
  -- Verificar tabla attendance_records
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records'
  ) THEN
    RAISE NOTICE '✅ Tabla attendance_records verificada';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla attendance_records no existe';
  END IF;
  
  -- Verificar tabla store_schedules
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'store_schedules'
  ) THEN
    RAISE NOTICE '✅ Tabla store_schedules verificada';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla store_schedules no existe';
  END IF;

  -- Verificar campos GPS
  SELECT COUNT(*) INTO campo_count
  FROM information_schema.columns 
  WHERE table_name = 'store_schedules' 
  AND column_name IN ('latitude', 'longitude', 'location_radius_meters');

  IF campo_count = 3 THEN
    RAISE NOTICE '✅ Campos GPS agregados correctamente (latitude, longitude, location_radius_meters)';
  ELSE
    RAISE WARNING '⚠️ Faltan campos GPS. Se encontraron % de 3', campo_count;
  END IF;

  -- Mostrar resumen
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos pasos:';
  RAISE NOTICE '1. Configura las coordenadas GPS de tus tiendas';
  RAISE NOTICE '2. Inicia sesión como admin';
  RAISE NOTICE '3. Ve a Asistencia → Configuración';
  RAISE NOTICE '4. Agrega latitud, longitud y radio para cada tienda';
  RAISE NOTICE '';
END $$;
