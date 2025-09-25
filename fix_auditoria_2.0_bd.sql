-- Script para verificar y ajustar BD existente para Auditorías 2.0
-- Ejecutar este script paso a paso en Supabase SQL Editor

-- 1. VERIFICAR ESTRUCTURA ACTUAL
-- Verificar si existen las tablas necesarias
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('auditorias', 'categorias', 'subcategorias', 'preguntas', 'auditoria_preguntas', 'respuestas')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. VERIFICAR DATOS EXISTENTES
-- Verificar si hay datos en las tablas maestras
SELECT 'categorias' as tabla, count(*) as registros FROM categorias WHERE activo = true
UNION ALL
SELECT 'subcategorias' as tabla, count(*) as registros FROM subcategorias WHERE activo = true
UNION ALL
SELECT 'preguntas' as tabla, count(*) as registros FROM preguntas WHERE activo = true;

-- 3. AJUSTES NECESARIOS PARA AUDITORÍAS 2.0

-- Verificar que la tabla auditorias tenga los campos correctos
-- Si no existe, crearla
DO $$
BEGIN
  -- Verificar si la columna id_auditoria es SERIAL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auditorias' 
    AND column_name = 'id_auditoria' 
    AND column_default LIKE 'nextval%'
  ) THEN
    -- Modificar la tabla si es necesario
    ALTER TABLE auditorias ALTER COLUMN id_auditoria SET DEFAULT nextval('auditorias_id_auditoria_seq'::regclass);
  END IF;
END $$;

-- Asegurar que los campos necesarios existan en auditorias
ALTER TABLE auditorias 
ADD COLUMN IF NOT EXISTS observaciones text,
ADD COLUMN IF NOT EXISTS calificacion_total_v2 numeric DEFAULT 0;

-- Ajustar auditoria_preguntas para que funcione correctamente
ALTER TABLE auditoria_preguntas 
ALTER COLUMN id_auditoria TYPE bigint USING id_auditoria::bigint;

-- 4. INSERTAR DATOS MAESTROS SI NO EXISTEN

-- Insertar categorías si no existen (usando ON CONFLICT para evitar duplicados)
INSERT INTO categorias (id, nombre, peso, orden) VALUES
(1, 'ASEO', 10, 1),
(2, 'VISUAL', 11, 2),
(3, 'BODEGA', 11, 3),
(4, 'DINERO E INVENTARIO', 16, 4),
(5, 'CARPETAS Y TEMAS GENERALES', 10, 5),
(6, 'CELULAR Y FUNCIONES', 12, 6),
(7, 'CUMPLIMIENTO A PROCESOS COMERCIALES', 14, 7),
(8, 'INDICADORES', 16, 8)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  peso = EXCLUDED.peso,
  orden = EXCLUDED.orden,
  updated_at = NOW();

-- Insertar subcategorías si no existen
INSERT INTO subcategorias (id, categoria_id, nombre, orden) VALUES
-- ASEO
(1, 1, 'ASEO LOCATIVO', 1),
(2, 1, 'ASEO GENERAL TIENDA', 2),
-- VISUAL
(3, 2, 'PUBLICIDAD', 1),
(4, 2, 'EXHIBICIONES', 2),
(5, 2, 'VISUAL GENERAL', 3),
-- BODEGA
(6, 3, 'GESTIÓN DE BODEGA', 1),
(7, 3, 'ORDEN DE BODEGA', 2),
-- DINERO E INVENTARIO
(8, 4, 'DINERO', 1),
(9, 4, 'CONSIGNACIONES', 2),
(10, 4, 'INVENTARIO', 3),
-- CARPETAS Y TEMAS GENERALES
(11, 5, 'ADMINISTRATIVAS', 1),
(12, 5, 'GENERAL', 2),
-- CELULAR Y FUNCIONES
(13, 6, 'CELULAR PERSONAL', 1),
(14, 6, 'CORPORATIVO', 2),
-- CUMPLIMIENTO A PROCESOS COMERCIALES
(15, 7, 'SALUDO', 1),
(16, 7, 'ASESORÍA', 2),
-- INDICADORES
(17, 8, 'CONOCIMIENTO', 1),
(18, 8, 'RESULTADOS', 2),
(19, 8, 'MEDICIÓN REDES Y ESTADOS', 3)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria_id = EXCLUDED.categoria_id,
  orden = EXCLUDED.orden,
  updated_at = NOW();

-- Insertar algunas preguntas de ejemplo (solo si la tabla está vacía)
INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden)
SELECT 1, 'Antenas limpias', 1
WHERE NOT EXISTS (SELECT 1 FROM preguntas LIMIT 1);

INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden)
SELECT 1, 'El baffle limpio (si aplica)', 2
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE subcategoria_id = 1 AND orden = 2);

INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden)
SELECT 1, 'Punto de pago en orden, sin prendas, basura, todo en su lugar', 3
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE subcategoria_id = 1 AND orden = 3);

INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden)
SELECT 2, 'Maniquís limpios', 1
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE subcategoria_id = 2 AND orden = 1);

INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden)
SELECT 3, 'Campaña del mes montado toda su publicidad POP', 1
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE subcategoria_id = 3 AND orden = 1);

-- 5. VERIFICAR CONFIGURACIÓN FINAL
-- Contar registros finales
SELECT 
  'CONFIGURACIÓN FINAL' as status,
  (SELECT count(*) FROM categorias WHERE activo = true) as categorias,
  (SELECT count(*) FROM subcategorias WHERE activo = true) as subcategorias,
  (SELECT count(*) FROM preguntas WHERE activo = true) as preguntas;

-- 6. PRUEBA DE INSERCIÓN DE AUDITORÍA
-- Script de prueba para verificar que se puede crear una auditoría
-- (Solo ejecutar después de verificar que todo esté correcto)
/*
INSERT INTO auditorias (id_tienda, id_auditor, fecha, quienes_reciben, estado)
VALUES (1, auth.uid(), CURRENT_DATE, 'Prueba', 'en_progreso')
RETURNING id_auditoria;
*/

-- 7. VERIFICAR CONSTRAINTS Y FOREIGN KEYS
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('auditorias', 'auditoria_preguntas', 'respuestas')
  AND tc.table_schema = 'public';

-- 8. SOLUCIÓN A POSIBLES PROBLEMAS COMUNES

-- Si hay problema con secuencias, resetear
-- ALTER SEQUENCE auditorias_id_auditoria_seq RESTART WITH 1;
-- ALTER SEQUENCE auditoria_preguntas_id_auditoria_pregunta_seq RESTART WITH 1;
-- ALTER SEQUENCE respuestas_id_respuesta_seq RESTART WITH 1;

-- Si hay problema con tipos de datos
-- ALTER TABLE auditoria_preguntas ALTER COLUMN id_auditoria TYPE bigint;
-- ALTER TABLE respuestas ALTER COLUMN id_auditoria_pregunta TYPE bigint;