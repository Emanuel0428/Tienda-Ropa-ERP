import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Save, Link, AlertCircle, CheckCircle, FolderOpen, Calendar, FileText, FolderClosed } from 'lucide-react';

interface TiendaConfig {
  id_tienda: number;
  nombre: string;
}

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
}

const DriveConfig: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiendaConfig, setTiendaConfig] = useState<TiendaConfig | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [links, setLinks] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tipos de documentos que se pueden subir
  const tiposDocumentos: TipoDocumento[] = [
    { id: 'ventas', nombre: 'Ventas', descripcion: 'Reportes de ventas mensuales', icono: '💰' },
    { id: 'cierre_caja', nombre: 'Cierre de Caja', descripcion: 'Documentos de cierre diario de caja', icono: '📊' },
    { id: 'cierre_voucher', nombre: 'Cierre de Voucher', descripcion: 'Vouchers de tarjetas y pagos electrónicos', icono: '💳' },
    { id: 'consignaciones', nombre: 'Consignaciones', descripcion: 'Documentos de consignaciones bancarias', icono: '🏦' },
    { id: 'facturas_gastos', nombre: 'Facturas y Gastos', descripcion: 'Facturas de compras y gastos operativos', icono: '🧾' },
   ];

  useEffect(() => {
    loadTiendaConfig();
  }, []);

  useEffect(() => {
    // Cargar links cuando cambie el mes
    if (tiendaConfig) {
      loadLinksDelMes();
    }
  }, [mesSeleccionado, tiendaConfig]);

  const loadTiendaConfig = async () => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setErrorMessage('Usuario no autenticado');
        return;
      }

      // Obtener el id_tienda del usuario (primera consulta)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id_tienda')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        throw userError;
      }

      if (!userData || !userData.id_tienda) {
        setErrorMessage('Usuario no tiene tienda asignada');
        return;
      }

      // Obtener los datos de la tienda (segunda consulta)
      const { data: tiendaData, error: tiendaError } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .eq('id_tienda', userData.id_tienda)
        .single();

      if (tiendaError) {
        console.error('Error obteniendo tienda:', tiendaError);
        throw tiendaError;
      }

      if (tiendaData) {
        setTiendaConfig({
          id_tienda: tiendaData.id_tienda,
          nombre: tiendaData.nombre
        });
      }
    } catch (error: any) {
      console.error('Error cargando configuración:', error);
      setErrorMessage('Error al cargar la configuración de la tienda');
    } finally {
      setLoading(false);
    }
  };

  const loadLinksDelMes = async () => {
    if (!tiendaConfig) return;

    try {
      // Cargar la configuración guardada para este mes y tienda
      const { data, error } = await supabase
        .from('drive_configs')
        .select('tipo_documento, drive_link')
        .eq('id_tienda', tiendaConfig.id_tienda)
        .eq('mes', mesSeleccionado);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      // Convertir array a objeto { tipo_documento: link }
      const linksObj: Record<string, string> = {};
      if (data) {
        data.forEach(item => {
          linksObj[item.tipo_documento] = item.drive_link || '';
        });
      }

      setLinks(linksObj);
    } catch (error: any) {
      console.error('Error cargando links del mes:', error);
    }
  };

  const handleSave = async () => {
    if (!tiendaConfig) {
      setErrorMessage('No se pudo identificar la tienda');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Guardar cada link configurado
      const promises = Object.entries(links).map(([tipoDoc, link]) => {
        if (!link.trim()) return null; // Skip vacíos

        // Primero intentar actualizar, si no existe, insertar
        return supabase
          .from('drive_configs')
          .upsert({
            id_tienda: tiendaConfig.id_tienda,
            mes: mesSeleccionado,
            tipo_documento: tipoDoc,
            drive_link: link.trim(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id_tienda,mes,tipo_documento'
          });
      }).filter(p => p !== null);

      const results = await Promise.all(promises);
      
      // Verificar si hubo errores
      const errors = results.filter(r => r?.error);
      if (errors.length > 0) {
        throw new Error('Error guardando algunos links');
      }

      setSuccessMessage(`✅ Configuración guardada correctamente para ${getMesNombre()}`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      setErrorMessage('Error al guardar la configuración: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkChange = (tipoDoc: string, value: string) => {
    setLinks(prev => ({
      ...prev,
      [tipoDoc]: value
    }));
  };

  const getMesNombre = () => {
    const [year, month] = mesSeleccionado.split('-');
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary-600" />
          Configuración de Carpetas de Drive
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Configura los links de las carpetas de Google Drive para cada tipo de documento
        </p>
      </div>

      {/* Info de la tienda */}
      {tiendaConfig && (
        <Card className="mb-4 bg-primary-50 border-primary-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                {tiendaConfig.nombre}
              </h3>
              <p className="text-xs text-primary-700">
                ID: {tiendaConfig.id_tienda}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Mensajes */}
      {successMessage && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda: Selector de mes e instrucciones */}
        <div className="lg:col-span-1 space-y-4">
          {/* Selector de Mes */}
          <Card className="p-3">
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              Filtrar por Mes
            </h2>
            
            <input
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1.5 text-xs text-gray-600">
              <span className="font-semibold">{getMesNombre()}</span>
            </p>
          </Card>

          {/* Instrucciones */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <h3 className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Instrucciones
            </h3>
            <ol className="text-xs text-blue-800 space-y-0.5 list-decimal list-inside">
              <li>Crea carpetas en Drive</li>
              <li>Clic derecho → "Compartir"</li>
              <li>Copia el enlace</li>
              <li>Pégalo abajo</li>
              <li>Guarda la configuración</li>
            </ol>
          </Card>

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={saving || Object.values(links).every(link => !link?.trim())}
              className="w-full text-sm py-2"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            
            <Button
              onClick={() => navigate('/documents')}
              variant="outline"
              className="w-full text-sm py-2"
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Columna derecha: Lista de tipos de documentos */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <FolderClosed className="w-4 h-4 text-primary-600" />
            Tipos de Documentos
          </h2>

          <div className="space-y-2">
            {tiposDocumentos.map((tipo) => (
              <Card key={tipo.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Icono */}
                  <div className="text-2xl flex-shrink-0">{tipo.icono}</div>
                  
                  {/* Información y campo de link */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {tipo.nombre}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {tipo.descripcion}
                      </p>
                    </div>

                    {/* Campo de link */}
                    <div className="flex gap-1.5 items-center">
                      <div className="flex-1 relative">
                        <Link className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={links[tipo.id] || ''}
                          onChange={(e) => handleLinkChange(tipo.id, e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                        />
                      </div>
                      {links[tipo.id] && (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen de configuración */}
      {Object.keys(links).some(key => links[key]) && (
        <Card className="mt-4 bg-gray-50 p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            📊 Resumen - {getMesNombre()}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tiposDocumentos.map(tipo => {
              const link = links[tipo.id];
              if (!link) return null;
              
              return (
                <div key={tipo.id} className="flex items-center gap-1.5 text-xs bg-white p-2 rounded border border-gray-200">
                  <span className="text-base">{tipo.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tipo.nombre}</p>
                  </div>
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DriveConfig;
