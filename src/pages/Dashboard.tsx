import React from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Ventas del Día',
      value: '$147,500',
      change: '+12%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-primary-600'
    },
    {
      title: 'Prendas Vendidas',
      value: '23',
      change: '+8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-primary-500'
    },
    {
      title: 'Meta Semanal',
      value: '68%',
      change: '32% restante',
      trend: 'neutral',
      icon: Target,
      color: 'text-orange-600'
    },
    {
      title: 'Asesoras Activas',
      value: '8',
      change: '2 ausentes',
      trend: 'down',
      icon: Users,
      color: 'text-gray-500'
    }
  ];

  const recentTasks = [
    { id: 1, title: 'Conteo de inventario - Sección A', completed: true, time: '09:30' },
    { id: 2, title: 'Reporte de ventas matutino', completed: true, time: '12:00' },
    { id: 3, title: 'Actualizar precios temporada', completed: false, time: '15:00' },
    { id: 4, title: 'Llamada coordinación regional', completed: false, time: '16:30' }
  ];

  const recentSales = [
    { id: 1, invoice: 'FAC-001', items: 3, amount: '$28,500', time: '14:30', advisor: 'Ana López' },
    { id: 2, invoice: 'FAC-002', items: 1, amount: '$45,000', time: '14:15', advisor: 'María González' },
    { id: 3, invoice: 'FAC-003', items: 2, amount: '$32,300', time: '13:45', advisor: 'Carmen Ruiz' },
    { id: 4, invoice: 'FAC-004', items: 4, amount: '$62,800', time: '13:20', advisor: 'Laura Jiménez' }
  ];

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-600">Dashboard</h1>
        <p className="text-gray-600">Resumen general de actividades del día</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
                    {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                    <span className={`text-sm ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-gray-50`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas del Día</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                {task.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500">{task.time}</p>
                </div>
                <Badge variant={task.completed ? 'success' : 'warning'}>
                  {task.completed ? 'Completada' : 'Pendiente'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{sale.invoice}</p>
                  <p className="text-xs text-gray-500">{sale.advisor} - {sale.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{sale.amount}</p>
                  <p className="text-xs text-gray-500">{sale.items} prendas</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas y Notificaciones</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Stock bajo en talla M</p>
              <p className="text-xs text-yellow-600">Quedan menos de 5 unidades en blusas básicas talla M</p>
            </div>
            <Badge variant="warning">Urgente</Badge>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Nueva meta semanal disponible</p>
              <p className="text-xs text-blue-600">Se ha establecido una nueva meta de 150 prendas para esta semana</p>
            </div>
            <Badge variant="info">Info</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;