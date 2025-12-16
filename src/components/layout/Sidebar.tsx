import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  Home, 
  FileUp, 
  CheckSquare, 
  ShoppingCart, 
  BarChart3, 
  Target, 
  Package, 
  FileText, 
  Clock, 
  Bell,
  Users,
  Store,
  TrendingUp,
  Search,
  Menu,
  X,
  BarChart,
  ChevronDown,
  ChevronRight,
  Plus,
  History,
  HelpCircle,
  PieChart,
  Settings,
  RefreshCw
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  user: User | null;
  activeRoute: string;
  onRouteChange: (route: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [auditoriaExpanded, setAuditoriaExpanded] = useState(false);
  const [documentosExpanded, setDocumentosExpanded] = useState(false);
  const [asistenciaExpanded, setAsistenciaExpanded] = useState(false);
  const [storeName, setStoreName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Cargar nombre de la tienda y foto de perfil
  React.useEffect(() => {
    const loadUserData = async () => {
      if (!user?.store) return;
      
      try {
        // Cargar nombre de tienda
        const { data: storeData, error: storeError } = await supabase
          .from('tiendas')
          .select('nombre')
          .eq('id_tienda', user.store)
          .single();

        if (storeError) throw storeError;
        if (storeData) setStoreName(storeData.nombre);

        // Cargar foto de perfil
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (userData?.avatar_url) setAvatarUrl(userData.avatar_url);
      } catch (error) {
        console.error('Error cargando datos de usuario:', error);
      }
    };

    loadUserData();
  }, [user?.store, user?.id]);

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

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
      // Documentos ya no es un item directo, ahora es un desplegable
    ];

    // Items exclusivos de admin
    const adminOnlyItems = [
      { id: 'tasks', label: 'Tareas', icon: CheckSquare, path: '/tasks' },
      { id: 'sales', label: 'Ventas', icon: ShoppingCart, path: '/sales' },
      { id: 'sales-summary', label: 'Resumen Ventas', icon: BarChart3, path: '/sales-summary' },
      { id: 'goals', label: 'Metas y Ranking', icon: Target, path: '/goals' },
      { id: 'inventory', label: 'Inventario', icon: Package, path: '/inventory' },
      { id: 'incidents', label: 'Novedades', icon: FileText, path: '/incidents' },
      { id: 'schedule', label: 'Horarios', icon: Clock, path: '/schedule' },
      { id: 'notifications', label: 'Notificaciones', icon: Bell, path: '/notifications' },
    ];

    // Admin ve todas las opciones
    if (user?.role === 'admin') {
      baseItems.push(...adminOnlyItems);
      baseItems.splice(2, 0, 
        { id: 'stores', label: 'Tiendas', icon: Store, path: '/stores' },
        { id: 'users', label: 'Usuarios', icon: Users, path: '/users' },
        { id: 'analytics', label: 'Analíticas', icon: TrendingUp, path: '/analytics' },
        { id: 'statistics', label: 'Estadísticas', icon: BarChart, path: '/statistics' },
        { id: 'contentsquare-test', label: '🧪 Test ContentSquare', icon: HelpCircle, path: '/contentsquare-test' }
      );
    } else if (user?.role === 'coordinador') {
      // Coordinador ve solo elementos específicos (sin Dashboard ni Analíticas)
      return [
        { id: 'stores', label: 'Tiendas', icon: Store, path: '/stores' },
        { id: 'users', label: 'Usuarios', icon: Users, path: '/users' },
      ];
    }

    return baseItems;
  };

  // Función para verificar si el usuario puede ver auditorías
  const canViewAuditoria = () => {
    return user?.role === 'admin' || user?.role === 'coordinador' || user?.role === 'auditor';
  };

  // Opciones del menú de auditoría
  const getAuditoriaOptions = () => {
    return [
      { id: 'crear-auditoria', label: 'Crear Auditoría', icon: Plus, path: '/auditoria' },
      { id: 'historial-auditoria', label: 'Ver Historial', icon: History, path: '/auditoria/historial' },
      { id: 'preguntas-maestras', label: 'Ver Preguntas Maestras', icon: HelpCircle, path: '/preguntas-maestras' },
      { id: 'estadisticas-auditoria', label: 'Ver Estadísticas', icon: PieChart, path: '/auditoria/estadisticas' }
    ];
  };

  // Opciones del menú de documentos
  const getDocumentosOptions = () => {
    return [
      { id: 'subir-documentos', label: 'Subir Documentos', icon: FileUp, path: '/documents' },
      { id: 'config-drive', label: 'Configuración Drive', icon: Settings, path: '/drive-config' }
    ];
  };

  // Opciones del menú de asistencia
  const getAsistenciaOptions = () => {
    const options = [
      { id: 'mi-asistencia', label: 'Mi Asistencia', icon: Clock, path: '/attendance' }
    ];

    // Administradoras y Asesoras ven su horario
    if (user?.role === 'administradora' || user?.role === 'asesora') {
      options.push(
        { id: 'mi-horario', label: 'Mi Horario', icon: BarChart, path: '/my-schedule' }
      );
    }

    // Coordinador y Admin ven opciones adicionales
    if (user?.role === 'coordinador' || user?.role === 'admin') {
      options.push(
        { id: 'monitor-asistencia', label: 'Monitor Tiendas', icon: Users, path: '/attendance-monitor' }
      );
    }

    // Solo Admin ve configuración
    if (user?.role === 'admin') {
      options.push(
        { id: 'config-asistencia', label: 'Configuración GPS', icon: Settings, path: '/attendance-settings' },
        { id: 'horarios-rotativos', label: 'Horarios Rotativos', icon: RefreshCw, path: '/rotating-schedules' }
      );
    }

    return options;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
    setAuditoriaExpanded(false); // Cerrar desplegable al navegar
    setDocumentosExpanded(false); // Cerrar desplegable de documentos al navegar
    setAsistenciaExpanded(false); // Cerrar desplegable de asistencia al navegar
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary-600 text-white shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            setIsMobileOpen(false);
            setAuditoriaExpanded(false); // Cerrar desplegable al cerrar sidebar
            setDocumentosExpanded(false); // Cerrar desplegable de documentos
            setAsistenciaExpanded(false); // Cerrar desplegable de asistencia
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`bg-white dark:bg-gray-800 shadow-lg h-screen w-64 fixed left-0 top-0 z-40 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 flex flex-col ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-600">Tienda Admin</h1>
              <p className="text-sm text-gray-500 capitalize">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'coordinador' ? 'Coordinador' :
                 user?.role === 'asesora' ? 'Asesora' :
                 user?.role === 'auditor' ? 'Auditor' : user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={user?.name || 'Usuario'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {storeName || `Tienda ${user?.store}`}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <nav className="h-full overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6'}}>
            <ul className="space-y-1 pb-4">
              {/* Elementos del menú principal */}
              {getMenuItems().map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  </li>
                );
              })}

              {/* Sección de Documentos con desplegable */}
              <li>
                <button
                  onClick={() => setDocumentosExpanded(!documentosExpanded)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    location.pathname.includes('/documents') || location.pathname.includes('/drive-config')
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <FileUp className={`w-5 h-5 ${
                    location.pathname.includes('/documents') || location.pathname.includes('/drive-config')
                      ? 'text-primary-600' 
                      : 'text-gray-500'
                  }`} />
                  <span className="font-medium text-sm flex-1">Documentos</span>
                  {documentosExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Submenu desplegable */}
                {documentosExpanded && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {getDocumentosOptions().map((option) => {
                      const OptionIcon = option.icon;
                      const isActiveOption = isActiveRoute(option.path);
                      
                      return (
                        <li key={option.id}>
                          <button
                            onClick={() => handleNavigation(option.path)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                              isActiveOption
                                ? 'bg-primary-100 text-primary-700 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                            }`}
                          >
                            <OptionIcon className={`w-4 h-4 ${isActiveOption ? 'text-primary-600' : 'text-gray-500'}`} />
                            <span className="text-xs font-medium">{option.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>

              {/* Sección de Asistencia con desplegable */}
              <li>
                <button
                  onClick={() => setAsistenciaExpanded(!asistenciaExpanded)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    location.pathname.includes('/attendance')
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <Clock className={`w-5 h-5 ${
                    location.pathname.includes('/attendance')
                      ? 'text-primary-600' 
                      : 'text-gray-500'
                  }`} />
                  <span className="font-medium text-sm flex-1">Asistencia</span>
                  {asistenciaExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Submenu desplegable */}
                {asistenciaExpanded && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {getAsistenciaOptions().map((option) => {
                      const OptionIcon = option.icon;
                      const isActiveOption = isActiveRoute(option.path);
                      
                      return (
                        <li key={option.id}>
                          <button
                            onClick={() => handleNavigation(option.path)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                              isActiveOption
                                ? 'bg-primary-100 text-primary-700 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                            }`}
                          >
                            <OptionIcon className={`w-4 h-4 ${isActiveOption ? 'text-primary-600' : 'text-gray-500'}`} />
                            <span className="text-xs font-medium">{option.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>

              {/* Sección de Auditoría con desplegable */}
              {canViewAuditoria() && (
                <li>
                  {/* Botón principal de Auditoría */}
                  <button
                    onClick={() => setAuditoriaExpanded(!auditoriaExpanded)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      location.pathname.includes('/auditoria') || location.pathname.includes('/preguntas-maestras')
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    <Search className={`w-5 h-5 ${
                      location.pathname.includes('/auditoria') || location.pathname.includes('/preguntas-maestras')
                        ? 'text-primary-600' 
                        : 'text-gray-500'
                    }`} />
                    <span className="font-medium text-sm flex-1">Auditoría</span>
                    {auditoriaExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Submenu desplegable */}
                  {auditoriaExpanded && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {getAuditoriaOptions().map((option) => {
                        const OptionIcon = option.icon;
                        const isActiveOption = isActiveRoute(option.path);
                        
                        return (
                          <li key={option.id}>
                            <button
                              onClick={() => handleNavigation(option.path)}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                                isActiveOption
                                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                              }`}
                            >
                              <OptionIcon className={`w-4 h-4 ${isActiveOption ? 'text-primary-600' : 'text-gray-500'}`} />
                              <span className="text-xs font-medium">{option.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>Versión 1.0.0</p>
            <p className="mt-1">© 2024 Tienda Admin</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
