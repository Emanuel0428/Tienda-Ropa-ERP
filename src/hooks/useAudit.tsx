import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import {
  Pregunta,
  Auditoria,
  AuditoriaPregunta,
  Respuesta,
  CategoriaConSubcategorias,
  FormularioAuditoria,
  ResumenAuditoria,
  ResumenCategoria,
  NuevaPregunta,
  EditarPregunta
} from '../types/audit';

export const useAudit = () => {
  const { user } = useAuth();

  // Estados principales
  const [categorias, setCategorias] = useState<CategoriaConSubcategorias[]>([]);
  const [auditoriaActual, setAuditoriaActual] = useState<Auditoria | null>(null);
  const [preguntasAuditoria, setPreguntasAuditoria] = useState<AuditoriaPregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Map<number, Respuesta>>(new Map());
  
  // Estados de formulario
  const [formularioAuditoria, setFormularioAuditoria] = useState<FormularioAuditoria>({
    id_tienda: '',
    fecha: new Date().toISOString().split('T')[0],
    quienes_reciben: '',
    observaciones: ''
  });

  // Estados de control
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [modoRevision, setModoRevision] = useState(false); // Nuevo estado para modo revisión

  // Estados para gestión de preguntas del catálogo
  const [showPreguntaModal, setShowPreguntaModal] = useState(false);
  const [preguntaEditando, setPreguntaEditando] = useState<Pregunta | null>(null);
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState<number | null>(null);

  // Cargar estructura completa del catálogo maestro (SOLO para nuevas auditorías)


  const cargarEstructuraCatalogo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Limpiar estados previos
      setCategorias([]);
      setRespuestas(new Map());
      setPreguntasAuditoria([]);

      // Cargar categorías
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (categoriasError) throw categoriasError;

      // Cargar subcategorías
      const { data: subcategoriasData, error: subcategoriasError } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (subcategoriasError) throw subcategoriasError;

      // Cargar SOLO preguntas base del catálogo maestro (sin variables ni eliminadas)
      const { data: preguntasBase, error: preguntasError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      // Organizar datos en estructura jerárquica (SOLO preguntas base)
      const categoriasOrganizadas: CategoriaConSubcategorias[] = categoriasData?.map(categoria => ({
        ...categoria,
        subcategorias: subcategoriasData
          ?.filter(sub => sub.categoria_id === categoria.id)
          .map(subcategoria => {
            const preguntasSubcategoria = preguntasBase
              ?.filter(pregunta => pregunta.subcategoria_id === subcategoria.id)
              .map(pregunta => ({
                // Convertir pregunta base a formato de auditoria_pregunta temporal
                id_auditoria_pregunta: 0, // Se asignará al crear la auditoría
                id_auditoria: 0,
                id_pregunta: pregunta.id,
                texto_pregunta: pregunta.texto_pregunta,
                id_categoria: categoria.id,
                id_subcategoria: subcategoria.id,
                orden: pregunta.orden,
                created_at: pregunta.created_at,
                respuesta: undefined
              })) || [];
            

            
            return {
              ...subcategoria,
              preguntas: preguntasSubcategoria
            };
          }) || []
      })) || [];

      setCategorias(categoriasOrganizadas);
      
      console.log('✅ Catálogo cargado:', preguntasBase?.length, 'preguntas');

    } catch (error) {
      console.error('❌ Error cargando estructura del catálogo:', error);
      setError('Error al cargar la estructura de auditoría');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar estructura de auditoría existente (desde auditoria_preguntas)
  const cargarEstructuraAuditoriaExistente = async (idAuditoria: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar categorías y subcategorías
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('orden');

      const { data: subcategoriasData } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('activo', true)
        .order('orden');

      // Cargar preguntas específicas de esta auditoría
      const { data: preguntasAuditoriaData, error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .select(`
          *,
          respuesta:respuestas(*)
        `)
        .eq('id_auditoria', idAuditoria)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      if (!categoriasData || !subcategoriasData) {
        throw new Error('No se pudieron cargar las categorías');
      }

      // Organizar respuestas en Map
      const respuestasMap = new Map<number, Respuesta>();
      preguntasAuditoriaData?.forEach(pregunta => {
        if (pregunta.respuesta && pregunta.respuesta.length > 0) {
          respuestasMap.set(pregunta.id_auditoria_pregunta, pregunta.respuesta[0]);
        }
      });

      // Organizar estructura jerárquica con las preguntas de la auditoría específica
      const categoriasOrganizadas: CategoriaConSubcategorias[] = categoriasData.map(categoria => ({
        ...categoria,
        subcategorias: subcategoriasData
          .filter(sub => sub.categoria_id === categoria.id)
          .map(subcategoria => ({
            ...subcategoria,
            preguntas: preguntasAuditoriaData
              ?.filter(pregunta => 
                pregunta.id_categoria === categoria.id && 
                pregunta.id_subcategoria === subcategoria.id
              )
              .map(pregunta => ({
                ...pregunta,
                respuesta: respuestasMap.get(pregunta.id_auditoria_pregunta)
              })) || []
          }))
      }));

      setCategorias(categoriasOrganizadas);
      setRespuestas(respuestasMap);
      
      console.log('✅ Auditoría cargada:', preguntasAuditoriaData?.length, 'preguntas');

    } catch (error) {
      console.error('❌ Error cargando estructura de auditoría existente:', error);
      setError('Error al cargar la estructura de auditoría');
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva auditoría con snapshot de preguntas
  const crearNuevaAuditoria = async (): Promise<Auditoria | null> => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      return null;
    }

    try {
      setIsSaving(true);
      setError(null);

      // 1. Crear el registro principal de auditoría
      const { data: auditoriaData, error: auditoriaError } = await supabase
        .from('auditorias')
        .insert({
          id_tienda: parseInt(formularioAuditoria.id_tienda),
          id_auditor: user.id,
          fecha: formularioAuditoria.fecha,
          quienes_reciben: formularioAuditoria.quienes_reciben,
          observaciones: formularioAuditoria.observaciones,
          estado: 'en_progreso',
          calificacion_total: 0
        })
        .select()
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Cargar preguntas y subcategorías por separado (más simple y confiable)
      const { data: preguntasBase, error: preguntasError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      const { data: subcategorias, error: subcategoriasError } = await supabase
        .from('subcategorias')
        .select('id, categoria_id');

      if (subcategoriasError) throw subcategoriasError;

      // 3. Crear mapa de subcategorias para lookup rápido
      const subcategoriaMap = new Map(subcategorias?.map(sub => [sub.id, sub.categoria_id]) || []);

      // 4. Crear snapshot para auditoria_preguntas
      const preguntasSnapshot = preguntasBase?.map(pregunta => ({
        id_auditoria: auditoriaData.id_auditoria,
        id_pregunta: pregunta.id,
        texto_pregunta: pregunta.texto_pregunta,
        id_categoria: subcategoriaMap.get(pregunta.subcategoria_id),
        id_subcategoria: pregunta.subcategoria_id,
        orden: pregunta.orden
      })) || [];

      const { data: preguntasAuditoriaData, error: insertError } = await supabase
        .from('auditoria_preguntas')
        .insert(preguntasSnapshot)
        .select();

      if (insertError) throw insertError;

      console.log('✅ Auditoría creada:', auditoriaData.id_auditoria, '-', preguntasAuditoriaData.length, 'preguntas');

      // 4. Actualizar estados y cargar estructura final
      setModoRevision(false);
      setAuditoriaActual(auditoriaData);
      
      // Cargar estructura completa para UI
      await cargarEstructuraAuditoriaExistente(auditoriaData.id_auditoria);

      setCurrentStep(2);
      return auditoriaData;

    } catch (error) {
      console.error('❌ Error creando auditoría:', error);
      setError('Error al crear la auditoría');
      return null;
    } finally {
      setIsSaving(false);
    }
  };



  // Guardar respuesta individual
  const guardarRespuesta = async (
    id_auditoria_pregunta: number, 
    respuesta: boolean, 
    comentario?: string, 
    accion_correctiva?: string
  ): Promise<boolean> => {
    if (!auditoriaActual) {
      setError('No hay auditoría activa');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('respuestas')
        .upsert({
          id_auditoria_pregunta,
          respuesta,
          comentario: comentario || null,
          accion_correctiva: accion_correctiva || null
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      setRespuestas(prev => new Map(prev.set(id_auditoria_pregunta, data)));
      
      // Actualizar categorías con la nueva respuesta
      setCategorias(prev => 
        prev.map(categoria => ({
          ...categoria,
          subcategorias: categoria.subcategorias.map(subcategoria => ({
            ...subcategoria,
            preguntas: subcategoria.preguntas.map(pregunta => 
              pregunta.id_auditoria_pregunta === id_auditoria_pregunta
                ? { ...pregunta, respuesta: data }
                : pregunta
            )
          }))
        }))
      );

      return true;

    } catch (error) {
      console.error('❌ Error guardando respuesta:', error);
      setError('Error al guardar la respuesta');
      return false;
    }
  };

  // Calcular resumen con ponderación por peso de categoría
  const calcularResumen = (): ResumenAuditoria => {
    let totalPreguntas = 0;
    let preguntasRespondidas = 0;
    let sumaPonderada = 0;
    let pesoTotal = 0;

    const categoriasResumen: ResumenCategoria[] = categorias.map(categoria => {
      let categoriaTotalPreguntas = 0;
      let categoriaAprobadas = 0;
      let categoriaRespondidas = 0;

      categoria.subcategorias.forEach(subcategoria => {
        subcategoria.preguntas.forEach(pregunta => {
          categoriaTotalPreguntas++;
          totalPreguntas++;
          
          if (pregunta.respuesta) {
            categoriaRespondidas++;
            preguntasRespondidas++;
            
            if (pregunta.respuesta.respuesta === true) {
              categoriaAprobadas++;
            }
          }
        });
      });

      const porcentajeCumplimiento = categoriaRespondidas > 0 
        ? Math.round((categoriaAprobadas / categoriaRespondidas) * 100) 
        : 0;
      
      const contribucionPonderada = (porcentajeCumplimiento * categoria.peso) / 100;
      
      // Solo contar para el total si tiene preguntas respondidas
      if (categoriaRespondidas > 0) {
        sumaPonderada += contribucionPonderada;
        pesoTotal += categoria.peso;
      }

      return {
        categoria_id: categoria.id,
        categoria_nombre: categoria.nombre,
        peso_categoria: categoria.peso,
        total_preguntas: categoriaTotalPreguntas,
        preguntas_aprobadas: categoriaAprobadas,
        porcentaje_cumplimiento: porcentajeCumplimiento,
        contribucion_ponderada: contribucionPonderada
      };
    });

    const calificacionTotalPonderada = pesoTotal > 0 ? Math.round(sumaPonderada / pesoTotal * 100) : 0;

    return {
      total_preguntas: totalPreguntas,
      preguntas_respondidas: preguntasRespondidas,
      preguntas_aprobadas: categoriasResumen.reduce((acc, cat) => acc + cat.preguntas_aprobadas, 0),
      preguntas_reprobadas: preguntasRespondidas - categoriasResumen.reduce((acc, cat) => acc + cat.preguntas_aprobadas, 0),
      calificacion_total_ponderada: calificacionTotalPonderada,
      categorias_resumen: categoriasResumen
    };
  };

  // Finalizar auditoría y calcular calificación final
  const finalizarAuditoria = async (
    observacionesFinales?: string, 
    notasPersonal?: string, 
    notasCampanas?: string, 
    conclusiones?: string
  ): Promise<boolean> => {
    if (!auditoriaActual) {
      setError('No hay auditoría activa');
      return false;
    }

    try {
      setIsSaving(true);

      const resumen = calcularResumen();
      
      console.log('📝 Guardando notas de auditoría:', {
        notas_personal: notasPersonal,
        notas_campanas: notasCampanas,
        notas_conclusiones: conclusiones,
        observaciones: observacionesFinales
      });
      
      const { error } = await supabase
        .from('auditorias')
        .update({
          estado: 'completada',
          calificacion_total: resumen.calificacion_total_ponderada,
          observaciones: observacionesFinales || auditoriaActual.observaciones,
          notas_personal: notasPersonal || auditoriaActual.notas_personal,
          notas_campanas: notasCampanas || auditoriaActual.notas_campanas,
          notas_conclusiones: conclusiones || auditoriaActual.notas_conclusiones,
          updated_at: new Date().toISOString()
        })
        .eq('id_auditoria', auditoriaActual.id_auditoria);

      if (error) throw error;

      console.log('✅ Auditoría finalizada con todas las notas:', resumen.calificacion_total_ponderada + '%');
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      return true;

    } catch (error) {
      console.error('❌ Error finalizando auditoría:', error);
      setError('Error al finalizar la auditoría');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Cargar auditoría existente con todas sus respuestas
  const cargarAuditoriaExistente = async (id_auditoria: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Cargar auditoría principal
      const { data: auditoriaData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_auditoria', id_auditoria)
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Usar la función específica para cargar estructura de auditoría existente
      await cargarEstructuraAuditoriaExistente(id_auditoria);

      // 3. Actualizar formulario con datos de la auditoría
      setFormularioAuditoria({
        id_tienda: auditoriaData.id_tienda.toString(),
        fecha: auditoriaData.fecha,
        quienes_reciben: auditoriaData.quienes_reciben || '',
        observaciones: auditoriaData.observaciones || ''
      });

      // 4. Actualizar estados
      setModoRevision(true); // Activar modo revisión
      setAuditoriaActual(auditoriaData);

      console.log('✅ Auditoría cargada:', id_auditoria);

      return true;

    } catch (error) {
      console.error('❌ Error cargando auditoría existente:', error);
      setError('Error al cargar la auditoría');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para recargar auditoría sin cambiar el modo revisión (para edición de preguntas)
  const recargarAuditoriaActual = async (id_auditoria: number): Promise<boolean> => {
    try {
      if (!auditoriaActual || auditoriaActual.id_auditoria !== id_auditoria) {
        console.warn('No hay auditoría activa o no coincide con la ID');
        return false;
      }

      // 1. Cargar auditoría principal (actualizar datos)
      const { data: auditoriaData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_auditoria', id_auditoria)
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Recargar estructura con preguntas modulares
      await cargarEstructuraAuditoriaExistente(id_auditoria);

      // 3. Actualizar la auditoría actual SIN cambiar modo revisión
      setAuditoriaActual(auditoriaData);

      return true;

    } catch (error) {
      console.error('❌ Error recargando auditoría actual:', error);
      return false;
    }
  };

  // Gestión de preguntas en el catálogo maestro
  const agregarPregunta = async (nuevaPregunta: NuevaPregunta): Promise<Pregunta | null> => {
    try {
      const { data, error } = await supabase
        .from('preguntas')
        .insert(nuevaPregunta)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Pregunta agregada');
      await cargarEstructuraCatalogo(); // Recargar estructura
      
      return data;

    } catch (error) {
      console.error('❌ Error agregando pregunta:', error);
      setError('Error al agregar la pregunta');
      return null;
    }
  };

  const editarPregunta = async (preguntaEditada: EditarPregunta): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('preguntas')
        .update({
          texto_pregunta: preguntaEditada.texto_pregunta,
          subcategoria_id: preguntaEditada.subcategoria_id,
          orden: preguntaEditada.orden
        })
        .eq('id', preguntaEditada.id);

      if (error) throw error;

      console.log('✅ Pregunta editada');
      await cargarEstructuraCatalogo(); // Recargar estructura
      
      return true;

    } catch (error) {
      console.error('❌ Error editando pregunta:', error);
      setError('Error al editar la pregunta');
      return false;
    }
  };

  const eliminarPregunta = async (preguntaId: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('preguntas')
        .update({ activo: false })
        .eq('id', preguntaId);

      if (error) throw error;

      console.log('✅ Pregunta desactivada');
      await cargarEstructuraCatalogo(); // Recargar estructura
      
      return true;

    } catch (error) {
      console.error('❌ Error desactivando pregunta:', error);
      setError('Error al eliminar la pregunta');
      return false;
    }
  };

  // Handlers para formularios y UI
  const handleFormularioChange = (field: keyof FormularioAuditoria, value: any) => {
    setFormularioAuditoria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRespuestaChange = async (id_auditoria_pregunta: number, valor: boolean) => {
    await guardarRespuesta(id_auditoria_pregunta, valor);
  };

  // Refs para manejar timeouts de debounce
  const comentarioTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const accionCorrectivaTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  const handleComentarioChange = (id_auditoria_pregunta: number, comentario: string) => {
    // Actualizar estado local inmediatamente (para la UI)
    const respuestaActual = respuestas.get(id_auditoria_pregunta);
    if (respuestaActual) {
      const nuevaRespuesta = { ...respuestaActual, comentario };
      setRespuestas(prev => new Map(prev.set(id_auditoria_pregunta, nuevaRespuesta)));

      // Limpiar timeout anterior si existe
      if (comentarioTimeoutRef.current[id_auditoria_pregunta]) {
        clearTimeout(comentarioTimeoutRef.current[id_auditoria_pregunta]);
      }

      // Establecer nuevo timeout para guardar después de 1 segundo sin escribir
      comentarioTimeoutRef.current[id_auditoria_pregunta] = setTimeout(async () => {
        await guardarRespuesta(
          id_auditoria_pregunta, 
          respuestaActual.respuesta, 
          comentario, 
          respuestaActual.accion_correctiva
        );
        delete comentarioTimeoutRef.current[id_auditoria_pregunta];
      }, 1000);
    }
  };

  const handleAccionCorrectivaChange = (id_auditoria_pregunta: number, accionCorrectiva: string) => {
    // Actualizar estado local inmediatamente (para la UI)
    const respuestaActual = respuestas.get(id_auditoria_pregunta);
    if (respuestaActual) {
      const nuevaRespuesta = { ...respuestaActual, accion_correctiva: accionCorrectiva };
      setRespuestas(prev => new Map(prev.set(id_auditoria_pregunta, nuevaRespuesta)));

      // Limpiar timeout anterior si existe
      if (accionCorrectivaTimeoutRef.current[id_auditoria_pregunta]) {
        clearTimeout(accionCorrectivaTimeoutRef.current[id_auditoria_pregunta]);
      }

      // Establecer nuevo timeout para guardar después de 1 segundo sin escribir
      accionCorrectivaTimeoutRef.current[id_auditoria_pregunta] = setTimeout(async () => {
        await guardarRespuesta(
          id_auditoria_pregunta, 
          respuestaActual.respuesta, 
          respuestaActual.comentario, 
          accionCorrectiva
        );
        delete accionCorrectivaTimeoutRef.current[id_auditoria_pregunta];
      }, 1000);
    }
  };

  // Obtener lista de auditorías anteriores por tienda
  const obtenerAuditoriasAnteriores = async (idTienda: number): Promise<Auditoria[]> => {
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_tienda', idTienda)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo auditorías anteriores:', error);
      return [];
    }
  };

  // Cargar auditoría anterior específica con sus respuestas
  const cargarAuditoriaAnterior = async (idAuditoriaPlantilla: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Cargar datos básicos de la auditoría plantilla
      const { data: auditoriaPlantilla, error: auditoriaError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_auditoria', idAuditoriaPlantilla)
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Cargar TODAS las preguntas que tenía la auditoría plantilla (sin respuestas)
      const { data: preguntasPlantilla, error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .select('*') // Sin respuestas
        .eq('id_auditoria', idAuditoriaPlantilla)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      // 3. Actualizar formulario con datos de la plantilla (excepto fecha)
      setFormularioAuditoria({
        id_tienda: auditoriaPlantilla.id_tienda.toString(),
        fecha: new Date().toISOString().split('T')[0], // Fecha actual
        quienes_reciben: auditoriaPlantilla.quienes_reciben || '',
        observaciones: auditoriaPlantilla.observaciones || ''
      });

      // 4. Crear registro principal de nueva auditoría
      const { data: nuevaAuditoria, error: errorNuevaAuditoria } = await supabase
        .from('auditorias')
        .insert({
          id_tienda: parseInt(formularioAuditoria.id_tienda),
          id_auditor: user?.id,
          fecha: formularioAuditoria.fecha,
          quienes_reciben: formularioAuditoria.quienes_reciben,
          observaciones: formularioAuditoria.observaciones,
          estado: 'en_progreso',
          calificacion_total: 0
        })
        .select()
        .single();

      if (errorNuevaAuditoria) throw errorNuevaAuditoria;

      // 5. Copiar EXACTAMENTE las mismas preguntas de la plantilla (sin respuestas)
      const preguntasParaNuevaAuditoria = preguntasPlantilla?.map(pregunta => ({
        id_auditoria: nuevaAuditoria.id_auditoria,
        id_pregunta: pregunta.id_pregunta, // Mantener referencia si es pregunta base
        texto_pregunta: pregunta.texto_pregunta,
        id_categoria: pregunta.id_categoria,
        id_subcategoria: pregunta.id_subcategoria,
        orden: pregunta.orden
      })) || [];

      const { data: preguntasCreadas, error: errorPreguntas } = await supabase
        .from('auditoria_preguntas')
        .insert(preguntasParaNuevaAuditoria)
        .select();

      if (errorPreguntas) throw errorPreguntas;

      console.log(`� ${preguntasCreadas.length} preguntas copiadas sin respuestas`);

      // 6. Actualizar estados locales
      setModoRevision(false);
      setAuditoriaActual(nuevaAuditoria);
      setPreguntasAuditoria(preguntasCreadas);

      // 7. Cargar estructura final para mostrar en UI
      await cargarEstructuraAuditoriaExistente(nuevaAuditoria.id_auditoria);
      setModoRevision(false); // Mantener en modo creación

      setCurrentStep(2);
      console.log('✅ Plantilla aplicada:', nuevaAuditoria.id_auditoria, '-', preguntasCreadas.length, 'preguntas');
      return true;

    } catch (error) {
      console.error('❌ Error aplicando plantilla:', error);
      setError('Error al aplicar la plantilla de auditoría');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ========== NUEVAS FUNCIONES MODULARES ==========
  
  // Agregar pregunta variable específica para una auditoría
  const agregarPreguntaVariable = async (idAuditoria: number, subcategoriaId: number, textoPregunta: string): Promise<boolean> => {
    try {
      // Verificar que la auditoría existe, pero ser más flexible con el estado
      if (!auditoriaActual || auditoriaActual.id_auditoria !== idAuditoria) {
        console.warn(`⚠️ Estado de auditoría no sincronizado. Esperado: ${idAuditoria}, Actual: ${auditoriaActual?.id_auditoria}`);
        // Intentar continuar si al menos tenemos una ID válida
        if (!idAuditoria) {
          throw new Error('ID de auditoría no válida');
        }
      }

      // Obtener el siguiente orden para esta subcategoría en esta auditoría
      const { data: ultimaPregunta } = await supabase
        .from('preguntas_variables')
        .select('orden')
        .eq('id_auditoria', idAuditoria)
        .eq('id_subcategoria', subcategoriaId)
        .order('orden', { ascending: false })
        .limit(1);

      const siguienteOrden = ultimaPregunta && ultimaPregunta.length > 0 ? ultimaPregunta[0].orden + 1 : 1000; // Empezar en 1000 para distinguir de preguntas base

      // Insertar pregunta variable
      const { error: errorVariable } = await supabase
        .from('preguntas_variables')
        .insert({
          id_auditoria: idAuditoria,
          id_subcategoria: subcategoriaId,
          texto_pregunta: textoPregunta.trim(),
          orden: siguienteOrden,
          activo: true
        });

      if (errorVariable) throw errorVariable;

      // Obtener información de subcategoría para categoría
      const { data: subcategoriaInfo } = await supabase
        .from('subcategorias')
        .select('categoria_id')
        .eq('id', subcategoriaId)
        .single();

      if (!subcategoriaInfo) {
        throw new Error('No se pudo obtener información de la subcategoría');
      }

      // Agregar a tabla auditoria_preguntas
      const { error: errorAuditoriaPregunta } = await supabase
        .from('auditoria_preguntas')
        .insert({
          id_auditoria: idAuditoria,
          id_pregunta: null, // NULL para preguntas variables
          texto_pregunta: textoPregunta.trim(),
          id_categoria: subcategoriaInfo.categoria_id,
          id_subcategoria: subcategoriaId,
          orden: siguienteOrden
        });

      if (errorAuditoriaPregunta) throw errorAuditoriaPregunta;

      console.log('✅ Pregunta agregada');

      // Recargar auditoría actual sin cambiar modo revisión
      await recargarAuditoriaActual(idAuditoria);
      return true;

    } catch (error) {
      console.error('❌ Error agregando pregunta variable:', error);
      setError('Error al agregar la pregunta a la auditoría');
      return false;
    }
  };

  // Eliminar pregunta específica de una auditoría (marcarla como eliminada)
  const eliminarPreguntaDeAuditoria = async (idAuditoria: number, idPregunta: number, motivo?: string): Promise<boolean> => {
    try {
      if (!auditoriaActual || auditoriaActual.id_auditoria !== idAuditoria) {
        throw new Error('No hay auditoría activa o no coincide con la ID proporcionada');
      }

      // Verificar si la pregunta ya está eliminada para evitar error 409
      const { data: yaEliminada } = await supabase
        .from('preguntas_eliminadas')
        .select('id_pregunta')
        .eq('id_auditoria', idAuditoria)
        .eq('id_pregunta', idPregunta)
        .single();

      if (yaEliminada) {
        return true;
      }

      // Marcar pregunta como eliminada para esta auditoría
      const { error: errorEliminada } = await supabase
        .from('preguntas_eliminadas')
        .insert({
          id_auditoria: idAuditoria,
          id_pregunta: idPregunta,
          eliminado_por: user?.id || null,
          motivo: motivo || 'Eliminada durante edición de auditoría'
        });

      if (errorEliminada) throw errorEliminada;

      // Eliminar de auditoria_preguntas
      const { error: errorAuditoriaPregunta } = await supabase
        .from('auditoria_preguntas')
        .delete()
        .eq('id_auditoria', idAuditoria)
        .eq('id_pregunta', idPregunta);

      if (errorAuditoriaPregunta) throw errorAuditoriaPregunta;

      console.log('✅ Pregunta eliminada');

      // Recargar auditoría actual sin cambiar modo revisión
      await recargarAuditoriaActual(idAuditoria);
      return true;

    } catch (error) {
      console.error('❌ Error eliminando pregunta de auditoría:', error);
      setError('Error al eliminar la pregunta de la auditoría');
      return false;
    }
  };

  // Efectos
  useEffect(() => {
    cargarEstructuraCatalogo();
  }, []);

  // Limpieza de timeouts al desmontar
  useEffect(() => {
    return () => {
      // Limpiar timeouts de comentarios
      Object.values(comentarioTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      // Limpiar timeouts de acciones correctivas
      Object.values(accionCorrectivaTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Retorno del hook
  return {
    // Estados principales
    categorias,
    auditoriaActual,
    preguntasAuditoria,
    formularioAuditoria,
    respuestas,
    
    // Estados de control
    isLoading,
    isSaving,
    error,
    currentStep,
    showSuccessMessage,
    modoRevision,
    
    // Estados de gestión de preguntas
    showPreguntaModal,
    preguntaEditando,
    subcategoriaSeleccionada,
    
    // Funciones principales
    cargarEstructuraCatalogo,
    crearNuevaAuditoria,
    guardarRespuesta,
    finalizarAuditoria,
    cargarAuditoriaExistente,
    calcularResumen,
    obtenerAuditoriasAnteriores,
    cargarAuditoriaAnterior,
    
    // Gestión de preguntas del catálogo
    agregarPregunta,
    editarPregunta,
    eliminarPregunta,
    
    // Gestión de preguntas modulares
    agregarPreguntaVariable,
    eliminarPreguntaDeAuditoria,
    recargarAuditoriaActual,
    
    // Handlers
    handleFormularioChange,
    handleRespuestaChange,
    handleComentarioChange,
    handleAccionCorrectivaChange,
    
    // Funciones de carga específicas
    cargarEstructuraAuditoriaExistente,
    
    // Setters
    setCurrentStep,
    setShowSuccessMessage,
    setShowPreguntaModal,
    setPreguntaEditando,
    setSubcategoriaSeleccionada,
    setError,
    setModoRevision,
    setAuditoriaActual
  };
};