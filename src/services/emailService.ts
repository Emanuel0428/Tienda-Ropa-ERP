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
  
  // Información detallada
  categorias: CategoriaResumen[];
  fotos: FotoResumen[];
  comentarios_generales?: string;
  observaciones?: string;
  total_preguntas: number;
  preguntas_aprobadas: number;
  preguntas_reprobadas: number;
  auditor?: string;
  
  // Campos específicos de la base de datos
  notas_personal?: string;
  notas_campanas?: string;
  notas_conclusiones?: string;
}

/**
 * Envía notificación por email cuando se completa una auditoría
 */
export const enviarNotificacionAuditoriaCompletada = async (
  datos: NotificacionAuditoria
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 === INICIO ENVÍO NOTIFICACIÓN AUDITORÍA ===');
    console.log('📋 Datos recibidos completos:', {
      auditoria_id: datos.auditoria_id,
      tienda_nombre: datos.tienda_nombre,
      to_email: datos.to_email,
      calificacion_final: datos.calificacion_final,
      auditor: datos.auditor,
      total_preguntas: datos.total_preguntas,
      preguntas_aprobadas: datos.preguntas_aprobadas,
      preguntas_reprobadas: datos.preguntas_reprobadas,
      categorias_length: datos.categorias?.length || 0,
      fotos_length: datos.fotos?.length || 0,
      comentarios_generales: datos.comentarios_generales || 'No hay',
      observaciones: datos.observaciones || 'No hay'
    });
    
    if (datos.categorias && datos.categorias.length > 0) {
      console.log('📊 Categorías recibidas:', datos.categorias.map(cat => 
        `${cat.nombre}: ${cat.porcentaje}% (${cat.preguntas_aprobadas}/${cat.preguntas_aprobadas + cat.preguntas_reprobadas})`
      ));
    }
    
    if (datos.fotos && datos.fotos.length > 0) {
      console.log('📸 Fotos recibidas:', datos.fotos.map(foto => 
        `${foto.tipo}: ${foto.cantidad} foto(s)`
      ));
    }

    // Preparar los parámetros del template con información detallada y valores por defecto seguros
    const templateParams = {
      // Información básica (con validación)
      to_email: datos.to_email || 'no-email@ejemplo.com',
      auditoria_id: (datos.auditoria_id || 0).toString(),
      tienda_nombre: datos.tienda_nombre || 'Tienda No Especificada',
      fecha_auditoria: datos.fecha_auditoria || new Date().toLocaleDateString('es-ES'),
      calificacion_final: (datos.calificacion_final || 0).toString(),
      sistema_url: datos.sistema_url || window.location.origin || 'https://mi-sistema.com',
      
      // Información detallada (con valores seguros)
      total_preguntas: (datos.total_preguntas || 0).toString(),
      preguntas_aprobadas: (datos.preguntas_aprobadas || 0).toString(),
      preguntas_reprobadas: (datos.preguntas_reprobadas || 0).toString(),
      comentarios_generales: datos.comentarios_generales || 'No hay comentarios adicionales.',
      observaciones: datos.observaciones || 'No hay observaciones.',
      auditor: datos.auditor || 'Sistema Automático',
      
      // Categorías (con validación robusta)
      categorias_json: JSON.stringify(datos.categorias || []),
      categorias_html: datos.categorias?.length > 0 ? generarHTMLCategorias(datos.categorias) : '<p>No hay información de categorías disponible.</p>',
      categorias_texto: datos.categorias?.length > 0 ? generarTextoCategorias(datos.categorias) : 'No hay información de categorías disponible.',
      
      // Notas específicas de la base de datos
      notas_personal: datos.notas_personal || 'No hay notas del personal registradas.',
      notas_campanas: datos.notas_campanas || 'No hay notas específicas sobre campañas.',
      notas_conclusiones: datos.notas_conclusiones || 'No hay conclusiones finales registradas.',
      
      // Fotos (con validación robusta)
      fotos_json: JSON.stringify(datos.fotos || []),
      fotos_html: datos.fotos?.length > 0 ? generarHTMLFotos(datos.fotos) : '<p>No hay información de fotos disponible.</p>',
      total_fotos: (datos.fotos?.reduce((total, foto) => total + (foto.cantidad || 0), 0) || 0).toString(),
    };

    // Validación de parámetros críticos antes del envío
    const parametrosCriticos = ['to_email', 'tienda_nombre', 'auditor', 'fecha_auditoria', 'calificacion_final'];
    const parametrosInvalidos = parametrosCriticos.filter(param => 
      !templateParams[param as keyof typeof templateParams] || 
      templateParams[param as keyof typeof templateParams] === 'undefined' ||
      templateParams[param as keyof typeof templateParams] === 'null'
    );

    if (parametrosInvalidos.length > 0) {
      console.error('❌ Parámetros inválidos detectados:', parametrosInvalidos);
      throw new Error(`Parámetros inválidos: ${parametrosInvalidos.join(', ')}`);
    }

    // Log específico del contenido para debugging
    console.log('🎨 VALIDACIÓN EXITOSA - Enviando email con:');
    console.log('📧 Email destino:', templateParams.to_email);
    console.log('🏪 Tienda:', templateParams.tienda_nombre);
    console.log('👤 Auditor:', templateParams.auditor);
    console.log('📅 Fecha:', templateParams.fecha_auditoria);
    console.log('🎯 Calificación:', templateParams.calificacion_final + '%');
    console.log('📊 Categorías:', datos.categorias?.length || 0, 'encontradas');
    console.log('📸 Fotos:', datos.fotos?.length || 0, 'tipos encontrados');

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



/**
 * Genera texto plano para mostrar categorías en el email (fallback)
 */
const generarTextoCategorias = (categorias: CategoriaResumen[]): string => {
  console.log('📝 Generando texto plano para categorías:', categorias?.length || 0, 'categorías');
  
  if (!categorias || categorias.length === 0) {
    return 'No hay información de categorías disponible.';
  }

  try {
    const lineasTexto = categorias.map((categoria, index) => {
      // Validar que la categoría tenga las propiedades necesarias
      const nombre = categoria?.nombre || `Categoría ${index + 1}`;
      const porcentaje = categoria?.porcentaje || 0;
      const aprobadas = categoria?.preguntas_aprobadas || 0;
      const reprobadas = categoria?.preguntas_reprobadas || 0;
      const peso = categoria?.peso || 0;
      
      console.log(`📄 Procesando categoría ${index + 1}: ${nombre} - ${porcentaje.toFixed(1)}%`);
      return `${nombre}: ${porcentaje.toFixed(1)}% (${aprobadas}/${aprobadas + reprobadas}) - Peso: ${peso}%`;
    }).join('\n');

    return `RESULTADOS POR CATEGORÍA:\n\n${lineasTexto}`;
  } catch (error) {
    console.error('Error generando texto de categorías:', error);
    return 'Error al procesar información de categorías.';
  }
};

/**
 * Genera HTML para mostrar categorías en el email
 */
const generarHTMLCategorias = (categorias: CategoriaResumen[]): string => {
  console.log('🎨 Generando HTML para categorías:', categorias?.length || 0, 'categorías');
  
  if (!categorias || categorias.length === 0) {
    return '<p style="color: #666; font-style: italic; padding: 20px; text-align: center;">No hay información de categorías disponible.</p>';
  }

  try {
    const filasHTML = categorias.map((categoria, index) => {
      // Validar propiedades con valores por defecto
      const nombre = categoria?.nombre || `Categoría ${index + 1}`;
      const porcentaje = categoria?.porcentaje || 0;
      const aprobadas = categoria?.preguntas_aprobadas || 0;
      const reprobadas = categoria?.preguntas_reprobadas || 0;
      const peso = categoria?.peso || 0;
      
      const colorPorcentaje = porcentaje >= 80 ? '#10B981' : 
                             porcentaje >= 60 ? '#F59E0B' : '#EF4444';
      
      console.log(`🏷️ Generando fila para categoría ${index + 1}: ${nombre} - ${porcentaje.toFixed(1)}%`);
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 15px 12px; font-weight: 600; color: #1f2937; font-size: 14px;">${nombre}</td>
          <td style="padding: 15px 12px; text-align: center; color: ${colorPorcentaje}; font-weight: bold; font-size: 16px;">${porcentaje.toFixed(1)}%</td>
          <td style="padding: 15px 12px; text-align: center; color: #10b981; font-weight: 600; font-size: 14px;">${aprobadas}</td>
          <td style="padding: 15px 12px; text-align: center; color: #ef4444; font-weight: 600; font-size: 14px;">${reprobadas}</td>
          <td style="padding: 15px 12px; text-align: center; color: #6b7280; font-weight: 500; font-size: 14px;">${peso}%</td>
        </tr>
      `;
    }).join('');

    // HTML que se integra perfectamente con tu template
    const tablaHTML = `
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
      <th style="padding: 15px 12px; text-align: left; font-size: 14px; font-weight: bold;">📋 Categoría</th>
      <th style="padding: 15px 12px; text-align: center; font-size: 14px; font-weight: bold;">🎯 Calificación</th>
      <th style="padding: 15px 12px; text-align: center; font-size: 14px; font-weight: bold;">✅ Aprobadas</th>
      <th style="padding: 15px 12px; text-align: center; font-size: 14px; font-weight: bold;">❌ Reprobadas</th>
      <th style="padding: 15px 12px; text-align: center; font-size: 14px; font-weight: bold;">⚖️ Peso</th>
    </tr>
  </thead>
  <tbody>
    ${filasHTML}
  </tbody>
</table>`;

    console.log('✅ HTML de categorías generado exitosamente');
    console.log('🔍 HTML generado (primeros 500 caracteres):', tablaHTML.substring(0, 500));
    return tablaHTML;
  } catch (error) {
    console.error('Error generando HTML de categorías:', error);
    return '<p style="color: #ef4444;">Error al procesar información de categorías.</p>';
  }
};

/**
 * Genera HTML para mostrar fotos en el email
 */
const generarHTMLFotos = (fotos: FotoResumen[]): string => {
  console.log('📸 Generando HTML para fotos:', fotos?.length || 0, 'tipos de foto');
  
  if (!fotos || fotos.length === 0) {
    return '<p style="color: #666; font-style: italic; padding: 20px; text-align: center;">No hay información de fotos disponible.</p>';
  }

  try {
    const fotosHTML = fotos.map((foto, index) => {
      const tipo = foto?.tipo || `Tipo ${index + 1}`;
      const cantidad = foto?.cantidad || 0;
      const urls = foto?.urls || [];
      const colorFondo = cantidad > 0 ? '#dcfce7' : '#fee2e2';
      const colorTexto = cantidad > 0 ? '#15803d' : '#dc2626';
      const icono = cantidad > 0 ? '✅' : '❌';
      
      console.log(`🖼️ Procesando tipo de foto ${index + 1}: ${tipo} - ${cantidad} foto(s) - URLs: ${urls.length}`);
      
      // Generar galería de imágenes si hay URLs
      let galeriaHTML = '';
      if (urls.length > 0) {
        const imagenesHTML = urls.map((url, imgIndex) => `
          <div style="display: inline-block; margin: 5px; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <a href="${url}" target="_blank" style="text-decoration: none;">
              <img src="${url}" 
                   alt="Foto ${imgIndex + 1} - ${tipo}" 
                   style="width: 120px; height: 120px; object-fit: cover; display: block; transition: transform 0.2s;"
                   onmouseover="this.style.transform='scale(1.05)'"
                   onmouseout="this.style.transform='scale(1)'">
            </a>
          </div>
        `).join('');
        
        galeriaHTML = `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: 500;">📷 Galería (click para ampliar):</p>
            <div style="text-align: left;">
              ${imagenesHTML}
            </div>
          </div>
        `;
      }
      
      return `
        <div style="background: ${colorFondo}; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${colorTexto};">
          <!-- Header con información del tipo -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${urls.length > 0 ? '0' : '0'};">
            <div>
              <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">📷 ${tipo}</p>
            </div>
            <div>
              <span style="color: ${colorTexto}; font-weight: bold; font-size: 16px;">${icono} ${cantidad}</span>
              <span style="color: #6b7280; font-size: 12px; margin-left: 5px;">foto${cantidad !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <!-- Galería de imágenes -->
          ${galeriaHTML}
        </div>
      `;
    }).join('');

    const totalFotos = fotos.reduce((total, foto) => total + (foto.cantidad || 0), 0);
    const tiposCompletos = fotos.filter(foto => (foto.cantidad || 0) > 0).length;
    const tiposFaltantes = fotos.filter(foto => (foto.cantidad || 0) === 0).length;

    console.log(`📊 Resumen de fotos: ${totalFotos} total, ${tiposCompletos} completos, ${tiposFaltantes} faltantes`);

    const resumenHTML = `
<div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
    <h4 style="margin: 0; font-size: 16px; font-weight: bold;">📸 Estado de Fotografías</h4>
    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 90%;">
      ${totalFotos} fotos en total • ${tiposCompletos} tipos completos • ${tiposFaltantes} tipos faltantes
    </p>
  </div>
  <div>
    ${fotosHTML}
  </div>
</div>`;

    console.log('✅ HTML de fotos generado exitosamente');
    return resumenHTML;
  } catch (error) {
    console.error('Error generando HTML de fotos:', error);
    return '<div style="background: #fee2e2; padding: 15px; border-radius: 8px; color: #dc2626;">Error al procesar información de fotos.</div>';
  }
};