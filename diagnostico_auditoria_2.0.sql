-- Script de diagnóstico y corrección para Auditorías 2.0
-- Ejecutar paso a paso en Supabase SQL Editor

-- =========================================
-- PASO 1: DIAGNÓSTICO DE PROBLEMAS
-- =========================================

-- 1.1 Verificar que existan las tablas principales
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'categorias', 
            'subcategorias', 
            'preguntas', 
            'auditorias', 
            'auditoria_preguntas', 
            'respuestas'
        ) THEN '✅ Requerida para Auditorías 2.0'
        ELSE '⚠️ Tabla adicional'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE '%audit%' 
   OR table_name IN ('categorias', 'subcategorias', 'preguntas', 'respuestas')
ORDER BY 
    CASE 
        WHEN table_name IN ('categorias', 'subcategorias', 'preguntas', 'auditorias', 'auditoria_preguntas', 'respuestas') 
        THEN 1 ELSE 2 
    END,
    table_name;

-- 1.2 Verificar estructura de tabla auditorias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'auditorias'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.3 Verificar si hay datos en categorias
SELECT 
    'categorias' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN activo = true THEN 1 END) as registros_activos
FROM categorias
UNION ALL
SELECT 
    'subcategorias' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN activo = true THEN 1 END) as registros_activos
FROM subcategorias
UNION ALL
SELECT 
    'preguntas' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN activo = true THEN 1 END) as registros_activos
FROM preguntas;

-- =========================================
-- PASO 2: VERIFICACIÓN DE FOREIGN KEYS
-- =========================================

-- 2.1 Verificar foreign keys críticas
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('auditorias', 'auditoria_preguntas', 'respuestas', 'subcategorias', 'preguntas')
ORDER BY tc.table_name, kcu.column_name;

-- =========================================
-- PASO 3: CORRECCIONES AUTOMÁTICAS
-- =========================================

-- 3.1 Corregir estructura de tabla auditorias
DO $$
DECLARE
    has_serial_id boolean;
BEGIN
    -- Verificar si id_auditoria tiene secuencia automática
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'id_auditoria'
        AND column_default LIKE 'nextval%'
    ) INTO has_serial_id;

    -- Si no tiene secuencia, recrear la columna como SERIAL
    IF NOT has_serial_id THEN
        -- Crear secuencia si no existe
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'auditorias_id_auditoria_seq') THEN
            CREATE SEQUENCE auditorias_id_auditoria_seq;
            RAISE NOTICE '✅ Creada secuencia auditorias_id_auditoria_seq';
        END IF;

        -- Configurar valor por defecto para la secuencia
        ALTER TABLE auditorias ALTER COLUMN id_auditoria SET DEFAULT nextval('auditorias_id_auditoria_seq');
        
        -- Asignar la secuencia a la columna
        ALTER SEQUENCE auditorias_id_auditoria_seq OWNED BY auditorias.id_auditoria;
        
        -- Actualizar el valor actual de la secuencia
        SELECT setval('auditorias_id_auditoria_seq', COALESCE(MAX(id_auditoria), 1)) FROM auditorias;
        
        RAISE NOTICE '✅ Configurado id_auditoria como campo auto-incrementable';
    END IF;

    -- Verificar si falta columna quienes_reciben
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'quienes_reciben'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN quienes_reciben TEXT;
        RAISE NOTICE '✅ Agregada columna quienes_reciben a tabla auditorias';
    END IF;

    -- Verificar si falta columna observaciones
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'observaciones'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN observaciones TEXT;
        RAISE NOTICE '✅ Agregada columna observaciones a tabla auditorias';
    END IF;

    -- Verificar si falta columna estado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditorias' 
        AND column_name = 'estado'
    ) THEN
        ALTER TABLE auditorias ADD COLUMN estado VARCHAR(20) DEFAULT 'en_progreso';
        RAISE NOTICE '✅ Agregada columna estado a tabla auditorias';
    END IF;
END $$;

-- 3.2 Insertar datos mínimos si no existen categorías
INSERT INTO categorias (nombre, peso, orden, activo) 
SELECT * FROM (VALUES 
    ('ASEO', 10, 1, true),
    ('VISUAL', 11, 2, true),
    ('DINERO', 16, 3, true),
    ('ATENCIÓN AL CLIENTE', 12, 4, true),
    ('PRODUCTO', 15, 5, true),
    ('PERSONAL', 13, 6, true),
    ('SISTEMA', 11, 7, true),
    ('PROMOCIÓN', 12, 8, true)
) AS nuevas_categorias(nombre, peso, orden, activo)
WHERE NOT EXISTS (SELECT 1 FROM categorias LIMIT 1);

-- 3.3 Insertar subcategorías básicas si no existen
INSERT INTO subcategorias (categoria_id, nombre, orden, activo)
SELECT 
    c.id, 
    'General',
    1,
    true
FROM categorias c
WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE categoria_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM subcategorias LIMIT 1);

-- 3.4 Insertar al menos una pregunta de prueba por subcategoría
INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden, activo)
SELECT 
    s.id,
    'Pregunta de prueba - ' || c.nombre,
    1,
    true
FROM subcategorias s
JOIN categorias c ON s.categoria_id = c.id
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE subcategoria_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM preguntas LIMIT 1);

-- =========================================
-- PASO 4: VERIFICACIÓN FINAL
-- =========================================

-- 4.1 Resumen final del sistema
SELECT 
    'RESUMEN DEL SISTEMA AUDITORÍAS 2.0' as titulo,
    (SELECT COUNT(*) FROM categorias WHERE activo = true) as categorias_activas,
    (SELECT COUNT(*) FROM subcategorias WHERE activo = true) as subcategorias_activas,
    (SELECT COUNT(*) FROM preguntas WHERE activo = true) as preguntas_activas,
    (SELECT COUNT(*) FROM auditorias) as auditorias_existentes;

-- 4.2 Estructura completa disponible
SELECT 
    c.nombre as categoria,
    c.peso as peso_categoria,
    COUNT(DISTINCT s.id) as subcategorias,
    COUNT(p.id) as total_preguntas
FROM categorias c
LEFT JOIN subcategorias s ON c.id = s.categoria_id AND s.activo = true
LEFT JOIN preguntas p ON s.id = p.subcategoria_id AND p.activo = true
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.peso, c.orden
ORDER BY c.orden;

-- =========================================
-- PASO 5: PRUEBA DE CREACIÓN
-- =========================================

-- 5.1 Probar creación de auditoría de prueba (comentar si no quieres crear)
-- NOTA: id_auditoria se genera automáticamente, NO incluirlo en el INSERT
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
    (SELECT id FROM auth.users LIMIT 1), -- Usar el primer usuario disponible
    CURRENT_DATE, 
    'Personal de prueba', 
    'Auditoría de prueba del sistema', 
    'en_progreso', 
    0
) RETURNING id_auditoria, fecha, estado;
