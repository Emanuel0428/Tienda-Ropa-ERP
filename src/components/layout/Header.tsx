import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

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
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button 
                      onClick={() => {
                        navigate('/profile');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Perfil</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/settings');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
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