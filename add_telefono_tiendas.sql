-- Migración: Agregar campo telefono a la tabla tiendas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS telefono character varying(20);

COMMENT ON COLUMN public.tiendas.telefono IS 'Número de celular o teléfono de la tienda';
