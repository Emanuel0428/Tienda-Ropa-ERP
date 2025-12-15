import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Clock, Users, Store as StoreIcon, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../supabaseClient';

interface ActiveEmployee {
  id_usuario: number;
  nombre: string;
  rol: string;
  check_in: string;
  duration: string;
  wifi_verified: boolean;
  isLate: boolean;
  expectedTime: string | null;
}

interface StoreAttendance {
  id_tienda: number;
  nombre_tienda: string;
  activeEmployees: ActiveEmployee[];
  totalActive: number;
}

const AttendanceMonitor: React.FC = () => {
  const [storesData, setStoresData] = useState<StoreAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'coordinador') {
      loadAttendanceData();
      // Actualizar cada 5 minutos en lugar de cada minuto
      const interval = setInterval(loadAttendanceData, 300000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

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

  const calculateDuration = useCallback((checkInTime: Date): string => {
    const now = new Date();
    const diff = now.getTime() - checkInTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, []);

  const loadAttendanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener todas las tiendas
      const { data: tiendas, error: tiendasError } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .order('nombre');

      if (tiendasError) throw tiendasError;

      // Para cada tienda, obtener empleados activos
      const today = new Date().toISOString().split('T')[0];
      
      const storesAttendance: StoreAttendance[] = await Promise.all(
        (tiendas || []).map(async (tienda) => {
          const { data: activeRecords, error } = await supabase
            .from('attendance_records')
            .select(`
              id,
              id_usuario,
              check_in,
              wifi_verified,
              usuarios!inner(
                id_usuario,
                nombre,
                rol
              )
            `)
            .eq('id_tienda', tienda.id_tienda)
            .gte('check_in', `${today}T00:00:00`)
            .is('check_out', null)
            .order('check_in', { ascending: false });

          if (error) {
            console.error(`Error cargando asistencia de tienda ${tienda.nombre}:`, error);
            return {
              id_tienda: tienda.id_tienda,
              nombre_tienda: tienda.nombre,
              activeEmployees: [],
              totalActive: 0
            };
          }

          // Cargar horarios individuales para hoy
          const { data: schedules } = await supabase
            .from('employee_schedules')
            .select('id_usuario, check_in_deadline, is_day_off')
            .eq('schedule_date', today)
            .in('id_usuario', (activeRecords || []).map(r => r.id_usuario));

          const schedulesMap = new Map(
            (schedules || []).map(s => [s.id_usuario, s])
          );

          const employees: ActiveEmployee[] = (activeRecords || []).map(record => {
            const checkInTime = new Date(record.check_in);
            const schedule = schedulesMap.get(record.id_usuario);
            
            let isLate = false;
            let expectedTime: string | null = null;
            
            if (schedule && !schedule.is_day_off) {
              expectedTime = schedule.check_in_deadline;
              const [hours, minutes] = schedule.check_in_deadline.split(':');
              const deadline = new Date(checkInTime);
              deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              isLate = checkInTime > deadline;
            }
            
            return {
              id_usuario: record.id_usuario,
              nombre: (record.usuarios as any).nombre,
              rol: (record.usuarios as any).rol,
              check_in: record.check_in,
              duration: calculateDuration(checkInTime),
              wifi_verified: record.wifi_verified,
              isLate,
              expectedTime
            };
          });

          return {
            id_tienda: tienda.id_tienda,
            nombre_tienda: tienda.nombre,
            activeEmployees: employees,
            totalActive: employees.length
          };
        })
      );

      setStoresData(storesAttendance);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error cargando datos de asistencia:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateDuration]);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const getRoleBadgeVariant = useCallback((role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'coordinador': return 'warning';
      case 'asesora': return 'success';
      case 'auditor': return 'info';
      default: return 'default';
    }
  }, []);

  if (userRole !== 'admin' && userRole !== 'coordinador') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
        <Card className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Restringido</h2>
          <p className="text-gray-600">
            Solo coordinadores y administradores pueden acceder a esta página.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-600" />
              Monitor de Asistencia
            </h1>
            <p className="text-gray-600 mt-2">
              Empleados activos en todas las tiendas • Última actualización: {lastUpdate.toLocaleTimeString('es-CO')}
            </p>
          </div>
          <Button
            onClick={loadAttendanceData}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <StoreIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tiendas Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storesData.filter(s => s.totalActive > 0).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Empleados Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storesData.reduce((sum, store) => sum + store.totalActive, 0)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tiendas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storesData.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado por tienda */}
        <div className="space-y-6">
          {storesData.map((store) => (
            <Card key={store.id_tienda}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <StoreIcon className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">{store.nombre_tienda}</h2>
                  <Badge variant={store.totalActive > 0 ? 'success' : 'default'}>
                    {store.totalActive} {store.totalActive === 1 ? 'empleado' : 'empleados'}
                  </Badge>
                </div>
              </div>

              {store.activeEmployees.length > 0 ? (
                <div className="space-y-3">
                  {store.activeEmployees.map((employee) => (
                    <div
                      key={employee.id_usuario}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {employee.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.nombre}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={getRoleBadgeVariant(employee.rol)} size="sm">
                              {employee.rol}
                            </Badge>
                            {employee.wifi_verified ? (
                              <span className="text-xs text-green-600">✓ WiFi verificado</span>
                            ) : (
                              <span className="text-xs text-orange-600">⚠ Sin verificar WiFi</span>
                            )}
                            {employee.isLate && (
                              <Badge variant="error" size="sm">
                                🕐 Llegada tarde
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Entrada: {formatTime(employee.check_in)}
                        </p>
                        {employee.expectedTime && (
                          <p className="text-xs text-gray-500">
                            Hora límite: {employee.expectedTime}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Duración: {employee.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No hay empleados activos en esta tienda</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {storesData.length === 0 && !isLoading && (
          <Card className="text-center py-12">
            <p className="text-gray-600">No hay datos de asistencia disponibles</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AttendanceMonitor;
