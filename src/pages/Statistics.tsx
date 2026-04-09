import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  MapPin, Users, Calendar, Target, RefreshCw
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Tienda {
  id_tienda: number;
  nombre: string;
  zona: 'norte' | 'sur' | null;
  promedio: number;
  cantidad: number;
}

interface FalloComun {
  texto_pregunta: string;
  categoria: string;
  fallos: number;
  total: number;
  porcentaje: number;
}

interface TendenciaMes {
  mes: string;
  promedio: number;
  cantidad: number;
}

interface AuditorPerformance {
  nombre: string;
  cantidad: number;
  promedio: number;
}

interface ZonaStats {
  nombre: string;
  tiendas: Tienda[];
  promedio: number;
  totalAuditorias: number;
}

interface Stats {
  totalAuditorias: number;
  promedioGeneral: number;
  auditoriasCompletadas: number;
  tiendas: Tienda[];
  fallosMasComunes: FalloComun[];
  tendenciaMensual: TendenciaMes[];
  auditoresPorformance: AuditorPerformance[];
  zonaStats: ZonaStats[];
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const ScoreBar = ({ value, max = 100, color = 'blue' }: { value: number; max?: number; color?: string }) => {
  const pct = Math.min((value / max) * 100, 100);
  const colors: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500',
    yellow: 'bg-yellow-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  };
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={`${colors[color] ?? 'bg-blue-500'} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const scoreColor = (v: number) => v >= 80 ? 'text-green-600' : v >= 60 ? 'text-yellow-600' : 'text-red-600';
const scoreBg = (v: number) => v >= 80 ? 'bg-green-50 border-green-200' : v >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
const scoreBarColor = (v: number) => v >= 80 ? 'green' : v >= 60 ? 'yellow' : 'red';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Componente ───────────────────────────────────────────────────────────────

const Statistics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTiendas, setAllTiendas] = useState<{ id_tienda: number; nombre: string }[]>([]);
  const [filters, setFilters] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    tienda: '',
    zona: '',
  });

  useEffect(() => {
    supabase.from('tiendas').select('id_tienda, nombre').order('nombre')
      .then(({ data }) => setAllTiendas(data || []));
  }, []);

  useEffect(() => { load(); }, [filters]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadAuditStats()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    // 1. Auditorías del período
    let auditQuery = supabase
      .from('auditorias')
      .select(`id_auditoria, fecha, calificacion_total, estado, id_tienda, id_auditor, tiendas(nombre, zona)`)
      .gte('fecha', filters.start)
      .lte('fecha', filters.end);

    if (filters.tienda) auditQuery = auditQuery.eq('id_tienda', parseInt(filters.tienda));

    const { data: auditorias, error: auditError } = await auditQuery;
    if (auditError) throw auditError;

    const lista = auditorias || [];

    // Filtrar por zona si está seleccionada
    const listaFiltrada = filters.zona
      ? lista.filter((a: any) => a.tiendas?.zona === filters.zona)
      : lista;

    // 2. Auditores
    const auditorIds = [...new Set(listaFiltrada.map((a: any) => a.id_auditor).filter(Boolean))];
    const { data: usuariosData } = auditorIds.length > 0
      ? await supabase.from('usuarios').select('id, nombre').in('id', auditorIds)
      : { data: [] };
    const auditoresMap: Record<string, string> = (usuariosData || []).reduce((acc: any, u: any) => {
      acc[u.id] = u.nombre; return acc;
    }, {});

    // 3. Tiendas con zonas
    const { data: tiendasData } = await supabase
      .from('tiendas').select('id_tienda, nombre, zona').order('nombre');

    const tiendasConZona: Record<number, any> = (tiendasData || []).reduce((acc: any, t: any) => {
      acc[t.id_tienda] = t; return acc;
    }, {});

    // 4. Estadísticas por tienda
    const tiendasStats: Record<number, { nombre: string; zona: string | null; total: number; count: number }> = {};
    listaFiltrada.forEach((a: any) => {
      const id = a.id_tienda;
      if (!tiendasStats[id]) {
        tiendasStats[id] = {
          nombre: tiendasConZona[id]?.nombre || a.tiendas?.nombre || `Tienda ${id}`,
          zona: tiendasConZona[id]?.zona || a.tiendas?.zona || null,
          total: 0, count: 0,
        };
      }
      tiendasStats[id].total += a.calificacion_total || 0;
      tiendasStats[id].count += 1;
    });

    const tiendas: Tienda[] = Object.entries(tiendasStats).map(([id, t]) => ({
      id_tienda: parseInt(id),
      nombre: t.nombre,
      zona: t.zona as 'norte' | 'sur' | null,
      promedio: t.count > 0 ? t.total / t.count : 0,
      cantidad: t.count,
    })).sort((a, b) => b.promedio - a.promedio);

    // 5. Zonas
    const zonaMap: Record<string, { tiendas: Tienda[]; totalProm: number; totalAud: number }> = {};
    tiendas.forEach(t => {
      const z = t.zona || 'sin_zona';
      if (!zonaMap[z]) zonaMap[z] = { tiendas: [], totalProm: 0, totalAud: 0 };
      zonaMap[z].tiendas.push(t);
      zonaMap[z].totalProm += t.promedio;
      zonaMap[z].totalAud += t.cantidad;
    });

    const zonaStats: ZonaStats[] = Object.entries(zonaMap)
      .filter(([z]) => z !== 'sin_zona')
      .map(([z, data]) => ({
        nombre: z === 'norte' ? 'Zona Norte' : z === 'sur' ? 'Zona Sur' : z,
        tiendas: data.tiendas,
        promedio: data.tiendas.length > 0 ? data.totalProm / data.tiendas.length : 0,
        totalAuditorias: data.totalAud,
      }));

    // 6. Fallos más comunes — join completo
    const idsAuditoria = listaFiltrada.map((a: any) => a.id_auditoria);
    let fallosMasComunes: FalloComun[] = [];

    if (idsAuditoria.length > 0) {
      const { data: preguntasData } = await supabase
        .from('auditoria_preguntas')
        .select(`
          id_auditoria_pregunta,
          texto_pregunta,
          id_auditoria,
          categorias ( nombre ),
          respuestas ( respuesta )
        `)
        .in('id_auditoria', idsAuditoria);

      const fallosMap: Record<string, { texto: string; categoria: string; fallos: number; total: number }> = {};
      (preguntasData || []).forEach((p: any) => {
        const r = p.respuestas?.[0];
        if (!r) return; // sin respuesta = ignorar
        const key = p.texto_pregunta;
        if (!fallosMap[key]) {
          fallosMap[key] = {
            texto: p.texto_pregunta,
            categoria: p.categorias?.nombre || 'Sin categoría',
            fallos: 0, total: 0,
          };
        }
        fallosMap[key].total++;
        if (r.respuesta === false) fallosMap[key].fallos++;
      });

      fallosMasComunes = Object.values(fallosMap)
        .filter(f => f.total > 0)
        .map(f => ({
          texto_pregunta: f.texto,
          categoria: f.categoria,
          fallos: f.fallos,
          total: f.total,
          porcentaje: Math.round((f.fallos / f.total) * 100),
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje)
        .slice(0, 10);
    }

    // 7. Tendencia mensual
    const tendMap: Record<string, { total: number; count: number }> = {};
    listaFiltrada.forEach((a: any) => {
      const fecha = new Date(a.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!tendMap[key]) tendMap[key] = { total: 0, count: 0 };
      tendMap[key].total += a.calificacion_total || 0;
      tendMap[key].count++;
    });

    const tendenciaMensual: TendenciaMes[] = Object.entries(tendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [year, month] = key.split('-');
        return {
          mes: `${MESES[parseInt(month) - 1]} ${year}`,
          promedio: v.count > 0 ? v.total / v.count : 0,
          cantidad: v.count,
        };
      });

    // 8. Performance auditores
    const audMap: Record<string, { total: number; count: number }> = {};
    listaFiltrada.forEach((a: any) => {
      const nombre = auditoresMap[a.id_auditor] || 'Sin identificar';
      if (!audMap[nombre]) audMap[nombre] = { total: 0, count: 0 };
      audMap[nombre].total += a.calificacion_total || 0;
      audMap[nombre].count++;
    });

    const auditoresPorformance: AuditorPerformance[] = Object.entries(audMap)
      .map(([nombre, v]) => ({ nombre, cantidad: v.count, promedio: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // 9. Totales
    const totalAuditorias = listaFiltrada.length;
    const promedioGeneral = totalAuditorias > 0
      ? listaFiltrada.reduce((s: number, a: any) => s + (a.calificacion_total || 0), 0) / totalAuditorias
      : 0;
    const auditoriasCompletadas = listaFiltrada.filter((a: any) => a.estado === 'completada').length;

    setStats({
      totalAuditorias, promedioGeneral, auditoriasCompletadas,
      tiendas, fallosMasComunes, tendenciaMensual, auditoresPorformance, zonaStats,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            Estadísticas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis de auditorías por zonas, tiendas y período</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Desde</label>
            <input type="date" value={filters.start}
              onChange={e => setFilters(f => ({ ...f, start: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
            <input type="date" value={filters.end}
              onChange={e => setFilters(f => ({ ...f, end: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Zona</label>
            <select value={filters.zona}
              onChange={e => setFilters(f => ({ ...f, zona: e.target.value, tienda: '' }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las zonas</option>
              <option value="norte">Zona Norte</option>
              <option value="sur">Zona Sur</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tienda</label>
            <select value={filters.tienda}
              onChange={e => setFilters(f => ({ ...f, tienda: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las tiendas</option>
              {allTiendas.map(t => (
                <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-primary-500" />
          <p>Cargando estadísticas...</p>
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
        </Card>
      ) : stats ? (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Auditorías</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAuditorias}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completadas</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.auditoriasCompletadas}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalAuditorias > 0 ? Math.round((stats.auditoriasCompletadas / stats.totalAuditorias) * 100) : 0}%
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Promedio General</p>
              <p className={`text-3xl font-bold mt-1 ${scoreColor(stats.promedioGeneral)}`}>
                {stats.promedioGeneral.toFixed(1)}%
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tiendas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.tiendas.length}</p>
              <p className="text-xs text-gray-400 mt-1">con auditorías</p>
            </Card>
          </div>

          {/* Zonas */}
          {stats.zonaStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stats.zonaStats.map(zona => (
                <Card key={zona.nombre} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${zona.nombre.includes('Norte') ? 'bg-blue-100' : 'bg-orange-100'}`}>
                        <MapPin className={`w-5 h-5 ${zona.nombre.includes('Norte') ? 'text-blue-600' : 'text-orange-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{zona.nombre}</h3>
                        <p className="text-xs text-gray-500">{zona.tiendas.length} tiendas • {zona.totalAuditorias} auditorías</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${scoreColor(zona.promedio)}`}>{zona.promedio.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">promedio</p>
                    </div>
                  </div>
                  <ScoreBar value={zona.promedio} color={scoreBarColor(zona.promedio)} />
                  <div className="mt-4 space-y-2">
                    {zona.tiendas.sort((a, b) => b.promedio - a.promedio).map(t => (
                      <div key={t.id_tienda} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{t.nombre}</span>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className="text-xs text-gray-400">{t.cantidad} aud.</span>
                          <span className={`font-bold ${scoreColor(t.promedio)}`}>{t.promedio.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Tiendas ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Top Tiendas
              </h3>
              {stats.tiendas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
              ) : stats.tiendas.slice(0, 5).map((t, i) => (
                <div key={t.id_tienda} className={`flex items-center justify-between p-3 rounded-lg mb-2 border ${scoreBg(t.promedio)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{t.nombre}</p>
                      {t.zona && <Badge variant={t.zona === 'norte' ? 'info' : 'warning'} size="sm">{t.zona === 'norte' ? 'Norte' : 'Sur'}</Badge>}
                    </div>
                  </div>
                  <span className={`font-bold ${scoreColor(t.promedio)}`}>{t.promedio.toFixed(1)}%</span>
                </div>
              ))}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Tiendas a Mejorar
              </h3>
              {stats.tiendas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
              ) : [...stats.tiendas].sort((a, b) => a.promedio - b.promedio).slice(0, 5).map((t, i) => (
                <div key={t.id_tienda} className={`flex items-center justify-between p-3 rounded-lg mb-2 border ${scoreBg(t.promedio)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{t.nombre}</p>
                      {t.zona && <Badge variant={t.zona === 'norte' ? 'info' : 'warning'} size="sm">{t.zona === 'norte' ? 'Norte' : 'Sur'}</Badge>}
                    </div>
                  </div>
                  <span className={`font-bold ${scoreColor(t.promedio)}`}>{t.promedio.toFixed(1)}%</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Fallos más comunes */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Preguntas con Más Fallos
            </h3>
            {stats.fallosMasComunes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sin datos de respuestas para el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.fallosMasComunes.map((f, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{f.texto_pregunta}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{f.categoria}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-lg font-bold ${f.porcentaje >= 70 ? 'text-red-600' : f.porcentaje >= 40 ? 'text-yellow-600' : 'text-orange-500'}`}>
                          {f.porcentaje}%
                        </span>
                        <p className="text-xs text-gray-400">{f.fallos}/{f.total} fallos</p>
                      </div>
                    </div>
                    <ScoreBar value={f.porcentaje} color={f.porcentaje >= 70 ? 'red' : f.porcentaje >= 40 ? 'yellow' : 'orange'} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tendencia mensual */}
          {stats.tendenciaMensual.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Tendencia Mensual
              </h3>
              <div className="space-y-3">
                {stats.tendenciaMensual.map((m, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{m.mes}</span>
                    <div className="flex-1">
                      <ScoreBar value={m.promedio} color={scoreBarColor(m.promedio)} />
                    </div>
                    <span className={`w-16 text-right text-sm font-bold flex-shrink-0 ${scoreColor(m.promedio)}`}>
                      {m.promedio.toFixed(1)}%
                    </span>
                    <span className="w-12 text-right text-xs text-gray-400 flex-shrink-0">{m.cantidad} aud.</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Performance auditores */}
          {stats.auditoresPorformance.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Performance por Auditor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.auditoresPorformance.map((a, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">{a.nombre}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{a.cantidad} auditorías</span>
                      <span className={`font-bold text-sm ${scoreColor(a.promedio)}`}>{a.promedio.toFixed(1)}%</span>
                    </div>
                    <ScoreBar value={a.promedio} color={scoreBarColor(a.promedio)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Todas las tiendas */}
          {stats.tiendas.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Todas las Tiendas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                      <th className="text-left py-2 pr-4">Tienda</th>
                      <th className="text-left py-2 pr-4">Zona</th>
                      <th className="text-right py-2 pr-4">Auditorías</th>
                      <th className="text-right py-2 pr-4">Promedio</th>
                      <th className="text-left py-2 w-32">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stats.tiendas.map(t => (
                      <tr key={t.id_tienda} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{t.nombre}</td>
                        <td className="py-3 pr-4">
                          {t.zona
                            ? <Badge variant={t.zona === 'norte' ? 'info' : 'warning'} size="sm">{t.zona === 'norte' ? 'Norte' : 'Sur'}</Badge>
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">{t.cantidad}</td>
                        <td className={`py-3 pr-4 text-right font-bold ${scoreColor(t.promedio)}`}>{t.promedio.toFixed(1)}%</td>
                        <td className="py-3 w-32">
                          <ScoreBar value={t.promedio} color={scoreBarColor(t.promedio)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </div>
      ) : null}
    </div>
  );
};

export default Statistics;
