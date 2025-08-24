import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Calendar, 
  Clock,
  Filter,
  RotateCcw
} from 'lucide-react';

const Tasks: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Apertura de tienda',
      description: 'Encender luces, abrir cortinas, verificar temperatura',
      type: 'daily',
      completed: true,
      dueDate: '2024-01-15',
      dueTime: '08:00',
      priority: 'high',
      category: 'Operaciones'
    },
    {
      id: 2,
      title: 'Conteo de caja inicial',
      description: 'Verificar dinero en efectivo y registrar monto inicial',
      type: 'daily',
      completed: true,
      dueDate: '2024-01-15',
      dueTime: '08:30',
      priority: 'high',
      category: 'Finanzas'
    },
    {
      id: 3,
      title: 'Revisar llegadas de mercancía',
      description: 'Verificar nuevos productos y actualizar inventario',
      type: 'daily',
      completed: false,
      dueDate: '2024-01-15',
      dueTime: '10:00',
      priority: 'medium',
      category: 'Inventario'
    },
    {
      id: 4,
      title: 'Limpieza profunda de probadores',
      description: 'Desinfectar y organizar todos los probadores',
      type: 'weekly',
      completed: false,
      dueDate: '2024-01-15',
      dueTime: '15:00',
      priority: 'medium',
      category: 'Limpieza'
    },
    {
      id: 5,
      title: 'Reporte mensual de ventas',
      description: 'Generar y enviar reporte completo de ventas del mes',
      type: 'monthly',
      completed: false,
      dueDate: '2024-01-31',
      dueTime: '17:00',
      priority: 'high',
      category: 'Reportes'
    },
    {
      id: 6,
      title: 'Inventario general',
      description: 'Conteo completo de toda la mercancía',
      type: 'monthly',
      completed: false,
      dueDate: '2024-01-31',
      dueTime: '18:00',
      priority: 'high',
      category: 'Inventario'
    }
  ]);

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'info';
      case 'weekly': return 'warning';
      case 'monthly': return 'success';
      default: return 'default';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const today = new Date().toISOString().split('T')[0];
    const taskDate = task.dueDate;
    
    switch (selectedPeriod) {
      case 'today':
        return taskDate === today;
      case 'week':
        return task.type === 'weekly' || task.type === 'daily';
      case 'month':
        return task.type === 'monthly' || task.type === 'weekly' || task.type === 'daily';
      default:
        return true;
    }
  });

  const completedTasks = filteredTasks.filter(task => task.completed).length;
  const totalTasks = filteredTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Checklist de Tareas</h1>
          <p className="text-gray-600">Organiza y completa las tareas diarias, semanales y mensuales</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-600">Progreso del Día</h3>
            <p className="text-sm text-gray-600">
              {completedTasks} de {totalTasks} tareas completadas
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{completionPercentage}%</div>
            <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <div className="flex space-x-2">
            {[
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Esta Semana' },
              { value: 'month', label: 'Este Mes' },
              { value: 'all', label: 'Todas' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-primary-50 text-primary-600 border border-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="ml-auto">
            <RotateCcw className="w-3 h-3 mr-1" />
            Resetear Día
          </Button>
        </div>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`transition-all duration-200 ${
            task.completed ? 'bg-gray-50 border-gray-200' : 'hover:shadow-md'
          }`}>
            <div className="flex items-start space-x-4">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-1 text-primary-600 hover:text-primary-700 transition-colors"
              >
                {task.completed ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-lg font-medium ${
                      task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      task.completed ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {task.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <Badge variant={getTypeColor(task.type)} size="sm">
                        {task.type === 'daily' ? 'Diaria' : 
                         task.type === 'weekly' ? 'Semanal' : 'Mensual'}
                      </Badge>
                      <Badge variant={getPriorityColor(task.priority)} size="sm">
                        {task.priority === 'high' ? 'Alta' : 
                         task.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{task.dueDate}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{task.dueTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <Badge variant="default" size="sm">
                    {task.category}
                  </Badge>
                  
                  {task.completed && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Completada
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay tareas para este período
          </h3>
          <p className="text-gray-600">
            Selecciona otro período o agrega nuevas tareas
          </p>
        </Card>
      )}
    </div>
  );
};

export default Tasks;