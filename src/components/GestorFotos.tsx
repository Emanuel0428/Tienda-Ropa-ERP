import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { 
  subirFotoAuditoria, 
  obtenerFotosAuditoria, 
  eliminarFotoAuditoria,
  obtenerConteoFotos,
  TIPOS_FOTOS, 
  TipoFoto,
  AuditoriaFoto 
} from '../services/imageService';

interface GestorFotosProps {
  idAuditoria: number;
  readonly?: boolean;
}

const GestorFotos: React.FC<GestorFotosProps> = ({ idAuditoria, readonly = false }) => {
  const [fotos, setFotos] = useState<AuditoriaFoto[]>([]);
  const [conteoFotos, setConteoFotos] = useState<Record<TipoFoto, number>>({} as Record<TipoFoto, number>);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null); // tipo de foto que se está subiendo
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoFoto | null>(null);
  const [fotosViendo, setFotosViendo] = useState<AuditoriaFoto[]>([]);
  const [fotoModalAbierta, setFotoModalAbierta] = useState<string | null>(null);

  // Detectar si es iOS
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const esSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    if (idAuditoria) {
      cargarFotos();
      cargarConteo();
    }
    
    // Log de información del dispositivo para diagnóstico
    if (esIOS) {
      console.log('📱 Dispositivo iOS detectado:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        safari: esSafari,
        touchSupport: 'ontouchstart' in window
      });
    }
  }, [idAuditoria]);

  const cargarFotos = async () => {
    setIsLoading(true);
    const result = await obtenerFotosAuditoria(idAuditoria);
    
    console.log('🔍 Resultado de cargar fotos:', result);
    
    if (result.success && result.data) {
      console.log('📁 Fotos cargadas:', result.data);
      setFotos(result.data);
    } else {
      console.error('❌ Error cargando fotos:', result.error);
      setError(result.error || 'Error al cargar las fotos');
    }
    setIsLoading(false);
  };

  const cargarConteo = async () => {
    const result = await obtenerConteoFotos(idAuditoria);
    
    if (result.success && result.data) {
      setConteoFotos(result.data);
    }
  };

  const handleSubirFoto = async (tipoFoto: TipoFoto, archivo: File) => {
    setSubiendo(tipoFoto);
    setError(null);

    console.log('📱 Iniciando subida desde iOS:', {
      tipo: tipoFoto,
      archivo: archivo.name,
      size: archivo.size,
      type: archivo.type
    });

    try {
      const result = await subirFotoAuditoria(idAuditoria, tipoFoto, archivo);

      if (result.success && result.data) {
        console.log('✅ Foto subida exitosamente desde iOS:', result.data);
        
        // Actualizar lista de fotos
        setFotos(prev => {
          const nuevaLista = [...prev, result.data!];
          console.log('📋 Lista actualizada de fotos:', nuevaLista);
          return nuevaLista;
        });
        
        // Actualizar conteo
        setConteoFotos(prev => ({
          ...prev,
          [tipoFoto]: (prev[tipoFoto] || 0) + 1
        }));
        
        // Recargar fotos desde el servidor para asegurar sincronización
        await cargarFotos();
        await cargarConteo();
        
        // Mensaje de éxito específico para móvil
        console.log('📱 Foto subida correctamente desde dispositivo móvil');
        
      } else {
        console.error('❌ Error subiendo foto desde iOS:', result.error);
        
        // Mensajes de error más específicos para iOS
        let mensajeError = result.error || 'Error al subir la foto';
        
        if (mensajeError.includes('Invalid key') || mensajeError.includes('key')) {
          mensajeError = 'Error con el nombre de archivo. Intenta tomar otra foto.';
        } else if (mensajeError.includes('size') || mensajeError.includes('large')) {
          mensajeError = 'La imagen es muy grande. Intenta con una foto más pequeña.';
        } else if (mensajeError.includes('network') || mensajeError.includes('connection')) {
          mensajeError = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        }
        
        setError(`📱 ${mensajeError}`);
      }
    } catch (error) {
      console.error('📱 Error inesperado subiendo foto desde iOS:', error);
      setError('Error inesperado. Verifica tu conexión e intenta de nuevo.');
    }

    setSubiendo(null);
  };

  const handleEliminarFoto = async (foto: AuditoriaFoto) => {
    if (!confirm('¿Está seguro de que desea eliminar esta foto?')) {
      return;
    }

    const result = await eliminarFotoAuditoria(foto.id_auditoria_foto);

    if (result.success) {
      // Remover de la lista
      setFotos(prev => prev.filter(f => f.id_auditoria_foto !== foto.id_auditoria_foto));
      setFotosViendo(prev => prev.filter(f => f.id_auditoria_foto !== foto.id_auditoria_foto));
      // Actualizar conteo
      setConteoFotos(prev => ({
        ...prev,
        [foto.tipo_foto as TipoFoto]: Math.max(0, (prev[foto.tipo_foto as TipoFoto] || 0) - 1)
      }));
    } else {
      setError(result.error || 'Error al eliminar la foto');
    }
  };

  const verFotosPorTipo = (tipo: TipoFoto) => {
    const fotosTipo = fotos.filter(foto => foto.tipo_foto === tipo);
    console.log(`📸 Mostrando fotos de tipo "${tipo}":`, fotosTipo);
    setFotosViendo(fotosTipo);
    setTipoSeleccionado(tipo);
  };

  const FileInputs: React.FC<{ tipoFoto: TipoFoto; onFileSelect: (file: File) => void }> = ({ 
    tipoFoto, 
    onFileSelect 
  }) => {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      
      console.log('📱 Evento de cambio de archivo:', {
        hasFile: !!file,
        inputId: e.target.id,
        tipoFoto: tipoFoto
      });
      
      if (!file) {
        console.log('📱 No se seleccionó archivo');
        return;
      }

      console.log('📱 Archivo seleccionado desde iOS:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      // Validaciones específicas para iOS
      if (file.size === 0) {
        setError('Error: El archivo está vacío. Intenta seleccionar otra foto.');
        e.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB límite para iOS
        setError('Error: La imagen es muy grande. Máximo 10MB permitido.');
        e.target.value = '';
        return;
      }

      // Verificar que sea realmente una imagen
      if (!file.type.startsWith('image/')) {
        setError('Error: Por favor selecciona solo archivos de imagen.');
        e.target.value = '';
        return;
      }

      try {
        onFileSelect(file);
      } catch (error) {
        console.error('📱 Error procesando archivo iOS:', error);
        setError('Error al procesar la imagen. Intenta de nuevo.');
      }
      
      // Reset input
      e.target.value = '';
    };

    // Funciones para activar los inputs
    const activarCamara = () => {
      console.log('📱 Activando cámara para:', tipoFoto);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        console.error('📱 Referencia de cámara no encontrada');
      }
    };

    const activarGaleria = () => {
      console.log('📱 Activando galería para:', tipoFoto);
      if (galleryInputRef.current) {
        galleryInputRef.current.click();
      } else {
        console.error('📱 Referencia de galería no encontrada');
      }
    };

    return (
      <>
        {/* Input para cámara (solo iOS) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id={`camera-input-${tipoFoto.replace(/\s+/g, '-').toLowerCase()}`}
          multiple={false}
        />
        
        {/* Input para galería */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id={`gallery-input-${tipoFoto.replace(/\s+/g, '-').toLowerCase()}`}
          multiple={false}
        />

        {/* Exponer funciones para uso externo */}
        <div style={{ display: 'none' }}>
          <button onClick={activarCamara} id={`btn-camera-${tipoFoto.replace(/\s+/g, '-').toLowerCase()}`} />
          <button onClick={activarGaleria} id={`btn-gallery-${tipoFoto.replace(/\s+/g, '-').toLowerCase()}`} />
        </div>
      </>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Cargando fotos...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
          {esIOS && (
            <div className="mt-2 text-sm text-red-600">
              <strong>💡 Consejos para iOS:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>Prueba con el botón "📷 Cámara" para tomar una nueva foto</li>
                <li>O usa "🖼️ Galería" para seleccionar una foto existente</li>
                <li>Verifica que tengas buena conexión a internet</li>
                <li>Si la foto es muy grande, intenta usar menor calidad en cámara</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {esIOS && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <strong className="font-bold">📱 Dispositivo iOS detectado</strong>
          <p className="text-sm mt-1">
            Tienes dos opciones para subir fotos:
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li><strong>📷 Cámara:</strong> Toma una nueva foto con la cámara trasera</li>
            <li><strong>🖼️ Galería:</strong> Selecciona una foto existente de tu galería</li>
          </ul>
          <p className="text-xs mt-2 text-blue-600">
            Formatos soportados: HEIC, HEIF, JPG, PNG (máximo 10MB)
          </p>
        </div>
      )}

      {/* Lista de tipos de fotos con contadores */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📸 Checklist de Fotos ({fotos.length} fotos subidas)
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {TIPOS_FOTOS.map((tipo: TipoFoto) => {
              const cantidad = conteoFotos[tipo] || 0;
              const estaSubiendo = subiendo === tipo;
              
              return (
                <div key={tipo} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border shadow-sm hover:shadow-md transition-shadow gap-3 sm:gap-0">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      cantidad > 0 ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100 border-2 border-gray-300'
                    }`}>
                      {cantidad > 0 ? '✅' : '📷'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-base sm:text-lg leading-tight">{tipo}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {cantidad > 0 ? `${cantidad} foto${cantidad !== 1 ? 's' : ''} subida${cantidad !== 1 ? 's' : ''}` : 'Sin fotos'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
                    {cantidad > 0 && (
                      <Button
                        variant="secondary"
                        className="text-sm px-4 py-2 w-full sm:w-auto touch-manipulation"
                        onClick={() => verFotosPorTipo(tipo)}
                      >
                        🔍 Ver fotos ({cantidad})
                      </Button>
                    )}
                    
                    {!readonly && (
                      <>
                        <FileInputs 
                          tipoFoto={tipo}
                          onFileSelect={(file: File) => handleSubirFoto(tipo, file)}
                        />
                        
                        {/* Botones separados para iOS */}
                        {esIOS ? (
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button
                              variant="primary"
                              className="text-sm px-4 py-2 w-full sm:w-auto touch-manipulation flex items-center justify-center gap-2"
                              onClick={() => {
                                console.log('📱 Click en botón cámara para:', tipo);
                                const btn = document.getElementById(`btn-camera-${tipo.replace(/\s+/g, '-').toLowerCase()}`) as HTMLButtonElement;
                                if (btn) {
                                  btn.click();
                                } else {
                                  console.error('📱 Botón cámara no encontrado para:', tipo);
                                }
                              }}
                              disabled={estaSubiendo}
                            >
                              {estaSubiendo ? '⏳' : '📷'} 
                              {estaSubiendo ? 'Subiendo...' : 'Cámara'}
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-sm px-4 py-2 w-full sm:w-auto touch-manipulation flex items-center justify-center gap-2"
                              onClick={() => {
                                console.log('📱 Click en botón galería para:', tipo);
                                const btn = document.getElementById(`btn-gallery-${tipo.replace(/\s+/g, '-').toLowerCase()}`) as HTMLButtonElement;
                                if (btn) {
                                  btn.click();
                                } else {
                                  console.error('📱 Botón galería no encontrado para:', tipo);
                                }
                              }}
                              disabled={estaSubiendo}
                            >
                              🖼️ Galería
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            className="text-sm px-4 py-2 w-full sm:w-auto touch-manipulation flex items-center justify-center gap-2"
                            onClick={() => {
                              console.log('📱 Click en botón subir para:', tipo);
                              const btn = document.getElementById(`btn-gallery-${tipo.replace(/\s+/g, '-').toLowerCase()}`) as HTMLButtonElement;
                              if (btn) {
                                btn.click();
                              } else {
                                console.error('📱 Botón subir no encontrado para:', tipo);
                              }
                            }}
                            disabled={estaSubiendo}
                          >
                            {estaSubiendo ? '⏳ Subiendo...' : '📤 Subir foto'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Modal/Galería de fotos por tipo */}
      {tipoSeleccionado && fotosViendo.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl max-h-[90vh] w-full mx-4 overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                📸 {tipoSeleccionado} ({fotosViendo.length} fotos)
              </h3>
              <button
                className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
                onClick={() => {
                  setTipoSeleccionado(null);
                  setFotosViendo([]);
                }}
              >
                ×
              </button>
            </div>
            
            {/* Contenido scrolleable */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {fotosViendo.map((foto) => (
                  <div key={foto.id_auditoria_foto} className="relative group bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={foto.url_foto}
                      alt={foto.tipo_foto}
                      className="w-full h-40 sm:h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-200 touch-manipulation"
                      onClick={() => setFotoModalAbierta(foto.url_foto)}
                      onLoad={() => {
                        console.log('✅ Imagen cargada correctamente:', foto.url_foto);
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error('❌ Error cargando imagen:', foto.url_foto);
                        console.error('❌ Detalles del error:', e);
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii/+CjxwYXRoIGQ9Ik0xMDAgNzBDODcuODUgNzAgNzggNzkuODUgNzggOTJDNzggMTA0LjE1IDg3Ljg1IDExNCAxMDAgMTE0QzExMi4xNSAxMTQgMTIyIDEwNC4xNSAxMjIgOTJDMTIyIDc5Ljg1IDExMi4xNSA3MCAxMDAgNzBaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0xNDAgMTMwSDYwVjE0MEgxNDBWMTMwWiIgZmlsbD0iIzlCOUI5QiIvPgo8L3N2Zz4K';
                      }}
                    />
                    
                    {/* Botón de eliminar fijo en móviles, hover en desktop */}
                    {!readonly && (
                      <button
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg transition-all touch-manipulation opacity-80 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('¿Está seguro de que desea eliminar esta foto?')) {
                            handleEliminarFoto(foto);
                          }
                        }}
                        title="Eliminar foto"
                      >
                        🗑️
                      </button>
                    )}

                    {/* Overlay con información */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-end">
                      <div className="w-full p-3 bg-gradient-to-t from-black to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center justify-between">
                          <div className="text-xs">
                            📅 {new Date(foto.created_at).toLocaleString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs">
                            👁️ Ver foto
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Mensaje si no hay fotos */}
              {fotosViendo.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📷</div>
                  <p>No hay fotos de tipo "{tipoSeleccionado}" aún.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen en pantalla completa */}
      {fotoModalAbierta && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setFotoModalAbierta(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={fotoModalAbierta}
              alt="Foto de auditoría"
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Botones de acción en la imagen */}
            <div className="absolute top-2 right-2 flex gap-2">
              {!readonly && (() => {
                const fotoActual = fotosViendo.find(f => f.url_foto === fotoModalAbierta);
                return fotoActual ? (
                  <button
                    className="text-white text-sm font-semibold bg-red-500 hover:bg-red-600 rounded-lg px-3 py-2 flex items-center gap-2 transition-all shadow-lg touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('¿Está seguro de que desea eliminar esta foto?')) {
                        handleEliminarFoto(fotoActual);
                        setFotoModalAbierta(null);
                      }
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                ) : null;
              })()}
              
              <button
                className="text-white text-2xl font-bold bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center transition-all touch-manipulation"
                onClick={() => setFotoModalAbierta(null)}
              >
                ×
              </button>
            </div>

            {/* Información de la foto */}
            {(() => {
              const fotoActual = fotosViendo.find(f => f.url_foto === fotoModalAbierta);
              return fotoActual ? (
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-60 text-white rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{fotoActual.tipo_foto}</p>
                      <p className="text-xs sm:text-sm opacity-80">
                        📅 {new Date(fotoActual.created_at).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-xs opacity-80">
                      📸 Foto {fotosViendo.findIndex(f => f.url_foto === fotoModalAbierta) + 1} de {fotosViendo.length}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Navegación entre fotos */}
            {fotosViendo.length > 1 && (() => {
              const currentIndex = fotosViendo.findIndex(f => f.url_foto === fotoModalAbierta);
              const hasNext = currentIndex < fotosViendo.length - 1;
              const hasPrev = currentIndex > 0;

              return (
                <>
                  {hasPrev && (
                    <button
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-2xl font-bold bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-12 h-12 flex items-center justify-center transition-all touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoModalAbierta(fotosViendo[currentIndex - 1].url_foto);
                      }}
                    >
                      ←
                    </button>
                  )}
                  
                  {hasNext && (
                    <button
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-2xl font-bold bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-12 h-12 flex items-center justify-center transition-all touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoModalAbierta(fotosViendo[currentIndex + 1].url_foto);
                      }}
                    >
                      →
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GestorFotos;