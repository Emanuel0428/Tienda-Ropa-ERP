import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import Sales from './pages/Sales';
import SalesSummary from './pages/SalesSummary';
import Goals from './pages/Goals';
import Inventory from './pages/Inventory';
import Audit from './pages/Audit';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import Stores from './pages/Stores';

// Componentes placeholder para las rutas faltantes
const Users = () => <div className="p-6 mt-10"><h1 className="text-2xl font-bold">Gestión de Usuarios</h1><p className="text-gray-600 mt-2">Administración de usuarios y roles</p></div>;
const Analytics = () => <div className="p-6 mt-10"><h1 className="text-2xl font-bold">Analíticas Avanzadas</h1><p className="text-gray-600 mt-2">Reportes y análisis detallados</p></div>;
const Incidents = () => <div className="p-6 mt-10"><h1 className="text-2xl font-bold">Registro de Novedades</h1><p className="text-gray-600 mt-2">Gestión de incidentes y reportes</p></div>;
const Schedule = () => <div className="p-6 mt-10"><h1 className="text-2xl font-bold">Control de Horarios</h1><p className="text-gray-600 mt-2">Seguimiento de asistencia y puntualidad</p></div>;
const Notifications = () => <div className="p-6 mt-10"><h1 className="text-2xl font-bold">Centro de Notificaciones</h1><p className="text-gray-600 mt-2">Gestión de alertas y comunicados</p></div>;

function App() {
  const { user, loading, signOut } = useAuth();

  // Mostrar loading solo cuando está procesando login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // Si hay usuario, mostrar la aplicación
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        activeRoute="" 
        onRouteChange={() => {}} 
      />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header 
          user={user} 
          onLogout={signOut}
        />
        <main className="flex-1 overflow-y-auto pt-16 p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/sales-summary" element={<SalesSummary />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;