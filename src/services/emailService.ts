import emailjs from '@emailjs/browser';

// Configuración de EmailJS desde variables de entorno
const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

// Validar que las variables de entorno estén configuradas
if (!EMAILJS_CONFIG.SERVICE_ID || !EMAILJS_CONFIG.TEMPLATE_ID || !EMAILJS_CONFIG.PUBLIC_KEY) {
  console.error('❌ Variables de entorno de EmailJS no configuradas. Revisa tu archivo .env');
  console.error('Necesitas: VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY');
}

// Inicializar EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export interface NotificacionAuditoria {
  auditoria_id: number;
  tienda_nombre: string;
  fecha_auditoria: string;
  calificacion_final: number;
  to_email: string;
  sistema_url?: string;
}

/**
 * Envía notificación por email cuando se completa una auditoría
 */
export const enviarNotificacionAuditoriaCompletada = async (
  datos: NotificacionAuditoria
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Enviando notificación de auditoría completada:', {
      auditoriaId: datos.auditoria_id,
      tienda: datos.tienda_nombre,
      email: datos.to_email,
      calificacion: datos.calificacion_final
    });

    // Preparar los parámetros del template
    const templateParams = {
      to_email: datos.to_email,
      auditoria_id: datos.auditoria_id.toString(),
      tienda_nombre: datos.tienda_nombre,
      fecha_auditoria: datos.fecha_auditoria,
      calificacion_final: datos.calificacion_final.toString(),
      sistema_url: datos.sistema_url || window.location.origin,
    };

    console.log('📋 Parámetros del template:', templateParams);

    // Enviar email usando EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email enviado exitosamente:', {
      status: response.status,
      text: response.text,
      auditoriaId: datos.auditoria_id
    });

    return { success: true };

  } catch (error: any) {
    console.error('❌ Error enviando email de auditoría:', {
      error: error.message || error,
      auditoriaId: datos.auditoria_id,
      email: datos.to_email
    });

    // Mensajes de error más específicos
    let mensajeError = 'Error inesperado al enviar email';
    
    if (error.status === 400) {
      mensajeError = 'Error en la configuración del template de email';
    } else if (error.status === 401) {
      mensajeError = 'Error de autenticación con el servicio de email';
    } else if (error.status === 403) {
      mensajeError = 'No tienes permisos para enviar emails';
    } else if (error.status === 413) {
      mensajeError = 'El contenido del email es demasiado grande';
    } else if (error.text && error.text.includes('network')) {
      mensajeError = 'Error de conexión. Verifica tu internet';
    }

    return { success: false, error: mensajeError };
  }
};

/**
 * Envía múltiples notificaciones a diferentes destinatarios
 */
export const enviarNotificacionesMultiples = async (
  datos: NotificacionAuditoria,
  destinatarios: string[]
): Promise<{ success: boolean; resultados: { email: string; enviado: boolean; error?: string }[] }> => {
  
  console.log('📧 Enviando notificaciones múltiples:', {
    auditoriaId: datos.auditoria_id,
    destinatarios: destinatarios.length,
    emails: destinatarios
  });

  const resultados: { email: string; enviado: boolean; error?: string }[] = [];

  for (const email of destinatarios) {
    try {
      const resultado = await enviarNotificacionAuditoriaCompletada({
        ...datos,
        to_email: email
      });

      resultados.push({
        email,
        enviado: resultado.success,
        error: resultado.error
      });

      // Pequeña pausa entre emails para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error(`❌ Error enviando a ${email}:`, error);
      resultados.push({
        email,
        enviado: false,
        error: error.message || 'Error inesperado'
      });
    }
  }

  const exitosos = resultados.filter(r => r.enviado).length;
  const fallidos = resultados.filter(r => !r.enviado).length;

  console.log('📊 Resumen de envío múltiple:', {
    total: destinatarios.length,
    exitosos,
    fallidos,
    auditoriaId: datos.auditoria_id
  });

  return {
    success: exitosos > 0,
    resultados
  };
};

/**
 * Valida un email antes de enviarlo
 */
export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Obtiene la configuración de emails de notificación
 * (esto se puede expandir para obtener desde la BD)
 */
export const obtenerDestinatariosNotificacion = (): string[] => {
  // Por ahora, emails hardcodeados. En el futuro se puede obtener de la BD
  return [
    'federicomi2004@gmail.com', // Email principal
    // Agregar más emails según necesidad:
    // 'supervisor@empresa.com',
    // 'gerencia@empresa.com'
  ];
};

/**
 * Formatea la fecha para el email
 */
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
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return new Date().toLocaleString('es-ES');
  }
};