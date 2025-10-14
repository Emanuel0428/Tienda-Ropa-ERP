import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../supabaseClient';
import { 
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface EstadisticasData {
  totalAuditorias: number;
  auditoriasCompletadas: number;
  auditoriasEnProgreso: number;
  promedioGeneral: number;
  mejorPuntuacion: number;
  peorPuntuacion: number;
  auditoriasPorMes: { mes: string; cantidad: number }[];
  categoriasMejorPuntuadas: { categoria: string; promedio: number }[];
  categoriasPeorPuntuadas: { categoria: string; promedio: number }[];
  tiendaConMejorPuntuacion: { tienda: string; promedio: number } | null;
  auditoriaReciente: any;
}

const AuditoriaEstadisticas = () => {
  const [estadisticas, setEstadisticas] = useState<EstadisticasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);

      // 1. Estadísticas generales de auditorías
      const { data: auditorias, error: auditoriasError } = await supabase
        .from('auditorias')
        .select('*');

      if (auditoriasError) throw auditoriasError;

      const totalAuditorias = auditorias?.length || 0;
      const auditoriasCompletadas = auditorias?.filter(a => a.estado === 'completada').length || 0;
      const auditoriasEnProgreso = auditorias?.filter(a => a.estado === 'en_progreso').length || 0;

      // 2. Calcular promedios de puntuación
      const puntuaciones = auditorias
        ?.filter(a => a.calificacion_total !== null)
        .map(a => a.calificacion_total) || [];
      
      const promedioGeneral = puntuaciones.length > 0 
        ? puntuaciones.reduce((sum, p) => sum + p, 0) / puntuaciones.length 
        : 0;
      
      const mejorPuntuacion = puntuaciones.length > 0 ? Math.max(...puntuaciones) : 0;
      const peorPuntuacion = puntuaciones.length > 0 ? Math.min(...puntuaciones) : 0;

      // 3. Auditorías por mes (últimos 6 meses)
      const auditoriasPorMes = calcularAuditoriasPorMes(auditorias || []);

      // 4. Estadísticas por categorías
      const { data: preguntasStats } = await supabase
        .from('auditoria_preguntas')
        .select(`
          respuesta,
          pregunta_id,
          preguntas (
            categoria_id,
            categorias (
              nombre
            )
          )
        `);

      const estadisticasCategorias = calcularEstadisticasCategorias(preguntasStats || []);

      // 5. Auditoría más reciente
      const auditoriaReciente = auditorias
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

      setEstadisticas({
        totalAuditorias,
        auditoriasCompletadas,
        auditoriasEnProgreso,
        promedioGeneral: Math.round(promedioGeneral * 100) / 100,
        mejorPuntuacion: Math.round(mejorPuntuacion * 100) / 100,
        peorPuntuacion: Math.round(peorPuntuacion * 100) / 100,
        auditoriasPorMes,
        categoriasMejorPuntuadas: estadisticasCategorias.mejores,
        categoriasPeorPuntuadas: estadisticasCategorias.peores,
        tiendaConMejorPuntuacion: null, // Por implementar si hay datos de tiendas
        auditoriaReciente
      });

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError('Error al cargar las estadísticas de auditorías');
    } finally {
      setLoading(false);
    }
  };

  const calcularAuditoriasPorMes = (auditorias: any[]) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ahora = new Date();
    const resultado = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mes = meses[fecha.getMonth()];
      const año = fecha.getFullYear();
      
      const cantidad = auditorias.filter(a => {
        const fechaAuditoria = new Date(a.created_at);
        return fechaAuditoria.getMonth() === fecha.getMonth() && 
               fechaAuditoria.getFullYear() === fecha.getFullYear();
      }).length;

      resultado.push({ mes: `${mes} ${año}`, cantidad });
    }

    return resultado;
  };

  const calcularEstadisticasCategorias = (preguntasData: any[]) => {
    const categorias: { [key: string]: { total: number; aprobadas: number } } = {};

    preguntasData.forEach(pregunta => {
      if (pregunta.preguntas?.categorias?.nombre) {
        const categoria = pregunta.preguntas.categorias.nombre;
        if (!categorias[categoria]) {
          categorias[categoria] = { total: 0, aprobadas: 0 };
        }
        categorias[categoria].total++;
        if (pregunta.respuesta === 'si') {
          categorias[categoria].aprobadas++;
        }
      }
    });

    const promedios = Object.entries(categorias).map(([categoria, stats]) => ({
      categoria,
      promedio: stats.total > 0 ? (stats.aprobadas / stats.total) * 100 : 0
    }));

    promedios.sort((a, b) => b.promedio - a.promedio);

    return {
      mejores: promedios.slice(0, 3),
      peores: promedios.slice(-3).reverse()
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error || !estadisticas) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'No se pudieron cargar las estadísticas'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-6">
      {/* Header */}
      <div className="mb-8 mt-8">
        <h1 className="text-3xl font-bold text-gray-800">📊 Estadísticas de Auditorías</h1>
        <p className="text-gray-600 mt-2">
          Análisis detallado del rendimiento y progreso de las auditorías
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total de Auditorías */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Auditorías</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.totalAuditorias}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Completadas */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-3xl font-bold text-green-600">{estadisticas.auditoriasCompletadas}</p>
              <p className="text-xs text-gray-500">
                {estadisticas.totalAuditorias > 0 
                  ? `${Math.round((estadisticas.auditoriasCompletadas / estadisticas.totalAuditorias) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* En Progreso */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Progreso</p>
              <p className="text-3xl font-bold text-yellow-600">{estadisticas.auditoriasEnProgreso}</p>
              <p className="text-xs text-gray-500">
                {estadisticas.totalAuditorias > 0 
                  ? `${Math.round((estadisticas.auditoriasEnProgreso / estadisticas.totalAuditorias) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        {/* Promedio General */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio General</p>
              <p className="text-3xl font-bold text-purple-600">{estadisticas.promedioGeneral}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Auditorías por Mes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tendencia Mensual
          </h3>
          <div className="space-y-3">
            {estadisticas.auditoriasPorMes.map((mes, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{mes.mes}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max((mes.cantidad / Math.max(...estadisticas.auditoriasPorMes.map(m => m.cantidad), 1)) * 100, 5)}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-8">{mes.cantidad}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Puntuaciones Extremas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Puntuaciones Destacadas
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">Mejor Puntuación</span>
                <Badge variant="success">{estadisticas.mejorPuntuacion}%</Badge>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-800">Puntuación Más Baja</span>
                <Badge variant="error">{estadisticas.peorPuntuacion}%</Badge>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-800">Promedio General</span>
                <Badge variant="default">{estadisticas.promedioGeneral}%</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Categorías Mejor Puntuadas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Categorías con Mejor Rendimiento
          </h3>
          <div className="space-y-3">
            {estadisticas.categoriasMejorPuntuadas.map((categoria, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-800">{categoria.categoria}</span>
                <Badge variant="success">{Math.round(categoria.promedio)}%</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Categorías Peor Puntuadas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Categorías que Necesitan Atención
          </h3>
          <div className="space-y-3">
            {estadisticas.categoriasPeorPuntuadas.map((categoria, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium text-gray-800">{categoria.categoria}</span>
                <Badge variant="error">{Math.round(categoria.promedio)}%</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Auditoría Reciente */}
      {estadisticas.auditoriaReciente && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Última Auditoría Registrada
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  Auditoría {estadisticas.auditoriaReciente.id_auditoria_custom || `#${estadisticas.auditoriaReciente.id_auditoria}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{new Date(estadisticas.auditoriaReciente.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>{estadisticas.auditoriaReciente.quienes_reciben || 'Sin asignar'}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuditoriaEstadisticas;