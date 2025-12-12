import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings, Save, Clock, Bell, Store as StoreIcon, RefreshCw, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface StoreSchedule {
  id?: number;
  id_tienda: number;
  nombre_tienda: string;
  check_in_deadline: string;
  notification_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  location_radius_meters: number;
  // Horarios semanales
  monday_check_in_deadline: string;
  tuesday_check_in_deadline: string;
  wednesday_check_in_deadline: string;
  thursday_check_in_deadline: string;
  friday_check_in_deadline: string;
  saturday_check_in_deadline: string;
  sunday_check_in_deadline: string;
}

const AttendanceSettings: React.FC = () => {
  const [stores, setStores] = useState<StoreSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.rol);
    } catch (error) {
      console.error('Error verificando rol:', error);
    }
  }, []);

  const loadStoresConfiguration = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener todas las tiendas
      const { data: tiendas, error: tiendasError } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .order('nombre');

      if (tiendasError) throw tiendasError;

      // Obtener configuraciones existentes
      const { data: schedules, error: schedulesError } = await supabase
        .from('store_schedules')
        .select('*');

      if (schedulesError) throw schedulesError;

      // Combinar datos
      const storesConfig: StoreSchedule[] = (tiendas || []).map(tienda => {
        const schedule = schedules?.find(s => s.id_tienda === tienda.id_tienda);
        return {
          id: schedule?.id,
          id_tienda: tienda.id_tienda,
          nombre_tienda: tienda.nombre,
          check_in_deadline: schedule?.check_in_deadline || '09:00:00',
          notification_enabled: schedule?.notification_enabled ?? true,
          latitude: schedule?.latitude || null,
          longitude: schedule?.longitude || null,
          location_radius_meters: schedule?.location_radius_meters || 100,
          // Horarios semanales
          monday_check_in_deadline: schedule?.monday_check_in_deadline || '09:00:00',
          tuesday_check_in_deadline: schedule?.tuesday_check_in_deadline || '09:00:00',
          wednesday_check_in_deadline: schedule?.wednesday_check_in_deadline || '09:00:00',
          thursday_check_in_deadline: schedule?.thursday_check_in_deadline || '09:00:00',
          friday_check_in_deadline: schedule?.friday_check_in_deadline || '09:00:00',
          saturday_check_in_deadline: schedule?.saturday_check_in_deadline || '10:00:00',
          sunday_check_in_deadline: schedule?.sunday_check_in_deadline || '10:00:00'
        };
      });

      setStores(storesConfig);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      alert('Error al cargar configuraciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSave = useCallback(async (storeConfig: StoreSchedule) => {
    // Validar que tenga coordenadas GPS configuradas
    const hasGPS = storeConfig.latitude !== null && storeConfig.longitude !== null;
    
    if (!hasGPS) {
      alert('⚠️ Debes configurar las coordenadas GPS (latitud y longitud) de la tienda.\n\nObtén las coordenadas desde Google Maps.');
      return;
    }

    setIsSaving(storeConfig.id_tienda);
    try {
      const dataToSave = {
        id_tienda: storeConfig.id_tienda,
        check_in_deadline: storeConfig.check_in_deadline,
        notification_enabled: storeConfig.notification_enabled,
        latitude: storeConfig.latitude,
        longitude: storeConfig.longitude,
        location_radius_meters: storeConfig.location_radius_meters,
        // Horarios semanales
        monday_check_in_deadline: storeConfig.monday_check_in_deadline,
        tuesday_check_in_deadline: storeConfig.tuesday_check_in_deadline,
        wednesday_check_in_deadline: storeConfig.wednesday_check_in_deadline,
        thursday_check_in_deadline: storeConfig.thursday_check_in_deadline,
        friday_check_in_deadline: storeConfig.friday_check_in_deadline,
        saturday_check_in_deadline: storeConfig.saturday_check_in_deadline,
        sunday_check_in_deadline: storeConfig.sunday_check_in_deadline
      };

      if (storeConfig.id) {
        // Actualizar existente
        const { error } = await supabase
          .from('store_schedules')
          .update(dataToSave)
          .eq('id', storeConfig.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('store_schedules')
          .insert([dataToSave]);

        if (error) throw error;
      }

      alert('\u2705 Configuraci\u00f3n guardada para ${storeConfig.nombre_tienda}');
      await loadStoresConfiguration(); // Recargar para obtener IDs actualizados
    } catch (error) {
      console.error('Error guardando configuraci\u00f3n:', error);
      alert('\u274c Error al guardar configuraci\u00f3n');
    } finally {
      setIsSaving(null);
    }
  }, [loadStoresConfiguration]);

  const updateStore = useCallback((id_tienda: number, field: keyof StoreSchedule, value: any) => {
    setStores(prevStores => prevStores.map(store => 
      store.id_tienda === id_tienda 
        ? { ...store, [field]: value }
        : store
    ));
  }, []);

  // Effects después de todas las funciones
  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadStoresConfiguration();
    }
  }, [userRole, loadStoresConfiguration]);

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
        <Card className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Restringido</h2>
          <p className="text-gray-600">
            Solo administradores pueden acceder a esta configuración.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary-600" />
              Configuración de Asistencia
            </h1>
            <p className="text-gray-600 mt-2">
              Configura horarios y ubicación GPS para cada tienda
            </p>
          </div>
          <Button
            onClick={loadStoresConfiguration}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Información */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Configuración del Sistema</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Horarios semanales:</strong> Configura horarios diferentes por cada día de la semana</li>
                <li>• <strong>Coordenadas GPS:</strong> Ubicación exacta de la tienda (latitud, longitud)</li>
                <li>• <strong>Radio de tolerancia:</strong> Distancia máxima permitida en metros</li>
                <li>• <strong>Notificaciones:</strong> Activar alertas para empleados tardíos</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Información sobre verificación GPS */}
        <Card className="mb-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">✅ Verificación de Ubicación GPS (Recomendado)</h3>
              <div className="text-sm text-green-800 space-y-2">
                <p>
                  <strong>La app verifica la ubicación GPS</strong> del empleado al dar entrada. 
                  Esto es más confiable y seguro que verificar WiFi.
                </p>
                <p className="mt-2">
                  <strong>Cómo obtener las coordenadas de tu tienda:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Abre Google Maps y busca tu tienda</li>
                  <li>Haz clic derecho en la ubicación exacta</li>
                  <li>Copia las coordenadas (aparecen en formato: 4.123456, -74.123456)</li>
                  <li>El primer número es la latitud, el segundo es la longitud</li>
                </ol>
                <p className="mt-2">
                  <strong>Radio de tolerancia:</strong> Se recomienda 50-100 metros para cubrir edificios grandes
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Lista de tiendas */}
        <div className="space-y-4">
          {stores.map((store) => (
            <Card key={store.id_tienda}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <StoreIcon className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{store.nombre_tienda}</h2>
              </div>

              {/* Horarios Semanales */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Horarios por Día de la Semana
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configura horarios diferentes para cada día. Si todos los días tienen el mismo horario, usa la misma hora para todos.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Lunes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔵 Lunes
                    </label>
                    <input
                      type="time"
                      value={store.monday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'monday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Martes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔵 Martes
                    </label>
                    <input
                      type="time"
                      value={store.tuesday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'tuesday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Miércoles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔵 Miércoles
                    </label>
                    <input
                      type="time"
                      value={store.wednesday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'wednesday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Jueves */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔵 Jueves
                    </label>
                    <input
                      type="time"
                      value={store.thursday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'thursday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Viernes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔵 Viernes
                    </label>
                    <input
                      type="time"
                      value={store.friday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'friday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Sábado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🟢 Sábado
                    </label>
                    <input
                      type="time"
                      value={store.saturday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'saturday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Domingo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🟢 Domingo
                    </label>
                    <input
                      type="time"
                      value={store.sunday_check_in_deadline}
                      onChange={(e) => updateStore(store.id_tienda, 'sunday_check_in_deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notificaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notificaciones
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={store.notification_enabled}
                        onChange={(e) => updateStore(store.id_tienda, 'notification_enabled', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Alertar tardanzas</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección GPS */}
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Verificación por GPS (Recomendado)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Latitud */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={store.latitude || ''}
                      onChange={(e) => updateStore(store.id_tienda, 'latitude', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Ej: 4.123456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Longitud */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={store.longitude || ''}
                      onChange={(e) => updateStore(store.id_tienda, 'longitude', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Ej: -74.123456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Radio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Radio (metros)
                    </label>
                    <input
                      type="number"
                      value={store.location_radius_meters}
                      onChange={(e) => updateStore(store.id_tienda, 'location_radius_meters', parseInt(e.target.value) || 100)}
                      placeholder="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Distancia máxima permitida
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón guardar */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleSave(store)}
                  disabled={isSaving === store.id_tienda}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving === store.id_tienda ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {stores.length === 0 && !isLoading && (
          <Card className="text-center py-12">
            <p className="text-gray-600">No hay tiendas configuradas</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AttendanceSettings;
