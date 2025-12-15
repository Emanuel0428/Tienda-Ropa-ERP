import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, Settings, User as UserIcon, Clock } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../supabaseClient';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLateNotification, setShowLateNotification] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  // Cargar foto de perfil
  React.useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      } catch (error) {
        console.error('Error cargando avatar:', error);
      }
    };

    loadAvatar();
  }, [user?.id]);

  // Escuchar cambios en el avatar
  React.useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setAvatarUrl(event.detail.avatarUrl);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  const checkAttendanceStatus = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Obtener datos del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id_usuario, id_tienda')
        .eq('id', authUser.id)
        .single();

      if (userError) return;

      // Obtener configuración de horario de la tienda
      const { data: schedule, error: scheduleError } = await supabase
        .from('store_schedules')
        .select('check_in_deadline')
        .eq('id_tienda', userData.id_tienda)
        .single();

      if (scheduleError) return;

      // Verificar si ya dio entrada hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRecord } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('id_usuario', userData.id_usuario)
        .gte('check_in', `${today}T00:00:00`)
        .is('check_out', null)
        .maybeSingle();

      // Si no ha dado entrada y ya pasó la hora límite, mostrar notificación
      if (!todayRecord && schedule?.check_in_deadline) {
        const now = new Date();
        const [hours, minutes] = schedule.check_in_deadline.split(':');
        const deadline = new Date();
        deadline.setHours(parseInt(hours), parseInt(minutes), 0);

        setShowLateNotification(now > deadline);
      } else {
        setShowLateNotification(false);
      }
    } catch (error) {
      console.error('Error verificando asistencia:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkAttendanceStatus();
      // Verificar cada 5 minutos en lugar de cada minuto
      const interval = setInterval(checkAttendanceStatus, 300000);
      return () => clearInterval(interval);
    }
  }, [user, checkAttendanceStatus]);

  return (
    <header className="bg-primary-600 shadow-sm border-b border-primary-700 h-16 fixed top-0 left-0 lg:left-64 right-0 z-30">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center space-x-2 lg:space-x-4 ml-12 lg:ml-0">
          <div className="relative hidden sm:block">
            <Search className="w-5 h-5 text-white/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-lg focus:ring-2 focus:ring-primary-50 focus:border-primary-50 w-48 lg:w-80"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {user ? (
            <>
              {/* Attendance Clock */}
              <button 
                onClick={() => navigate('/attendance')}
                className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Control de Asistencia"
              >
                <Clock className="w-5 h-5" />
                {showLateNotification && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse font-bold">
                    !
                  </span>
                )}
              </button>

              {/* Notifications */}
              <button 
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 lg:space-x-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || 'Usuario'}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-center hidden lg:block">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-white/60">Tienda: {user?.store}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button 
                      onClick={() => {
                        navigate('/profile');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Perfil</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/settings');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configuración</span>
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        onLogout();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full border border-primary-600 hover:bg-white transition-colors"
                onClick={() => navigate('/auth')}
              >Iniciar sesión</button>
              <button
                className="bg-white text-primary-700 px-3 py-1 rounded-full border border-primary-600 hover:bg-primary-50 transition-colors"
                onClick={() => navigate('/auth?register=true')}
              >Crear usuario</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
