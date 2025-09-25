-- Corrección específica para la estructura de tabla auditorias
-- Error: Could not find the 'observaciones' column of 'auditorias'
-- Ejecutar este script en Supabase SQL Editor

-- =========================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- =========================================

-- Ver todas las columnas actuales de la tabla auditorias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'auditorias' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- PASO 2: AGREGAR COLUMNAS FALTANTES
-- =========================================

DO $$
BEGIN
    -- Agregar columna observaciones si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'observaciones'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN observaciones TEXT;
        RAISE NOTICE '✅ Agregada columna observaciones';
    ELSE
        RAISE NOTICE '⚠️ Columna observaciones ya existe';
    END IF;

    -- Agregar columna quienes_reciben si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'quienes_reciben'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN quienes_reciben TEXT;
        RAISE NOTICE '✅ Agregada columna quienes_reciben';
    ELSE
        RAISE NOTICE '⚠️ Columna quienes_reciben ya existe';
    END IF;

    -- Agregar columna estado si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'estado'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN estado VARCHAR(20) DEFAULT 'en_progreso';
        RAISE NOTICE '✅ Agregada columna estado';
    ELSE
        RAISE NOTICE '⚠️ Columna estado ya existe';
    END IF;

    -- Verificar y corregir tipo de calificacion_total
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'calificacion_total'
        AND data_type != 'numeric'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE auditorias ALTER COLUMN calificacion_total TYPE DECIMAL(5,2);
        RAISE NOTICE '✅ Corregido tipo de calificacion_total a DECIMAL(5,2)';
    END IF;

END $$;

-- =========================================
-- PASO 3: CONFIGURAR ID AUTO-INCREMENTABLE
-- =========================================

DO $$
DECLARE
    max_id integer;
    has_serial boolean;
BEGIN
    -- Verificar si ya tiene configuración SERIAL
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'id_auditoria'
        AND column_default LIKE 'nextval%'
        AND table_schema = 'public'
    ) INTO has_serial;

    IF NOT has_serial THEN
        RAISE NOTICE '🔧 Configurando id_auditoria como campo SERIAL...';
        
        -- Limpiar registros con ID NULL primero
        DELETE FROM auditorias WHERE id_auditoria IS NULL;
        
        -- Obtener el ID máximo actual
        SELECT COALESCE(MAX(id_auditoria), 0) INTO max_id FROM auditorias;
        
        -- Crear o recrear la secuencia
        DROP SEQUENCE IF EXISTS auditorias_id_auditoria_seq CASCADE;
        EXECUTE format('CREATE SEQUENCE auditorias_id_auditoria_seq START %s', max_id + 1);
        
        -- Configurar la columna para usar la secuencia
        ALTER TABLE auditorias ALTER COLUMN id_auditoria SET DEFAULT nextval('auditorias_id_auditoria_seq');
        
        -- Asignar la secuencia a la columna
        ALTER SEQUENCE auditorias_id_auditoria_seq OWNED BY auditorias.id_auditoria;
        
        RAISE NOTICE '✅ Configuración SERIAL completada. Próximo ID será: %', max_id + 1;
    ELSE
        RAISE NOTICE '✅ Campo id_auditoria ya está configurado como SERIAL';
    END IF;
END $$;

-- =========================================
-- PASO 4: VERIFICAR ESTRUCTURA FINAL
-- =========================================

-- Mostrar estructura final de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'auditorias' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- PASO 5: REFRESCAR CACHE DE SUPABASE
-- =========================================

-- Forzar actualización del cache de esquema
NOTIFY pgrst, 'reload schema';

-- =========================================
-- PASO 6: PRUEBA DE INSERCIÓN
-- =========================================

-- Probar inserción con todas las columnas necesarias
INSERT INTO auditorias (
    id_tienda, 
    id_auditor, 
    fecha, 
    quienes_reciben, 
    observaciones, 
    estado, 
    calificacion_total
) VALUES (
    1,
    (SELECT id FROM auth.users LIMIT 1),
    CURRENT_DATE,
    'Prueba después de corrección',
    'Probando que todas las columnas existan',
    'en_progreso',
    0.00
) RETURNING 
    id_auditoria,
    fecha,
    quienes_reciben,
    observaciones,
    estado;

-- =========================================
-- PASO 7: RESUMEN FINAL
-- =========================================

SELECT 
    'VERIFICACIÓN FINAL' as titulo,
    (SELECT COUNT(*) FROM auditorias) as total_auditorias,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'auditorias') as columnas_en_tabla;

RAISE NOTICE '🎉 Corrección de estructura completada. Puedes probar crear auditorías en la aplicación.';