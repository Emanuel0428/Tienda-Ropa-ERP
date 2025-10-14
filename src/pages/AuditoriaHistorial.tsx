import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../supabaseClient';
import { 
  Calendar,
  MapPin,
  User,
  Edit3,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';

interface AuditoriaHistorial {
  id_auditoria: number;
  id_auditoria_custom?: string;
  id_tienda?: number;
  id_auditor?: string;
  fecha: string;
  created_at: string;
  updated_at: string;
  estado: 'en_progreso' | 'completada' | 'pendiente';
  quienes_reciben: string;
  observaciones?: string;
  calificacion_total?: number;
  notas_personal?: string;
  notas_campanas?: string;
  notas_conclusiones?: string;
  total_preguntas?: number;
  preguntas_aprobadas?: number;
  tiendas?: any; // Tipo flexible para manejar el JOIN
}

const AuditoriaHistorial = () => {
  const navigate = useNavigate();
  const [auditorias, setAuditorias] = useState<AuditoriaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'en_progreso' | 'completada'>('todas');
  const [auditoriaParaEliminar, setAuditoriaParaEliminar] = useState<AuditoriaHistorial | null>(null);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargarHistorialAuditorias();
  }, []);

  const cargarHistorialAuditorias = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando historial de auditorías...');
      
      // Primero hacer una prueba simple de conexión
      const { data: testData, error: testError } = await supabase
        .from('auditorias')
        .select('count', { count: 'exact', head: true });
        
      if (testError) {
        console.error('❌ Error de conexión:', testError);
        throw new Error(`Error de conexión: ${testError.message}`);
      }
      
      console.log('✅ Conexión exitosa, auditorías encontradas:', testData);
      
      // Obtener auditorías con información de tiendas
      const { data: auditoriasData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select(`
          id_auditoria,
          id_auditoria_custom,
          id_tienda,
          id_auditor,
          fecha,
          created_at,
          updated_at,
          estado,
          quienes_reciben,
          observaciones,
          calificacion_total,
          notas_personal,
          notas_campanas,
          notas_conclusiones,
          tiendas (
            nombre,
            direccion,
            ciudad
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limitar a 50 para evitar problemas de rendimiento

      if (auditoriaError) {
        console.error('❌ Error en la consulta de auditorías:', auditoriaError);
        
        // Si el error es por tabla no encontrada o problemas de permisos
        if (auditoriaError.code === 'PGRST116' || auditoriaError.code === '42P01') {
          throw new Error('La tabla de auditorías no existe o no tienes permisos para accederla');
        }
        
        throw new Error(auditoriaError.message || 'Error desconocido al obtener auditorías');
      }
      
      console.log('✅ Auditorías obtenidas:', auditoriasData?.length || 0);
      
      // Si no hay auditorías, no es un error, simplemente mostrar vacío
      if (!auditoriasData || auditoriasData.length === 0) {
        console.log('ℹ️ No hay auditorías para mostrar');
        setAuditorias([]);
        return;
      }

      // Para cada auditoría, obtener estadísticas de preguntas
      const auditoriasConStats = await Promise.all(
        (auditoriasData || []).map(async (auditoria) => {
          try {
            const { data: statsData, error: statsError } = await supabase
              .from('auditoria_preguntas')
              .select('respuesta')
              .eq('id_auditoria', auditoria.id_auditoria);

            if (statsError) {
              console.warn('⚠️ Error obteniendo estadísticas para auditoría', auditoria.id_auditoria, statsError);
            }

            const totalPreguntas = statsData?.length || 0;
            const preguntasAprobadas = statsData?.filter(p => p.respuesta === 'si').length || 0;

            return {
              ...auditoria,
              total_preguntas: totalPreguntas,
              preguntas_aprobadas: preguntasAprobadas
            } as AuditoriaHistorial;
          } catch (err) {
            console.warn('⚠️ Error procesando estadísticas para auditoría', auditoria.id_auditoria, err);
            return {
              ...auditoria,
              total_preguntas: 0,
              preguntas_aprobadas: 0
            };
          }
        })
      );

      console.log('✅ Auditorías con estadísticas:', auditoriasConStats);
      setAuditorias(auditoriasConStats);
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      let errorMessage = 'Error al cargar el historial de auditorías';
      
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'object' && error && 'message' in error) {
        errorMessage += ': ' + (error as any).message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const auditoriasFilteradas = auditorias.filter(auditoria => {
    if (filtroEstado === 'todas') return true;
    return auditoria.estado === filtroEstado;
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada':
        return <Badge variant="success">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completada
          </div>
        </Badge>;
      case 'en_progreso':
        return <Badge variant="warning">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En Progreso
          </div>
        </Badge>;
      default:
        return <Badge variant="error">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pendiente
          </div>
        </Badge>;
    }
  };

  const calcularPorcentaje = (aprobadas: number = 0, total: number = 0) => {
    if (total === 0) return 0;
    return Math.round((aprobadas / total) * 100);
  };

  const handleEditarAuditoria = (id: number) => {
    navigate(`/auditoria?id=${id}`);
  };

  const handleVerAuditoria = (id: number) => {
    navigate(`/auditoria?id=${id}&modo=revision`);
  };

  const handleEliminarAuditoria = async () => {
    if (!auditoriaParaEliminar) return;
    
    const textoEsperado = `ELIMINAR ${auditoriaParaEliminar.id_auditoria}`;
    if (confirmacionTexto !== textoEsperado) {
      setError('Texto de confirmación incorrecto');
      return;
    }

    try {
      setEliminando(true);
      
      // Primero eliminar las preguntas relacionadas
      const { error: preguntasError } = await supabase
        .from('auditoria_preguntas')
        .delete()
        .eq('id_auditoria', auditoriaParaEliminar.id_auditoria);

      if (preguntasError) {
        console.warn('Error eliminando preguntas:', preguntasError);
      }

      // Eliminar las fotos relacionadas
      const { error: fotosError } = await supabase
        .from('auditoria_fotos')
        .delete()
        .eq('id_auditoria', auditoriaParaEliminar.id_auditoria);

      if (fotosError) {
        console.warn('Error eliminando fotos:', fotosError);
      }

      // Finalmente eliminar la auditoría
      const { error: auditoriaError } = await supabase
        .from('auditorias')
        .delete()
        .eq('id_auditoria', auditoriaParaEliminar.id_auditoria);

      if (auditoriaError) throw auditoriaError;

      // Actualizar la lista local
      setAuditorias(prev => prev.filter(a => a.id_auditoria !== auditoriaParaEliminar.id_auditoria));
      
      // Cerrar modal
      setAuditoriaParaEliminar(null);
      setConfirmacionTexto('');
      setError(null);
      
    } catch (error) {
      console.error('Error eliminando auditoría:', error);
      setError('Error al eliminar la auditoría');
    } finally {
      setEliminando(false);
    }
  };

  const abrirModalEliminar = (auditoria: AuditoriaHistorial) => {
    setAuditoriaParaEliminar(auditoria);
    setConfirmacionTexto('');
    setError(null);
  };

  const cerrarModalEliminar = () => {
    setAuditoriaParaEliminar(null);
    setConfirmacionTexto('');
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando historial de auditorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-6">
      {/* Header */}
      <div className="mb-8 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📋 Historial de Auditorías</h1>
            <p className="text-gray-600 mt-2">
              Gestiona y revisa todas las auditorías realizadas
            </p>
          </div>
          <Button
            onClick={() => navigate('/auditoria')}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Nueva Auditoría
          </Button>
        </div>

        {/* Filtros */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setFiltroEstado('todas')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'todas'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas ({auditorias.length})
          </button>
          <button
            onClick={() => setFiltroEstado('completada')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'completada'
                ? 'bg-green-100 text-green-700 border-2 border-green-200'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Completadas ({auditorias.filter(a => a.estado === 'completada').length})
          </button>
          <button
            onClick={() => setFiltroEstado('en_progreso')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'en_progreso'
                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            En Progreso ({auditorias.filter(a => a.estado === 'en_progreso').length})
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Lista de Auditorías */}
      {auditoriasFilteradas.length === 0 ? (
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            No hay auditorías {filtroEstado !== 'todas' ? filtroEstado === 'completada' ? 'completadas' : 'en progreso' : ''}
          </h3>
          <p className="text-gray-500 mb-4">
            {filtroEstado === 'todas' 
              ? 'Comienza creando tu primera auditoría' 
              : 'Cambia el filtro para ver otras auditorías'
            }
          </p>
          {filtroEstado === 'todas' && (
            <Button onClick={() => navigate('/auditoria')} variant="primary">
              Crear Primera Auditoría
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {auditoriasFilteradas.map((auditoria) => (
            <Card 
              key={auditoria.id_auditoria} 
              className={`hover:shadow-lg transition-shadow ${
                auditoria.estado === 'completada' 
                  ? 'border-l-4 border-l-green-500 bg-green-50' 
                  : auditoria.estado === 'en_progreso'
                  ? 'border-l-4 border-l-yellow-500 bg-yellow-50'
                  : 'border-l-4 border-l-red-500 bg-red-50'
              }`}
            >
              <div className="p-6">
                {/* Header de la card */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      Auditoría {auditoria.id_auditoria_custom || `#${auditoria.id_auditoria}`}
                    </h3>
                    {getEstadoBadge(auditoria.estado)}
                  </div>
                </div>

                {/* Información de la auditoría */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {auditoria.tiendas?.nombre || `Tienda ${auditoria.id_tienda}` || 'Sin asignar'}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(auditoria.fecha || auditoria.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>

                  {auditoria.estado === 'completada' && auditoria.updated_at && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizada: {new Date(auditoria.updated_at).toLocaleDateString('es-ES')}
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    {auditoria.quienes_reciben || 'Sin asignar'}
                  </div>
                </div>

                {/* Estadísticas */}
                {/* Mostrar calificación si está disponible */}
                {auditoria.calificacion_total !== null && auditoria.calificacion_total !== undefined && (
                  <div className="bg-white rounded-lg p-3 mb-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Calificación</span>
                      <span className="text-sm font-bold text-gray-800">
                        {Math.round(auditoria.calificacion_total)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.max(auditoria.calificacion_total, 0), 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Mostrar progreso de preguntas si están disponibles */}
                {auditoria.total_preguntas && auditoria.total_preguntas > 0 && (
                  <div className="bg-white rounded-lg p-3 mb-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Progreso</span>
                      <span className="text-sm font-bold text-gray-800">
                        {calcularPorcentaje(auditoria.preguntas_aprobadas, auditoria.total_preguntas)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${calcularPorcentaje(auditoria.preguntas_aprobadas, auditoria.total_preguntas)}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {auditoria.preguntas_aprobadas}/{auditoria.total_preguntas} preguntas aprobadas
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {auditoria.observaciones && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Observaciones:</strong> {auditoria.observaciones}
                    </p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerAuditoria(auditoria.id_auditoria)}
                    variant="secondary"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Button>
                  {auditoria.estado !== 'completada' && (
                    <Button
                      onClick={() => handleEditarAuditoria(auditoria.id_auditoria)}
                      variant="primary"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </Button>
                  )}
                  <Button
                    onClick={() => abrirModalEliminar(auditoria)}
                    variant="danger"
                    className="px-3 py-2 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {auditoriaParaEliminar && (
        <Modal
          isOpen={true}
          onClose={cerrarModalEliminar}
          title="⚠️ Confirmar Eliminación"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-2">
                ¿Estás seguro de que deseas eliminar esta auditoría?
              </p>
              <div className="text-sm text-red-700">
                <p><strong>ID:</strong> {auditoriaParaEliminar.id_auditoria}</p>
                <p><strong>Tienda:</strong> {auditoriaParaEliminar.tiendas?.nombre || `Tienda ${auditoriaParaEliminar.id_tienda}`}</p>
                <p><strong>Fecha:</strong> {new Date(auditoriaParaEliminar.created_at).toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Se eliminarán también todas las preguntas y fotos asociadas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe: <span className="font-bold text-red-600">ELIMINAR {auditoriaParaEliminar.id_auditoria}</span>
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={`ELIMINAR ${auditoriaParaEliminar.id_auditoria}`}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={cerrarModalEliminar}
                variant="secondary"
                className="flex-1"
                disabled={eliminando}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleEliminarAuditoria}
                variant="danger"
                className="flex-1"
                disabled={eliminando || confirmacionTexto !== `ELIMINAR ${auditoriaParaEliminar.id_auditoria}`}
              >
                {eliminando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Confirmar Eliminación
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditoriaHistorial;