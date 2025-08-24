-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auditoria_fotos (
  id_auditoria integer NOT NULL,
  url_foto text NOT NULL,
  id_foto integer NOT NULL DEFAULT nextval('auditoria_fotos_id_foto_seq'::regclass),
  CONSTRAINT auditoria_fotos_pkey PRIMARY KEY (id_foto),
  CONSTRAINT auditoria_fotos_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria)
);
CREATE TABLE public.auditoria_subcategorias (
  id_auditoria integer NOT NULL,
  nombre_subcategoria character varying NOT NULL,
  calificacion numeric NOT NULL,
  id_subcategoria integer NOT NULL DEFAULT nextval('auditoria_subcategorias_id_subcategoria_seq'::regclass),
  CONSTRAINT auditoria_subcategorias_pkey PRIMARY KEY (id_subcategoria),
  CONSTRAINT auditoria_subcategorias_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria)
);
CREATE TABLE public.auditorias (
  id_auditor integer NOT NULL,
  id_responsable integer NOT NULL,
  id_tienda integer NOT NULL,
  fecha date NOT NULL,
  calificacion_general numeric,
  comentarios text,
  id_auditoria integer NOT NULL DEFAULT nextval('auditorias_id_auditoria_seq'::regclass),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auditorias_pkey PRIMARY KEY (id_auditoria),
  CONSTRAINT auditorias_id_auditor_fkey FOREIGN KEY (id_auditor) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT auditorias_id_responsable_fkey FOREIGN KEY (id_responsable) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT auditorias_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.inventario (
  id_tienda integer NOT NULL,
  codigo character varying NOT NULL,
  producto character varying NOT NULL,
  categoria character varying,
  talla character varying,
  ubicacion character varying,
  id_inv integer NOT NULL DEFAULT nextval('inventario_id_inv_seq'::regclass),
  stock integer DEFAULT 0,
  scaneados integer DEFAULT 0,
  CONSTRAINT inventario_pkey PRIMARY KEY (id_inv),
  CONSTRAINT inventario_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.tareas (
  titulo character varying NOT NULL,
  descripcion text,
  frecuencia character varying CHECK (frecuencia::text = ANY (ARRAY['diaria'::character varying, 'semanal'::character varying, 'mensual'::character varying]::text[])),
  id_tarea integer NOT NULL DEFAULT nextval('tareas_id_tarea_seq'::regclass),
  CONSTRAINT tareas_pkey PRIMARY KEY (id_tarea)
);
CREATE TABLE public.tareas_asignadas (
  id_tarea integer NOT NULL,
  id_usuario integer NOT NULL,
  id_tienda integer NOT NULL,
  fecha date NOT NULL,
  evidencia text,
  id_ta integer NOT NULL DEFAULT nextval('tareas_asignadas_id_ta_seq'::regclass),
  completada boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tareas_asignadas_pkey PRIMARY KEY (id_ta),
  CONSTRAINT tareas_asignadas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES public.tareas(id_tarea),
  CONSTRAINT tareas_asignadas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT tareas_asignadas_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.tiendas (
  nombre character varying NOT NULL,
  direccion character varying,
  ciudad character varying,
  id_admin integer,
  id_asesora integer,
  id_tienda integer NOT NULL DEFAULT nextval('tiendas_id_tienda_seq'::regclass),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tiendas_pkey PRIMARY KEY (id_tienda),
  CONSTRAINT tiendas_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT tiendas_id_asesora_fkey FOREIGN KEY (id_asesora) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.usuarios (
  id uuid DEFAULT auth.uid(),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  nombre character varying NOT NULL,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'coordinador'::character varying, 'asesora'::character varying, 'auditor'::character varying]::text[])),
  id_tienda integer,
  fecha_nacimiento date,
  celular character varying,
  id_usuario integer NOT NULL DEFAULT nextval('usuarios_id_usuario_seq'::regclass),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ventas (
  id_tienda integer NOT NULL,
  fecha date NOT NULL,
  total numeric NOT NULL,
  presupuesto numeric,
  id_venta integer NOT NULL DEFAULT nextval('ventas_id_venta_seq'::regclass),
  creditos numeric DEFAULT 0,
  pago_tarjeta numeric DEFAULT 0,
  pago_qr numeric DEFAULT 0,
  efectivo numeric DEFAULT 0,
  abonos numeric DEFAULT 0,
  facturas integer DEFAULT 0,
  prendas integer DEFAULT 0,
  CONSTRAINT ventas_pkey PRIMARY KEY (id_venta),
  CONSTRAINT ventas_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);