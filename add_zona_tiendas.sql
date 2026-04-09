-- Agrega la columna zona a la tabla tiendas
-- Valores permitidos: 'norte' o 'sur'
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS zona character varying(10)
  CHECK (zona IN ('norte', 'sur'));

-- Luego asignar la zona a cada tienda manualmente, por ejemplo:
-- UPDATE public.tiendas SET zona = 'norte' WHERE nombre = 'Tienda Centro';
-- UPDATE public.tiendas SET zona = 'sur'   WHERE nombre = 'Tienda Sur';
