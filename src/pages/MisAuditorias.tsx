import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar,
  MapPin,
  User,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  Camera,
  AlertCircle,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuditoriaItem {
  id_auditoria: number;
  id_auditoria_custom?: string;
  fecha: string;
  estado: 'en_progreso' | 'completada';
  quienes_reciben: string;
  calificacion_total?: number;
  created_at: string;
  tiendas?: { nombre: string };
}

interface Pregunta {
  id_auditoria_pregunta: number;
  texto_pregunta: string;
  id_categoria: number;
  orden: number;
  respuesta?: boolean | null;
  comentario?: string | null;
  accion_correctiva?: string | null;
}

interface Categoria {
  id: number;
  nombre: string;
  preguntas: Pregunta[];
  aprobadas: number;
  reprobadas: number;
  porcentaje: number;
}

interface DetalleAuditoria {
  id_auditoria: number;
  id_auditoria_custom?: string;
  fecha: string;
  estado: string;
  quienes_reciben: string;
  calificacion_total?: number;
  notas_personal?: string;
  notas_campanas?: string;
  notas_conclusiones?: string;
  observaciones?: string;
  tienda_nombre: string;
  auditor_nombre?: string;
  categorias: Categoria[];
  fotos: { tipo_foto: string; url_foto: string }[];
}

// ── Componente ────────────────────────────────────────────────────────────────

const MisAuditorias = () => {
  const { user } = useAuth();
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<DetalleAuditoria | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<number>>(new Set());
  const [filtro, setFiltro] = useState<'todas' | 'completada' | 'en_progreso'>('todas');

  // ── Cargar lista ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.store) return;
    cargarAuditorias();
  }, [user]);

  const cargarAuditorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select(`
          id_auditoria, id_auditoria_custom, fecha, estado,
          quienes_reciben, calificacion_total, created_at,
          tiendas ( nombre )
        `)
        .eq('id_tienda', Number(user!.store))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditorias((data || []) as AuditoriaItem[]);
    } catch (e) {
      console.error('Error cargando auditorías:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Cargar detalle ────────────────────────────────────────────────────────

  const abrirDetalle = async (id: number) => {
    setLoadingDetalle(true);
    try {
      // 1. Info básica + tienda
      const { data: aud } = await supabase
        .from('auditorias')
        .select('*, tiendas(nombre)')
        .eq('id_auditoria', id)
        .single();

      // 2. Nombre del auditor
      let auditorNombre = 'Desconocido';
      if (aud.id_auditor) {
        const { data: u } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', aud.id_auditor)
          .single();
        if (u) auditorNombre = u.nombre;
      }

      // 3. Preguntas con respuestas
      const { data: preguntasRaw } = await supabase
        .from('auditoria_preguntas')
        .select('id_auditoria_pregunta, texto_pregunta, id_categoria, orden, respuestas(respuesta, comentario, accion_correctiva)')
        .eq('id_auditoria', id)
        .order('orden');

      // 4. Categorías (join manual)
      const { data: categoriasRaw } = await supabase
        .from('categorias')
        .select('id, nombre');

      const categoriasMap: Record<number, string> = {};
      (categoriasRaw || []).forEach((c: any) => { categoriasMap[c.id] = c.nombre; });

      // Agrupar preguntas por categoría
      const porCategoria: Record<number, Pregunta[]> = {};
      (preguntasRaw || []).forEach((p: any) => {
        const resp = Array.isArray(p.respuestas) ? p.respuestas[0] : null;
        const pregunta: Pregunta = {
          id_auditoria_pregunta: p.id_auditoria_pregunta,
          texto_pregunta: p.texto_pregunta,
          id_categoria: p.id_categoria,
          orden: p.orden,
          respuesta: resp?.respuesta ?? null,
          comentario: resp?.comentario ?? null,
          accion_correctiva: resp?.accion_correctiva ?? null,
        };
        if (!porCategoria[p.id_categoria]) porCategoria[p.id_categoria] = [];
        porCategoria[p.id_categoria].push(pregunta);
      });

      const categorias: Categoria[] = Object.entries(porCategoria).map(([idCat, preguntas]) => {
        const aprobadas = preguntas.filter(p => p.respuesta === true).length;
        const reprobadas = preguntas.filter(p => p.respuesta === false).length;
        const respondidas = aprobadas + reprobadas;
        return {
          id: Number(idCat),
          nombre: categoriasMap[Number(idCat)] || `Categoría ${idCat}`,
          preguntas,
          aprobadas,
          reprobadas,
          porcentaje: respondidas > 0 ? Math.round((aprobadas / respondidas) * 100) : 0,
        };
      });

      // 5. Fotos
      const { data: fotos } = await supabase
        .from('auditoria_fotos')
        .select('tipo_foto, url_foto')
        .eq('id_auditoria', id);

      setDetalle({
        id_auditoria: aud.id_auditoria,
        id_auditoria_custom: aud.id_auditoria_custom,
        fecha: aud.fecha,
        estado: aud.estado,
        quienes_reciben: aud.quienes_reciben,
        calificacion_total: aud.calificacion_total,
        notas_personal: aud.notas_personal,
        notas_campanas: aud.notas_campanas,
        notas_conclusiones: aud.notas_conclusiones,
        observaciones: aud.observaciones,
        tienda_nombre: aud.tiendas?.nombre || '',
        auditor_nombre: auditorNombre,
        categorias,
        fotos: fotos || [],
      });

      // Expandir categorías con reprobadas por defecto
      const conReprobadas = new Set(
        categorias.filter(c => c.reprobadas > 0).map(c => c.id)
      );
      setCategoriasExpandidas(conReprobadas);
    } catch (e) {
      console.error('Error cargando detalle:', e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const toggleCategoria = (id: number) => {
    setCategoriasExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  const colorCalificacion = (pct: number) =>
    pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';

  const bgBarCalificacion = (pct: number) =>
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  const auditoriasVista = auditorias.filter(a =>
    filtro === 'todas' ? true : a.estado === filtro
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user?.store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
        <Card className="max-w-lg mx-auto text-center py-12 mt-8">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">Tu cuenta no está asociada a ninguna tienda.</p>
          <p className="text-sm text-gray-500 mt-1">Contacta al administrador para que te asigne una tienda.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando auditorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-8 px-4 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            Mis Auditorías
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historial de auditorías realizadas en tu tienda — solo lectura
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['todas', 'completada', 'en_progreso'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                filtro === f
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400'
              }`}
            >
              {f === 'todas' ? `Todas (${auditorias.length})`
                : f === 'completada' ? `Completadas (${auditorias.filter(a => a.estado === 'completada').length})`
                : `En progreso (${auditorias.filter(a => a.estado === 'en_progreso').length})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {auditoriasVista.length === 0 ? (
          <Card className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay auditorías registradas</p>
            <p className="text-sm text-gray-400 mt-1">Las auditorías completadas aparecerán aquí</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {auditoriasVista.map(a => {
              const pct = a.calificacion_total ? Math.round(a.calificacion_total) : null;
              return (
                <Card key={a.id_auditoria} className="hover:shadow-md transition-shadow">
                  <div className="p-5">
                    {/* Estado + ID */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {a.id_auditoria_custom || `#${a.id_auditoria}`}
                      </span>
                      {a.estado === 'completada' ? (
                        <Badge variant="success" className="flex items-center gap-1 text-xs">
                          <CheckCircle className="w-3 h-3" /> Completada
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" /> En progreso
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 shrink-0" />
                        {new Date(a.fecha || a.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="w-4 h-4 shrink-0" />
                        Reciben: {a.quienes_reciben}
                      </div>
                    </div>

                    {/* Calificación */}
                    {pct !== null && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Calificación</span>
                          <span className={`font-bold ${colorCalificacion(pct)}`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${bgBarCalificacion(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Acción */}
                    <Button
                      onClick={() => abrirDetalle(a.id_auditoria)}
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2 text-sm"
                      disabled={loadingDetalle}
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalle
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {detalle && (
        <Modal
          isOpen={true}
          onClose={() => setDetalle(null)}
          title={`Auditoría ${detalle.id_auditoria_custom || `#${detalle.id_auditoria}`}`}
          size="lg"
        >
          <div className="space-y-6 pb-2">

            {/* Cabecera con info general */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{detalle.tienda_nombre}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{new Date(detalle.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4 shrink-0" />
                <span>Auditor: {detalle.auditor_nombre}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4 shrink-0" />
                <span>Reciben: {detalle.quienes_reciben}</span>
              </div>
            </div>

            {/* Calificación total */}
            {detalle.calificacion_total !== undefined && detalle.calificacion_total !== null && (
              <div className="text-center py-4 border rounded-xl dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-1">Calificación final</p>
                <p className={`text-5xl font-bold ${colorCalificacion(Math.round(detalle.calificacion_total))}`}>
                  {Math.round(detalle.calificacion_total)}%
                </p>
                <div className="mt-3 mx-8">
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${bgBarCalificacion(Math.round(detalle.calificacion_total))}`}
                      style={{ width: `${Math.min(Math.round(detalle.calificacion_total), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Resultados por categoría */}
            {detalle.categorias.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Resultados por categoría</h3>
                <div className="space-y-2">
                  {detalle.categorias.map(cat => (
                    <div key={cat.id} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                      {/* Header categoría */}
                      <button
                        onClick={() => toggleCategoria(cat.id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {categoriasExpandidas.has(cat.id)
                            ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{cat.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <span className="text-xs text-green-600 font-medium">{cat.aprobadas}✓</span>
                          <span className="text-xs text-red-500 font-medium">{cat.reprobadas}✗</span>
                          <span className={`text-sm font-bold w-12 text-right ${colorCalificacion(cat.porcentaje)}`}>
                            {cat.porcentaje}%
                          </span>
                        </div>
                      </button>

                      {/* Preguntas */}
                      {categoriasExpandidas.has(cat.id) && (
                        <div className="divide-y dark:divide-gray-700">
                          {cat.preguntas.map(p => (
                            <div key={p.id_auditoria_pregunta} className={`p-3 ${
                              p.respuesta === false ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'
                            }`}>
                              <div className="flex items-start gap-2">
                                {p.respuesta === true && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                                {p.respuesta === false && <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                                {p.respuesta === null && <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{p.texto_pregunta}</p>
                                  {p.comentario && (
                                    <p className="text-xs text-gray-500 mt-1 italic">💬 {p.comentario}</p>
                                  )}
                                  {p.accion_correctiva && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">⚡ Acción: {p.accion_correctiva}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {(detalle.notas_personal || detalle.notas_campanas || detalle.notas_conclusiones || detalle.observaciones) && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notas del auditor</h3>
                <div className="space-y-3">
                  {detalle.notas_personal && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Personal</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{detalle.notas_personal}</p>
                    </div>
                  )}
                  {detalle.notas_campanas && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-1">Campañas</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{detalle.notas_campanas}</p>
                    </div>
                  )}
                  {detalle.notas_conclusiones && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Conclusiones</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{detalle.notas_conclusiones}</p>
                    </div>
                  )}
                  {detalle.observaciones && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">Observaciones</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{detalle.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fotos */}
            {detalle.fotos.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Fotografías ({detalle.fotos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {detalle.fotos.map((foto, i) => (
                    <a
                      key={i}
                      href={foto.url_foto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block rounded-lg overflow-hidden border dark:border-gray-700 aspect-square"
                    >
                      <img
                        src={foto.url_foto}
                        alt={foto.tipo_foto}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        <p className="text-white text-xs truncate">{foto.tipo_foto}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setDetalle(null)} variant="secondary">Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MisAuditorias;
