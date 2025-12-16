import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Clock, Calendar, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface DaySchedule {
  day: string;
  dayName: string;
  date: string;
  check_in_deadline: string;
  is_day_off: boolean;
  notes: string | null;
}

interface WeekInfo {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

const MySchedule: React.FC = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    loadUserSchedule();
  }, []);

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const getMonday = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const loadUserSchedule = async () => {
    try {
      setLoading(true);

      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // 2. Obtener datos del usuario (rol y nombre)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre, rol, id_tienda')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      setUserRole(userData.rol);
      setUserName(userData.nombre);

      // Solo mostrar horarios para administradora y asesora
      if (userData.rol !== 'administradora' && userData.rol !== 'asesora') {
        setLoading(false);
        return;
      }

      // 3. Calcular rango de la semana actual (lunes a domingo)
      const today = new Date();
      const monday = getMonday(new Date(today));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const weekNum = getWeekNumber(today);

      setWeekInfo({
        weekNumber: weekNum,
        startDate: monday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        endDate: sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });

      // 4. Obtener horarios de la semana actual
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('id_usuario', userData.id_usuario)
        .gte('schedule_date', monday.toISOString().split('T')[0])
        .lte('schedule_date', sunday.toISOString().split('T')[0])
        .order('schedule_date', { ascending: true });

      if (scheduleError) throw scheduleError;

      // 5. Formatear datos para mostrar
      const weekSchedule: DaySchedule[] = [];
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();

        const dayData = scheduleData?.find(s => s.schedule_date === dateStr);

        weekSchedule.push({
          day: dayNames[dayOfWeek].slice(0, 3).toUpperCase(),
          dayName: dayNames[dayOfWeek],
          date: currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          check_in_deadline: dayData?.check_in_deadline || '09:00:00',
          is_day_off: dayData?.is_day_off || false,
          notes: dayData?.notes || null
        });
      }

      setSchedule(weekSchedule);
    } catch (error) {
      console.error('Error cargando horario:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTodayIndex = (): number => {
    const today = new Date().getDay();
    return today;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando horario...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'administradora' && userRole !== 'asesora') {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Horario no disponible
          </h2>
          <p className="text-gray-600">
            Esta función está disponible solo para Administradoras y Asesoras.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto pt-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Horario</h1>
        <p className="text-gray-600">{userName} - {userRole === 'administradora' ? 'Administradora' : 'Asesora'}</p>
      </div>

      {/* Información de la semana */}
      {weekInfo && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Semana {weekInfo.weekNumber}</h2>
                <p className="text-sm text-gray-600">
                  {weekInfo.startDate} - {weekInfo.endDate}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Horarios rotativos</p>
              <p className="text-xs text-gray-500">Actualizados automáticamente</p>
            </div>
          </div>
        </Card>
      )}

      {/* Vista de horario semanal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {schedule.map((day, index) => {
          const isToday = index === getTodayIndex();
          const isPast = index < getTodayIndex();
          
          return (
            <Card 
              key={index}
              className={`
                transition-all duration-200 hover:shadow-lg
                ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${day.is_day_off ? 'bg-gray-50 opacity-75' : ''}
                ${isPast && !isToday ? 'opacity-60' : ''}
              `}
            >
              <div className="text-center">
                {/* Día de la semana */}
                <div className={`
                  text-sm font-bold mb-2 pb-2 border-b-2
                  ${isToday ? 'text-blue-600 border-blue-500' : 'text-gray-600 border-gray-200'}
                `}>
                  {day.day}
                </div>

                {/* Fecha */}
                <div className="text-xs text-gray-500 mb-3">
                  {day.date}
                </div>

                {/* Indicador de hoy */}
                {isToday && (
                  <div className="mb-3">
                    <span className="inline-block bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      HOY
                    </span>
                  </div>
                )}

                {/* Contenido del horario */}
                {day.is_day_off ? (
                  <div className="py-6">
                    <div className="text-4xl mb-2">🌴</div>
                    <p className="text-sm font-semibold text-gray-600">Día Libre</p>
                  </div>
                ) : (
                  <div className="py-4">
                    {/* Hora de entrada */}
                    <div className="mb-4">
                      <Clock className={`w-8 h-8 mx-auto mb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`} />
                      <p className="text-2xl font-bold text-gray-800">
                        {formatTime(day.check_in_deadline)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Hora de entrada</p>
                    </div>

                    {/* Notas adicionales */}
                    {day.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 italic">
                          📝 {day.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Leyenda */}
      <Card className="mt-6 bg-gray-50">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-gray-600">Día actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200"></div>
            <span className="text-gray-600">Día libre</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Hora de entrada programada</span>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>💡 Los horarios se actualizan semanalmente según el sistema de turnos rotativos</p>
      </div>
    </div>
  );
};

export default MySchedule;
