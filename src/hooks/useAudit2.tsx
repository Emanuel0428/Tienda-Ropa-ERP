import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import {
  Categoria,
  Subcategoria,
  Pregunta,
  Auditoria,
  AuditoriaPregunta,
  Respuesta,
  CategoriaConSubcategorias,
  SubcategoriaConPreguntas,
  PreguntaConRespuesta,
  FormularioAuditoria,
  ResumenAuditoria,
  ResumenCategoria,
  NuevaPregunta,
  EditarPregunta,
  GuardarAuditoriaPayload,
  AuditoriaCompleta
} from '../types/audit2';

export const useAudit2 = () => {
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

  // Cargar estructura completa del catálogo maestro
  const cargarEstructuraCatalogo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📋 Cargando estructura del catálogo maestro...');

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

      // Cargar todas las preguntas del catálogo
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      // Organizar datos en estructura jerárquica
      const categoriasOrganizadas: CategoriaConSubcategorias[] = categoriasData?.map(categoria => ({
        ...categoria,
        subcategorias: subcategoriasData
          ?.filter(sub => sub.categoria_id === categoria.id)
          .map(subcategoria => ({
            ...subcategoria,
            preguntas: preguntasData
              ?.filter(pregunta => pregunta.subcategoria_id === subcategoria.id)
              .map(pregunta => ({
                // Convertir pregunta del catálogo a formato de auditoria_pregunta temporal
                id_auditoria_pregunta: 0, // Se asignará al crear la auditoría
                id_auditoria: 0,
                id_pregunta: pregunta.id,
                texto_pregunta: pregunta.texto_pregunta,
                id_categoria: categoria.id,
                id_subcategoria: subcategoria.id,
                orden: pregunta.orden,
                created_at: pregunta.created_at,
                respuesta: undefined
              })) || []
          })) || []
      })) || [];

      setCategorias(categoriasOrganizadas);
      
      console.log('✅ Estructura del catálogo cargada:', {
        categorias: categoriasOrganizadas.length,
        subcategorias: subcategoriasData?.length || 0,
        preguntas: preguntasData?.length || 0
      });

    } catch (error) {
      console.error('❌ Error cargando estructura del catálogo:', error);
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

      console.log('🚀 Creando nueva auditoría...');

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

      console.log('✅ Auditoría creada con ID:', auditoriaData.id_auditoria);

      // 2. Crear snapshot de todas las preguntas del catálogo
      const preguntasSnapshot: Omit<AuditoriaPregunta, 'id_auditoria_pregunta' | 'created_at'>[] = [];
      
      categorias.forEach(categoria => {
        categoria.subcategorias.forEach(subcategoria => {
          subcategoria.preguntas.forEach(pregunta => {
            preguntasSnapshot.push({
              id_auditoria: auditoriaData.id_auditoria,
              id_pregunta: pregunta.id_pregunta,
              texto_pregunta: pregunta.texto_pregunta,
              id_categoria: categoria.id,
              id_subcategoria: subcategoria.id,
              orden: pregunta.orden
            });
          });
        });
      });

      const { data: preguntasAuditoriaData, error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .insert(preguntasSnapshot)
        .select();

      if (preguntasError) throw preguntasError;

      console.log('✅ Snapshot de preguntas creado:', preguntasAuditoriaData.length, 'preguntas');

      // 3. Actualizar estados locales
      setModoRevision(false); // Modo creación nueva
      setAuditoriaActual(auditoriaData);
      setPreguntasAuditoria(preguntasAuditoriaData);
      
      // 4. Actualizar categorías con IDs reales de auditoria_preguntas
      actualizarCategoriasConPreguntasAuditoria(preguntasAuditoriaData);

      setCurrentStep(2);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      return auditoriaData;

    } catch (error) {
      console.error('❌ Error creando auditoría:', error);
      setError('Error al crear la auditoría');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Actualizar categorías con los IDs reales de auditoria_preguntas
  const actualizarCategoriasConPreguntasAuditoria = (preguntasAuditoriaData: AuditoriaPregunta[]) => {
    setCategorias(prev => 
      prev.map(categoria => ({
        ...categoria,
        subcategorias: categoria.subcategorias.map(subcategoria => ({
          ...subcategoria,
          preguntas: subcategoria.preguntas.map(pregunta => {
            const preguntaAuditoria = preguntasAuditoriaData.find(pa => 
              pa.id_categoria === categoria.id && 
              pa.id_subcategoria === subcategoria.id && 
              pa.id_pregunta === pregunta.id_pregunta
            );
            
            return preguntaAuditoria ? {
              ...preguntaAuditoria,
              respuesta: respuestas.get(preguntaAuditoria.id_auditoria_pregunta)
            } : pregunta;
          })
        }))
      }))
    );
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

      console.log('💾 Respuesta guardada:', { id_auditoria_pregunta, respuesta, comentario });
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
  const finalizarAuditoria = async (observacionesFinales?: string): Promise<boolean> => {
    if (!auditoriaActual) {
      setError('No hay auditoría activa');
      return false;
    }

    try {
      setIsSaving(true);

      const resumen = calcularResumen();
      
      const { error } = await supabase
        .from('auditorias')
        .update({
          estado: 'completada',
          calificacion_total: resumen.calificacion_total_ponderada,
          observaciones: observacionesFinales || auditoriaActual.observaciones,
          updated_at: new Date().toISOString()
        })
        .eq('id_auditoria', auditoriaActual.id_auditoria);

      if (error) throw error;

      console.log('✅ Auditoría finalizada con calificación:', resumen.calificacion_total_ponderada);
      
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

      console.log('📖 Cargando auditoría existente ID:', id_auditoria);

      // 1. Cargar auditoría principal
      const { data: auditoriaData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_auditoria', id_auditoria)
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Cargar preguntas de la auditoría con sus respuestas
      const { data: preguntasAuditoriaData, error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .select(`
          *,
          respuesta:respuestas(*)
        `)
        .eq('id_auditoria', id_auditoria)
        .order('orden', { ascending: true });

      if (preguntasError) throw preguntasError;

      // 3. Cargar estructura de categorías y subcategorías
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

      if (!categoriasData || !subcategoriasData) {
        throw new Error('No se pudieron cargar las categorías');
      }

      // 4. Organizar respuestas en Map
      const respuestasMap = new Map<number, Respuesta>();
      preguntasAuditoriaData?.forEach(pregunta => {
        if (pregunta.respuesta && pregunta.respuesta.length > 0) {
          respuestasMap.set(pregunta.id_auditoria_pregunta, pregunta.respuesta[0]);
        }
      });

      // 5. Organizar estructura jerárquica con las preguntas de la auditoría específica
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

      // 6. Actualizar formulario con datos de la auditoría
      setFormularioAuditoria({
        id_tienda: auditoriaData.id_tienda.toString(),
        fecha: auditoriaData.fecha,
        quienes_reciben: auditoriaData.quienes_reciben || '',
        observaciones: auditoriaData.observaciones || ''
      });

      // 7. Actualizar estados
      setModoRevision(true); // Activar modo revisión
      setAuditoriaActual(auditoriaData);
      setPreguntasAuditoria(preguntasAuditoriaData || []);
      setRespuestas(respuestasMap);
      setCategorias(categoriasOrganizadas);

      console.log('✅ Auditoría existente cargada correctamente:', {
        id: id_auditoria,
        preguntas: preguntasAuditoriaData?.length || 0,
        respuestas: respuestasMap.size,
        fecha: auditoriaData.fecha
      });

      return true;

    } catch (error) {
      console.error('❌ Error cargando auditoría existente:', error);
      setError('Error al cargar la auditoría');
      return false;
    } finally {
      setIsLoading(false);
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

      console.log('✅ Pregunta agregada al catálogo:', data);
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

      console.log('✅ Pregunta editada en el catálogo:', preguntaEditada.id);
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

      console.log('✅ Pregunta desactivada del catálogo:', preguntaId);
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

  const handleComentarioChange = async (id_auditoria_pregunta: number, comentario: string) => {
    const respuestaActual = respuestas.get(id_auditoria_pregunta);
    if (respuestaActual) {
      await guardarRespuesta(
        id_auditoria_pregunta, 
        respuestaActual.respuesta, 
        comentario, 
        respuestaActual.accion_correctiva
      );
    }
  };

  const handleAccionCorrectivaChange = async (id_auditoria_pregunta: number, accionCorrectiva: string) => {
    const respuestaActual = respuestas.get(id_auditoria_pregunta);
    if (respuestaActual) {
      await guardarRespuesta(
        id_auditoria_pregunta, 
        respuestaActual.respuesta, 
        respuestaActual.comentario, 
        accionCorrectiva
      );
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
  const cargarAuditoriaAnterior = async (idAuditoria: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Cargando auditoría anterior ID:', idAuditoria);

      // 1. Cargar la auditoría
      const { data: auditoriaData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_auditoria', idAuditoria)
        .single();

      if (auditoriaError) throw auditoriaError;

      // 2. Cargar las preguntas de esa auditoría con sus respuestas
      const { data: preguntasAuditoriaData, error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .select(`
          *,
          respuesta:respuestas(*)
        `)
        .eq('id_auditoria', idAuditoria);

      if (preguntasError) throw preguntasError;

      // 3. Cargar estructura actual del catálogo
      await cargarEstructuraCatalogo();

      // 4. Actualizar formulario con datos de la auditoría anterior (excepto fecha)
      setFormularioAuditoria({
        id_tienda: auditoriaData.id_tienda.toString(),
        fecha: new Date().toISOString().split('T')[0], // Fecha actual para nueva auditoría
        quienes_reciben: auditoriaData.quienes_reciben || '',
        observaciones: auditoriaData.observaciones || ''
      });

      // 5. Crear nueva auditoría
      setModoRevision(false); // Esto será una nueva auditoría
      const auditoriaCreada = await crearNuevaAuditoria();
      if (!auditoriaCreada) return false;

      // 6. Aplicar respuestas anteriores a las preguntas que coincidan
      for (const preguntaAnterior of preguntasAuditoriaData) {
        if (preguntaAnterior.respuesta && preguntaAnterior.respuesta.length > 0) {
          const respuestaAnterior = preguntaAnterior.respuesta[0];
          
          // Buscar pregunta equivalente en la nueva auditoría por texto
          const preguntaActual = preguntasAuditoria.find(p => 
            p.texto_pregunta === preguntaAnterior.texto_pregunta
          );

          if (preguntaActual) {
            await guardarRespuesta(
              preguntaActual.id_auditoria_pregunta,
              respuestaAnterior.respuesta,
              respuestaAnterior.comentario,
              respuestaAnterior.accion_correctiva
            );
          }
        }
      }

      console.log('✅ Auditoría anterior cargada y aplicada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error cargando auditoría anterior:', error);
      setError('Error al cargar la auditoría anterior');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Efectos
  useEffect(() => {
    cargarEstructuraCatalogo();
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
    
    // Handlers
    handleFormularioChange,
    handleRespuestaChange,
    handleComentarioChange,
    handleAccionCorrectivaChange,
    
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