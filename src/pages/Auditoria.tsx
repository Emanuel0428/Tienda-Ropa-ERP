import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAudit } from '../hooks/useAudit';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import type { Auditoria, Respuesta } from '../types/audit';
import GestorFotos from '../components/GestorFotos';
import { obtenerConteoFotos } from '../services/imageService';
import { 
  enviarNotificacionAuditoriaCompletada, 
  obtenerDestinatariosNotificacion,
  formatearFechaEmail,
  CategoriaResumen,
  FotoResumen 
} from '../services/emailService';

const Auditoria = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Hook de autenticación para obtener información del usuario
  const { user } = useAuth();
  
  const {
    // Estados principales
    categorias,
    auditoriaActual,
    formularioAuditoria,
    respuestas,
    
    // Estados de control
    isLoading,
    isSaving,
    error,
    currentStep,
    showSuccessMessage,
    modoRevision,
    

    // Funciones principales
    crearNuevaAuditoria,
    finalizarAuditoria,
    cargarAuditoriaExistente,
    calcularResumen,
    obtenerAuditoriasAnteriores,
    cargarAuditoriaAnterior,
   
    
    // Handlers
    handleFormularioChange,
    handleRespuestaChange,
    handleComentarioChange,
    handleAccionCorrectivaChange,
    
    // Setters
    setCurrentStep,
    setShowSuccessMessage,
    setError,
    setModoRevision,
    cargarEstructuraCatalogo,
    setAuditoriaActual,
    
    // Funciones modulares
    agregarPreguntaVariable,
    eliminarPreguntaDeAuditoria,
    recargarAuditoriaActual
  } = useAudit();

  const [showResumenModal, setShowResumenModal] = useState(false);
  const [auditoriasAnteriores, setAuditoriasAnteriores] = useState<Auditoria[]>([]);
  const [showAuditoriasModal, setShowAuditoriasModal] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false); // Para editar dentro del modo revisión
  const [cambiosPendientes, setCambiosPendientes] = useState(false); // Para detectar cambios
  const [respuestasOriginales, setRespuestasOriginales] = useState<Map<number, Respuesta>>(new Map()); // Backup de respuestas originales
  const [actualizandoAuditoria, setActualizandoAuditoria] = useState(false); // Estado local para actualización
  
  // Nuevos estados para tiendas y usuarios
  const [tiendas, setTiendas] = useState<{id_tienda: number, nombre: string}[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<{id_usuario: number, nombre: string, rol: string}[]>([]);
  const [cargandoTiendas, setCargandoTiendas] = useState(false);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<{id_tienda: number, nombre: string} | null>(null);

  // Estados para notas y conclusiones
  const [notasPersonal, setNotasPersonal] = useState('');
  const [notasCampanas, setNotasCampanas] = useState('');
  const [conclusiones, setConclusiones] = useState('');

  // Estados para modal de confirmación de finalizar
  const [showConfirmFinalizarModal, setShowConfirmFinalizarModal] = useState(false);

  // Función para guardar automáticamente las notas
  const guardarNotasAutomaticamente = async () => {
    if (!auditoriaActual) return;

    try {
      console.log('💾 Guardando notas automáticamente:', {
        notas_personal: notasPersonal,
        notas_campanas: notasCampanas,
        notas_conclusiones: conclusiones
      });

      const { error } = await supabase
        .from('auditorias')
        .update({
          notas_personal: notasPersonal,
          notas_campanas: notasCampanas,
          notas_conclusiones: conclusiones,
          updated_at: new Date().toISOString()
        })
        .eq('id_auditoria', auditoriaActual.id_auditoria);

      if (error) throw error;
      console.log('✅ Notas guardadas automáticamente');
    } catch (error) {
      console.error('❌ Error guardando notas:', error);
    }
  };
  const [preguntasSinResponder, setPreguntasSinResponder] = useState<Array<{categoria: string, subcategoria: string, pregunta: string, id_auditoria_pregunta: number}>>([]);
  const [fotosFaltantes, setFotosFaltantes] = useState<string[]>([]);

  // Estados para edición de preguntas
  const [modoEdicionPreguntas, setModoEdicionPreguntas] = useState<{[key: number]: boolean}>({});
  const [mostrarFormularioNuevaPregunta, setMostrarFormularioNuevaPregunta] = useState<{[key: number]: boolean}>({});
  const [textoNuevaPregunta, setTextoNuevaPregunta] = useState<{[key: number]: string}>({});





  // Cargar tiendas disponibles al montar el componente
  useEffect(() => {
    cargarTiendasDisponibles();
  }, []);

  // Cargar notas específicas cuando se carga una auditoría existente
  useEffect(() => {
    if (auditoriaActual && modoRevision) {
      console.log('📝 Cargando notas de auditoría existente:', {
        notas_personal: auditoriaActual.notas_personal,
        notas_campanas: auditoriaActual.notas_campanas,
        notas_conclusiones: auditoriaActual.notas_conclusiones
      });

      setNotasPersonal(auditoriaActual.notas_personal || '');
      setNotasCampanas(auditoriaActual.notas_campanas || '');
      setConclusiones(auditoriaActual.notas_conclusiones || '');
    }
  }, [auditoriaActual, modoRevision]);

  // Guardar notas automáticamente cuando cambien (con debounce)
  useEffect(() => {
    if (!auditoriaActual || isLoading) return;

    // Solo guardar si hay contenido y no estamos en el proceso inicial de carga
    const hayContenido = notasPersonal.trim() || notasCampanas.trim() || conclusiones.trim();
    if (!hayContenido) return;

    const timeoutId = setTimeout(() => {
      guardarNotasAutomaticamente();
    }, 2000); // Esperar 2 segundos después del último cambio

    return () => clearTimeout(timeoutId);
  }, [notasPersonal, notasCampanas, conclusiones, auditoriaActual, isLoading]);

  // Manejar parámetros URL para cargar auditoría específica
  useEffect(() => {
    const auditoriaId = searchParams.get('id');
    const modo = searchParams.get('modo');
    const step = searchParams.get('step');
    
    if (auditoriaId) {
      const id = parseInt(auditoriaId);
      console.log('🔍 Cargando auditoría desde historial:', id, 'modo:', modo, 'step:', step);
      
      // Manejar diferentes modos
      if (modo === 'revision') {
        setModoRevision(true);
        setModoEdicion(false);
      } else if (modo === 'resumen') {
        // Cargar auditoría y mostrar resumen directamente
        cargarAuditoriaExistente(id).then(() => {
          setShowResumenModal(true);
        });
        return; // No continuar con el resto de la lógica
      } else if (modo === 'edicion') {
        setModoRevision(false);
        setModoEdicion(true);
        // Si viene con step, establecer el step específico
        if (step) {
          const stepNumber = parseInt(step);
          if (stepNumber >= 1 && stepNumber <= 4) {
            setCurrentStep(stepNumber);
          }
        }
      } else {
        setModoRevision(false);
      }
      
      // Cargar la auditoría existente (excepto para modo resumen que ya se maneja arriba)
      if (modo !== 'resumen') {
        cargarAuditoriaExistente(id);
      }
    }
  }, [searchParams.get('id'), searchParams.get('modo'), searchParams.get('step')]);

  const cargarTiendasDisponibles = async () => {
    setCargandoTiendas(true);
    try {
      const { data: tiendasData, error: tiendasError } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .order('nombre');

      if (tiendasError) {
        console.error('Error cargando tiendas:', tiendasError);
        setError('Error al cargar las tiendas disponibles');
        return;
      }

      setTiendas(tiendasData || []);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      setError('Error al cargar las tiendas disponibles');
    } finally {
      setCargandoTiendas(false);
    }
  };

  const cargarUsuariosTienda = async (tienda: {id_tienda: number, nombre: string}) => {
    try {
      // Obtener todos los usuarios que tienen esta tienda asignada
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre, rol')
        .eq('id_tienda', tienda.id_tienda)
        .in('rol', ['admin', 'asesora']); // Solo admin y asesoras

      if (usuariosError) {
        console.error('Error cargando usuarios:', usuariosError);
        setUsuariosDisponibles([]);
        return;
      }

      setUsuariosDisponibles(usuariosData || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsuariosDisponibles([]);
    }
  };

  const handleTiendaChange = async (idTienda: string) => {
    const tienda = tiendas.find(t => t.id_tienda.toString() === idTienda);
    if (tienda) {
      setTiendaSeleccionada(tienda);
      handleFormularioChange('id_tienda', idTienda);
      
      // Cargar usuarios de la tienda
      await cargarUsuariosTienda(tienda);
      
      // Buscar auditorías anteriores
      buscarAuditoriasAnteriores(idTienda);
      
      // Limpiar el campo de quiénes reciben al cambiar de tienda
      handleFormularioChange('quienes_reciben', '');
      
      console.log(`✅ Tienda seleccionada: ${tienda.nombre} (ID: ${tienda.id_tienda})`);
    }
  };



  // Función para alternar modo de edición de preguntas por subcategoría
  const toggleModoEdicionPreguntas = (subcategoriaId: number) => {
    setModoEdicionPreguntas(prev => ({
      ...prev,
      [subcategoriaId]: !prev[subcategoriaId]
    }));
  };

  // Funciones para manejo de nueva pregunta
  const toggleFormularioNuevaPregunta = (subcategoriaId: number) => {
    setMostrarFormularioNuevaPregunta(prev => ({
      ...prev,
      [subcategoriaId]: !prev[subcategoriaId]
    }));
    // Limpiar el texto si se está cerrando
    if (mostrarFormularioNuevaPregunta[subcategoriaId]) {
      setTextoNuevaPregunta(prev => ({
        ...prev,
        [subcategoriaId]: ''
      }));
    }
  };

  const handleTextoNuevaPreguntaChange = (subcategoriaId: number, texto: string) => {
    setTextoNuevaPregunta(prev => ({
      ...prev,
      [subcategoriaId]: texto
    }));
  };

  // Función para agregar nueva pregunta (ahora usando sistema modular)
  const agregarNuevaPregunta = async (subcategoriaId: number) => {
    try {
      const textoTrimmed = (textoNuevaPregunta[subcategoriaId] || '').trim();
      if (!textoTrimmed) {
        alert('Por favor, escriba el texto de la pregunta');
        return;
      }

      if (!auditoriaActual) {
        alert('No hay auditoría activa');
        return;
      }

      // Usar la nueva función modular para agregar pregunta variable
      const exito = await agregarPreguntaVariable(
        auditoriaActual.id_auditoria, 
        subcategoriaId, 
        textoTrimmed
      );

      if (!exito) {
        throw new Error('Error en agregarPreguntaVariable');
      }

      // Limpiar el formulario
      setTextoNuevaPregunta(prev => ({
        ...prev,
        [subcategoriaId]: ''
      }));

      // Cerrar el formulario
      setMostrarFormularioNuevaPregunta(prev => ({
        ...prev,
        [subcategoriaId]: false
      }));

      console.log('✅ Nueva pregunta agregada exitosamente');

    } catch (error) {
      console.error('Error al agregar nueva pregunta:', error);
      alert('Error al agregar la pregunta. Por favor, intente nuevamente.');
    }
  };

  // Función para ocultar pregunta en auditoría específica (versión actualizada modular)
  const ocultarPreguntaEnAuditoria = async (idAuditoriaPregunta: number) => {
    try {
      if (!auditoriaActual) return;

      console.log(`🗑️ Intentando eliminar pregunta con ID: ${idAuditoriaPregunta}`);

      // Primero obtener información completa de la pregunta para determinar si es base o variable
      const { data: preguntaInfo, error: errorInfo } = await supabase
        .from('auditoria_preguntas')
        .select('id_pregunta, texto_pregunta, id_subcategoria')
        .eq('id_auditoria_pregunta', idAuditoriaPregunta)
        .single();

      if (errorInfo) throw errorInfo;

      console.log('📋 Información de pregunta:', preguntaInfo);

      // Si tiene id_pregunta, es una pregunta base -> usar sistema modular
      if (preguntaInfo.id_pregunta) {
        console.log('🔧 Eliminando pregunta base usando sistema modular');
        const exito = await eliminarPreguntaDeAuditoria(
          auditoriaActual.id_auditoria, 
          preguntaInfo.id_pregunta,
          'Eliminada desde interfaz de edición'
        );
        
        if (!exito) {
          throw new Error('Error en eliminarPreguntaDeAuditoria');
        }
      } else {
        // Si no tiene id_pregunta, es una pregunta variable -> eliminar completamente
        console.log('🔧 Eliminando pregunta variable de la base de datos');
        
        // Paso 1: Eliminar respuesta asociada si existe
        const { error: errorRespuesta } = await supabase
          .from('respuestas')
          .delete()
          .eq('id_auditoria_pregunta', idAuditoriaPregunta);

        if (errorRespuesta) {
          console.warn('⚠️ Error eliminando respuesta (puede no existir):', errorRespuesta);
        }

        // Paso 2: Buscar si existe en preguntas_variables por texto y subcategoría
        const { data: preguntaVariable, error: errorBusqueda } = await supabase
          .from('preguntas_variables')
          .select('id_pregunta_variable')
          .eq('id_auditoria', auditoriaActual.id_auditoria)
          .eq('id_subcategoria', preguntaInfo.id_subcategoria)
          .eq('texto_pregunta', preguntaInfo.texto_pregunta)
          .maybeSingle();

        if (errorBusqueda) {
          console.warn('⚠️ Error buscando pregunta variable:', errorBusqueda);
        }

        // Paso 3: Eliminar de preguntas_variables si existe
        if (preguntaVariable) {
          console.log(`🗑️ Eliminando pregunta variable con ID: ${preguntaVariable.id_pregunta_variable}`);
          const { error: errorEliminarVariable } = await supabase
            .from('preguntas_variables')
            .delete()
            .eq('id_pregunta_variable', preguntaVariable.id_pregunta_variable);

          if (errorEliminarVariable) {
            console.error('❌ Error eliminando de preguntas_variables:', errorEliminarVariable);
            throw errorEliminarVariable;
          }
        } else {
          console.log('ℹ️ No se encontró pregunta variable correspondiente');
        }

        // Paso 4: Eliminar de auditoria_preguntas
        const { error: errorAuditoriaPregunta } = await supabase
          .from('auditoria_preguntas')
          .delete()
          .eq('id_auditoria_pregunta', idAuditoriaPregunta)
          .eq('id_auditoria', auditoriaActual.id_auditoria);

        if (errorAuditoriaPregunta) {
          console.error('❌ Error eliminando de auditoria_preguntas:', errorAuditoriaPregunta);
          throw errorAuditoriaPregunta;
        }

        // Paso 5: Recargar la auditoría manteniendo el modo actual
        if (auditoriaActual?.id_auditoria) {
          await recargarAuditoriaActual(auditoriaActual.id_auditoria);
        }
      }
      
      console.log('✅ Pregunta eliminada exitosamente de la auditoría');
      
    } catch (error) {
      console.error('❌ Error eliminando pregunta:', error);
      setError('Error al eliminar la pregunta de la auditoría: ' + (error as Error).message);
    }
  };

  // Cargar auditorías anteriores cuando cambia la tienda
  const buscarAuditoriasAnteriores = async (idTienda: string) => {
    if (!idTienda || idTienda === '') return;
    
    setCargandoAnteriores(true);
    try {
      const anteriores = await obtenerAuditoriasAnteriores(parseInt(idTienda));
      setAuditoriasAnteriores(anteriores);
    } catch (error) {
      console.error('Error buscando auditorías anteriores:', error);
    } finally {
      setCargandoAnteriores(false);
    }
  };

  // Cargar auditoría anterior seleccionada
  const handleCargarAuditoriaAnterior = async (idAuditoria: number) => {
    setShowAuditoriasModal(false);
    const exito = await cargarAuditoriaAnterior(idAuditoria);
    if (exito) {
      setCurrentStep(2);
    }
  };

  // Ver detalles de auditoría anterior (cargar en modo revisión)
  const handleVerDetallesAuditoria = async (idAuditoria: number) => {
    setShowAuditoriasModal(false);
    const exito = await cargarAuditoriaExistente(idAuditoria);
    if (exito) {
      setCurrentStep(2);
      // Guardar backup de respuestas originales
      setRespuestasOriginales(new Map(respuestas));
      setCambiosPendientes(false);
    }
  };

  // Activar modo edición en revisión
  const activarModoEdicion = () => {
    setModoEdicion(true);
    // Guardar backup de respuestas originales para poder compararlas
    setRespuestasOriginales(new Map(respuestas));
    setCambiosPendientes(false);
  };

  // Cancelar edición y restaurar respuestas originales
  const cancelarEdicion = () => {
    setModoEdicion(false);
    setCambiosPendientes(false);
    // Aquí podrías restaurar las respuestas originales si quisieras
  };

  // Detectar cambios cuando se modifica una respuesta en modo edición
  const handleRespuestaChangeConDeteccion = async (id_auditoria_pregunta: number, valor: boolean) => {
    if (modoRevision && modoEdicion) {
      await handleRespuestaChange(id_auditoria_pregunta, valor);
      // Detectar si hay cambios comparando con respuestas originales
      const respuestaOriginal = respuestasOriginales.get(id_auditoria_pregunta);
      const respuestaActual = respuestas.get(id_auditoria_pregunta);
      
      const hayCambios = respuestaOriginal?.respuesta !== valor ||
                        respuestaOriginal?.comentario !== respuestaActual?.comentario ||
                        respuestaOriginal?.accion_correctiva !== respuestaActual?.accion_correctiva;
      
      setCambiosPendientes(hayCambios);
    } else {
      await handleRespuestaChange(id_auditoria_pregunta, valor);
    }
  };

  // Actualizar auditoría existente
  const actualizarAuditoria = async () => {
    if (!auditoriaActual || !modoRevision) return;

    try {
      setActualizandoAuditoria(true);
      
      // Actualizar estado de la auditoría si es necesario
      const { error: auditoriaError } = await supabase
        .from('auditorias')
        .update({
          calificacion_total: calcularResumen().calificacion_total_ponderada,
          updated_at: new Date().toISOString()
        })
        .eq('id_auditoria', auditoriaActual.id_auditoria);

      if (auditoriaError) throw auditoriaError;

      // Las respuestas individuales ya se guardan automáticamente con handleRespuestaChange
      
      setModoEdicion(false);
      setCambiosPendientes(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      console.log('✅ Auditoría actualizada exitosamente');
      
    } catch (error) {
      console.error('❌ Error actualizando auditoría:', error);
      setError('Error al actualizar la auditoría');
    } finally {
      setActualizandoAuditoria(false);
    }
  };

  // Función auxiliar para obtener el nombre del auditor
  const obtenerNombreAuditor = async (): Promise<string> => {
    try {
      console.log('🔍 Obteniendo nombre del auditor...', { 
        user: user ? { name: user.name, email: user.email, id: user.id } : null 
      });

      // Primero, intentar con el nombre del user del hook (más confiable)
      if (user?.name) {
        console.log('✅ Nombre obtenido del user hook:', user.name);
        return user.name;
      }

      // Si no, buscar en la base de datos por ID de usuario
      if (user?.id) {
        const { data: usuarioData, error } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', user.id)
          .single();

        if (!error && usuarioData?.nombre) {
          console.log('✅ Nombre obtenido de BD por ID:', usuarioData.nombre);
          return usuarioData.nombre;
        }
      }

      // Buscar por email si está disponible
      if (user?.email) {
        const { data: usuarioData, error } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('celular', user.email.split('@')[0]) // El email puede ser celular@tienda.com
          .single();

        if (!error && usuarioData?.nombre) {
          console.log('✅ Nombre obtenido de BD por celular:', usuarioData.nombre);
          return usuarioData.nombre;
        }
      }

      // Fallback: generar nombre descriptivo
      const fallbackName = user?.email?.split('@')[0] || user?.name || 'Auditor';
      console.log('⚠️ Usando nombre fallback:', fallbackName);
      return fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    } catch (error) {
      console.error('❌ Error obteniendo nombre del auditor:', error);
      return 'Sistema de Auditorías';
    }
  };

  // Función auxiliar para obtener el nombre de la tienda
  const obtenerNombreTienda = async (idTienda: number): Promise<string> => {
    try {
      console.log('🏪 Obteniendo nombre de la tienda...', { 
        idTienda, 
        tiendaSeleccionada: tiendaSeleccionada?.nombre 
      });

      // Primero usar tiendaSeleccionada si está disponible
      if (tiendaSeleccionada?.nombre) {
        console.log('✅ Nombre obtenido de tiendaSeleccionada:', tiendaSeleccionada.nombre);
        return tiendaSeleccionada.nombre;
      }

      // Si no, consultar directamente a la base de datos
      const { data: tiendaData, error } = await supabase
        .from('tiendas')
        .select('nombre')
        .eq('id_tienda', idTienda)
        .single();

      if (!error && tiendaData?.nombre) {
        console.log('✅ Nombre obtenido de BD:', tiendaData.nombre);
        return tiendaData.nombre;
      }

      console.warn('⚠️ No se encontró nombre de tienda:', { error, tiendaData });
      return `Tienda #${idTienda}`;
    } catch (error) {
      console.error('❌ Error obteniendo nombre de la tienda:', error);
      return `Tienda #${idTienda}`;
    }
  };

  // Función para notificar por email cuando se completa una auditoría
  const notificarAuditoriaCompletada = async (datosAuditoria: Auditoria) => {
    try {
      console.log('📧 Enviando notificaciones de auditoría completada...');
      
      // Obtener información adicional
      const resumen = calcularResumen();
      
      // Obtener nombres reales del auditor y la tienda
      const [nombreAuditor, nombreTienda] = await Promise.all([
        obtenerNombreAuditor(),
        obtenerNombreTienda(datosAuditoria.id_tienda)
      ]);
      
      console.log('👤 Información del auditor y tienda:', {
        auditor: nombreAuditor,
        tienda: nombreTienda,
        userEmail: user?.email,
        auditoriaId: datosAuditoria.id_auditoria,
        tiendaId: datosAuditoria.id_tienda
      });
      
      // Obtener conteo de fotos usando tu servicio existente
      let totalFotos = 0;
      try {
        const { data: conteoFotos } = await obtenerConteoFotos(datosAuditoria.id_auditoria);
        totalFotos = conteoFotos ? Object.values(conteoFotos).reduce((a: number, b: number) => a + b, 0) : 0;
      } catch (error) {
        console.warn('No se pudo obtener conteo de fotos:', error);
      }

      // Preparar resumen de categorías con porcentajes
      console.log('📊 Procesando categorías para email:', categorias.map(c => c.nombre));
      
      const categoriasResumen: CategoriaResumen[] = categorias.map(categoria => {
        const preguntasCategoria = categoria.subcategorias.flatMap(sub => sub.preguntas);
        const preguntasAprobadas = preguntasCategoria.filter(p => {
          const respuesta = respuestas.get(p.id_auditoria_pregunta);
          return respuesta && respuesta.respuesta === true;
        }).length;
        const preguntasReprobadas = preguntasCategoria.filter(p => {
          const respuesta = respuestas.get(p.id_auditoria_pregunta);
          return respuesta && respuesta.respuesta === false;
        }).length;
        const totalPreguntas = preguntasCategoria.length;
        const porcentaje = totalPreguntas > 0 ? (preguntasAprobadas / totalPreguntas) * 100 : 0;

        const categoriaResumen = {
          nombre: categoria.nombre,
          peso: categoria.peso || 0,
          calificacion: porcentaje,
          porcentaje: porcentaje,
          preguntas_total: totalPreguntas,
          preguntas_aprobadas: preguntasAprobadas,
          preguntas_reprobadas: preguntasReprobadas
        };

        console.log(`📈 Categoría procesada: ${categoria.nombre}`, categoriaResumen);
        return categoriaResumen;
      });

      console.log('📋 Resumen completo de categorías:', categoriasResumen);

      // Preparar resumen de fotos
      let fotosResumen: FotoResumen[] = [];
      try {
        const { data: conteoFotos } = await obtenerConteoFotos(datosAuditoria.id_auditoria);
        const tiposFotos = [
          'Fachada', 'Campaña y promociones', 'General de la tienda por los lados',
          'Punto de pago', 'Vestier', 'Implementos de aseo', 'Bodegas',
          'Personal de la tienda', 'Libro verde y carpetas', 
          'Cuaderno de seguimiento de pptos e informes de la marca'
        ];
        
        fotosResumen = tiposFotos.map(tipo => ({
          tipo,
          cantidad: conteoFotos?.[tipo as keyof typeof conteoFotos] || 0
        }));
      } catch (error) {
        console.warn('Error obteniendo resumen de fotos:', error);
      }

      // Preparar datos para el email con información detallada
      const datosEmail = {
        auditoria_id: datosAuditoria.id_auditoria,
        tienda_nombre: nombreTienda,
        fecha_auditoria: formatearFechaEmail(datosAuditoria.fecha || new Date()),
        calificacion_final: Math.round(resumen.calificacion_total_ponderada),
        to_email: '', // Se llenará para cada destinatario
        sistema_url: `${window.location.origin}/auditoria/estadisticas`,
        
        // Información detallada
        categorias: categoriasResumen,
        fotos: fotosResumen,
        comentarios_generales: notasPersonal || 'No se agregaron notas adicionales',
        observaciones: conclusiones || 'No se agregaron observaciones',
        total_preguntas: resumen.total_preguntas,
        preguntas_aprobadas: resumen.preguntas_aprobadas,
        preguntas_reprobadas: resumen.preguntas_reprobadas,
        auditor: nombreAuditor,
        
        // Campos específicos de la base de datos
        notas_personal: notasPersonal || datosAuditoria.notas_personal || 'No se registraron notas del personal.',
        notas_campanas: notasCampanas || datosAuditoria.notas_campanas || 'No se registraron notas específicas sobre campañas.',
        notas_conclusiones: conclusiones || datosAuditoria.notas_conclusiones || 'No se registraron conclusiones específicas.'
      };

      console.log('📊 Datos de la auditoría para notificar:', {
        id: datosEmail.auditoria_id,
        tienda: datosEmail.tienda_nombre,
        auditor: datosEmail.auditor,
        calificacion: datosEmail.calificacion_final,
        totalFotos,
        fecha: datosEmail.fecha_auditoria,
        categorias: categoriasResumen.length,
        fotos: fotosResumen.length
      });

      // Obtener lista de destinatarios
      const destinatarios = obtenerDestinatariosNotificacion();
      
      if (destinatarios.length === 0) {
        console.warn('⚠️ No hay destinatarios configurados para notificaciones');
        return;
      }

      console.log('📮 Enviando notificaciones a:', destinatarios);

      // Enviar notificación al primer destinatario (principal)
      const emailPrincipal = destinatarios[0];
      const resultado = await enviarNotificacionAuditoriaCompletada({
        ...datosEmail,
        to_email: emailPrincipal
      });

      if (resultado.success) {
        console.log('✅ Notificación enviada exitosamente a:', emailPrincipal);
        
        // Mostrar mensaje de éxito
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 4000);

        // Si hay más destinatarios, enviar a ellos también (opcional)
        if (destinatarios.length > 1) {
          console.log('📧 Enviando a destinatarios adicionales...');
          
          // Enviar a los demás destinatarios de forma asíncrona
          const destinatariosAdicionales = destinatarios.slice(1);
          destinatariosAdicionales.forEach(async (email) => {
            try {
              await enviarNotificacionAuditoriaCompletada({
                ...datosEmail,
                to_email: email
              });
              console.log('✅ Notificación adicional enviada a:', email);
            } catch (error) {
              console.error('❌ Error enviando a destinatario adicional:', email, error);
            }
          });
        }

      } else {
        console.error('❌ Error enviando notificación principal:', resultado.error);
        
        // Mostrar error al usuario pero no bloquear el flujo
        console.warn('⚠️ La auditoría se completó pero hubo un error enviando la notificación por email');
      }

    } catch (error) {
      console.error('❌ Error general enviando notificaciones:', error);
      // No fallar la finalización por error de notificación
      console.warn('⚠️ La auditoría se completó correctamente, pero no se pudo enviar la notificación por email');
    }
  };

  // Función wrapper para finalizar auditoría con redirección
  const manejarFinalizarAuditoria = async () => {
    try {
      console.log('💾 Finalizando auditoría con notas:', {
        notasPersonal,
        notasCampanas,
        conclusiones
      });
      
      const exito = await finalizarAuditoria(
        conclusiones, // observacionesFinales
        notasPersonal, // notasPersonal 
        notasCampanas, // notasCampanas
        conclusiones // conclusiones (también se usa como notas_conclusiones)
      );
      if (exito && auditoriaActual) {
        console.log('🎉 Auditoría finalizada exitosamente');
        
        // 🚀 NUEVA LÍNEA: Notificar a n8n
        await notificarAuditoriaCompletada(auditoriaActual);
        
        console.log('🎉 Redirección a estadísticas en 2 segundos...');
        // Pequeño delay para mostrar el mensaje de éxito antes de redireccionar
        setTimeout(() => {
          navigate('/auditoria/estadisticas');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error finalizando auditoría:', error);
    }
  };

  // Función para finalizar auditoría con validación de preguntas pendientes
  const manejarFinalizarAuditoriaConValidacion = async () => {
    if (!auditoriaActual) return;

    console.log('🔍 Iniciando proceso de finalización...', {
      auditoriaId: auditoriaActual.id_auditoria,
      estado: auditoriaActual.estado,
      modoRevision
    });

    // SIEMPRE verificar preguntas pendientes para mostrar resumen
    const preguntasSinResponder = [];
    
    for (const categoria of categorias) {
      for (const subcategoria of categoria.subcategorias) {
        for (const pregunta of subcategoria.preguntas) {
          const respuesta = respuestas.get(pregunta.id_auditoria_pregunta);
          if (!respuesta || respuesta.respuesta === null || respuesta.respuesta === undefined) {
            preguntasSinResponder.push({
              categoria: categoria.nombre,
              subcategoria: subcategoria.nombre,
              pregunta: pregunta.texto_pregunta,
              id_auditoria_pregunta: pregunta.id_auditoria_pregunta
            });
          }
        }
      }
    }

    // Verificar fotos faltantes por tipo
    let fotosFaltantes: string[] = [];
    try {
      const { data: conteoFotos } = await obtenerConteoFotos(auditoriaActual.id_auditoria);
      const TIPOS_FOTOS_REQUERIDOS = [
        'Fachada',
        'Campaña y promociones', 
        'General de la tienda por los lados',
        'Punto de pago',
        'Vestier'
      ] as const;
      
      fotosFaltantes = TIPOS_FOTOS_REQUERIDOS.filter(tipo => {
        const cantidad = conteoFotos?.[tipo as keyof typeof conteoFotos] || 0;
        return cantidad === 0;
      });
    } catch (error) {
      console.warn('No se pudo verificar fotos:', error);
    }

    console.log('📊 Resumen de auditoría:', {
      preguntasSinResponder: preguntasSinResponder.length,
      fotosFaltantes: fotosFaltantes.length,
      tiposFotosFaltantes: fotosFaltantes
    });

    // Si hay preguntas sin responder O fotos faltantes, mostrar modal informativo
    if (preguntasSinResponder.length > 0 || fotosFaltantes.length > 0) {
      console.log('⚠️ Mostrando modal de confirmación con resumen de pendientes');
      setPreguntasSinResponder(preguntasSinResponder);
      setFotosFaltantes(fotosFaltantes);
      setShowConfirmFinalizarModal(true);
      return; // Esperar respuesta del usuario en el modal
    }

    // Proceder con la finalización (todo completo)
    console.log('✅ Auditoría completa, finalizando...');
    await manejarFinalizarAuditoria();
  };

  // Confirmar finalización con preguntas pendientes
  const confirmarFinalizacionConPendientes = async () => {
    setShowConfirmFinalizarModal(false);
    setPreguntasSinResponder([]);
    setFotosFaltantes([]);
    await manejarFinalizarAuditoria();
  };

  // Cancelar finalización y cerrar modal
  const cancelarFinalizacion = () => {
    setShowConfirmFinalizarModal(false);
    setPreguntasSinResponder([]);
    setFotosFaltantes([]);
  };

  // Navegar a una pregunta específica
  const navegarAPregunta = (id_auditoria_pregunta: number) => {
    // Cerrar el modal
    setShowConfirmFinalizarModal(false);
    setPreguntasSinResponder([]);
    
    // Ir al step de evaluación si no estamos ahí
    if (currentStep !== 2) {
      setCurrentStep(2);
    }
    
    // Usar setTimeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      // Buscar el elemento con el ID de la pregunta
      const preguntaElement = document.querySelector(`[data-pregunta-id="${id_auditoria_pregunta}"]`);
      if (preguntaElement) {
        // Hacer scroll hasta el elemento con un offset para mejor visibilidad
        preguntaElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Resaltar temporalmente la pregunta
        preguntaElement.classList.add('ring-4', 'ring-yellow-300', 'ring-opacity-75');
        setTimeout(() => {
          preguntaElement.classList.remove('ring-4', 'ring-yellow-300', 'ring-opacity-75');
        }, 3000);
      }
    }, 100);
  };

  // Renderizar formulario inicial
  const renderFormularioInicial = () => (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nueva Auditoría</h2>
          <Button
            type="button"
            onClick={() => navigate('/preguntas-maestras')}
            variant="secondary"
            className="text-gray-600 hover:text-gray-800 px-2 py-1"
            title="Gestionar preguntas maestras"
          >
            ⋯
          </Button>
        </div>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (isSaving) return; // Prevenir múltiples envíos
          await crearNuevaAuditoria();
        }} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tienda *
            </label>
            <div className="flex gap-2">
              <select
                value={formularioAuditoria.id_tienda || ''}
                onChange={(e) => handleTiendaChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={cargandoTiendas}
              >
                <option value="">
                  {cargandoTiendas ? 'Cargando tiendas...' : 'Seleccione una tienda'}
                </option>
                {tiendas.map((tienda) => (
                  <option key={tienda.id_tienda} value={tienda.id_tienda}>
                    {tienda.nombre}
                  </option>
                ))}
              </select>
              {auditoriasAnteriores.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setShowAuditoriasModal(true)}
                  variant="secondary"
                  className="whitespace-nowrap"
                  disabled={cargandoAnteriores}
                >
                  {cargandoAnteriores ? '🔄' : '📋'} Anteriores ({auditoriasAnteriores.length})
                </Button>
              )}
            </div>
            {tiendaSeleccionada && (
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-800">
                  ✅ Tienda seleccionada: <strong>{tiendaSeleccionada.nombre}</strong>
                  {usuariosDisponibles.length > 0 && (
                    <span className="ml-2">
                      • {usuariosDisponibles.length} persona(s) disponible(s)
                    </span>
                  )}
                </p>
              </div>
            )}
            {auditoriasAnteriores.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                💡 Esta tienda tiene {auditoriasAnteriores.length} auditoría(s) anterior(es). 
                Puedes cargar una como plantilla.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Auditoría *
            </label>
            <input
              type="date"
              value={formularioAuditoria.fecha}
              onChange={(e) => handleFormularioChange('fecha', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiénes Reciben
            </label>
            {tiendaSeleccionada ? (
              <div className="space-y-2">
                {usuariosDisponibles.length > 0 ? (
                  <>
                    {usuariosDisponibles.map((usuario) => (
                      <label key={usuario.id_usuario} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formularioAuditoria.quienes_reciben.includes(usuario.nombre)}
                          onChange={(e) => {
                            const nombres = formularioAuditoria.quienes_reciben
                              .split(',')
                              .map(n => n.trim())
                              .filter(n => n);
                            
                            if (e.target.checked) {
                              nombres.push(usuario.nombre);
                            } else {
                              const index = nombres.indexOf(usuario.nombre);
                              if (index > -1) nombres.splice(index, 1);
                            }
                            
                            handleFormularioChange('quienes_reciben', nombres.join(', '));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm flex items-center">
                          {usuario.nombre}
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                            usuario.rol === 'admin' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {usuario.rol === 'admin' ? 'Admin' : 'Asesora'}
                          </span>
                        </span>
                      </label>
                    ))}
                    
                    {/* Solo mostrar nombres adicionales si no hay ningún trabajador seleccionado */}
                    {!usuariosDisponibles.some(usuario => formularioAuditoria.quienes_reciben.includes(usuario.nombre)) && (
                      <div className="pt-2 border-t">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Nombres adicionales (separados por comas):
                        </label>
                        <input
                          type="text"
                          value={formularioAuditoria.quienes_reciben}
                          onChange={(e) => handleFormularioChange('quienes_reciben', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Ej: Juan Pérez, María García"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 También puede escribir nombres manualmente si no están en la lista
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 italic p-2 bg-yellow-50 rounded border border-yellow-200">
                      ⚠️ Esta tienda no tiene administradores o asesores asignados en el sistema
                    </p>
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nombres adicionales (separados por comas):
                      </label>
                      <input
                        type="text"
                        value={formularioAuditoria.quienes_reciben}
                        onChange={(e) => handleFormularioChange('quienes_reciben', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Ej: Juan Pérez, María García"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Escriba los nombres de las personas que recibirán la auditoría
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  📍 Primero seleccione una tienda para ver las personas disponibles
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones Iniciales
            </label>
            <textarea
              value={formularioAuditoria.observaciones || ''}
              onChange={(e) => handleFormularioChange('observaciones', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observaciones generales sobre la auditoría"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSaving || !formularioAuditoria.id_tienda}
            >
              {isSaving ? 'Creando...' : 'Crear Auditoría'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );



  // Renderizar lista de preguntas por categoría
  const renderPreguntas = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
          Evaluación de Auditoría
          {auditoriaActual && (
            <span className="block sm:inline sm:ml-2 text-sm sm:text-lg font-normal text-gray-600">
              (ID: {auditoriaActual.id_auditoria})
            </span>
          )}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button 
            onClick={() => setShowResumenModal(true)}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Ver Resumen
          </Button>
          

          
          {/* Botones según el modo */}
          {modoRevision ? (
            <>
              {!modoEdicion && (
                <Button 
                  onClick={activarModoEdicion}
                  variant="secondary"
                >
                  ✏️ Editar Auditoría
                </Button>
              )}
              
              {modoEdicion && cambiosPendientes && (
                <>
                  <Button 
                    onClick={cancelarEdicion}
                    variant="secondary"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={actualizarAuditoria}
                    variant="primary"
                    disabled={actualizandoAuditoria}
                  >
                    {actualizandoAuditoria ? 'Actualizando...' : '💾 Actualizar Auditoría'}
                  </Button>
                </>
              )}
              
              {modoEdicion && !cambiosPendientes && (
                <Button 
                  onClick={cancelarEdicion}
                  variant="secondary"
                >
                  Salir de Edición
                </Button>
              )}
            </>
          ) : (
            // En modo normal (no revisión) no mostrar botones adicionales aquí
            <></>
          )}
        </div>
      </div>

      {categorias.map((categoria) => {
        console.log(`🔍 Renderizando categoría: ${categoria.nombre}`);
        categoria.subcategorias.forEach(sub => {
          console.log(`  📂 Subcategoría: ${sub.nombre} - ${sub.preguntas.length} preguntas`);
          sub.preguntas.forEach((pregunta, idx) => {
            console.log(`    📝 [${idx}] ID: ${pregunta.id_auditoria_pregunta}, Pregunta: "${pregunta.texto_pregunta.slice(0, 30)}...", id_pregunta: ${pregunta.id_pregunta}`);
          });
        });
        
        return (
        <Card key={categoria.id} className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{categoria.nombre}</h3>
              <Badge variant="info">
                Peso: {categoria.peso}%
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {categoria.subcategorias.map((subcategoria) => (
              <div key={subcategoria.id} className="border-l-4 border-blue-200 pl-6">
                <div className="mb-4 flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-gray-700">
                    {subcategoria.nombre}
                  </h4>
                  {!modoRevision && auditoriaActual && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => toggleModoEdicionPreguntas(subcategoria.id)}
                        variant="secondary"
                        className="text-xs px-3 py-1"
                      >
                        {modoEdicionPreguntas[subcategoria.id] ? '🔒 Finalizar Edición' : '✏️ Editar Preguntas'}
                      </Button>
                      {modoEdicionPreguntas[subcategoria.id] && (
                        <Button
                          onClick={() => toggleFormularioNuevaPregunta(subcategoria.id)}
                          variant="secondary"
                          className="text-xs px-3 py-1 bg-green-400 hover:bg-green-500 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 border border-green-500"
                        >
                          ➕ Pregunta Nueva
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {subcategoria.preguntas.map((pregunta, preguntaIdx) => (
                    <div key={
                      pregunta.id_auditoria_pregunta > 0 
                        ? `auditoria-${pregunta.id_auditoria_pregunta}` 
                        : `temp-${subcategoria.id}-${pregunta.id_pregunta || 'var'}-${preguntaIdx}-${pregunta.texto_pregunta.slice(0, 10)}`
                    }>
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-3 bg-white rounded border hover:bg-gray-50 transition-all duration-300 gap-3 sm:gap-0"
                        data-pregunta-id={pregunta.id_auditoria_pregunta}
                      >
                        <p className="text-gray-800 text-sm sm:flex-1 sm:mr-4 leading-relaxed">
                          {pregunta.texto_pregunta}
                        </p>
                        <div className="flex gap-2 items-center justify-end sm:justify-center flex-shrink-0">
                          {/* Botón de eliminar pregunta en modo edición */}
                          {modoEdicionPreguntas[subcategoria.id] && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('¿Estás seguro de que deseas ocultar esta pregunta de la auditoría?')) {
                                  ocultarPreguntaEnAuditoria(pregunta.id_auditoria_pregunta);
                                }
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer"
                              title="Ocultar pregunta de esta auditoría"
                            >
                              🗑️
                            </button>
                          )}
                          
                          {/* Botones ✓ y ✕ - SOLO mostrar si NO estamos en modo edición de preguntas */}
                          {!modoEdicionPreguntas[subcategoria.id] && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (modoRevision && modoEdicion) {
                                    handleRespuestaChangeConDeteccion(pregunta.id_auditoria_pregunta, true);
                                  } else if (!modoRevision) {
                                    handleRespuestaChange(pregunta.id_auditoria_pregunta, true);
                                  }
                                }}
                                disabled={modoRevision && !modoEdicion}
                                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 touch-manipulation ${
                                  pregunta.respuesta?.respuesta === true
                                    ? 'bg-green-500 text-white'
                                    : (modoRevision && !modoEdicion)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-200 text-green-600 hover:bg-green-500 hover:text-white cursor-pointer'
                                }`}
                              >
                                ✓
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (modoRevision && modoEdicion) {
                                    handleRespuestaChangeConDeteccion(pregunta.id_auditoria_pregunta, false);
                                  } else if (!modoRevision) {
                                    handleRespuestaChange(pregunta.id_auditoria_pregunta, false);
                                  }
                                }}
                                disabled={modoRevision && !modoEdicion}
                                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 touch-manipulation ${
                                  pregunta.respuesta?.respuesta === false
                                    ? 'bg-red-500 text-white'
                                    : (modoRevision && !modoEdicion)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-200 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer'
                                }`}
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Comentarios y Acciones Correctivas - SOLO cuando respuesta es false (✗) */}
                      {pregunta.respuesta?.respuesta === false && (
                        <div className="mt-6 border-t pt-4">
                          <div className="bg-red-50 rounded-lg p-4">
                            <h5 className="text-red-800 font-semibold mb-3 flex items-center">
                              <span className="text-red-600 mr-2">⚠️</span>
                              Acciones Requeridas
                            </h5>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-red-700 mb-2">
                                  Comentario
                                </label>
                                <textarea
                                  value={pregunta.respuesta.comentario || ''}
                                  onChange={(e) => {
                                    if (modoRevision && modoEdicion) {
                                      handleComentarioChange(pregunta.id_auditoria_pregunta, e.target.value);
                                      setCambiosPendientes(true);
                                    } else if (!modoRevision) {
                                      handleComentarioChange(pregunta.id_auditoria_pregunta, e.target.value);
                                    }
                                  }}
                                  disabled={modoRevision && !modoEdicion}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none text-sm ${
                                    (modoRevision && !modoEdicion)
                                      ? 'border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
                                      : 'border-red-300 bg-white focus:ring-2 focus:ring-red-500'
                                  }`}
                                  rows={3}
                                  placeholder={modoRevision && !modoEdicion ? '' : "Describe el problema encontrado..."}
                                  readOnly={modoRevision && !modoEdicion}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-red-700 mb-2">
                                  Acción Correctiva {(!modoRevision || modoEdicion) && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                  value={pregunta.respuesta.accion_correctiva || ''}
                                  onChange={(e) => {
                                    if (modoRevision && modoEdicion) {
                                      handleAccionCorrectivaChange(pregunta.id_auditoria_pregunta, e.target.value);
                                      setCambiosPendientes(true);
                                    } else if (!modoRevision) {
                                      handleAccionCorrectivaChange(pregunta.id_auditoria_pregunta, e.target.value);
                                    }
                                  }}
                                  disabled={modoRevision && !modoEdicion}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none text-sm ${
                                    (modoRevision && !modoEdicion)
                                      ? 'border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
                                      : 'border-red-300 bg-white focus:ring-2 focus:ring-red-500'
                                  }`}
                                  rows={3}
                                  placeholder={modoRevision && !modoEdicion ? '' : "¿Qué acciones se deben tomar para corregir?"}
                                  readOnly={modoRevision && !modoEdicion}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Comentario opcional para respuestas positivas */}
                      {pregunta.respuesta?.respuesta === true && (
                        <div className="mt-4">
                          {/* No mostrar en modo revisión sin edición */}
                          {(!modoRevision || modoEdicion) && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center">
                                <span className="mr-2">📝</span>
                                Agregar comentario opcional
                                <span className="ml-2 transform transition-transform group-open:rotate-180">▼</span>
                              </summary>
                            <div className="mt-3">
                              <textarea
                                value={pregunta.respuesta.comentario || ''}
                                onChange={(e) => {
                                  if (modoRevision && modoEdicion) {
                                    handleComentarioChange(pregunta.id_auditoria_pregunta, e.target.value);
                                    setCambiosPendientes(true);
                                  } else if (!modoRevision) {
                                    handleComentarioChange(pregunta.id_auditoria_pregunta, e.target.value);
                                  }
                                }}
                                disabled={modoRevision && !modoEdicion}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none text-sm ${
                                  (modoRevision && !modoEdicion)
                                    ? 'border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
                                    : 'border-gray-300 bg-green-50 focus:ring-2 focus:ring-green-500'
                                }`}
                                rows={2}
                                placeholder={modoRevision && !modoEdicion ? '' : "Observaciones adicionales (opcional)..."}
                                readOnly={modoRevision && !modoEdicion}
                              />
                            </div>
                          </details>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Formulario para nueva pregunta */}
                  {mostrarFormularioNuevaPregunta[subcategoria.id] && (
                    <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 mt-4 shadow-lg">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => agregarNuevaPregunta(subcategoria.id)}
                          disabled={!textoNuevaPregunta[subcategoria.id]?.trim()}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-green-600"
                          title="Guardar nueva pregunta"
                        >
                          ➕
                        </button>
                        <input
                          type="text"
                          value={textoNuevaPregunta[subcategoria.id] || ''}
                          onChange={(e) => handleTextoNuevaPreguntaChange(subcategoria.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && textoNuevaPregunta[subcategoria.id]?.trim()) {
                              agregarNuevaPregunta(subcategoria.id);
                            }
                          }}
                          placeholder="Escriba aquí la nueva pregunta..."
                          className="flex-1 px-4 py-2 border-2 border-green-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-600 bg-white shadow-inner"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div> {/* Cierre del div className="p-6 space-y-6" */}
        </Card>
        );
      })}

      {/* Navegación al siguiente paso */}
      <Card className="mt-8">
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4">
            ¡Evaluación completada! Continúa con las fotos de auditoría.
          </p>
          <Button
            variant="primary"
            onClick={() => setCurrentStep(3)}
            className="px-8 py-3 text-lg"
          >
            📸 Siguiente: Fotos →
          </Button>
        </div>
      </Card>

      {/* Botón de Guardar y Ver Resumen */}
      {!modoRevision && (
        <div className="mt-8 text-center">
          <Button 
            onClick={() => setShowResumenModal(true)}
            variant="secondary"
            disabled={isSaving}
            className="px-8 py-3 text-lg"
          >
            � Guardar y Ver Resumen
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ Continúa con fotos y conclusiones para completar la auditoría
          </p>
        </div>
      )}
    </div>
  );

  // Modal de resumen
  const renderResumenModal = () => {
    const resumen = calcularResumen();
    
    return (
      <Modal 
        isOpen={showResumenModal} 
        onClose={() => setShowResumenModal(false)}
        title="📊 Progreso de Evaluación"
      >
        <div className="space-y-6">
          {/* Resumen General */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">Resumen General</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{resumen.total_preguntas}</p>
                <p className="text-sm text-gray-600">Total Preguntas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{resumen.preguntas_aprobadas}</p>
                <p className="text-sm text-gray-600">Aprobadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{resumen.preguntas_reprobadas}</p>
                <p className="text-sm text-gray-600">Reprobadas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{resumen.calificacion_total_ponderada}%</p>
                <p className="text-sm text-gray-600">Calificación Final</p>
              </div>
            </div>
          </div>

          {/* Resumen por Categorías */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen por Categorías</h3>
            <div className="space-y-3">
              {resumen.categorias_resumen.map((categoria) => (
                <div key={categoria.categoria_id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">{categoria.categoria_nombre}</h4>
                    <Badge 
                      variant={categoria.porcentaje_cumplimiento >= 80 ? 'success' : 
                              categoria.porcentaje_cumplimiento >= 60 ? 'warning' : 'error'}
                    >
                      {categoria.porcentaje_cumplimiento}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Peso: {categoria.peso_categoria}%</span>
                    <span>Contribución: {categoria.contribucion_ponderada.toFixed(1)} puntos</span>
                    <span>{categoria.preguntas_aprobadas}/{categoria.total_preguntas} preguntas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-800 mb-2">📋 Resumen de Evaluación</h4>
            
            {currentStep === 2 ? (
              <>
                <p className="text-sm text-blue-700">
                  Este es un resumen del progreso actual de las preguntas respondidas. 
                  Para completar la auditoría, continúa con:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4">
                  <li>• 📸 Subir fotos de evidencia</li>
                  <li>• 📝 Agregar notas y conclusiones</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm text-blue-700">
                  Resumen actual de las preguntas evaluadas. El progreso se guardará automáticamente.
                </p>
                <div className="text-sm text-blue-700 mt-2 bg-blue-100 rounded p-2">
                  💾 Al guardar, regresarás a la pestaña de información para continuar después.
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between">
            <Button 
              onClick={() => setShowResumenModal(false)}
              variant="secondary"
            >
              Continuar Evaluando
            </Button>
            
            {/* Botón dinámico según el paso actual */}
            {currentStep === 2 ? (
              <Button 
                onClick={() => {
                  setShowResumenModal(false);
                  setCurrentStep(3); // Ir a la sección de fotos
                }}
                variant="primary"
              >
                📸 Continuar con Fotos
              </Button>
            ) : (
              <Button 
                onClick={async () => {
                  setShowResumenModal(false);
                  // Guardar progreso y redirigir a información
                  if (auditoriaActual) {
                    // Aquí podrías agregar lógica para guardar el progreso si es necesario
                    setCurrentStep(1); // Redirigir a la pestaña información
                  }
                }}
                variant="primary"
              >
                💾 Guardar Progreso
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 px-2 sm:px-6">
      {/* Mensajes de Estado */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Cerrar</span>
            ×
          </button>
        </div>
      )}

      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <strong className="font-bold">¡Éxito! </strong>
          <span className="block sm:inline">Operación completada correctamente.</span>
        </div>
      )}

      {/* Header de la aplicación */}
      <div className="mb-8 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {modoRevision ? '📋 Revisión de Auditoría' : '🚀 Auditorías'}
            </h1>
            {modoRevision && auditoriaActual && (
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>ID: #{auditoriaActual.id_auditoria}</span>
                <span>Fecha: {new Date(auditoriaActual.fecha).toLocaleDateString()}</span>
                <Badge 
                  variant={
                    auditoriaActual.estado === 'completada' ? 'success' :
                    auditoriaActual.estado === 'revisada' ? 'info' : 'warning'
                  }
                >
                  {auditoriaActual.estado.toUpperCase()}
                </Badge>
                <span>Calificación: {auditoriaActual.calificacion_total}%</span>
                {modoEdicion && (
                  <>
                    <span>•</span>
                    <Badge variant="warning">
                      ✏️ MODO EDICIÓN
                    </Badge>
                    {cambiosPendientes && (
                      <Badge variant="error">
                        ⚠️ CAMBIOS SIN GUARDAR
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {modoRevision && (
            <Button
              variant="secondary"
              onClick={() => {
                setModoRevision(false);
                setCurrentStep(1);
                setAuditoriaActual(null);
                cargarEstructuraCatalogo();
              }}
            >
              ← Nueva Auditoría
            </Button>
          )}
        </div>
      </div>

      {/* Navegación de Pasos - Responsive */}
      <div className="mb-8">
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-2 sm:gap-4 lg:gap-8">
          <Button 
            variant={currentStep === 1 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(1)}
            className="text-xs sm:text-sm w-full sm:w-auto"
          >
            <span className="hidden sm:inline">1. Información</span>
            <span className="sm:hidden">1. Info</span>
          </Button>
          <Button 
            variant={currentStep === 2 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(2)}
            disabled={!auditoriaActual}
            className="text-xs sm:text-sm w-full sm:w-auto"
          >
            <span className="hidden sm:inline">2. Evaluación</span>
            <span className="sm:hidden">2. Eval.</span>
          </Button>
          <Button 
            variant={currentStep === 3 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(3)}
            disabled={!auditoriaActual}
            className="text-xs sm:text-sm w-full sm:w-auto"
          >
            <span className="hidden sm:inline">3. Fotos</span>
            <span className="sm:hidden">3. Fotos</span>
          </Button>
          <Button 
            variant={currentStep === 4 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(4)}
            disabled={!auditoriaActual}
            className="text-xs sm:text-sm w-full sm:w-auto col-span-2 sm:col-span-1"
          >
            <span className="hidden sm:inline">4. Notas y Conclusiones</span>
            <span className="sm:hidden">4. Finalizar</span>
          </Button>
        </div>
      </div>

      {/* Contenido Principal */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <>
          {currentStep === 1 && renderFormularioInicial()}
          {currentStep === 2 && renderPreguntas()}
          {currentStep === 3 && auditoriaActual && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  📸 Fotos de Auditoría
                  <span className="ml-2 text-lg font-normal text-gray-600">
                    (ID: {auditoriaActual.id_auditoria})
                  </span>
                </h2>
              </div>
              
              <GestorFotos 
                idAuditoria={auditoriaActual.id_auditoria}
                readonly={modoRevision && !modoEdicion}
              />
              
              {/* Navegación al siguiente paso */}
              {!modoRevision && (
                <Card className="mt-8">
                  <div className="p-6 text-center">
                    <p className="text-gray-600 mb-4">
                      ¡Fotos completadas! Continúa con las notas y conclusiones.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setCurrentStep(4)}
                      className="px-8 py-3 text-lg"
                    >
                      📝 Siguiente: Notas y Conclusiones →
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
          {currentStep === 4 && auditoriaActual && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  📝 Notas y Conclusiones
                  <span className="ml-2 text-lg font-normal text-gray-600">
                    (ID: {auditoriaActual.id_auditoria})
                  </span>
                </h2>
                
                {/* Indicador de estado de la auditoría */}
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      auditoriaActual.estado === 'completada' ? 'default' :
                      auditoriaActual.estado === 'revisada' ? 'default' :
                      'default'
                    }
                  >
                    {auditoriaActual.estado === 'completada' ? '✅ Completada' :
                     auditoriaActual.estado === 'revisada' ? '🔒 Revisada' :
                     '🔄 En Progreso'}
                  </Badge>
                  {modoRevision && (
                    <Badge variant="default">
                      👁️ Modo Revisión
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Sección de Notas y Conclusiones */}
              <Card>
                <div className={`text-white p-4 ${
                  auditoriaActual.estado === 'completada' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  auditoriaActual.estado === 'revisada' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                  'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}>
                  <h3 className="text-xl font-bold">
                    {auditoriaActual.estado === 'completada' ? '✅ Auditoría Completada' :
                     auditoriaActual.estado === 'revisada' ? '� Auditoría Revisada' :
                     '�📋 Completa la auditoría'}
                  </h3>
                  {auditoriaActual.estado === 'completada' && (
                    <p className="text-sm opacity-90 mt-1">
                      Esta auditoría ha sido finalizada. Puedes re-finalizarla para enviar nuevas notificaciones.
                    </p>
                  )}
                  {auditoriaActual.estado === 'revisada' && (
                    <p className="text-sm opacity-90 mt-1">
                      Esta auditoría ha sido revisada. Puedes finalizarla nuevamente si es necesario.
                    </p>
                  )}
                  {auditoriaActual.estado === 'en_progreso' && (
                    <p className="text-sm opacity-90 mt-1">
                      Completa las notas y conclusiones, luego finaliza la auditoría.
                    </p>
                  )}
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notas del Personal
                      </label>
                      <textarea
                        value={notasPersonal}
                        onChange={(e) => setNotasPersonal(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Notas sobre el personal de la tienda..."
                        disabled={modoRevision && !modoEdicion}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campañas y Tienda en General
                      </label>
                      <textarea
                        value={notasCampanas}
                        onChange={(e) => setNotasCampanas(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Notas sobre campañas y estado general de la tienda..."
                        disabled={modoRevision && !modoEdicion}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conclusiones Finales
                    </label>
                    <textarea
                      value={conclusiones}
                      onChange={(e) => setConclusiones(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Conclusiones generales de la auditoría..."
                      disabled={modoRevision && !modoEdicion}
                    />
                  </div>
                </div>
              </Card>

              {/* Botones finales */}
              <Card>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={() => setShowResumenModal(true)}
                      variant="secondary"
                      className="px-6 py-3 text-lg"
                    >
                      📋 Ver Resumen
                    </Button>
                    
                    {/* Botón de Finalizar - siempre visible y funcional */}
                    <Button 
                      onClick={manejarFinalizarAuditoriaConValidacion}
                      variant="primary"
                      disabled={isSaving}
                      className="px-6 py-3 text-lg"
                    >
                      {isSaving ? 'Finalizando...' : 
                       auditoriaActual?.estado === 'completada' ? '✅ Re-finalizar Auditoría' : 
                       auditoriaActual?.estado === 'revisada' ? '� Finalizar Nuevamente' : 
                       '✅ Finalizar Auditoría'
                      }
                    </Button>
                    
                    {/* Botón de Guardar Cambios para modo edición */}
                    {modoRevision && modoEdicion && cambiosPendientes && (
                      <Button 
                        onClick={actualizarAuditoria}
                        variant="primary"
                        disabled={actualizandoAuditoria}
                        className="px-6 py-3 text-lg"
                      >
                        {actualizandoAuditoria ? 'Actualizando...' : '💾 Guardar Cambios'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {showResumenModal && renderResumenModal()}
      {showAuditoriasModal && renderAuditoriasAnterioresModal()}
      {showConfirmFinalizarModal && renderConfirmFinalizarModal()}
    </div>
  );

  // Modal de confirmación para finalizar con preguntas pendientes
  function renderConfirmFinalizarModal() {
    return (
      <Modal
        isOpen={showConfirmFinalizarModal}
        onClose={cancelarFinalizacion}
        title={
          preguntasSinResponder.length === 0 && fotosFaltantes.length === 0 
            ? "✅ Confirmar Finalización" 
            : "⚠️ Revisar Antes de Finalizar"
        }
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Resumen de pendientes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-yellow-800 font-bold">!</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  Resumen antes de finalizar
                </h3>
                <div className="space-y-1">
                  {preguntasSinResponder.length > 0 && (
                    <p className="text-yellow-700">
                      📝 <strong>{preguntasSinResponder.length} pregunta(s)</strong> sin responder (se considerarán NO APROBADAS)
                    </p>
                  )}
                  {fotosFaltantes.length > 0 && (
                    <p className="text-yellow-700">
                      📸 <strong>{fotosFaltantes.length} tipo(s) de foto</strong> sin subir
                    </p>
                  )}
                  {preguntasSinResponder.length === 0 && fotosFaltantes.length === 0 && (
                    <p className="text-green-700">
                      ✅ <strong>¡Auditoría completa!</strong> Todas las preguntas respondidas y fotos cargadas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección de fotos faltantes */}
          {fotosFaltantes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">📸 Tipos de fotos faltantes:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fotosFaltantes.map((tipo, index) => (
                  <div key={index} className="flex items-center text-blue-700 bg-blue-100 rounded px-3 py-2">
                    <span className="text-blue-500 mr-2">📷</span>
                    <span className="text-sm font-medium">{tipo}</span>
                  </div>
                ))}
              </div>
              <p className="text-blue-600 text-sm mt-3">
                💡 Puedes ir al Paso 3 para subir las fotos faltantes antes de finalizar.
              </p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-800 mb-3">Preguntas pendientes:</h4>
            <div className="space-y-2">
              {preguntasSinResponder.slice(0, 8).map((pregunta, index) => (
                <div 
                  key={index} 
                  className="border-l-4 border-red-300 pl-3 py-2 bg-red-50 rounded-r cursor-pointer hover:bg-red-100 transition-colors duration-200 group"
                  onClick={() => navegarAPregunta(pregunta.id_auditoria_pregunta)}
                  title="Clic para ir a esta pregunta"
                >
                  <div className="text-sm">
                    <p className="font-medium text-red-800 group-hover:text-red-900">
                      📍 {pregunta.categoria} → {pregunta.subcategoria}
                    </p>
                    <p className="text-red-700 mt-1 group-hover:text-red-800">
                      {pregunta.pregunta.length > 100 
                        ? `${pregunta.pregunta.slice(0, 100)}...`
                        : pregunta.pregunta
                      }
                    </p>
                    <p className="text-xs text-red-500 mt-1 group-hover:text-red-600 font-medium">
                      👆 Clic aquí para ir a esta pregunta
                    </p>
                  </div>
                </div>
              ))}
              
              {preguntasSinResponder.length > 8 && (
                <div className="text-center text-gray-500 text-sm py-2">
                  ... y {preguntasSinResponder.length - 8} pregunta(s) más
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">💡 Navegación Rápida:</h4>
            <p className="text-blue-700 text-sm">
              <strong>Haz clic en cualquier pregunta</strong> de la lista para ir directamente a ella y responderla. 
              El modal se cerrará automáticamente y la página se desplazará hasta la pregunta seleccionada.
            </p>
            <p className="text-blue-600 text-xs mt-2">
              ✨ También puedes finalizar la auditoría con preguntas pendientes, pero afectará la calificación final.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button 
              onClick={cancelarFinalizacion}
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              {(preguntasSinResponder.length > 0 || fotosFaltantes.length > 0) 
                ? '📝 Completar Pendientes' 
                : '❌ Cancelar'}
            </Button>
            <Button 
              onClick={confirmarFinalizacionConPendientes}
              variant={
                (preguntasSinResponder.length === 0 && fotosFaltantes.length === 0) 
                  ? "primary" 
                  : "danger"
              }
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? 'Finalizando...' : 
               (preguntasSinResponder.length === 0 && fotosFaltantes.length === 0)
                ? '✅ Finalizar Auditoría'
                : '⚠️ Finalizar Incompleta'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Modal para mostrar auditorías anteriores
  function renderAuditoriasAnterioresModal() {
    return (
      <Modal
        isOpen={showAuditoriasModal}
        onClose={() => setShowAuditoriasModal(false)}
        title="Auditorías Anteriores"
        size="lg"
      >
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-600">
              Selecciona una auditoría anterior para usar como plantilla. 
              Las respuestas previas se aplicarán automáticamente a las preguntas coincidentes.
            </p>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {auditoriasAnteriores.map((auditoria) => (
              <div
                key={auditoria.id_auditoria}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-800">
                        Auditoría #{auditoria.id_auditoria}
                      </h4>
                      <Badge 
                        variant={
                          auditoria.estado === 'completada' ? 'success' :
                          auditoria.estado === 'revisada' ? 'info' : 'warning'
                        }
                      >
                        {auditoria.estado.toUpperCase()}
                      </Badge>
                      <Badge variant="default">
                        {auditoria.calificacion_total}%
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Fecha:</strong> {new Date(auditoria.fecha).toLocaleDateString()}</p>
                      {auditoria.quienes_reciben && (
                        <p><strong>Reciben:</strong> {auditoria.quienes_reciben}</p>
                      )}
                      {auditoria.observaciones && (
                        <p className="truncate"><strong>Observaciones:</strong> {auditoria.observaciones}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVerDetallesAuditoria(auditoria.id_auditoria)}
                  >
                    Ver Detalles
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCargarAuditoriaAnterior(auditoria.id_auditoria)}
                  >
                    Usar como Plantilla
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {auditoriasAnteriores.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <p>No se encontraron auditorías anteriores para esta tienda.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowAuditoriasModal(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-6">
    </div>
  );
}

export default Auditoria;