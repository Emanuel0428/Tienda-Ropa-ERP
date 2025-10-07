import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (idAuditoria) {
      cargarFotos();
      cargarConteo();
    }
  }, [idAuditoria]);

  const cargarFotos = async () => {
    setIsLoading(true);
    const result = await obtenerFotosAuditoria(idAuditoria);
    
    if (result.success && result.data) {
      setFotos(result.data);
    } else {
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

    const result = await subirFotoAuditoria(idAuditoria, tipoFoto, archivo);

    if (result.success && result.data) {
      // Actualizar lista de fotos
      setFotos(prev => [...prev, result.data!]);
      // Actualizar conteo
      setConteoFotos(prev => ({
        ...prev,
        [tipoFoto]: (prev[tipoFoto] || 0) + 1
      }));
    } else {
      setError(result.error || 'Error al subir la foto');
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
    setFotosViendo(fotosTipo);
    setTipoSeleccionado(tipo);
  };

  const FileInput: React.FC<{ tipoFoto: TipoFoto; onFileSelect: (file: File) => void }> = ({ 
    tipoFoto, 
    onFileSelect 
  }) => (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          onFileSelect(file);
        }
        e.target.value = ''; // Reset input
      }}
      style={{ display: 'none' }}
      id={`file-input-${tipoFoto.replace(/\s+/g, '-')}`}
    />
  );

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
        </div>
      )}

      {/* Lista de tipos de fotos con contadores */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📸 Checklist de Fotos ({fotos.length} fotos subidas)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPOS_FOTOS.map((tipo: TipoFoto) => {
              const cantidad = conteoFotos[tipo] || 0;
              const estaSubiendo = subiendo === tipo;
              
              return (
                <div key={tipo} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${cantidad > 0 ? '✅' : '📷'}`}>
                      {cantidad > 0 ? '✅' : '📷'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{tipo}</p>
                      <p className="text-sm text-gray-500">
                        {cantidad} foto{cantidad !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {cantidad > 0 && (
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => verFotosPorTipo(tipo)}
                      >
                        Ver ({cantidad})
                      </Button>
                    )}
                    
                    {!readonly && (
                      <>
                        <FileInput 
                          tipoFoto={tipo}
                          onFileSelect={(file) => handleSubirFoto(tipo, file)}
                        />
                        <Button
                          variant="primary"
                          className="text-xs px-2 py-1"
                          onClick={() => {
                            const input = document.getElementById(`file-input-${tipo.replace(/\s+/g, '-')}`) as HTMLInputElement;
                            input?.click();
                          }}
                          disabled={estaSubiendo}
                        >
                          {estaSubiendo ? '⏳' : '📤'} {estaSubiendo ? 'Subiendo...' : 'Subir'}
                        </Button>
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
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                📸 {tipoSeleccionado} ({fotosViendo.length} fotos)
              </h3>
              <Button
                variant="secondary"
                onClick={() => {
                  setTipoSeleccionado(null);
                  setFotosViendo([]);
                }}
              >
                ✕ Cerrar
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotosViendo.map((foto) => (
                <div key={foto.id_auditoria_foto} className="relative group">
                  <img
                    src={foto.url_foto}
                    alt={foto.tipo_foto}
                    className="w-full h-48 object-cover rounded border shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDODcuODUgNzAgNzggNzkuODUgNzggOTJDNzggMTA0LjE1IDg3Ljg1IDExNCAxMDAgMTE0QzExMi4xNSAxMTQgMTIyIDEwNC4xNSAxMjIgOTJDMTIyIDc5Ljg1IDExMi4xNSA3MCAxMDAgNzBaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0xNDAgMTMwSDYwVjE0MEgxNDBWMTMwWiIgZmlsbD0iIzlCOUI5QiIvPgo8L3N2Zz4K';
                    }}
                  />
                  
                  {!readonly && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-red-500 text-white hover:bg-red-600"
                        onClick={() => handleEliminarFoto(foto)}
                      >
                        🗑️
                      </Button>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(foto.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GestorFotos;