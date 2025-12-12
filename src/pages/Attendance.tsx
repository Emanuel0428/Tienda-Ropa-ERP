import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, LogIn, LogOut as LogOutIcon, Wifi, WifiOff, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AttendanceRecord {
  id: number;
  check_in: string;
  check_out: string | null;
  wifi_verified: boolean;
  wifi_name: string | null;
}

interface StoreSchedule {
  check_in_deadline: string;
  expected_wifi_name: string;
  notification_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  location_radius_meters: number;
  // Horarios semanales
  monday_check_in_deadline?: string;
  tuesday_check_in_deadline?: string;
  wednesday_check_in_deadline?: string;
  thursday_check_in_deadline?: string;
  friday_check_in_deadline?: string;
  saturday_check_in_deadline?: string;
  sunday_check_in_deadline?: string;
}

// Función helper para obtener el horario del día actual
const getTodayDeadline = (
  schedule: StoreSchedule | null, 
  individualSchedule: { check_in_deadline: string; is_day_off: boolean; notes: string | null } | null
): string => {
  // Prioridad 1: Horario individual si existe
  if (individualSchedule) {
    return individualSchedule.check_in_deadline;
  }
  
  // Prioridad 2: Horario semanal de la tienda
  if (!schedule) return '09:00:00';
  
  const dayOfWeek = new Date().getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  
  switch (dayOfWeek) {
    case 0: return schedule.sunday_check_in_deadline || schedule.check_in_deadline;
    case 1: return schedule.monday_check_in_deadline || schedule.check_in_deadline;
    case 2: return schedule.tuesday_check_in_deadline || schedule.check_in_deadline;
    case 3: return schedule.wednesday_check_in_deadline || schedule.check_in_deadline;
    case 4: return schedule.thursday_check_in_deadline || schedule.check_in_deadline;
    case 5: return schedule.friday_check_in_deadline || schedule.check_in_deadline;
    case 6: return schedule.saturday_check_in_deadline || schedule.check_in_deadline;
    default: return schedule.check_in_deadline;
  }
};

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [storeSchedule, setStoreSchedule] = useState<StoreSchedule | null>(null);
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; name: string | null }>({ connected: false, name: null });
  const [locationStatus, setLocationStatus] = useState<{
    verified: boolean;
    checking: boolean;
    error: string;
    distance: number | null;
  }>({ verified: false, checking: false, error: '', distance: null });
  const [userId, setUserId] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [individualSchedule, setIndividualSchedule] = useState<{
    check_in_deadline: string;
    is_day_off: boolean;
    notes: string | null;
  } | null>(null);

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('id_usuario, id_tienda')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setUserId(userData.id_usuario);
      setStoreId(userData.id_tienda);
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
    }
  }, [navigate]);

  const loadTodayAttendance = useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('id_usuario', userId)
        .gte('check_in', `${today}T00:00:00`)
        .lte('check_in', `${today}T23:59:59`)
        .order('check_in', { ascending: false });

      if (error) throw error;

      setTodayRecords(data || []);
      
      // Buscar si hay un registro activo (sin check_out)
      const activeRecord = data?.find(record => !record.check_out);
      setCurrentRecord(activeRecord || null);
    } catch (error) {
      console.error('Error cargando registros de asistencia:', error);
    }
  }, [userId]);

  const defaultSchedule: StoreSchedule = useMemo(() => ({
    check_in_deadline: '09:00:00',
    expected_wifi_name: '',
    notification_enabled: true,
    latitude: null,
    longitude: null,
    location_radius_meters: 100,
    monday_check_in_deadline: '09:00:00',
    tuesday_check_in_deadline: '09:00:00',
    wednesday_check_in_deadline: '09:00:00',
    thursday_check_in_deadline: '09:00:00',
    friday_check_in_deadline: '09:00:00',
    saturday_check_in_deadline: '10:00:00',
    sunday_check_in_deadline: '10:00:00'
  }), []);

  const loadStoreSchedule = useCallback(async () => {
    if (!storeId) return;

    try {
      const { data, error } = await supabase
        .from('store_schedules')
        .select('*')
        .eq('id_tienda', storeId)
        .maybeSingle();

      setStoreSchedule(data || defaultSchedule);
      
      if (error) {
        console.error('Error cargando configuración de horarios:', error);
      }
    } catch (error) {
      console.error('Error cargando configuración de horarios:', error);
      setStoreSchedule(defaultSchedule);
    }
  }, [storeId, defaultSchedule]);

  const loadIndividualSchedule = useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('check_in_deadline, is_day_off, notes')
        .eq('id_usuario', userId)
        .eq('schedule_date', today)
        .maybeSingle();

      if (data) {
        setIndividualSchedule(data);
      } else {
        setIndividualSchedule(null);
      }
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error cargando horario individual:', error);
      }
    } catch (error) {
      console.error('Error cargando horario individual:', error);
      setIndividualSchedule(null);
    }
  }, [userId]);

  // Función para calcular distancia entre dos coordenadas GPS (fórmula Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // Verificar ubicación GPS del usuario
  const checkLocation = async (): Promise<boolean> => {
    if (!storeSchedule || !storeSchedule.latitude || !storeSchedule.longitude) {
      // No hay coordenadas configuradas, permitir acceso
      setLocationStatus({
        verified: true,
        checking: false,
        error: 'No hay ubicación configurada para esta tienda',
        distance: null
      });
      return true;
    }

    setLocationStatus(prev => ({ ...prev, checking: true, error: '' }));

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus({
          verified: false,
          checking: false,
          error: 'Tu navegador no soporta geolocalización',
          distance: null
        });
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          const storeLat = storeSchedule.latitude!;
          const storeLon = storeSchedule.longitude!;
          
          const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
          const maxDistance = storeSchedule.location_radius_meters || 100;
          const isWithinRange = distance <= maxDistance;

          setLocationStatus({
            verified: isWithinRange,
            checking: false,
            error: isWithinRange ? '' : `Estás a ${Math.round(distance)}m de la tienda (máximo: ${maxDistance}m)`,
            distance: Math.round(distance)
          });

          resolve(isWithinRange);
        },
        (error) => {
          let errorMessage = 'Error obteniendo ubicación';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Debes permitir el acceso a tu ubicación para dar entrada';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'No se pudo determinar tu ubicación';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado obteniendo ubicación';
              break;
          }
          
          setLocationStatus({
            verified: false,
            checking: false,
            error: errorMessage,
            distance: null
          });
          
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const checkWifiConnection = useCallback(async () => {
    try {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          setWifiStatus({ connected: true, name: 'Conectado a Internet' });
        } catch {
          setWifiStatus({ connected: isOnline, name: isOnline ? 'Conectado' : 'Sin conexión' });
        }
      } else {
        setWifiStatus({ connected: false, name: 'Sin conexión' });
      }
    } catch (error) {
      console.error('Error verificando WiFi:', error);
      setWifiStatus({ connected: false, name: null });
    }
  }, []);

  const checkIfLate = useCallback(() => {
    if (!storeSchedule) return;

    // Si tiene día libre configurado, no marcar tardanza
    if (individualSchedule?.is_day_off) {
      setIsLate(false);
      return;
    }

    const now = new Date();
    const todayDeadline = getTodayDeadline(storeSchedule, individualSchedule);
    
    const [hours, minutes] = todayDeadline.split(':');
    const deadline = new Date();
    deadline.setHours(parseInt(hours), parseInt(minutes), 0);

    setIsLate(now > deadline && !currentRecord);
  }, [storeSchedule, individualSchedule, currentRecord]);

  const handleCheckIn = async () => {
    if (!userId || !storeId) {
      alert('Error: No se pudo identificar el usuario');
      return;
    }

    // Verificar si hay un registro activo
    if (currentRecord) {
      alert('Ya tienes una entrada registrada. Debes dar salida primero.');
      return;
    }

    // Verificar si es día libre
    if (individualSchedule?.is_day_off) {
      alert('🏖️ DÍA LIBRE\n\nHoy tienes el día libre según tu horario personalizado. No puedes registrar entrada.');
      return;
    }

    // Verificar conexión a internet (obligatorio)
    if (!wifiStatus.connected) {
      alert('⚠️ NO HAY CONEXIÓN A INTERNET\n\nPor favor conecta tu dispositivo a internet para registrar entrada.');
      return;
    }

    // Verificar ubicación GPS (obligatorio si está configurada)
    const locationVerified = await checkLocation();
    if (!locationVerified) {
      alert('⚠️ UBICACIÓN INCORRECTA\n\n' + locationStatus.error + '\n\nDebes estar en la ubicación de la tienda para dar entrada.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert([{
          id_usuario: userId,
          id_tienda: storeId,
          check_in: new Date().toISOString(),
          wifi_verified: wifiStatus.connected,
          wifi_name: wifiStatus.name
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentRecord(data);
      await loadTodayAttendance();
      alert('✅ Entrada registrada exitosamente');
    } catch (error) {
      console.error('Error registrando entrada:', error);
      alert('Error al registrar entrada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentRecord) {
      alert('No tienes una entrada registrada');
      return;
    }

    const confirm = window.confirm('¿Confirmas que deseas registrar tu salida?');
    if (!confirm) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('attendance_records')
        .update({ check_out: new Date().toISOString() })
        .eq('id', currentRecord.id);

      if (error) throw error;

      setCurrentRecord(null);
      await loadTodayAttendance();
      alert('✅ Salida registrada exitosamente');
    } catch (error) {
      console.error('Error registrando salida:', error);
      alert('Error al registrar salida');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Effects después de todas las funciones
  useEffect(() => {
    loadUserData();
    checkWifiConnection();
  }, [loadUserData, checkWifiConnection]);

  useEffect(() => {
    if (userId && storeId) {
      loadTodayAttendance();
      loadStoreSchedule();
      loadIndividualSchedule();
    }
  }, [userId, storeId, loadTodayAttendance, loadStoreSchedule, loadIndividualSchedule]);

  useEffect(() => {
    if (storeSchedule && !currentRecord) {
      checkIfLate();
    }
  }, [storeSchedule, individualSchedule, currentRecord, checkIfLate]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary-600" />
            Control de Asistencia
          </h1>
          <p className="text-gray-600 mt-2">Registra tu entrada y salida de la tienda</p>
        </div>

        {/* Alerta de verificación GPS */}
        {storeSchedule?.latitude && storeSchedule?.longitude && (
          <Card className={`mb-6 border-l-4 ${locationStatus.verified ? 'border-green-500' : locationStatus.error ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="flex items-start gap-3">
              <MapPin className={`w-6 h-6 flex-shrink-0 mt-1 ${locationStatus.verified ? 'text-green-500' : locationStatus.error ? 'text-red-500' : 'text-gray-400'}`} />
              <div className="flex-1">
                {locationStatus.checking ? (
                  <>
                    <p className="font-medium text-gray-900">Verificando ubicación...</p>
                    <p className="text-sm text-gray-600 mt-1">Por favor permite el acceso a tu ubicación</p>
                  </>
                ) : locationStatus.verified ? (
                  <>
                    <p className="font-medium text-green-900">✅ Ubicación verificada</p>
                    <p className="text-sm text-green-700 mt-1">
                      Estás en la ubicación de la tienda {locationStatus.distance && `(${locationStatus.distance}m)`}
                    </p>
                  </>
                ) : locationStatus.error ? (
                  <>
                    <p className="font-medium text-red-900">❌ Ubicación no verificada</p>
                    <p className="text-sm text-red-700 mt-1">{locationStatus.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">📍 Verificación de ubicación requerida</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Se verificará tu ubicación al dar entrada (radio: {storeSchedule.location_radius_meters}m)
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Horario Individual Configurado */}
        {individualSchedule && (
          <Card className={`mb-6 ${individualSchedule.is_day_off ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-3">
              <Clock className={`w-6 h-6 ${individualSchedule.is_day_off ? 'text-yellow-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                {individualSchedule.is_day_off ? (
                  <>
                    <p className="font-medium text-yellow-900">🏖️ Día libre programado</p>
                    <p className="text-sm text-yellow-700">
                      Hoy tienes el día libre según tu horario personalizado
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-blue-900">📅 Horario personalizado</p>
                    <p className="text-sm text-blue-700">
                      Hora de entrada hoy: {individualSchedule.check_in_deadline}
                      {individualSchedule.notes && ` • ${individualSchedule.notes}`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Alerta de tardanza */}
        {isLate && storeSchedule && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-900">⚠️ Llegada tarde</p>
                <p className="text-sm text-red-700">
                  Hora límite: {getTodayDeadline(storeSchedule, individualSchedule)}. Por favor registra tu entrada.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Estado actual */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Estado Actual</h2>
          
          {currentRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-900">Entrada registrada</p>
                    <p className="text-sm text-green-700">Hora: {formatTime(currentRecord.check_in)}</p>
                    <p className="text-sm text-green-700">Duración: {calculateDuration(currentRecord.check_in, null)}</p>
                  </div>
                </div>
                <Button
                  onClick={handleCheckOut}
                  variant="danger"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <LogOutIcon className="w-4 h-4" />
                  Registrar Salida
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">No has registrado entrada hoy</p>
              <Button
                onClick={handleCheckIn}
                variant="primary"
                disabled={isLoading}
                className="flex items-center gap-2 mx-auto"
              >
                <LogIn className="w-4 h-4" />
                Registrar Entrada
              </Button>
            </div>
          )}
        </Card>

        {/* Historial del día */}
        {todayRecords.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Registros de Hoy</h2>
            <div className="space-y-3">
              {todayRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <LogIn className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Entrada: {formatTime(record.check_in)}</span>
                    </div>
                    {record.check_out && (
                      <div className="flex items-center gap-2">
                        <LogOutIcon className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Salida: {formatTime(record.check_out)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {calculateDuration(record.check_in, record.check_out)}
                    </p>
                    {record.wifi_verified ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> WiFi verificado
                      </p>
                    ) : (
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Sin verificar
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Attendance;
