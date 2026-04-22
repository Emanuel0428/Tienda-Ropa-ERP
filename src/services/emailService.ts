import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';

const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export interface CategoriaResumen {
  nombre: string;
  peso: number;
  calificacion: number;
  porcentaje: number;
  preguntas_total: number;
  preguntas_aprobadas: number;
  preguntas_reprobadas: number;
}

export interface FotoResumen {
  tipo: string;
  cantidad: number;
  urls?: string[];
}

export interface NotificacionAuditoria {
  auditoria_id: number;
  tienda_nombre: string;
  fecha_auditoria: string;
  calificacion_final: number;
  to_email: string;
  sistema_url?: string;
  categorias: CategoriaResumen[];
  fotos: FotoResumen[];
  comentarios_generales?: string;
  observaciones?: string;
  total_preguntas: number;
  preguntas_aprobadas: number;
  preguntas_reprobadas: number;
  auditor?: string;
  notas_personal?: string;
  notas_campanas?: string;
  notas_conclusiones?: string;
}

const generarResumenCategorias = (categorias: CategoriaResumen[]): string => {
  if (!categorias || categorias.length === 0) return 'Sin información de categorías.';
  return categorias
    .map(c => `• ${c.nombre}: ${c.porcentaje.toFixed(1)}% (${c.preguntas_aprobadas}✓ / ${c.preguntas_reprobadas}✗)`)
    .join('\n');
};

const generarResumenFotos = (fotos: FotoResumen[]): string => {
  if (!fotos || fotos.length === 0) return 'Sin información de fotos.';
  const completas = fotos.filter(f => f.cantidad > 0);
  const faltantes = fotos.filter(f => f.cantidad === 0);
  const total = fotos.reduce((sum, f) => sum + f.cantidad, 0);
  const lineas = [`Total: ${total} foto(s) • ${completas.length} tipos completos • ${faltantes.length} tipos faltantes`];
  if (faltantes.length > 0) {
    lineas.push(`Faltantes: ${faltantes.map(f => f.tipo).join(', ')}`);
  }
  return lineas.join('\n');
};

export const enviarNotificacionAuditoriaCompletada = async (
  datos: NotificacionAuditoria
): Promise<{ success: boolean; error?: string }> => {
  try {
    const templateParams = {
      to_email: datos.to_email,
      auditoria_id: datos.auditoria_id.toString(),
      tienda_nombre: datos.tienda_nombre,
      fecha_auditoria: datos.fecha_auditoria,
      calificacion_final: datos.calificacion_final.toString(),
      auditor: datos.auditor || 'Sistema',
      sistema_url: datos.sistema_url || 'https://tienda-ropa-erp.vercel.app',
      total_preguntas: datos.total_preguntas.toString(),
      preguntas_aprobadas: datos.preguntas_aprobadas.toString(),
      preguntas_reprobadas: datos.preguntas_reprobadas.toString(),
      categorias_html: generarResumenCategorias(datos.categorias),
      fotos_html: generarResumenFotos(datos.fotos),
      notas_personal: datos.notas_personal || 'Sin notas.',
      notas_campanas: datos.notas_campanas || 'Sin notas.',
      notas_conclusiones: datos.notas_conclusiones || 'Sin conclusiones.',
      observaciones: datos.observaciones || 'Sin observaciones.',
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    if (response.status !== 200) {
      return { success: false, error: `EmailJS respondió con status ${response.status}` };
    }

    return { success: true };

  } catch (error: any) {
    const esErrorRed = error instanceof TypeError && error.message.includes('fetch');
    let mensajeError = esErrorRed
      ? 'Sin conexión — el correo no se envió pero la auditoría quedó guardada'
      : 'Error inesperado al enviar email';

    if (!esErrorRed) {
      if (error.status === 400) mensajeError = 'Configuración del template inválida';
      else if (error.status === 401) mensajeError = 'Clave pública de EmailJS incorrecta';
      else if (error.status === 403) mensajeError = 'Sin permisos para enviar emails';
      else if (error.status === 412) mensajeError = 'Precondición fallida — verifica el template ID y service ID';
      else if (error.status === 413) mensajeError = 'Contenido del email demasiado grande';
    }

    console.warn('Email no enviado:', mensajeError, { auditoriaId: datos.auditoria_id });
    return { success: false, error: mensajeError };
  }
};

export const enviarNotificacionesMultiples = async (
  datos: NotificacionAuditoria,
  destinatarios: string[]
): Promise<{ success: boolean; resultados: { email: string; enviado: boolean; error?: string }[] }> => {
  const resultados: { email: string; enviado: boolean; error?: string }[] = [];

  for (const email of destinatarios) {
    const resultado = await enviarNotificacionAuditoriaCompletada({ ...datos, to_email: email });
    resultados.push({ email, enviado: resultado.success, error: resultado.error });
    if (destinatarios.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    success: resultados.some(r => r.enviado),
    resultados
  };
};

export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const obtenerDestinatariosNotificacion = (): string[] => {
  return ['federicomi2004@gmail.com'];
};

export const obtenerEmailsEmpleadasTienda = async (idTienda: number): Promise<string[]> => {
  const { data, error } = await supabase
    .rpc('get_empleadas_tienda', { p_id_tienda: idTienda });

  if (error) {
    console.error('Error obteniendo emails de empleadas:', error);
    return [];
  }

  return (data as { email: string; nombre: string }[] | null)
    ?.map(d => d.email)
    .filter(Boolean) ?? [];
};

export const formatearFechaEmail = (fecha: string | Date): string => {
  try {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  } catch {
    return new Date().toLocaleString('es-ES');
  }
};
