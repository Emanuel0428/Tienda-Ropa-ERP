import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAudit2 } from '../hooks/useAudit2';
import { supabase } from '../supabaseClient';
import type { Auditoria, Respuesta } from '../types/audit2';

const Auditoria2 = () => {
  const navigate = useNavigate();
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
    
    // Estados de gestión de preguntas
    showPreguntaModal,
    preguntaEditando,
    subcategoriaSeleccionada,
    
    // Funciones principales
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
    cargarEstructuraCatalogo,
    setAuditoriaActual
  } = useAudit2();

  const [showResumenModal, setShowResumenModal] = useState(false);
  const [auditoriasAnteriores, setAuditoriasAnteriores] = useState<Auditoria[]>([]);
  const [showAuditoriasModal, setShowAuditoriasModal] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false); // Para editar dentro del modo revisión
  const [cambiosPendientes, setCambiosPendientes] = useState(false); // Para detectar cambios
  const [respuestasOriginales, setRespuestasOriginales] = useState<Map<number, Respuesta>>(new Map()); // Backup de respuestas originales
  const [actualizandoAuditoria, setActualizandoAuditoria] = useState(false); // Estado local para actualización

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

  // Renderizar formulario inicial
  const renderFormularioInicial = () => (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Auditoría 2.0</h2>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          await crearNuevaAuditoria();
        }} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tienda *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formularioAuditoria.id_tienda}
                onChange={(e) => {
                  handleFormularioChange('id_tienda', e.target.value);
                  buscarAuditoriasAnteriores(e.target.value);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingrese el ID de la tienda"
                required
              />
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
            <input
              type="text"
              value={formularioAuditoria.quienes_reciben}
              onChange={(e) => handleFormularioChange('quienes_reciben', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombres de las personas que reciben la auditoría"
            />
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Evaluación de Auditoría
          {auditoriaActual && (
            <span className="ml-2 text-lg font-normal text-gray-600">
              (ID: {auditoriaActual.id_auditoria})
            </span>
          )}
        </h2>
        <div className="flex gap-4">
          <Button 
            onClick={() => setShowResumenModal(true)}
            variant="secondary"
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
            <Button 
              onClick={() => finalizarAuditoria()}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Finalizando...' : 'Finalizar Auditoría'}
            </Button>
          )}
        </div>
      </div>

      {categorias.map((categoria) => (
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
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-700">
                    {subcategoria.nombre}
                  </h4>
                  <Button
                    onClick={() => {
                      setSubcategoriaSeleccionada(subcategoria.id);
                      setShowPreguntaModal(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    + Agregar Pregunta
                  </Button>
                </div>

                <div className="space-y-4">
                  {subcategoria.preguntas.map((pregunta) => (
                    <div key={pregunta.id_auditoria_pregunta} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-gray-800 font-medium flex-1 mr-4">
                          {pregunta.texto_pregunta}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              // Convertir AuditoriaPregunta a Pregunta para edición
                              const preguntaCatalogo = {
                                id: pregunta.id_pregunta,
                                subcategoria_id: pregunta.id_subcategoria,
                                texto_pregunta: pregunta.texto_pregunta,
                                orden: pregunta.orden,
                                activo: true,
                                created_at: pregunta.created_at,
                                updated_at: pregunta.created_at
                              };
                              setPreguntaEditando(preguntaCatalogo);
                              setShowPreguntaModal(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Botones de respuesta mejorados con ✓ y ✗ */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Respuesta
                          </label>
                          <div className="flex gap-6 justify-center">
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
                              className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 transition-all duration-200 ${
                                pregunta.respuesta?.respuesta === true
                                  ? 'bg-green-500 border-green-600 text-white shadow-lg scale-105'
                                  : (modoRevision && !modoEdicion)
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-white border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 cursor-pointer'
                              }`}
                            >
                              <span className="text-3xl font-bold">✓</span>
                              <span className="text-xs font-medium mt-1">CUMPLE</span>
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
                              className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 transition-all duration-200 ${
                                pregunta.respuesta?.respuesta === false
                                  ? 'bg-red-500 border-red-600 text-white shadow-lg scale-105'
                                  : (modoRevision && !modoEdicion)
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 cursor-pointer'
                              }`}
                            >
                              <span className="text-3xl font-bold">✗</span>
                              <span className="text-xs font-medium mt-1">NO CUMPLE</span>
                            </button>
                          </div>
                        </div>

                        {/* Estado visual de la respuesta */}
                        <div className="flex items-center justify-center">
                          {pregunta.respuesta?.respuesta === true && (
                            <Badge variant="success">✓ Cumple</Badge>
                          )}
                          {pregunta.respuesta?.respuesta === false && (
                            <Badge variant="error">✗ No Cumple</Badge>
                          )}
                          {pregunta.respuesta === undefined && (
                            <Badge variant="warning">Sin Respuesta</Badge>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  // Modal de resumen
  const renderResumenModal = () => {
    const resumen = calcularResumen();
    
    return (
      <Modal 
        isOpen={showResumenModal} 
        onClose={() => setShowResumenModal(false)}
        title="Resumen de Auditoría"
      >
        <div className="space-y-6">
          {/* Resumen General */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">Resumen General</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

          <div className="flex justify-end gap-4">
            <Button 
              onClick={() => setShowResumenModal(false)}
              variant="secondary"
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                setShowResumenModal(false);
                finalizarAuditoria();
              }}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Finalizando...' : 'Finalizar Auditoría'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {modoRevision ? '📋 Revisión de Auditoría' : '🚀 Auditorías 2.0'}
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

      {/* Navegación de Pasos */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          <Button 
            variant={currentStep === 1 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(1)}
          >
            1. Información
          </Button>
          <Button 
            variant={currentStep === 2 ? 'primary' : 'secondary'}
            onClick={() => setCurrentStep(2)}
            disabled={!auditoriaActual}
          >
            2. Evaluación
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
        </>
      )}

      {/* Modales */}
      {showResumenModal && renderResumenModal()}
      {showAuditoriasModal && renderAuditoriasAnterioresModal()}
    </div>
  );

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
};

export default Auditoria2;