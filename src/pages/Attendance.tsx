import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, LogIn, LogOut as LogOutIcon, Wifi, WifiOff, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  getTodayRecords,
  registerCheckIn,
  registerCheckOut,
  getStoreSchedule,
  getIndividualSchedule,
} from '../services/attendanceService';
import {
  getTodayDeadline,
  isLateForDeadline,
  formatTime,
  calculateDuration,
  calculateDistance,
} from '../hooks/useAttendanceUtils';
import type { AttendanceRecord, StoreSchedule, IndividualSchedule } from '../types/attendance';

const DEFAULT_SCHEDULE: StoreSchedule = {
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
  sunday_check_in_deadline: '10:00:00',
};

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [storeSchedule, setStoreSchedule] = useState<StoreSchedule | null>(null);
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; name: string | null }>({
    connected: false,
    name: null,
  });
  const [locationStatus, setLocationStatus] = useState<{
    verified: boolean;
    checking: boolean;
    error: string;
    distance: number | null;
  }>({ verified: false, checking: false, error: '', distance: null });
  const [userId, setUserId] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [individualSchedule, setIndividualSchedule] = useState<IndividualSchedule | null>(null);

  const isLate = useMemo(() => {
    if (!storeSchedule || currentRecord || individualSchedule?.is_day_off) return false;
    return isLateForDeadline(getTodayDeadline(storeSchedule, individualSchedule));
  }, [storeSchedule, individualSchedule, currentRecord]);

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, id_tienda')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserId(data.id_usuario);
      setStoreId(data.id_tienda);
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
    }
  }, [navigate]);

  const refreshTodayRecords = useCallback(async () => {
    if (!userId) return;
    try {
      const records = await getTodayRecords(userId);
      setTodayRecords(records);
      setCurrentRecord(records.find(r => !r.check_out) ?? null);
    } catch (error) {
      console.error('Error cargando registros de asistencia:', error);
    }
  }, [userId]);

  const checkWifiConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setWifiStatus({ connected: false, name: 'Sin conexión' });
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeout);
      setWifiStatus({ connected: true, name: 'Conectado a Internet' });
    } catch {
      setWifiStatus({ connected: navigator.onLine, name: navigator.onLine ? 'Conectado' : 'Sin conexión' });
    }
  }, []);

  const checkLocation = async (): Promise<boolean> => {
    if (!storeSchedule?.latitude || !storeSchedule?.longitude) {
      setLocationStatus({ verified: true, checking: false, error: 'No hay ubicación configurada', distance: null });
      return true;
    }

    setLocationStatus(prev => ({ ...prev, checking: true, error: '' }));

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus({ verified: false, checking: false, error: 'Tu navegador no soporta geolocalización', distance: null });
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = Math.round(calculateDistance(
            position.coords.latitude, position.coords.longitude,
            storeSchedule.latitude!, storeSchedule.longitude!
          ));
          const maxDistance = storeSchedule.location_radius_meters || 100;
          const ok = distance <= maxDistance;
          setLocationStatus({
            verified: ok,
            checking: false,
            error: ok ? '' : `Estás a ${distance}m de la tienda (máximo: ${maxDistance}m)`,
            distance,
          });
          resolve(ok);
        },
        (err) => {
          const messages: Record<number, string> = {
            1: 'Debes permitir el acceso a tu ubicación para dar entrada',
            2: 'No se pudo determinar tu ubicación',
            3: 'Tiempo de espera agotado obteniendo ubicación',
          };
          setLocationStatus({ verified: false, checking: false, error: messages[err.code] ?? 'Error obteniendo ubicación', distance: null });
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!userId || !storeId) { alert('Error: No se pudo identificar el usuario'); return; }
    if (currentRecord) { alert('Ya tienes una entrada registrada. Debes dar salida primero.'); return; }
    if (individualSchedule?.is_day_off) { alert('🏖️ Hoy tienes el día libre. No puedes registrar entrada.'); return; }
    if (!wifiStatus.connected) { alert('⚠️ No hay conexión a internet. Conéctate para registrar entrada.'); return; }

    const locationOk = await checkLocation();
    if (!locationOk) { alert(`⚠️ Ubicación incorrecta\n\n${locationStatus.error}`); return; }

    setIsLoading(true);
    try {
      const record = await registerCheckIn(userId, storeId, wifiStatus.connected, wifiStatus.name);
      setCurrentRecord(record);
      await refreshTodayRecords();
      alert('✅ Entrada registrada exitosamente');
    } catch (error) {
      console.error('Error registrando entrada:', error);
      alert('Error al registrar entrada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentRecord) { alert('No tienes una entrada registrada'); return; }
    if (!window.confirm('¿Confirmas que deseas registrar tu salida?')) return;

    setIsLoading(true);
    try {
      await registerCheckOut(currentRecord.id);
      setCurrentRecord(null);
      await refreshTodayRecords();
      alert('✅ Salida registrada exitosamente');
    } catch (error) {
      console.error('Error registrando salida:', error);
      alert('Error al registrar salida');
    } finally {
      setIsLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    loadUserData();
    checkWifiConnection();
  }, [loadUserData, checkWifiConnection]);

  // Carga cuando tenemos userId y storeId
  useEffect(() => {
    if (!userId || !storeId) return;
    const today = new Date().toISOString().split('T')[0];

    refreshTodayRecords();
    getStoreSchedule(storeId)
      .then(data => setStoreSchedule(data ?? DEFAULT_SCHEDULE))
      .catch(() => setStoreSchedule(DEFAULT_SCHEDULE));
    getIndividualSchedule(userId, today)
      .then(data => setIndividualSchedule(data))
      .catch(() => setIndividualSchedule(null));
  }, [userId, storeId, refreshTodayRecords]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary-600" />
            Control de Asistencia
          </h1>
          <p className="text-gray-600 mt-2">Registra tu entrada y salida de la tienda</p>
        </div>

        {/* GPS */}
        {storeSchedule?.latitude && storeSchedule?.longitude && (
          <Card className={`mb-6 border-l-4 ${locationStatus.verified ? 'border-green-500' : locationStatus.error ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="flex items-start gap-3">
              <MapPin className={`w-6 h-6 flex-shrink-0 mt-1 ${locationStatus.verified ? 'text-green-500' : locationStatus.error ? 'text-red-500' : 'text-gray-400'}`} />
              <div className="flex-1">
                {locationStatus.checking ? (
                  <p className="font-medium text-gray-900">Verificando ubicación...</p>
                ) : locationStatus.verified ? (
                  <p className="font-medium text-green-900">✅ Ubicación verificada {locationStatus.distance && `(${locationStatus.distance}m)`}</p>
                ) : locationStatus.error ? (
                  <><p className="font-medium text-red-900">❌ Ubicación no verificada</p><p className="text-sm text-red-700 mt-1">{locationStatus.error}</p></>
                ) : (
                  <p className="font-medium text-gray-900">📍 Se verificará tu ubicación al dar entrada (radio: {storeSchedule.location_radius_meters}m)</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Horario individual */}
        {individualSchedule && (
          <Card className={`mb-6 ${individualSchedule.is_day_off ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-3">
              <Clock className={`w-6 h-6 ${individualSchedule.is_day_off ? 'text-yellow-600' : 'text-blue-600'}`} />
              <div>
                {individualSchedule.is_day_off ? (
                  <p className="font-medium text-yellow-900">🏖️ Día libre programado</p>
                ) : (
                  <p className="font-medium text-blue-900">
                    📅 Hora de entrada hoy: {individualSchedule.check_in_deadline}
                    {individualSchedule.notes && ` • ${individualSchedule.notes}`}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Alerta tardanza */}
        {isLate && storeSchedule && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-900">⚠️ Llegada tarde</p>
                <p className="text-sm text-red-700">
                  Hora límite: {getTodayDeadline(storeSchedule, individualSchedule)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Estado actual */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Estado Actual</h2>
          {currentRecord ? (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-900">Entrada registrada</p>
                  <p className="text-sm text-green-700">Hora: {formatTime(currentRecord.check_in)}</p>
                  <p className="text-sm text-green-700">Duración: {calculateDuration(currentRecord.check_in, null)}</p>
                </div>
              </div>
              <Button onClick={handleCheckOut} variant="danger" disabled={isLoading} className="flex items-center gap-2">
                <LogOutIcon className="w-4 h-4" />
                Registrar Salida
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">No has registrado entrada hoy</p>
              <Button onClick={handleCheckIn} variant="primary" disabled={isLoading} className="flex items-center gap-2 mx-auto">
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
                    <p className="text-sm font-medium text-gray-700">{calculateDuration(record.check_in, record.check_out)}</p>
                    {record.wifi_verified ? (
                      <p className="text-xs text-green-600 flex items-center gap-1"><Wifi className="w-3 h-3" /> WiFi verificado</p>
                    ) : (
                      <p className="text-xs text-orange-600 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Sin verificar</p>
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
