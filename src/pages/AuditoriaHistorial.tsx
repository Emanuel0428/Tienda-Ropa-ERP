import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../supabaseClient';
import { 
  Calendar,
  MapPin,
  User,
  Edit3,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AuditoriaHistorial {
  id_auditoria: number;
  nombre: string;
  ubicacion: string;
  fecha_creacion: string;
  fecha_finalizacion: string | null;
  estado: 'en_progreso' | 'completada' | 'pendiente';
  usuario_id: number;
  quienes_reciben: string;
  observaciones: string;
  puntuacion_total?: number;
  total_preguntas?: number;
  preguntas_aprobadas?: number;
}

const AuditoriaHistorial = () => {
  const navigate = useNavigate();
  const [auditorias, setAuditorias] = useState<AuditoriaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'en_progreso' | 'completada'>('todas');

  useEffect(() => {
    cargarHistorialAuditorias();
  }, []);

  const cargarHistorialAuditorias = async () => {
    try {
      setLoading(true);
      
      // Obtener auditorías con resumen de preguntas
      const { data: auditoriasData, error: auditoriaError } = await supabase
        .from('auditorias')
        .select(`
          id_auditoria,
          nombre,
          ubicacion,
          fecha_creacion,
          fecha_finalizacion,
          estado,
          usuario_id,
          quienes_reciben,
          observaciones,
          puntuacion_total
        `)
        .order('fecha_creacion', { ascending: false });

      if (auditoriaError) throw auditoriaError;

      // Para cada auditoría, obtener estadísticas de preguntas
      const auditoriasConStats = await Promise.all(
        (auditoriasData || []).map(async (auditoria) => {
          const { data: statsData } = await supabase
            .from('auditoria_preguntas')
            .select('respuesta')
            .eq('auditoria_id', auditoria.id_auditoria);

          const totalPreguntas = statsData?.length || 0;
          const preguntasAprobadas = statsData?.filter(p => p.respuesta === 'si').length || 0;

          return {
            ...auditoria,
            total_preguntas: totalPreguntas,
            preguntas_aprobadas: preguntasAprobadas
          };
        })
      );

      setAuditorias(auditoriasConStats);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('Error al cargar el historial de auditorías');
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
      <div className="mb-8">
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
                      {auditoria.nombre}
                    </h3>
                    {getEstadoBadge(auditoria.estado)}
                  </div>
                </div>

                {/* Información de la auditoría */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {auditoria.ubicacion}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(auditoria.fecha_creacion).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>

                  {auditoria.fecha_finalizacion && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizada: {new Date(auditoria.fecha_finalizacion).toLocaleDateString('es-ES')}
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    {auditoria.quienes_reciben || 'Sin asignar'}
                  </div>
                </div>

                {/* Estadísticas */}
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
                        className="bg-blue-500 h-2 rounded-full transition-all"
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditoriaHistorial;