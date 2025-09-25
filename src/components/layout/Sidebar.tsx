import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  BarChart
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

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
      { id: 'documents', label: 'Documentos', icon: FileUp, path: '/documents' },
      { id: 'tasks', label: 'Tareas', icon: CheckSquare, path: '/tasks' },
      { id: 'sales', label: 'Ventas', icon: ShoppingCart, path: '/sales' },
      { id: 'sales-summary', label: 'Resumen Ventas', icon: BarChart3, path: '/sales-summary' },
      { id: 'goals', label: 'Metas y Ranking', icon: Target, path: '/goals' },
      { id: 'inventory', label: 'Inventario', icon: Package, path: '/inventory' },
      { id: 'incidents', label: 'Novedades', icon: FileText, path: '/incidents' },
      { id: 'schedule', label: 'Horarios', icon: Clock, path: '/schedule' },
      { id: 'notifications', label: 'Notificaciones', icon: Bell, path: '/notifications' },
    ];

    // Elementos específicos por rol
    if (user?.role === 'admin') {
      // Admin puede ver todo
      baseItems.splice(2, 0, 
        { id: 'stores', label: 'Tiendas', icon: Store, path: '/stores' },
        { id: 'users', label: 'Usuarios', icon: Users, path: '/users' },
        { id: 'analytics', label: 'Analíticas', icon: TrendingUp, path: '/analytics' },
        { id: 'statistics', label: 'Estadísticas', icon: BarChart, path: '/statistics' }
      );
      baseItems.push({ id: 'audit', label: 'Auditoría', icon: Search, path: '/audit' });
      baseItems.push({ id: 'auditoria2', label: 'Auditoría 2.0', icon: Search, path: '/auditoria2' });
    } else if (user?.role === 'coordinador') {
      // Coordinador puede ver tiendas y auditoría
      baseItems.splice(2, 0, { id: 'stores', label: 'Tiendas', icon: Store, path: '/stores' });
      baseItems.push({ id: 'audit', label: 'Auditoría', icon: Search, path: '/audit' });
      baseItems.push({ id: 'auditoria2', label: 'Auditoría 2.0', icon: Search, path: '/auditoria2' });
    } else if (user?.role === 'auditor') {
      // Auditor solo puede ver auditoría además de lo básico
      baseItems.push({ id: 'audit', label: 'Auditoría', icon: Search, path: '/audit' });
      baseItems.push({ id: 'auditoria2', label: 'Auditoría 2.0', icon: Search, path: '/auditoria2' });
    }
    // Asesoras solo ven los elementos básicos

    return baseItems;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
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
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`bg-white shadow-lg h-screen w-64 fixed left-0 top-0 z-40 border-r border-gray-200 transform transition-transform duration-300 flex flex-col ${
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
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Tienda {user?.store}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <nav className="h-full overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6'}}>
            <ul className="space-y-1 pb-4">
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
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
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