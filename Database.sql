-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance_records (
  id integer NOT NULL DEFAULT nextval('attendance_records_id_seq'::regclass),
  id_usuario integer NOT NULL,
  id_tienda integer NOT NULL,
  check_in timestamp with time zone NOT NULL,
  check_out timestamp with time zone,
  wifi_verified boolean DEFAULT false,
  wifi_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT attendance_records_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.auditoria_fotos (
  tipo_foto text NOT NULL,
  url_foto text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id_auditoria_foto bigint NOT NULL DEFAULT nextval('auditoria_fotos_id_auditoria_foto_seq'::regclass),
  id_auditoria bigint NOT NULL,
  CONSTRAINT auditoria_fotos_pkey PRIMARY KEY (id_auditoria_foto),
  CONSTRAINT auditoria_fotos_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria)
);
CREATE TABLE public.auditoria_preguntas (
  id_auditoria_pregunta integer NOT NULL DEFAULT nextval('auditoria_preguntas_id_auditoria_pregunta_seq'::regclass),
  id_auditoria integer,
  id_pregunta integer,
  texto_pregunta text NOT NULL,
  id_categoria integer NOT NULL,
  id_subcategoria integer NOT NULL,
  orden integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auditoria_preguntas_pkey PRIMARY KEY (id_auditoria_pregunta),
  CONSTRAINT auditoria_preguntas_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria),
  CONSTRAINT auditoria_preguntas_id_pregunta_fkey FOREIGN KEY (id_pregunta) REFERENCES public.preguntas(id)
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
  id_auditoria bigint NOT NULL DEFAULT nextval('auditorias_id_auditoria_seq'::regclass),
  id_auditoria_custom text UNIQUE,
  observaciones text,
  CONSTRAINT auditorias_pkey PRIMARY KEY (id_auditoria),
  CONSTRAINT auditorias_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda),
  CONSTRAINT auditorias_id_auditor_fkey FOREIGN KEY (id_auditor) REFERENCES auth.users(id)
);
CREATE TABLE public.categorias (
  id integer NOT NULL DEFAULT nextval('categorias_id_seq'::regclass),
  nombre character varying NOT NULL,
  peso integer NOT NULL DEFAULT 10,
  orden integer NOT NULL DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.drive_configs (
  id integer NOT NULL DEFAULT nextval('drive_configs_id_seq'::regclass),
  id_tienda integer NOT NULL,
  mes character varying NOT NULL,
  tipo_documento character varying NOT NULL,
  drive_link text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drive_configs_pkey PRIMARY KEY (id),
  CONSTRAINT drive_configs_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.employee_schedules (
  id integer NOT NULL DEFAULT nextval('employee_schedules_id_seq'::regclass),
  id_usuario integer NOT NULL,
  id_tienda integer NOT NULL,
  schedule_date date NOT NULL,
  check_in_deadline time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,
  is_day_off boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT fk_employee_schedules_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT fk_employee_schedules_tienda FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
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
CREATE TABLE public.preguntas (
  id integer NOT NULL DEFAULT nextval('preguntas_id_seq'::regclass),
  subcategoria_id integer,
  texto_pregunta text NOT NULL,
  orden integer NOT NULL DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preguntas_pkey PRIMARY KEY (id),
  CONSTRAINT preguntas_subcategoria_id_fkey FOREIGN KEY (subcategoria_id) REFERENCES public.subcategorias(id)
);
CREATE TABLE public.preguntas_eliminadas (
  id_pregunta_eliminada integer NOT NULL DEFAULT nextval('preguntas_eliminadas_id_seq'::regclass),
  id_auditoria integer NOT NULL,
  id_pregunta integer NOT NULL,
  eliminado_por uuid,
  motivo text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preguntas_eliminadas_pkey PRIMARY KEY (id_pregunta_eliminada),
  CONSTRAINT preguntas_eliminadas_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria),
  CONSTRAINT preguntas_eliminadas_id_pregunta_fkey FOREIGN KEY (id_pregunta) REFERENCES public.preguntas(id),
  CONSTRAINT preguntas_eliminadas_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.preguntas_variables (
  id_pregunta_variable integer NOT NULL DEFAULT nextval('preguntas_variables_id_seq'::regclass),
  id_auditoria integer NOT NULL,
  id_subcategoria integer NOT NULL,
  texto_pregunta text NOT NULL,
  orden integer NOT NULL DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preguntas_variables_pkey PRIMARY KEY (id_pregunta_variable),
  CONSTRAINT preguntas_variables_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditorias(id_auditoria),
  CONSTRAINT preguntas_variables_id_subcategoria_fkey FOREIGN KEY (id_subcategoria) REFERENCES public.subcategorias(id)
);
CREATE TABLE public.respuestas (
  id_respuesta integer NOT NULL DEFAULT nextval('respuestas_id_respuesta_seq'::regclass),
  id_auditoria_pregunta integer,
  respuesta boolean NOT NULL,
  comentario text,
  accion_correctiva text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT respuestas_pkey PRIMARY KEY (id_respuesta),
  CONSTRAINT respuestas_id_auditoria_pregunta_fkey FOREIGN KEY (id_auditoria_pregunta) REFERENCES public.auditoria_preguntas(id_auditoria_pregunta)
);
CREATE TABLE public.schedule_templates (
  id integer NOT NULL DEFAULT nextval('schedule_templates_id_seq'::regclass),
  id_usuario integer,
  id_tienda integer,
  template_name character varying NOT NULL,
  is_rotating_template boolean DEFAULT false,
  week_number integer CHECK (week_number = ANY (ARRAY[1, 2])),
  target_role character varying CHECK (target_role::text = ANY (ARRAY['admin'::character varying, 'coordinador'::character varying, 'administradora'::character varying, 'asesora'::character varying]::text[])),
  monday_time time without time zone,
  monday_is_off boolean DEFAULT false,
  tuesday_time time without time zone,
  tuesday_is_off boolean DEFAULT false,
  wednesday_time time without time zone,
  wednesday_is_off boolean DEFAULT false,
  thursday_time time without time zone,
  thursday_is_off boolean DEFAULT false,
  friday_time time without time zone,
  friday_is_off boolean DEFAULT false,
  saturday_time time without time zone,
  saturday_is_off boolean DEFAULT false,
  sunday_time time without time zone,
  sunday_is_off boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schedule_templates_pkey PRIMARY KEY (id),
  CONSTRAINT fk_schedule_templates_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT fk_schedule_templates_tienda FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.store_schedules (
  id integer NOT NULL DEFAULT nextval('store_schedules_id_seq'::regclass),
  id_tienda integer NOT NULL UNIQUE,
  check_in_deadline time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,
  expected_wifi_name text,
  notification_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  latitude double precision,
  longitude double precision,
  location_radius_meters integer DEFAULT 100,
  monday_check_in_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
  tuesday_check_in_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
  wednesday_check_in_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
  thursday_check_in_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
  friday_check_in_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
  saturday_check_in_deadline time without time zone DEFAULT '10:00:00'::time without time zone,
  sunday_check_in_deadline time without time zone DEFAULT '10:00:00'::time without time zone,
  CONSTRAINT store_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT store_schedules_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
);
CREATE TABLE public.subcategorias (
  id integer NOT NULL DEFAULT nextval('subcategorias_id_seq'::regclass),
  categoria_id integer,
  nombre character varying NOT NULL,
  orden integer NOT NULL DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcategorias_pkey PRIMARY KEY (id),
  CONSTRAINT subcategorias_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
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
  CONSTRAINT tareas_asignadas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT tareas_asignadas_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tiendas(id_tienda)
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
  telefono character varying,
  zona character varying CHECK (zona::text = ANY (ARRAY['norte'::character varying, 'sur'::character varying]::text[])),
  CONSTRAINT tiendas_pkey PRIMARY KEY (id_tienda),
  CONSTRAINT tiendas_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT tiendas_id_asesora_fkey FOREIGN KEY (id_asesora) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.usuarios (
  id_usuario integer NOT NULL DEFAULT nextval('usuarios_id_usuario_seq'::regclass),
  nombre character varying NOT NULL,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'coordinador'::character varying, 'administradora'::character varying, 'asesora'::character varying, 'auditor'::character varying, 'gerencia'::character varying]::text[])),
  id_tienda integer,
  fecha_nacimiento date,
  celular character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  id uuid DEFAULT auth.uid(),
  avatar_url text,
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