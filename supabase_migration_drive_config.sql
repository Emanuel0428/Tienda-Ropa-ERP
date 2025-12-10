-- Migración: Sistema de configuración de carpetas Drive por tipo de documento y mes
-- Fecha: 2024-12-09
-- Descripción: Permite configurar links de carpetas de Google Drive para cada tipo de documento,
--              organizados por mes, para cada tienda

-- 1. Crear tabla drive_configs
CREATE TABLE IF NOT EXISTS public.drive_configs (
    id SERIAL PRIMARY KEY,
    id_tienda INTEGER NOT NULL REFERENCES public.tiendas(id_tienda) ON DELETE CASCADE,
    mes VARCHAR(7) NOT NULL, -- Formato: YYYY-MM (ej: 2024-12)
    tipo_documento VARCHAR(50) NOT NULL, -- cierre_caja, cierre_voucher, consignaciones, etc
    drive_link TEXT NOT NULL, -- Link completo o Folder ID de Google Drive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint único: una tienda no puede tener dos links para el mismo tipo de documento en el mismo mes
    CONSTRAINT unique_tienda_mes_tipo UNIQUE (id_tienda, mes, tipo_documento)
);

-- 2. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_drive_configs_tienda 
ON public.drive_configs(id_tienda);

CREATE INDEX IF NOT EXISTS idx_drive_configs_mes 
ON public.drive_configs(mes);

CREATE INDEX IF NOT EXISTS idx_drive_configs_tipo 
ON public.drive_configs(tipo_documento);

CREATE INDEX IF NOT EXISTS idx_drive_configs_tienda_mes 
ON public.drive_configs(id_tienda, mes);

-- 3. Agregar comentarios descriptivos
COMMENT ON TABLE public.drive_configs IS 
'Configuración de carpetas de Google Drive por tipo de documento y mes para cada tienda';

COMMENT ON COLUMN public.drive_configs.id_tienda IS 
'ID de la tienda a la que pertenece esta configuración';

COMMENT ON COLUMN public.drive_configs.mes IS 
'Mes en formato YYYY-MM (ej: 2024-12 para Diciembre 2024)';

COMMENT ON COLUMN public.drive_configs.tipo_documento IS 
'Tipo de documento: cierre_caja, cierre_voucher, consignaciones, facturas_gastos, inventario, nomina, otros';

COMMENT ON COLUMN public.drive_configs.drive_link IS 
'Link de la carpeta de Google Drive donde se guardarán estos documentos. Puede ser el link completo o solo el Folder ID';

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_drive_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_drive_configs_updated_at ON public.drive_configs;
CREATE TRIGGER trigger_update_drive_configs_updated_at
    BEFORE UPDATE ON public.drive_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_drive_configs_updated_at();

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE public.drive_configs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de seguridad (COMENTADAS - Ajustar según tu esquema de base de datos)

-- IMPORTANTE: Reemplaza 'public.usuarios' con el nombre correcto de tu tabla de usuarios
-- Opciones comunes: public.usuarios, auth.users, public.user_profiles, etc.

-- Los usuarios solo pueden ver las configuraciones de su propia tienda
CREATE POLICY "Users can view their own store configs"
ON public.drive_configs
FOR SELECT
USING (true); -- Permitir todo por ahora - AJUSTAR SEGÚN TU ESQUEMA
/*
USING (
    id_tienda IN (
        SELECT id_tienda 
        FROM public.usuarios  -- CAMBIAR AL NOMBRE CORRECTO
        WHERE id = auth.uid()
    )
);
*/

-- Los usuarios pueden insertar configuraciones para su propia tienda
CREATE POLICY "Users can insert configs for their store"
ON public.drive_configs
FOR INSERT
WITH CHECK (true); -- Permitir todo por ahora - AJUSTAR SEGÚN TU ESQUEMA
/*
WITH CHECK (
    id_tienda IN (
        SELECT id_tienda 
        FROM public.usuarios  -- CAMBIAR AL NOMBRE CORRECTO
        WHERE id = auth.uid()
    )
);
*/

-- Los usuarios pueden actualizar configuraciones de su propia tienda
CREATE POLICY "Users can update their own store configs"
ON public.drive_configs
FOR UPDATE
USING (true); -- Permitir todo por ahora - AJUSTAR SEGÚN TU ESQUEMA
/*
USING (
    id_tienda IN (
        SELECT id_tienda 
        FROM public.usuarios  -- CAMBIAR AL NOMBRE CORRECTO
        WHERE id = auth.uid()
    )
);
*/

-- Los usuarios pueden eliminar configuraciones de su propia tienda
CREATE POLICY "Users can delete their own store configs"
ON public.drive_configs
FOR DELETE
USING (true); -- Permitir todo por ahora - AJUSTAR SEGÚN TU ESQUEMA
/*
USING (
    id_tienda IN (
        SELECT id_tienda 
        FROM public.usuarios  -- CAMBIAR AL NOMBRE CORRECTO
        WHERE id = auth.uid()
    )
);
*/

-- Los admins pueden hacer todo (COMENTADO - DESCOMENTAR Y AJUSTAR SI NECESARIO)
/*
CREATE POLICY "Admins can manage all configs"
ON public.drive_configs
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.usuarios  -- CAMBIAR AL NOMBRE CORRECTO
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
*/

-- 8. Verificar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'drive_configs'
ORDER BY ordinal_position;

-- 9. Insertar datos de ejemplo (OPCIONAL - comentar si no quieres datos de prueba)
-- INSERT INTO public.drive_configs (id_tienda, mes, tipo_documento, drive_link) VALUES
-- (1, '2024-12', 'cierre_caja', 'https://drive.google.com/drive/folders/example1'),
-- (1, '2024-12', 'cierre_voucher', 'https://drive.google.com/drive/folders/example2'),
-- (1, '2024-12', 'consignaciones', 'https://drive.google.com/drive/folders/example3');

-- 10. Verificar que todo se creó correctamente
SELECT 
    table_name,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name IN ('drive_configs')
GROUP BY table_name;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'drive_configs';

