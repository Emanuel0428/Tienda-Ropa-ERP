import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Store, RefreshCw, Settings } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import EmployeeScheduleConfig from './EmployeeScheduleConfig';

type Tab = 'empleado' | 'tienda' | 'plantillas';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'empleado',
    label: 'Por Empleado',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Configura el horario día a día de cada empleado',
  },
  {
    id: 'tienda',
    label: 'Por Tienda',
    icon: <Store className="w-4 h-4" />,
    description: 'Horario base y coordenadas GPS de cada tienda',
  },
  {
    id: 'plantillas',
    label: 'Plantillas Rotativas',
    icon: <RefreshCw className="w-4 h-4" />,
    description: 'Aplica turnos rotativos a todas las tiendas en bloque',
  },
];

const Horarios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('empleado');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-6 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            Gestión de Horarios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configura horarios individuales, por tienda o mediante plantillas rotativas
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido del tab activo */}
        {activeTab === 'empleado' && (
          <EmployeeScheduleConfig embedded />
        )}

        {activeTab === 'tienda' && (
          <div className="max-w-2xl">
            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Horario base por tienda
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Define la hora de entrada para cada día de la semana en cada tienda.
                    Este horario aplica a todos los empleados que no tengan un horario individual configurado.
                    También puedes configurar las coordenadas GPS para validar la ubicación al marcar entrada.
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                    <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Prioridad:</strong> Si un empleado tiene horario individual para un día, ese horario tiene prioridad sobre el de la tienda.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/attendance-settings')}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Store className="w-4 h-4" />
                    Ir a Configuración por Tienda
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'plantillas' && (
          <div className="max-w-2xl">
            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Plantillas rotativas globales
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Crea plantillas de turnos por rol (administradora / asesora) con dos semanas alternas.
                    Al aplicarlas, se configuran automáticamente los horarios de todas las tiendas para un mes completo,
                    alternando entre la Semana 1 y la Semana 2 según el número de semana del año.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Semanas impares (1, 3, 5…)</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Plantilla Semana 1</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Semanas pares (2, 4…)</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Plantilla Semana 2</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/rotating-schedules')}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ir a Plantillas Rotativas
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default Horarios;
