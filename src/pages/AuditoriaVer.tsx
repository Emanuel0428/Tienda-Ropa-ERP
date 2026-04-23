import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AuditoriaDetalleView, { cargarDetalleAuditoria, DetalleAuditoria } from '../components/AuditoriaDetalleView';
import {
  enviarNotificacionAuditoriaCompletada,
  obtenerEmailsEmpleadasTienda,
  formatearFechaEmail,
  NotificacionAuditoria,
  CategoriaResumen,
  FotoResumen,
} from '../services/emailService';

const CORREO_FIJO = 'fmartinezt@gmail.com';

const construirPayloadEmail = (detalle: DetalleAuditoria): Omit<NotificacionAuditoria, 'to_email'> => {
  const categorias: CategoriaResumen[] = detalle.categorias.map(c => ({
    nombre: c.nombre,
    peso: 0,
    calificacion: 0,
    porcentaje: c.porcentaje,
    preguntas_total: c.preguntas.length,
    preguntas_aprobadas: c.aprobadas,
    preguntas_reprobadas: c.reprobadas,
  }));

  const fotosPorTipo: Record<string, string[]> = {};
  detalle.fotos.forEach(f => {
    if (!fotosPorTipo[f.tipo_foto]) fotosPorTipo[f.tipo_foto] = [];
    fotosPorTipo[f.tipo_foto].push(f.url_foto);
  });
  const fotos: FotoResumen[] = Object.entries(fotosPorTipo).map(([tipo, urls]) => ({
    tipo,
    cantidad: urls.length,
    urls,
  }));

  const totalPreguntas = detalle.categorias.reduce((s, c) => s + c.preguntas.length, 0);
  const aprobadas = detalle.categorias.reduce((s, c) => s + c.aprobadas, 0);
  const reprobadas = detalle.categorias.reduce((s, c) => s + c.reprobadas, 0);

  return {
    auditoria_id: detalle.id_auditoria,
    tienda_nombre: detalle.tienda_nombre,
    fecha_auditoria: formatearFechaEmail(detalle.fecha),
    calificacion_final: detalle.calificacion_total ?? 0,
    auditor: detalle.auditor_nombre,
    notas_personal: detalle.notas_personal,
    notas_campanas: detalle.notas_campanas,
    notas_conclusiones: detalle.notas_conclusiones,
    observaciones: detalle.observaciones,
    total_preguntas: totalPreguntas,
    preguntas_aprobadas: aprobadas,
    preguntas_reprobadas: reprobadas,
    categorias,
    fotos,
  };
};

const AuditoriaVer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idAuditoria = Number(id);

  const [detalle, setDetalle] = useState<DetalleAuditoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [emailResultado, setEmailResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!idAuditoria) return;
    cargarDetalleAuditoria(idAuditoria)
      .then(d => setDetalle(d))
      .catch(() => setError('No se pudo cargar la auditoría'))
      .finally(() => setLoading(false));
  }, [idAuditoria]);

  const handleReenviarCorreo = async () => {
    if (!detalle) return;
    setEnviando(true);
    setEmailResultado(null);

    try {
      const payload = construirPayloadEmail(detalle);
      const empleadas = detalle.id_tienda
        ? await obtenerEmailsEmpleadasTienda(detalle.id_tienda)
        : [];
      const destinatarios = [...new Set([CORREO_FIJO, ...empleadas])];

      const resultados = await Promise.allSettled(
        destinatarios.map(email =>
          enviarNotificacionAuditoriaCompletada({ ...payload, to_email: email })
        )
      );

      const enviados = resultados.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;
      const fallidos = destinatarios.length - enviados;

      if (enviados === 0) {
        setEmailResultado({ ok: false, msg: `No se pudo enviar a ningún destinatario (${destinatarios.join(', ')})` });
      } else if (fallidos > 0) {
        setEmailResultado({ ok: true, msg: `Enviado a ${enviados} de ${destinatarios.length} destinatarios` });
      } else {
        setEmailResultado({ ok: true, msg: `Correo enviado a: ${destinatarios.join(', ')}` });
      }
    } catch {
      setEmailResultado({ ok: false, msg: 'Error inesperado al enviar el correo' });
    } finally {
      setEnviando(false);
    }
  };

  if (!idAuditoria) {
    return <div className="text-center py-12 text-red-500">ID de auditoría inválido</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !detalle) {
    return <div className="text-center py-12 text-red-500">{error || 'Sin datos'}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pt-14 pb-6 px-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/auditoria/historial')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al historial
        </button>

        {detalle.estado === 'completada' && (
          <button
            onClick={handleReenviarCorreo}
            disabled={enviando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Mail className="w-4 h-4" /> Reenviar correo</>}
          </button>
        )}
      </div>

      {/* Resultado del envío */}
      {emailResultado && (
        <div className={`flex items-start gap-2 mb-4 rounded-lg px-4 py-3 text-sm ${
          emailResultado.ok
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {emailResultado.ok
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{emailResultado.msg}</span>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Auditoría {detalle.id_auditoria_custom || `#${detalle.id_auditoria}`}
      </h1>

      <AuditoriaDetalleView idAuditoria={idAuditoria} detalle={detalle} />
    </div>
  );
};

export default AuditoriaVer;
