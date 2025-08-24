import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Plus, 
  Search, 
  Calendar, 
  CreditCard,
  Banknote,
  Smartphone,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

const Sales: React.FC = () => {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [sales, setSales] = useState([
    {
      id: 1,
      invoiceNumber: 'FAC-001',
      date: '2024-01-15',
      time: '14:30',
      items: 3,
      amount: 28500,
      paymentMethod: 'card',
      advisor: 'Ana López',
      customer: 'Cliente Anónimo',
      products: ['Blusa básica', 'Pantalón jean', 'Accesorios']
    },
    {
      id: 2,
      invoiceNumber: 'FAC-002',
      date: '2024-01-15',
      time: '14:15',
      items: 1,
      amount: 45000,
      paymentMethod: 'cash',
      advisor: 'María González',
      customer: 'Carmen Rodríguez',
      products: ['Vestido formal']
    },
    {
      id: 3,
      invoiceNumber: 'FAC-003',
      date: '2024-01-15',
      time: '13:45',
      items: 2,
      amount: 32300,
      paymentMethod: 'transfer',
      advisor: 'Carmen Ruiz',
      customer: 'Laura Fernández',
      products: ['Falda midi', 'Top casual']
    }
  ]);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4 text-primary-500" />;
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-500" />;
      case 'transfer':
        return <Smartphone className="w-4 h-4 text-primary-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'card': return 'Tarjeta';
      case 'cash': return 'Efectivo';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalItems = sales.reduce((sum, sale) => sum + sale.items, 0);

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Registro de Ventas</h1>
          <p className="text-gray-600">Registra y gestiona las ventas diarias</p>
        </div>
        <Button onClick={() => setShowSaleModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Ventas del Día</p>
            <p className="text-2xl font-bold text-primary-600">${totalSales.toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Prendas Vendidas</p>
            <p className="text-2xl font-bold text-primary-600">{totalItems}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Transacciones</p>
            <p className="text-2xl font-bold text-primary-600">{sales.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Promedio/Venta</p>
            <p className="text-2xl font-bold text-primary-600">
              ${sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : '0'}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Fecha:</span>
          </div>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />

          <div className="relative ml-auto">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por factura, cliente..."
              className="pl-9 pr-4 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </Card>

      {/* Sales List */}
      <Card padding={false}>
        <CardHeader>
          <CardTitle>Ventas Registradas</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prendas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asesora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.customer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info" size="sm">{sale.items} items</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getPaymentIcon(sale.paymentMethod)}
                      <span className="text-sm text-gray-900">
                        {getPaymentLabel(sale.paymentMethod)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ${sale.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.advisor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Sale Modal */}
      <Modal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        title="Registrar Nueva Venta"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Factura
              </label>
              <input
                type="text"
                placeholder="FAC-004"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Prendas
              </label>
              <input
                type="number"
                placeholder="1"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Total (₡)
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Productos Vendidos
            </label>
            <textarea
              rows={3}
              placeholder="Descripción de los productos vendidos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora
              </label>
              <input
                type="time"
                defaultValue={new Date().toTimeString().slice(0, 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowSaleModal(false)}>
              Cancelar
            </Button>
            <Button>
              Registrar Venta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;