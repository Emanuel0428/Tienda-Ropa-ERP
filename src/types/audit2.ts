// Tipos para Sistema de Auditorías 2.0
// Tipos que coinciden con la estructura de BD actualizada

export interface Categoria {
  id: number;
  nombre: string;
  peso: number;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pregunta {
  id: number;
  subcategoria_id: number;
  texto_pregunta: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Auditoria {
  id_auditoria: number;
  id_tienda: number;
  id_auditor: string;
  fecha: string;
  quienes_reciben?: string;
  observaciones?: string;
  calificacion_total: number;
  estado: 'en_progreso' | 'completada' | 'revisada';
  created_at: string;
  updated_at: string;
}

export interface AuditoriaPregunta {
  id_auditoria_pregunta: number;
  id_auditoria: number;
  id_pregunta: number;
  texto_pregunta: string; // Snapshot del texto al momento de la auditoría
  id_categoria: number;
  id_subcategoria: number;
  orden: number;
  created_at: string;
}

export interface Respuesta {
  id_respuesta: number;
  id_auditoria_pregunta: number;
  respuesta: boolean; // true = Sí (100), false = No (0)
  comentario?: string;
  accion_correctiva?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para la UI y manejo de datos
export interface CategoriaConSubcategorias extends Categoria {
  subcategorias: SubcategoriaConPreguntas[];
}

export interface SubcategoriaConPreguntas extends Subcategoria {
  preguntas: PreguntaConRespuesta[];
}

export interface PreguntaConRespuesta extends AuditoriaPregunta {
  respuesta?: Respuesta;
  // Campos temporales para la UI
  respuesta_temp?: boolean;
  comentario_temp?: string;
  accion_correctiva_temp?: string;
}

// Tipos para formularios
export interface FormularioAuditoria {
  id_tienda: string;
  fecha: string;
  quienes_reciben: string;
  observaciones?: string;
}

// Tipos para estadísticas y resumen
export interface ResumenAuditoria {
  total_preguntas: number;
  preguntas_respondidas: number;
  preguntas_aprobadas: number;
  preguntas_reprobadas: number;
  calificacion_total_ponderada: number;
  categorias_resumen: ResumenCategoria[];
}

export interface ResumenCategoria {
  categoria_id: number;
  categoria_nombre: string;
  peso_categoria: number;
  total_preguntas: number;
  preguntas_aprobadas: number;
  porcentaje_cumplimiento: number;
  contribucion_ponderada: number; // porcentaje * peso
}

// Tipos para la gestión de preguntas en el catálogo maestro
export interface NuevaPregunta {
  subcategoria_id: number;
  texto_pregunta: string;
  orden: number;
}

export interface EditarPregunta extends NuevaPregunta {
  id: number;
}

// Tipos para respuestas del auditor
export interface NuevaRespuesta {
  id_auditoria_pregunta: number;
  respuesta: boolean;
  comentario?: string;
  accion_correctiva?: string;
}

export interface EditarRespuesta extends NuevaRespuesta {
  id_respuesta: number;
}

// Tipo para el payload completo de una auditoría al guardar
export interface GuardarAuditoriaPayload {
  auditoria: FormularioAuditoria;
  respuestas: {
    [id_auditoria_pregunta: number]: {
      respuesta: boolean;
      comentario?: string;
      accion_correctiva?: string;
    }
  };
}

// Tipo para la vista completa de una auditoría con todas sus respuestas
export interface AuditoriaCompleta extends Auditoria {
  categorias: CategoriaCompletaAuditoria[];
}

export interface CategoriaCompletaAuditoria extends Categoria {
  subcategorias: SubcategoriaCompletaAuditoria[];
}

export interface SubcategoriaCompletaAuditoria extends Subcategoria {
  preguntas: PreguntaCompletaAuditoria[];
}

export interface PreguntaCompletaAuditoria extends AuditoriaPregunta {
  respuesta?: Respuesta;
}