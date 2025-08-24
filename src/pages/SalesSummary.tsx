import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  BarChart3,
  PieChart,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const SalesSummary: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStore, setSelectedStore] = useState('all');

  const salesData = {
    week: {
      total: 885000,
      items: 142,
      transactions: 65,
      goal: 900000,
      change: 12.5
    },
    month: {
      total: 3750000,
      items: 625,
      transactions: 285,
      goal: 4500000,
      change: 8.3
    },
    year: {
      total: 37500000,
      items: 6250,
      transactions: 2850,
      goal: 45000000,
      change: 15.2
    }
  };

  const topProducts = [
    { name: 'Blusa básica blanca', sales: 24, amount: 360000, growth: 15 },
    { name: 'Pantalón jean clásico', sales: 18, amount: 810000, growth: 8 },
    { name: 'Vestido casual', sales: 15, amount: 675000, growth: -3 },
    { name: 'Falda midi', sales: 12, amount: 432000, growth: 22 },
    { name: 'Blusa estampada', sales: 10, amount: 390000, growth: 5 }
  ];

  const topAdvisors = [
    { name: 'María González', sales: 28, amount: 435000, efficiency: 95 },
    { name: 'Ana López', sales: 24, amount: 378000, efficiency: 92 },
    { name: 'Carmen Ruiz', sales: 22, amount: 354000, efficiency: 88 },
    { name: 'Laura Jiménez', sales: 19, amount: 306000, efficiency: 85 },
    { name: 'Sofia Vargas', sales: 16, amount: 267000, efficiency: 82 }
  ];

  const stores = [
    { id: 'all', name: 'Todas las tiendas' },
    { id: 'central', name: 'Tienda Central' },
    { id: 'plaza', name: 'Plaza San José' },
    { id: 'multiplaza', name: 'Multiplaza' }
  ];

  const current = salesData[selectedPeriod as keyof typeof salesData];
  const goalProgress = (current.total / current.goal) * 100;

  // Simulación de datos para gráficos
  const weeklyData = [
    { day: 'Lun', sales: 105000 },
    { day: 'Mar', sales: 126000 },
    { day: 'Mié', sales: 114000 },
    { day: 'Jue', sales: 144000 },
    { day: 'Vie', sales: 165000 },
    { day: 'Sab', sales: 201000 },
    { day: 'Dom', sales: 135000 }
  ];

  const maxSales = Math.max(...weeklyData.map(d => d.sales));

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Resumen de Ventas</h1>
          <p className="text-gray-600">Análisis y métricas de rendimiento</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <div className="flex space-x-2">
            {[
              { value: 'week', label: 'Esta Semana' },
              { value: 'month', label: 'Este Mes' },
              { value: 'year', label: 'Este Año' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-primary-600">${current.total.toLocaleString()}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{current.change}%</span>
              </div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prendas Vendidas</p>
              <p className="text-2xl font-bold text-primary-600">{current.items}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{Math.round(current.change * 0.8)}%</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-primary-600">{current.transactions}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{Math.round(current.change * 0.6)}%</span>
              </div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Meta del Período</p>
              <p className="text-2xl font-bold text-primary-600">{Math.round(goalProgress)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Ventas por Día
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {weeklyData.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 text-sm font-medium text-gray-600">
                  {item.day}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(item.sales / maxSales) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-20 text-sm font-medium text-gray-900 text-right">
                  ${(item.sales / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sales} unidades</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${product.amount.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end">
                    {product.growth > 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      product.growth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Advisors */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Asesoras</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ranking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asesora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badge
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topAdvisors.map((advisor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{advisor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{advisor.sales} prendas</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ${advisor.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${advisor.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{advisor.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={
                      index === 0 ? 'warning' :
                      advisor.efficiency >= 90 ? 'success' :
                      advisor.efficiency >= 80 ? 'info' : 'default'
                    }>
                      {index === 0 ? '🏆 Líder' :
                       advisor.efficiency >= 90 ? '⭐ Excelente' :
                       advisor.efficiency >= 80 ? '👍 Bueno' : '📈 Regular'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SalesSummary;