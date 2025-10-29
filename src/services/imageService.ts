import { supabase } from '../supabaseClient';

export interface AuditoriaFoto {
  id_auditoria_foto: number;
  id_auditoria: number;
  tipo_foto: string;
  url_foto: string;
  created_at: string;
}

// Tipos de fotos permitidos
export const TIPOS_FOTOS = [
  'Fachada',
  'Campaña y promociones', 
  'General de la tienda por los lados',
  'Punto de pago',
  'Vestier',
  'Implementos de aseo',
  'Bodegas',
  'Personal de la tienda',
  'Libro verde y carpetas',
  'Cuaderno de seguimiento de pptos e informes de la marca'
] as const;

export type TipoFoto = typeof TIPOS_FOTOS[number];

/**
 * Sube una imagen a Supabase Storage y guarda la referencia en la BD
 */
export const subirFotoAuditoria = async (
  idAuditoria: number,
  tipoFoto: TipoFoto,
  archivo: File
): Promise<{ success: boolean; data?: AuditoriaFoto; error?: string }> => {
  try {
    console.log('📱 Procesando archivo iOS:', {
      name: archivo.name,
      size: archivo.size,
      type: archivo.type,
      lastModified: archivo.lastModified
    });

    // Validar archivo - incluir formatos iOS
    const formatosPermitidos = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif' // Formatos iOS
    ];
    
    const esImagenValida = archivo.type.startsWith('image/') || 
                          formatosPermitidos.includes(archivo.type) ||
                          archivo.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/);
    
    if (!esImagenValida) {
      console.error('❌ Tipo de archivo no válido:', archivo.type);
      return { success: false, error: 'Por favor selecciona un archivo de imagen válido (JPG, PNG, HEIC, etc.)' };
    }

    // Validar tamaño (máximo 10MB para iOS)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (archivo.size === 0) {
      return { success: false, error: 'El archivo está vacío. Intenta seleccionar otra foto.' };
    }
    
    if (archivo.size > maxSize) {
      console.error('❌ Archivo muy grande:', archivo.size, 'bytes');
      return { success: false, error: 'La imagen no puede superar los 10MB' };
    }

    // Función para normalizar texto eliminando caracteres especiales
    const normalizeText = (text: string): string => {
      return text
        .normalize('NFD') // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (acentos)
        .replace(/ñ/g, 'n') // Reemplaza ñ por n
        .replace(/Ñ/g, 'N') // Reemplaza Ñ por N
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Elimina caracteres especiales
        .replace(/\s+/g, '_') // Reemplaza espacios por guiones bajos
        .toLowerCase(); // Convierte a minúsculas
    };

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    let extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Convertir formatos iOS a JPG para compatibilidad
    if (extension === 'heic' || extension === 'heif') {
      extension = 'jpg';
      console.log('📱 Convirtiendo formato iOS HEIC/HEIF a JPG');
    }
    
    // Normalizar nombre del tipo de foto
    const tipoFotoNormalizado = normalizeText(tipoFoto);
    
    // Generar nombre seguro para Supabase
    const nombreArchivo = `auditoria_${idAuditoria}_${tipoFotoNormalizado}_${timestamp}.${extension}`;
    const rutaArchivo = `auditorias/${idAuditoria}/${nombreArchivo}`;

    console.log('📝 Nombre de archivo generado para iOS:', {
      original: archivo.name,
      normalizado: nombreArchivo,
      ruta: rutaArchivo
    });

    // Subir archivo a Supabase Storage con configuración para iOS
    console.log('📱 Iniciando subida a Supabase Storage...');
    
    const { error: uploadError } = await supabase.storage
      .from('auditoria-fotos')
      .upload(rutaArchivo, archivo, {
        cacheControl: '3600',
        upsert: false,
        contentType: archivo.type || 'image/jpeg' // Fallback para iOS
      });

    if (uploadError) {
      console.error('📱 Error subiendo archivo desde iOS:', uploadError);
      
      // Mensajes de error más específicos para iOS
      let mensajeError = uploadError.message || 'Error desconocido';
      
      if (mensajeError.includes('Invalid key') || mensajeError.includes('key')) {
        mensajeError = 'Nombre de archivo inválido. Intenta tomar otra foto.';
      } else if (mensajeError.includes('413') || mensajeError.includes('large')) {
        mensajeError = 'La imagen es muy grande. Intenta con una foto más pequeña.';
      } else if (mensajeError.includes('401') || mensajeError.includes('403')) {
        mensajeError = 'Error de permisos. Contacta al administrador.';
      } else if (mensajeError.includes('network') || mensajeError.includes('fetch')) {
        mensajeError = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
      }
      
      return { success: false, error: `📱 ${mensajeError}` };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('auditoria-fotos')
      .getPublicUrl(rutaArchivo);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Error al obtener URL de la imagen' };
    }

    // Guardar referencia en la base de datos
    const insertData = {
      id_auditoria: idAuditoria,
      tipo_foto: tipoFoto,
      url_foto: urlData.publicUrl
    };
    
    console.log('Intentando insertar en auditoria_fotos:', insertData);
    
    // Verificar si la auditoría existe
    const { data: auditoriaExiste, error: auditoriaError } = await supabase
      .from('auditorias')
      .select('id_auditoria')
      .eq('id_auditoria', idAuditoria)
      .single();
    
    if (auditoriaError || !auditoriaExiste) {
      console.error('La auditoría no existe:', auditoriaError);
      return { success: false, error: `La auditoría ${idAuditoria} no existe` };
    }
    
    // Obtener el próximo ID disponible
    const { data: maxIdData } = await supabase
      .from('auditoria_fotos')
      .select('id_auditoria_foto')
      .order('id_auditoria_foto', { ascending: false })
      .limit(1);
    
    const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id_auditoria_foto + 1 : 1;
    
    const insertDataWithId = {
      ...insertData,
      id_auditoria_foto: nextId
    };
    
    console.log('Insertando con ID generado:', insertDataWithId);
    
    const { data: fotoData, error: dbError } = await supabase
      .from('auditoria_fotos')
      .insert(insertDataWithId)
      .select()
      .single();

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      console.error('Detalles del error:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      // Intentar eliminar el archivo subido si falló la BD
      await supabase.storage
        .from('auditoria-fotos')
        .remove([rutaArchivo]);
      return { success: false, error: `Error al guardar la referencia en la base de datos: ${dbError.message}` };
    }

    return { success: true, data: fotoData };

  } catch (error) {
    console.error('Error general:', error);
    return { success: false, error: 'Error inesperado al subir la imagen' };
  }
};

/**
 * Obtiene todas las fotos de una auditoría
 */
export const obtenerFotosAuditoria = async (
  idAuditoria: number
): Promise<{ success: boolean; data?: AuditoriaFoto[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('auditoria_fotos')
      .select('*')
      .eq('id_auditoria', idAuditoria)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo fotos:', error);
      return { success: false, error: 'Error al obtener las fotos' };
    }

    return { success: true, data: data || [] };

  } catch (error) {
    console.error('Error general:', error);
    return { success: false, error: 'Error inesperado al obtener las fotos' };
  }
};

/**
 * Obtiene fotos por tipo específico
 */
export const obtenerFotosPorTipo = async (
  idAuditoria: number,
  tipoFoto: TipoFoto
): Promise<{ success: boolean; data?: AuditoriaFoto[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('auditoria_fotos')
      .select('*')
      .eq('id_auditoria', idAuditoria)
      .eq('tipo_foto', tipoFoto)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo fotos por tipo:', error);
      return { success: false, error: 'Error al obtener las fotos' };
    }

    return { success: true, data: data || [] };

  } catch (error) {
    console.error('Error general:', error);
    return { success: false, error: 'Error inesperado al obtener las fotos' };
  }
};

/**
 * Elimina una foto (del storage y de la BD)
 */
export const eliminarFotoAuditoria = async (
  idFoto: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Primero obtener la información de la foto
    const { data: fotoData, error: fetchError } = await supabase
      .from('auditoria_fotos')
      .select('url_foto')
      .eq('id_auditoria_foto', idFoto)
      .single();

    if (fetchError) {
      return { success: false, error: 'Foto no encontrada' };
    }

    // Extraer la ruta del archivo desde la URL
    const url = new URL(fotoData.url_foto);
    const rutaArchivo = url.pathname.split('/storage/v1/object/public/auditoria-fotos/')[1];

    // Eliminar de la base de datos
    const { error: dbError } = await supabase
      .from('auditoria_fotos')
      .delete()
      .eq('id_auditoria_foto', idFoto);

    if (dbError) {
      console.error('Error eliminando de BD:', dbError);
      return { success: false, error: 'Error al eliminar la referencia de la base de datos' };
    }

    // Eliminar del storage
    const { error: storageError } = await supabase.storage
      .from('auditoria-fotos')
      .remove([rutaArchivo]);

    if (storageError) {
      console.warn('Error eliminando del storage:', storageError);
      // No retornamos error porque la referencia en BD ya se eliminó
    }

    return { success: true };

  } catch (error) {
    console.error('Error general:', error);
    return { success: false, error: 'Error inesperado al eliminar la foto' };
  }
};

/**
 * Obtiene el conteo de fotos por tipo para una auditoría
 */
export const obtenerConteoFotos = async (
  idAuditoria: number
): Promise<{ success: boolean; data?: Record<TipoFoto, number>; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('auditoria_fotos')
      .select('tipo_foto')
      .eq('id_auditoria', idAuditoria);

    if (error) {
      return { success: false, error: 'Error al obtener el conteo de fotos' };
    }

    // Contar fotos por tipo
    const conteo = TIPOS_FOTOS.reduce((acc, tipo) => {
      acc[tipo] = data?.filter(foto => foto.tipo_foto === tipo).length || 0;
      return acc;
    }, {} as Record<TipoFoto, number>);

    return { success: true, data: conteo };

  } catch (error) {
    console.error('Error general:', error);
    return { success: false, error: 'Error inesperado al obtener el conteo' };
  }
};