-- Tablas para Sistema de Auditorías 2.0 con preguntas dinámicas y snapshot
-- Este archivo contiene la estructura mejorada para el sistema flexible de auditorías

-- Tabla para categorías principales (catálogo maestro)
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  peso INTEGER NOT NULL DEFAULT 10, -- Peso para el cálculo ponderado
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para subcategorías (catálogo maestro)
CREATE TABLE IF NOT EXISTS subcategorias (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para preguntas del catálogo maestro
CREATE TABLE IF NOT EXISTS preguntas (
  id SERIAL PRIMARY KEY,
  subcategoria_id INTEGER REFERENCES subcategorias(id) ON DELETE CASCADE,
  texto_pregunta TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla principal de auditorías
CREATE TABLE IF NOT EXISTS auditorias (
  id_auditoria SERIAL PRIMARY KEY,
  id_tienda INTEGER NOT NULL,
  id_auditor UUID REFERENCES auth.users(id),
  fecha DATE NOT NULL,
  quienes_reciben TEXT,
  observaciones TEXT,
  calificacion_total DECIMAL(5,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'en_progreso', -- 'en_progreso', 'completada', 'revisada'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para snapshot de preguntas por auditoría (copia las preguntas al momento de crear la auditoría)
CREATE TABLE IF NOT EXISTS auditoria_preguntas (
  id_auditoria_pregunta SERIAL PRIMARY KEY,
  id_auditoria INTEGER REFERENCES auditorias(id_auditoria) ON DELETE CASCADE,
  id_pregunta INTEGER REFERENCES preguntas(id), -- Referencia al catálogo original
  texto_pregunta TEXT NOT NULL, -- Snapshot del texto al momento de la auditoría
  id_categoria INTEGER NOT NULL,
  id_subcategoria INTEGER NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para respuestas de cada pregunta
CREATE TABLE IF NOT EXISTS respuestas (
  id_respuesta SERIAL PRIMARY KEY,
  id_auditoria_pregunta INTEGER REFERENCES auditoria_preguntas(id_auditoria_pregunta) ON DELETE CASCADE,
  respuesta BOOLEAN NOT NULL, -- true = Sí (100), false = No (0)
  comentario TEXT,
  accion_correctiva TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria ON subcategorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_subcategoria ON preguntas(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_preguntas_auditoria ON auditoria_preguntas(id_auditoria);
CREATE INDEX IF NOT EXISTS idx_auditoria_preguntas_categoria ON auditoria_preguntas(id_categoria);
CREATE INDEX IF NOT EXISTS idx_auditoria_preguntas_subcategoria ON auditoria_preguntas(id_subcategoria);
CREATE INDEX IF NOT EXISTS idx_respuestas_auditoria_pregunta ON respuestas(id_auditoria_pregunta);
CREATE INDEX IF NOT EXISTS idx_auditorias_tienda ON auditorias(id_tienda);
CREATE INDEX IF NOT EXISTS idx_auditorias_auditor ON auditorias(id_auditor);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_subcategorias_updated_at BEFORE UPDATE ON subcategorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_preguntas_updated_at BEFORE UPDATE ON preguntas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_auditorias_updated_at BEFORE UPDATE ON auditorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_respuestas_updated_at BEFORE UPDATE ON respuestas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar las categorías actuales con sus pesos
INSERT INTO categorias (id, nombre, peso, orden) VALUES
(1, 'ASEO', 10, 1),
(2, 'VISUAL', 11, 2),
(3, 'BODEGA', 11, 3),
(4, 'DINERO E INVENTARIO', 16, 4),
(5, 'CARPETAS Y TEMAS GENERALES', 10, 5),
(6, 'CELULAR Y FUNCIONES', 12, 6),
(7, 'CUMPLIMIENTO A PROCESOS COMERCIALES', 14, 7),
(8, 'INDICADORES', 16, 8);

-- Insertar subcategorías
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
(19, 8, 'MEDICIÓN REDES Y ESTADOS', 3);

-- Insertar todas las preguntas del sistema actual
INSERT INTO preguntas (subcategoria_id, texto_pregunta, orden) VALUES
-- ASEO LOCATIVO (subcategoria_id = 1)
(1, 'Antenas limpias', 1),
(1, 'El baffle limpio (si aplica)', 2),
(1, 'Punto de pago en orden, sin prendas, basura, todo en su lugar', 3),
(1, 'Ventiladores limpios (Hace cuanto los limpiaron)', 4),
(1, 'Vitrinas limpias (si aplica)', 5),

-- ASEO GENERAL TIENDA (subcategoria_id = 2)
(2, 'Maniquís limpios', 1),
(2, 'Los módulos y frontales limpios', 2),
(2, 'Aseo de andén y cortina (para las que aplique)', 3),
(2, 'Tienda en general (barrido, trapeado piso y escaleras)', 4),
(2, 'Los vestier sin ganchos, limpios (sillas y espejos)', 5),
(2, 'Paredes limpias (del vestier, Punto de pago y tienda en general)', 6),
(2, 'Baño limpio, con sus respectivos implementos de aseo', 7),
(2, 'Basura acumulada, o la están sacando los días correspondientes', 8),
(2, 'Bodega principal limpia', 9),

-- PUBLICIDAD (subcategoria_id = 3)
(3, 'Campaña del mes montado toda su publicidad POP', 1),
(3, 'Exhibición de la promoción (ubicación dentro de la tienda)', 2),
(3, 'Exhibiciones nuevas colecciones', 3),

-- EXHIBICIONES (subcategoria_id = 4)
(4, 'Engamado de los modulos', 1),
(4, 'Frontales organizados por talla y perfilados', 2),
(4, 'Áreas y perimetrales organizadas y surtidas', 3),
(4, 'Mesa de Bienvenida o muebles con su respectiva campaña', 4),
(4, 'Prendas vaporizadas', 5),
(4, 'Cuantas campañas hay activas', 6),
(4, 'Qué % de participación tiene cada campaña', 7),

-- VISUAL GENERAL (subcategoria_id = 5)
(5, 'Maniquís vestidos (confirmar último cambio)', 1),
(5, 'Música corporativa - Emisora con volumen adecuado', 2),
(5, 'Prendas del piso con su respectivo pin', 3),
(5, 'Prendas con averías o sucias en piso', 4),

-- GESTIÓN DE BODEGA (subcategoria_id = 6)
(6, 'Bodega organizada por referencias, tallas y cajas rotuladas', 1),
(6, 'Gestión de cajas nuevas sin organizar (Hace cuanto la tienen)', 2),
(6, 'Última vez que llegó mercancía y cuántas cajas', 3),
(6, 'Mercancía en caja organizada y separada', 4),

-- ORDEN DE BODEGA (subcategoria_id = 7)
(7, 'Bodega pequeña (si aplica) o bodega alterna - organizadas con rótulos', 1),
(7, 'Están organizadas las cajas de averías, negativos rotuladas y separadas', 2),

-- DINERO (subcategoria_id = 8)
(8, 'Arqueo de caja general $100.000', 1),
(8, 'Arqueo de caja menor físico vs bitácora', 2),
(8, 'Arqueo de caja fuerte vs bitácora', 3),
(8, 'Los sobrantes si están siendo reportados?', 4),

-- CONSIGNACIONES (subcategoria_id = 9)
(9, 'Sin el uniforme', 1),
(9, 'Organizan y cuentan el dinero en bodega', 2),
(9, 'Cumplen con el proceso de enviar foto como mínimo a la 1pm, 4pm y al momento del cierre', 3),
(9, 'Cumplen el proceso de enviar foto cada que se consigna?', 4),
(9, 'Consignan todos los días en bancolombia y davivienda?', 5),

-- INVENTARIO (subcategoria_id = 10)
(10, 'Están cumpliendo con la meta de aleatorios semanal? Cuánto llevan?', 1),
(10, 'Cuantos faltantes tienen validados por la administradora en lo que va del mes', 2),
(10, 'Están llenando a tiempo la planilla para su respectivo informe', 3),

-- ADMINISTRATIVAS (subcategoria_id = 11)
(11, 'Carpetas de cierre financiero y kardex organizado sin tachones', 1),
(11, 'Kardex actualizado con la información diaria, cuántas prendas tienen?', 2),
(11, 'Están reportando el kardex por los grupos?', 3),

-- GENERAL (subcategoria_id = 12)
(12, 'Están haciendo el arqueo de caja al medio día', 1),
(12, 'Última visita del jefe de zona (está yendo mes a mes)', 2),
(12, 'Última visita de la visual cada cuánto va?', 3),
(12, 'Están cumpliendo con los horarios establecidos', 4),
(12, 'Las antenas están funcionando, baking, luces, ventiladores etc.', 5),
(12, 'Tienen todos las pestañas abiertas en el computador de acuerdo al check list', 6),
(12, 'Están reportando apertura, cierre por el grupo de CHICAS', 7),
(12, 'Están revisando los bolsos al momento de cada salida?', 8),
(12, 'Bolsos, monederas o canguros dentro de la bodega?', 9),
(12, 'El personal está debidamente presentado con los lineamientos de la marca y GMCO', 10),
(12, 'Tienen la dotación completa? Hace cuánto se les cambió?', 11),

-- CELULAR PERSONAL (subcategoria_id = 13)
(13, 'Asesoras con sus celulares dentro de los bolsos en la bodega', 1),
(13, 'La administradora con su celular personal solo para su uso estrictamente laboral', 2),

-- CORPORATIVO (subcategoria_id = 14)
(14, 'Están subiendo estados diarios y a todas las plataformas?', 1),
(14, 'Uso del celular corporativo para temas laborales', 2),

-- SALUDO (subcategoria_id = 15)
(15, 'Saludo de bienvenida al cliente (buenos días, buenas tardes, en qué podemos asesor@r)', 1),
(15, 'Están ofreciendo la campaña/promo del mes', 2),
(15, 'Están ofreciendo el crédito?', 3),

-- ASESORÍA (subcategoria_id = 16)
(16, 'Asesoran bien al cliente con actitud y diligencia y estratégicamente para hacer venta complementaria', 1),
(16, 'Verificar que un cliente al pagar recaudo, le recuerden el cupo que tiene disponible, y las nuevas llegadas para que se antoje', 2),
(16, 'Revisar que estén despidiendo bien al cliente y no descuidarlo hasta el momento de salir de la tienda', 3),
(16, 'Amabilidad en el punto de pago y recordando el crédito al cierre de la tienda', 4),
(16, 'Se ofrece venta complementaria y venta cruzada', 5),

-- CONOCIMIENTO (subcategoria_id = 17)
(17, 'Tienen claro el presupuesto diario tanto venta como en crédito y de cada una?', 1),
(17, 'Tienen claro las comisiones semanales y concurso del mes', 2),
(17, 'Saben cuánto llevan de comisiones que se han ganado hasta la fecha?', 3),
(17, 'Tienen abierto y entienden el archivo de ESTADO SEMANAL', 4),
(17, 'Tienen claro los indicadores enviados a inicio de mes por gerencia', 5),

-- RESULTADOS (subcategoria_id = 18)
(18, 'Vamos cumpliendo el presupuesto del mes?', 1),
(18, 'Estamos en el Top 7 del concurso del mes?', 2),
(18, 'Vamos cumpliendo con el presupuesto de crédito del mes?', 3),
(18, 'Van cumpliendo el UPF?', 4),
(18, 'Van cumpliendo el VPF?', 5),
(18, 'Están llevando control en un cuaderno sobre los informes enviados por la marca y PPTOS', 6),

-- MEDICIÓN REDES Y ESTADOS (subcategoria_id = 19)
(19, 'Si están subiendo estados al whatsapp', 1),
(19, 'Tienen publicación diaria en Facebook e Instagram', 2),
(19, 'Cuántos estados subidos al día en IG-FB', 3),
(19, 'Gestión de respuestas en bandeja de mensajes de Whatsapp', 4),
(19, 'Están siendo creativas al momento de subir estados y publicaciones', 5),
(19, 'Gestión de respuestas en bandeja de mensajes de FB e IG y Whatsapp', 6);