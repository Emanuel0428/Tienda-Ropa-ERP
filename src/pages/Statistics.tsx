import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui/Card';

interface AuditStats {
  totalAuditorias: number;
  promedioGeneral: number;
  mejoresTiendas: Array<{
    nombre: string;
    promedio: number;
    id_tienda: number;
  }>;
  peoresTiendas: Array<{
    nombre: string;
    promedio: number;
    id_tienda: number;
  }>;
  mejoresPorCategoria: Array<{
    categoria: string;
    tienda: string;
    promedio: number;
  }>;
  fallosMasComunes: Array<{
    pregunta: string;
    categoria: string;
    fallos: number;
    porcentaje: number;
  }>;
  tendenciaMensual: Array<{
    mes: string;
    promedio: number;
    cantidad: number;
  }>;
  auditoriasPorAuditor: Array<{
    nombre: string;
    cantidad: number;
    promedio: number;
  }>;
}

const Statistics = () => {
  const [activeTab, setActiveTab] = useState<'auditorias' | 'ventas' | 'inventario' | 'usuarios'>('auditorias');
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiendas, setTiendas] = useState<Array<{ id_tienda: number; nombre: string }>>([]);
  const [filters, setFilters] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    tienda: ''
  });

  useEffect(() => {
    if (activeTab === 'auditorias') {
      fetchTiendas();
      fetchAuditStats();
    }
  }, [activeTab, filters]);

  const fetchTiendas = async () => {
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .order('nombre');
      
      if (error) throw error;
      setTiendas(data || []);
    } catch (err) {
      console.error('Error fetching tiendas:', err);
    }
  };

  const fetchAuditStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construir la query base
      let query = supabase
        .from('auditorias')
        .select(`
          id_auditoria,
          fecha,
          calificacion_total,
          id_tienda,
          id_auditor,
          tiendas (nombre)
        `)
        .gte('fecha', filters.start)
        .lte('fecha', filters.end);

      // Agregar filtro por tienda si está seleccionada
      if (filters.tienda) {
        query = query.eq('id_tienda', parseInt(filters.tienda));
      }

      const { data: auditorias, error: auditError } = await query;

      if (auditError) throw auditError;

      if (auditorias && auditorias.length > 0) {
        // Para obtener los datos de los auditores, necesitamos hacer otra consulta
        const auditorIds = [...new Set(auditorias.map(a => a.id_auditor))];
        
        // Obtener información de usuarios basándose en auth.users
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .in('id', auditorIds);

        if (usuariosError) {
          console.error('Error fetching usuarios:', usuariosError);
        }

        // Crear un mapa de auditores para facilitar la búsqueda
        const auditoresMap = (usuariosData || []).reduce((acc: any, usuario) => {
          acc[usuario.id] = usuario.nombre;
          return acc;
        }, {});

        // Enriquecer auditorías con información de auditores
        const auditoriasEnriquecidas = auditorias.map(audit => ({
          ...audit,
          auditor_nombre: auditoresMap[audit.id_auditor] || 'Auditor no identificado'
        }));

        const stats = calculateAuditStats(auditoriasEnriquecidas);
        setAuditStats(stats);
      } else {
        // Si no hay auditorías, inicializar con valores vacíos
        setAuditStats({
          totalAuditorias: 0,
          promedioGeneral: 0,
          mejoresTiendas: [],
          peoresTiendas: [],
          mejoresPorCategoria: [],
          fallosMasComunes: [],
          tendenciaMensual: [],
          auditoriasPorAuditor: []
        });
      }
    } catch (err) {
      console.error('Error fetching audit stats:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const calculateAuditStats = (auditorias: any[]): AuditStats => {
    const totalAuditorias = auditorias.length;
    const promedioGeneral = totalAuditorias > 0 
      ? auditorias.reduce((sum, audit) => sum + (audit.calificacion_total || 0), 0) / totalAuditorias 
      : 0;

    // Mejores y peores tiendas
    const tiendasStats = auditorias.reduce((acc: any, audit) => {
      const tiendaId = audit.id_tienda;
      const tiendaNombre = audit.tiendas?.nombre || 'Sin nombre';
      
      if (!acc[tiendaId]) {
        acc[tiendaId] = {
          id_tienda: tiendaId,
          nombre: tiendaNombre,
          puntajes: [],
          total: 0,
          count: 0
        };
      }
      
      const puntaje = audit.calificacion_total || 0;
      acc[tiendaId].puntajes.push(puntaje);
      acc[tiendaId].total += puntaje;
      acc[tiendaId].count += 1;
      
      return acc;
    }, {});

    const tiendasArray = Object.values(tiendasStats).map((tienda: any) => ({
      ...tienda,
      promedio: tienda.count > 0 ? tienda.total / tienda.count : 0
    }));

    const mejoresTiendas = tiendasArray
      .sort((a: any, b: any) => b.promedio - a.promedio)
      .slice(0, 5)
      .map(t => ({ nombre: t.nombre, promedio: t.promedio, id_tienda: t.id_tienda }));

    const peoresTiendas = tiendasArray
      .sort((a: any, b: any) => a.promedio - b.promedio)
      .slice(0, 5)
      .map(t => ({ nombre: t.nombre, promedio: t.promedio, id_tienda: t.id_tienda }));

    // Tendencia mensual
    const tendenciaMensual = auditorias.reduce((acc: any, audit) => {
      const fecha = new Date(audit.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[mesKey]) {
        acc[mesKey] = { mes: mesKey, total: 0, count: 0 };
      }
      
      acc[mesKey].total += audit.calificacion_total || 0;
      acc[mesKey].count += 1;
      
      return acc;
    }, {});

    const tendencia = Object.values(tendenciaMensual).map((item: any) => ({
      mes: item.mes,
      promedio: item.count > 0 ? item.total / item.count : 0,
      cantidad: item.count
    }));

    // Auditorías por auditor
    const auditoresPorformance = auditorias.reduce((acc: any, audit) => {
      const auditor = audit.auditor_nombre || 'Sin nombre';
      
      if (!acc[auditor]) {
        acc[auditor] = { nombre: auditor, total: 0, count: 0 };
      }
      
      acc[auditor].total += audit.calificacion_total || 0;
      acc[auditor].count += 1;
      
      return acc;
    }, {});

    const auditoriasPorAuditor = Object.values(auditoresPorformance).map((auditor: any) => ({
      nombre: auditor.nombre,
      cantidad: auditor.count,
      promedio: auditor.count > 0 ? auditor.total / auditor.count : 0
    }));

    return {
      totalAuditorias,
      promedioGeneral,
      mejoresTiendas,
      peoresTiendas,
      mejoresPorCategoria: [], // Se puede implementar después cuando tengamos las respuestas detalladas
      fallosMasComunes: [], // Se puede implementar después cuando tengamos las respuestas detalladas
      tendenciaMensual: tendencia,
      auditoriasPorAuditor
    };
  };

  const renderAuditoriasTab = () => (
    <div className="space-y-6">
      {/* Filtros de fecha */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicio
            </label>
            <input
              type="date"
              value={filters.start}
              onChange={(e) => setFilters({ ...filters, start: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha fin
            </label>
            <input
              type="date"
              value={filters.end}
              onChange={(e) => setFilters({ ...filters, end: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tienda
            </label>
            <select
              value={filters.tienda}
              onChange={(e) => setFilters({ ...filters, tienda: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">Todas las tiendas</option>
              {tiendas.map(tienda => (
                <option key={tienda.id_tienda} value={tienda.id_tienda.toString()}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8">Cargando estadísticas...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{error}</div>
      ) : auditStats ? (
        <>
          {/* Métricas generales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Total Auditorías</h3>
              <p className="text-3xl font-bold text-blue-600">{auditStats.totalAuditorias}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Promedio General</h3>
              <p className="text-3xl font-bold text-green-600">
                {auditStats.promedioGeneral.toFixed(1)}%
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Período</h3>
              <p className="text-sm text-gray-600">
                {new Date(filters.start).toLocaleDateString()} - {new Date(filters.end).toLocaleDateString()}
              </p>
              {filters.tienda && (
                <p className="text-sm text-gray-600 mt-1">
                  Tienda: {tiendas.find(t => t.id_tienda.toString() === filters.tienda)?.nombre || 'Todas'}
                </p>
              )}
            </Card>
          </div>

          {/* Mejores y peores tiendas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Mejores Tiendas</h3>
              <div className="space-y-2">
                {auditStats.mejoresTiendas.map((tienda, index) => (
                  <div key={tienda.id_tienda} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">#{index + 1} {tienda.nombre}</span>
                    <span className="text-green-600 font-bold">{tienda.promedio.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📉 Tiendas a Mejorar</h3>
              <div className="space-y-2">
                {auditStats.peoresTiendas.map((tienda, index) => (
                  <div key={tienda.id_tienda} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">#{index + 1} {tienda.nombre}</span>
                    <span className="text-red-600 font-bold">{tienda.promedio.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Fallos más comunes - Placeholder por ahora */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Análisis Detallado</h3>
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">📊 Análisis detallado de categorías y fallos</p>
              <p className="text-sm">
                Próximamente: fallos más comunes, análisis por categorías, 
                mejores tiendas por área específica
              </p>
              <p className="text-xs mt-2 text-gray-400">
                Requiere implementación del sistema de respuestas detalladas
              </p>
            </div>
          </Card>

          {/* Performance por auditor */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Performance por Auditor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auditStats.auditoriasPorAuditor.map((auditor, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">{auditor.nombre}</h4>
                  <p className="text-sm text-gray-600">
                    {auditor.cantidad} auditorías realizadas
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    Promedio: {auditor.promedio.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📊 Estadísticas</h1>
      </div>

      {/* Navegación por pestañas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'auditorias', label: '📋 Auditorías' },
            { key: 'ventas', label: '💰 Ventas' },
            { key: 'inventario', label: '📦 Inventario' },
            { key: 'usuarios', label: '👥 Usuarios' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      {activeTab === 'auditorias' && renderAuditoriasTab()}
      
      {activeTab === 'ventas' && (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">💰 Estadísticas de Ventas</h3>
          <p className="text-gray-600">Próximamente: análisis de ventas, tendencias, productos más vendidos, etc.</p>
        </Card>
      )}

      {activeTab === 'inventario' && (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">📦 Estadísticas de Inventario</h3>
          <p className="text-gray-600">Próximamente: rotación de productos, stock bajo, análisis de categorías, etc.</p>
        </Card>
      )}

      {activeTab === 'usuarios' && (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">👥 Estadísticas de Usuarios</h3>
          <p className="text-gray-600">Próximamente: actividad de usuarios, roles, productividad, etc.</p>
        </Card>
      )}
    </div>
  );
};

export default Statistics;