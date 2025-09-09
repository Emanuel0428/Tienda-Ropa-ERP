// Interfaces para la base de datos
export interface Usuario {
  id: string;
  id_usuario: number;
  nombre: string;
  rol: string;
  id_tienda: number | null;
}

export interface Tienda {
  id_tienda: number;
  nombre: string;
}

export interface AuditoriaDB {
  id_auditoria: bigint;
  id_tienda: number;
  id_auditor: string; // UUID
  fecha: string;
  quienes_reciben: string;
  calificacion_total: number;
  notas_personal: string;
  notas_campanas: string;
  notas_conclusiones: string;
  estado: 'en_progreso' | 'completada';
  created_at: string;
  updated_at: string;
}

// Tipos para los ítems y subcategorías
export type Calificacion = 0 | 100 | null;

export interface AuditItem {
  id: number;
  label: string;
  calificacion: Calificacion;
  novedad: string;
}

export interface Subcategoria {
  id: number;
  nombre: string;
  items: AuditItem[];
}

export interface Categoria {
  id: number;
  nombre: string;
  peso: number;
  subcategorias: Subcategoria[];
}

// Interfaces para el estado de la aplicación
export interface AuditInfo {
  id_tienda: string;
  quienes_reciben: string;
  fecha: string;
}

export interface ExtraNotes {
  personal: string;
  campanasTienda: string;
  conclusiones: string;
}

export interface UploadedImages {
  [key: string]: string[];
}
