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
    // Validar archivo
    if (!archivo.type.startsWith('image/')) {
      return { success: false, error: 'El archivo debe ser una imagen' };
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (archivo.size > maxSize) {
      return { success: false, error: 'La imagen no puede superar los 5MB' };
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `auditoria_${idAuditoria}_${tipoFoto.replace(/\s+/g, '_')}_${timestamp}.${extension}`;
    const rutaArchivo = `auditorias/${idAuditoria}/${nombreArchivo}`;

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('auditoria-fotos')
      .upload(rutaArchivo, archivo, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      return { success: false, error: 'Error al subir la imagen: ' + uploadError.message };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('auditoria-fotos')
      .getPublicUrl(rutaArchivo);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Error al obtener URL de la imagen' };
    }

    // Guardar referencia en la base de datos
    const { data: fotoData, error: dbError } = await supabase
      .from('auditoria_fotos')
      .insert({
        id_auditoria: idAuditoria,
        tipo_foto: tipoFoto,
        url_foto: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      // Intentar eliminar el archivo subido si falló la BD
      await supabase.storage
        .from('auditoria-fotos')
        .remove([rutaArchivo]);
      return { success: false, error: 'Error al guardar la referencia en la base de datos' };
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