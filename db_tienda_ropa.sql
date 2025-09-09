-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auditoria_categorias (
  nombre_categoria text NOT NULL,
  peso integer NOT NULL,
  promedio numeric,
  created_at timestamp with time zone DEFAULT now(),
  id_auditoria_categoria bigint NOT NULL DEFAULT nextval('auditoria_categorias_id_seq'::regclass),
  id_auditoria bigint NOT NULL,
  CONSTRAINT auditoria_categorias_pkey PRIMARY KEY (id_auditoria_categoria),
  CONSTRAINT auditoria_categorias_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria)
);
CREATE TABLE public.auditoria_fotos (
  tipo_foto text NOT NULL,
  url_foto text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id_auditoria_foto bigint NOT NULL,
  id_auditoria bigint NOT NULL,
  CONSTRAINT auditoria_fotos_pkey PRIMARY KEY (id_auditoria_foto),
  CONSTRAINT auditoria_fotos_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria)
);
CREATE TABLE public.auditoria_items (
  item_label text NOT NULL,
  calificacion integer CHECK (calificacion = ANY (ARRAY[0, 100])),
  novedad text,
  created_at timestamp with time zone DEFAULT now(),
  id_auditoria_item bigint NOT NULL DEFAULT nextval('auditoria_items_id_seq'::regclass),
  id_auditoria_subcategoria bigint NOT NULL,
  CONSTRAINT auditoria_items_pkey PRIMARY KEY (id_auditoria_item),
  CONSTRAINT auditoria_items_id_auditoria_subcategoria_fkey FOREIGN KEY (id_auditoria_subcategoria) REFERENCES public.auditoria_subcategorias(id_auditoria_subcategoria)
);
CREATE TABLE public.auditoria_subcategorias (
  nombre_subcategoria text NOT NULL,
  promedio numeric,
  created_at timestamp with time zone DEFAULT now(),
  id_auditoria_subcategoria bigint NOT NULL DEFAULT nextval('auditoria_subcategorias_id_seq'::regclass),
  id_auditoria_categoria bigint NOT NULL,
  CONSTRAINT auditoria_subcategorias_pkey PRIMARY KEY (id_auditoria_subcategoria),
  CONSTRAINT auditoria_subcategorias_id_auditoria_categoria_fkey FOREIGN KEY (id_auditoria_categoria) REFERENCES public.auditoria_categorias(id_auditoria_categoria)
);
CREATE TABLE public.auditorias (
  id_tienda integer,
  id_auditor uuid,
  fecha date NOT NULL,
  quienes_reciben text NOT NULL,
  calificacion_total numeric,
  notas_personal text,
  notas_campanas text,
  notas_conclusiones text,
  estado text DEFAULT 'en_progreso'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id_auditoria bigint NOT NULL DEFAULT nextval('auditoria_id_seq'::regclass),
  CONSTRAINT auditorias_pkey PRIMARY KEY (id_auditoria),
  CONSTRAINT auditorias_id_auditor_fkey FOREIGN KEY (id_auditor) REFERENCES auth.users(id),
  CONSTRAINT auditorias_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.inventario (
  id_inv integer NOT NULL DEFAULT nextval('inventario_id_inv_seq'::regclass),
  id_tienda integer NOT NULL,
  codigo character varying NOT NULL,
  producto character varying NOT NULL,
  categoria character varying,
  talla character varying,
  ubicacion character varying,
  stock integer DEFAULT 0,
  scaneados integer DEFAULT 0,
  CONSTRAINT inventario_pkey PRIMARY KEY (id_inv),
  CONSTRAINT inventario_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.tareas (
  id_tarea integer NOT NULL DEFAULT nextval('tareas_id_tarea_seq'::regclass),
  titulo character varying NOT NULL,
  descripcion text,
  frecuencia character varying CHECK (frecuencia::text = ANY (ARRAY['diaria'::character varying, 'semanal'::character varying, 'mensual'::character varying]::text[])),
  CONSTRAINT tareas_pkey PRIMARY KEY (id_tarea)
);
CREATE TABLE public.tareas_asignadas (
  id_ta integer NOT NULL DEFAULT nextval('tareas_asignadas_id_ta_seq'::regclass),
  id_tarea integer NOT NULL,
  id_usuario integer NOT NULL,
  id_tienda integer NOT NULL,
  fecha date NOT NULL,
  completada boolean DEFAULT false,
  evidencia text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tareas_asignadas_pkey PRIMARY KEY (id_ta),
  CONSTRAINT tareas_asignadas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES public.tareas(id_tarea),
  CONSTRAINT tareas_asignadas_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda),
  CONSTRAINT tareas_asignadas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.tiendas (
  id_tienda integer NOT NULL DEFAULT nextval('tiendas_id_tienda_seq'::regclass),
  nombre character varying NOT NULL,
  direccion character varying,
  ciudad character varying,
  id_admin integer,
  id_asesora integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  meta_mensual numeric DEFAULT 0,
  CONSTRAINT tiendas_pkey PRIMARY KEY (id_tienda),
  CONSTRAINT tiendas_id_asesora_fkey FOREIGN KEY (id_asesora) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT tiendas_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.usuarios (
  id_usuario integer NOT NULL DEFAULT nextval('usuarios_id_usuario_seq'::regclass),
  nombre character varying NOT NULL,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'coordinador'::character varying, 'asesora'::character varying, 'auditor'::character varying]::text[])),
  id_tienda integer,
  fecha_nacimiento date,
  celular character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  id uuid DEFAULT auth.uid(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ventas (
  id_venta integer NOT NULL DEFAULT nextval('ventas_id_venta_seq'::regclass),
  id_tienda integer NOT NULL,
  fecha date NOT NULL,
  creditos numeric DEFAULT 0,
  pago_tarjeta numeric DEFAULT 0,
  pago_qr numeric DEFAULT 0,
  efectivo numeric DEFAULT 0,
  abonos numeric DEFAULT 0,
  facturas integer DEFAULT 0,
  prendas integer DEFAULT 0,
  total numeric NOT NULL,
  presupuesto numeric,
  CONSTRAINT ventas_pkey PRIMARY KEY (id_venta),
  CONSTRAINT ventas_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);