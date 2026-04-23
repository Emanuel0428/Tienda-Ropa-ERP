import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar, MapPin, User, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Camera,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

export interface DetalleAuditoria {
  id_auditoria: number;
  id_auditoria_custom?: string;
  id_tienda?: number;
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

// ── Carga de datos (exportada para reusar) ────────────────────────────────────

export const cargarDetalleAuditoria = async (id: number): Promise<DetalleAuditoria> => {
  const [{ data: aud }, { data: preguntasRaw }, { data: categoriasRaw }, { data: fotos }] =
    await Promise.all([
      supabase.from('auditorias').select('*, tiendas(nombre)').eq('id_auditoria', id).single(),
      supabase
        .from('auditoria_preguntas')
        .select('id_auditoria_pregunta, texto_pregunta, id_categoria, orden, respuestas(respuesta, comentario, accion_correctiva)')
        .eq('id_auditoria', id)
        .order('orden'),
      supabase.from('categorias').select('id, nombre'),
      supabase.from('auditoria_fotos').select('tipo_foto, url_foto').eq('id_auditoria', id),
    ]);

  let auditorNombre = 'Desconocido';
  if (aud?.id_auditor) {
    const { data: u } = await supabase
      .from('usuarios').select('nombre').eq('id', aud.id_auditor).single();
    if (u) auditorNombre = u.nombre;
  }

  const categoriasMap: Record<number, string> = {};
  (categoriasRaw || []).forEach((c: any) => { categoriasMap[c.id] = c.nombre; });

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

  return {
    id_auditoria: aud.id_auditoria,
    id_auditoria_custom: aud.id_auditoria_custom,
    id_tienda: aud.id_tienda,
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
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const colorPct = (pct: number) =>
  pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';

const bgBarPct = (pct: number) =>
  pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  idAuditoria: number;
  detalle?: DetalleAuditoria;
}

const AuditoriaDetalleView: React.FC<Props> = ({ idAuditoria, detalle: detalleProp }) => {
  const [detalle, setDetalle] = useState<DetalleAuditoria | null>(detalleProp ?? null);
  const [loading, setLoading] = useState(!detalleProp);
  const [error, setError] = useState<string | null>(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<number>>(
    detalleProp
      ? new Set(detalleProp.categorias.filter(c => c.reprobadas > 0).map(c => c.id))
      : new Set()
  );

  useEffect(() => {
    if (detalleProp) return;
    cargarDetalleAuditoria(idAuditoria)
      .then(d => {
        setDetalle(d);
        setCategoriasExpandidas(new Set(d.categorias.filter(c => c.reprobadas > 0).map(c => c.id)));
      })
      .catch(() => setError('No se pudo cargar el detalle de la auditoría'))
      .finally(() => setLoading(false));
  }, [idAuditoria, detalleProp]);

  const toggleCategoria = (id: number) =>
    setCategoriasExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  if (error || !detalle) return (
    <div className="text-center py-12 text-red-500">{error || 'Sin datos'}</div>
  );

  const pct = detalle.calificacion_total ? Math.round(detalle.calificacion_total) : null;

  return (
    <div className="space-y-6">

      {/* Info general */}
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
      {pct !== null && (
        <div className="text-center py-5 border rounded-xl dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-1">Calificación final</p>
          <p className={`text-5xl font-bold ${colorPct(pct)}`}>{pct}%</p>
          <div className="mt-3 mx-8">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
              <div className={`h-3 rounded-full ${bgBarPct(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Categorías */}
      {detalle.categorias.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Resultados por categoría</h3>
          <div className="space-y-2">
            {detalle.categorias.map(cat => (
              <div key={cat.id} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategoria(cat.id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
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
                    <span className={`text-sm font-bold w-12 text-right ${colorPct(cat.porcentaje)}`}>{cat.porcentaje}%</span>
                  </div>
                </button>

                {categoriasExpandidas.has(cat.id) && (
                  <div className="divide-y dark:divide-gray-700">
                    {cat.preguntas.map(p => (
                      <div key={p.id_auditoria_pregunta} className={`p-3 ${p.respuesta === false ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}`}>
                        <div className="flex items-start gap-2">
                          {p.respuesta === true && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                          {p.respuesta === false && <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                          {p.respuesta === null && <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200">{p.texto_pregunta}</p>
                            {p.comentario && <p className="text-xs text-gray-500 mt-1 italic">💬 {p.comentario}</p>}
                            {p.accion_correctiva && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">⚡ Acción: {p.accion_correctiva}</p>}
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
              <a key={i} href={foto.url_foto} target="_blank" rel="noopener noreferrer"
                className="group relative block rounded-lg overflow-hidden border dark:border-gray-700 aspect-square">
                <img src={foto.url_foto} alt={foto.tipo_foto}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-xs truncate">{foto.tipo_foto}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaDetalleView;
