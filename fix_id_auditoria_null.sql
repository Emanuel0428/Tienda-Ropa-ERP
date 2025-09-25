-- Corrección específica para el error de id_auditoria NULL
-- Ejecutar este script en Supabase SQL Editor para corregir el problema

-- =========================================
-- PASO 1: DIAGNÓSTICO DEL PROBLEMA
-- =========================================

-- Verificar registros con id_auditoria NULL
SELECT 
    COUNT(*) as registros_con_id_null,
    COUNT(CASE WHEN id_auditoria IS NOT NULL THEN 1 END) as registros_con_id_valido
FROM auditorias;

-- Ver detalles de registros problemáticos
SELECT * FROM auditorias WHERE id_auditoria IS NULL LIMIT 5;

-- =========================================
-- PASO 2: LIMPIAR DATOS CORRUPTOS
-- =========================================

-- OPCIÓN A: Eliminar registros con id_auditoria NULL (si no son importantes)
DELETE FROM auditorias WHERE id_auditoria IS NULL;

-- OPCIÓN B: Si quieres conservar los datos, primero asigna IDs manualmente
-- (Descomenta solo si quieres conservar los registros existentes)
/*
-- Crear secuencia temporal si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'temp_audit_seq') THEN
        CREATE SEQUENCE temp_audit_seq START 1;
    END IF;
END $$;

-- Asignar IDs secuenciales a registros NULL
UPDATE auditorias 
SET id_auditoria = nextval('temp_audit_seq')
WHERE id_auditoria IS NULL;

-- Eliminar secuencia temporal
DROP SEQUENCE IF EXISTS temp_audit_seq;
*/

-- =========================================
-- PASO 3: CONFIGURAR CAMPO COMO SERIAL
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
    ) INTO has_serial;

    IF NOT has_serial THEN
        RAISE NOTICE '🔧 Configurando id_auditoria como campo SERIAL...';
        
        -- Obtener el ID máximo actual
        SELECT COALESCE(MAX(id_auditoria), 0) INTO max_id FROM auditorias;
        
        -- Crear o recrear la secuencia
        DROP SEQUENCE IF EXISTS auditorias_id_auditoria_seq CASCADE;
        EXECUTE format('CREATE SEQUENCE auditorias_id_auditoria_seq START %s', max_id + 1);
        
        -- Configurar la columna para usar la secuencia
        ALTER TABLE auditorias ALTER COLUMN id_auditoria SET DEFAULT nextval('auditorias_id_auditoria_seq');
        
        -- Asignar la secuencia a la columna (para ownership)
        ALTER SEQUENCE auditorias_id_auditoria_seq OWNED BY auditorias.id_auditoria;
        
        RAISE NOTICE '✅ Configuración SERIAL completada. Próximo ID será: %', max_id + 1;
    ELSE
        RAISE NOTICE '✅ Campo id_auditoria ya está configurado como SERIAL';
    END IF;
END $$;

-- =========================================
-- PASO 4: VERIFICAR CORRECCIÓN
-- =========================================

-- Verificar que la columna tiene configuración correcta
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'auditorias' 
  AND column_name = 'id_auditoria';

-- Verificar que la secuencia existe y está configurada
SELECT 
    sequencename,
    start_value,
    last_value,
    increment_by
FROM pg_sequences 
WHERE sequencename = 'auditorias_id_auditoria_seq';

-- =========================================
-- PASO 5: PRUEBA DE INSERCIÓN
-- =========================================

-- Probar inserción sin especificar id_auditoria (debe auto-generarse)
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
    'Prueba de corrección',
    'Probando que el ID se genere automáticamente',
    'en_progreso',
    0
) RETURNING 
    id_auditoria,
    fecha,
    quienes_reciben,
    estado;

-- =========================================
-- PASO 6: RESUMEN FINAL
-- =========================================

SELECT 
    'RESUMEN DE CORRECCIÓN' as titulo,
    COUNT(*) as total_auditorias,
    MIN(id_auditoria) as id_minimo,
    MAX(id_auditoria) as id_maximo,
    COUNT(CASE WHEN id_auditoria IS NULL THEN 1 END) as registros_con_id_null
FROM auditorias;