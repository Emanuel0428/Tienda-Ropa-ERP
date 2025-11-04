import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Trophy, 
  TrendingUp, 
  Calendar,
  Star,
  Award,
  Users,
  Zap,
  Crown,
  Medal
} from 'lucide-react';

const Goals: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  // Datos de metas
  const goals = {
    daily: {
      target: 45000,
      current: 37500,
      items: { target: 8, current: 6 },
      transactions: { target: 12, current: 9 }
    },
    weekly: {
      target: 255000,
      current: 217500,
      items: { target: 45, current: 38 },
      transactions: { target: 65, current: 54 }
    },
    monthly: {
      target: 1050000,
      current: 855000,
      items: { target: 180, current: 142 },
      transactions: { target: 250, current: 198 }
    }
  };

  // Ranking de tiendas
  const storeRanking = [
    {
      id: 1,
      name: 'Tienda Central',
      sales: 375000,
      goal: 300000,
      progress: 125,
      rank: 1,
      points: 1250,
      badge: 'Superestrella',
      trend: 'up'
    },
    {
      id: 2,
      name: 'Plaza San José',
      sales: 294000,
      goal: 300000,
      progress: 98,
      rank: 2,
      points: 980,
      badge: 'Casi Perfecto',
      trend: 'up'
    },
    {
      id: 3,
      name: 'Multiplaza',
      sales: 261000,
      goal: 300000,
      progress: 87,
      rank: 3,
      points: 870,
      badge: 'En Camino',
      trend: 'stable'
    },
    {
      id: 4,
      name: 'Mall Cartago',
      sales: 219000,
      goal: 300000,
      progress: 73,
      rank: 4,
      points: 730,
      badge: 'Necesita Impulso',
      trend: 'down'
    }
  ];

  // Ranking de asesoras
  const advisorRanking = [
    {
      id: 1,
      name: 'María González',
      sales: 105000,
      goal: 75000,
      progress: 140,
      rank: 1,
      points: 350,
      achievements: ['🏆', '⭐', '🔥'],
      store: 'Tienda Central'
    },
    {
      id: 2,
      name: 'Ana López',
      sales: 84000,
      goal: 75000,
      progress: 112,
      rank: 2,
      points: 280,
      achievements: ['⭐', '👑'],
      store: 'Plaza San José'
    },
    {
      id: 3,
      name: 'Carmen Ruiz',
      sales: 78000,
      goal: 75000,
      progress: 104,
      rank: 3,
      points: 260,
      achievements: ['⭐'],
      store: 'Multiplaza'
    },
    {
      id: 4,
      name: 'Laura Jiménez',
      sales: 69000,
      goal: 75000,
      progress: 92,
      rank: 4,
      points: 230,
      achievements: ['💪'],
      store: 'Tienda Central'
    },
    {
      id: 5,
      name: 'Sofia Vargas',
      sales: 63000,
      goal: 75000,
      progress: 84,
      rank: 5,
      points: 210,
      achievements: ['📈'],
      store: 'Mall Cartago'
    }
  ];

  const currentGoal = goals[selectedPeriod as keyof typeof goals];
  const salesProgress = (currentGoal.current / currentGoal.target) * 100;
  const itemsProgress = (currentGoal.items.current / currentGoal.items.target) * 100;
  const transactionsProgress = (currentGoal.transactions.current / currentGoal.transactions.target) * 100;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-orange-500" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getBadgeColor = (progress: number) => {
    if (progress >= 120) return 'success';
    if (progress >= 100) return 'info';
    if (progress >= 80) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Metas y Ranking</h1>
          <p className="text-gray-600">Sistema gamificado de seguimiento de objetivos</p>
        </div>
        <Button variant="outline">
          <Trophy className="w-4 h-4 mr-2" />
          Ver Historial
        </Button>
      </div>

      {/* Period Selector */}
      <Card>
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Período:</span>
          <div className="flex space-x-2">
            {[
              { value: 'daily', label: 'Diario' },
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensual' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Goals Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <Card>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - salesProgress / 100)}`}
                  className="text-primary-600 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {Math.round(salesProgress)}%
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ventas</h3>
            <p className="text-sm text-gray-600">
              ${currentGoal.current.toLocaleString()} / ${currentGoal.target.toLocaleString()}
            </p>
            <Badge variant={getBadgeColor(salesProgress)}>
              {salesProgress >= 100 ? 'Meta Alcanzada!' : `Faltan $${(currentGoal.target - currentGoal.current).toLocaleString()}`}
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - itemsProgress / 100)}`}
                  className="text-primary-500 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {Math.round(itemsProgress)}%
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prendas</h3>
            <p className="text-sm text-gray-600">
              {currentGoal.items.current} / {currentGoal.items.target} prendas
            </p>
            <Badge variant={getBadgeColor(itemsProgress)}>
              {itemsProgress >= 100 ? 'Meta Alcanzada!' : `Faltan ${currentGoal.items.target - currentGoal.items.current}`}
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - transactionsProgress / 100)}`}
                  className="text-primary-600 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {Math.round(transactionsProgress)}%
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transacciones</h3>
            <p className="text-sm text-gray-600">
              {currentGoal.transactions.current} / {currentGoal.transactions.target} ventas
            </p>
            <Badge variant={getBadgeColor(transactionsProgress)}>
              {transactionsProgress >= 100 ? 'Meta Alcanzada!' : `Faltan ${currentGoal.transactions.target - currentGoal.transactions.current}`}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Ranking de Tiendas
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {storeRanking.map((store) => (
              <div key={store.id} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-2">
                  {getRankIcon(store.rank)}
                  <span className="font-semibold text-gray-900">#{store.rank}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{store.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          store.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(store.progress, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{store.progress}%</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${store.sales.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {store.points} pts
                  </p>
                </div>

                <Badge variant={getBadgeColor(store.progress)}>
                  {store.badge}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Advisor Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Ranking de Asesoras
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {advisorRanking.map((advisor) => (
              <div key={advisor.id} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-2">
                  {getRankIcon(advisor.rank)}
                  <span className="font-semibold text-gray-900">#{advisor.rank}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{advisor.name}</h4>
                  <p className="text-xs text-gray-500">{advisor.store}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          advisor.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(advisor.progress, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{advisor.progress}%</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex space-x-1 mb-1">
                    {advisor.achievements.map((achievement, idx) => (
                      <span key={idx} className="text-lg">{achievement}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{advisor.points} pts</p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${advisor.sales.toLocaleString()}
                  </p>
                  <Badge variant={getBadgeColor(advisor.progress)} size="sm">
                    {advisor.progress >= 120 ? '🚀 Superó!' : 
                     advisor.progress >= 100 ? '🎯 Cumplió' :
                     advisor.progress >= 80 ? '📈 Cerca' : '💪 Esfuerzo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-orange-500" />
            Logros y Reconocimientos
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">Vendedora del Mes</h4>
            </div>
            <p className="text-sm text-yellow-800">María González - Tienda Central</p>
            <p className="text-xs text-yellow-600 mt-1">140% de cumplimiento</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Mejor Equipo</h4>
            </div>
            <p className="text-sm text-blue-800">Tienda Central</p>
            <p className="text-xs text-blue-600 mt-1">125% de meta grupal</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Mayor Crecimiento</h4>
            </div>
            <p className="text-sm text-green-800">Plaza San José</p>
            <p className="text-xs text-green-600 mt-1">+25% vs. mes anterior</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Goals;