import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Package, 
  Scan,
  Calendar, 
  Search,
  MapPin,
  Plus,
  Edit,
  Download,
  Upload,
  Filter,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const Inventory: React.FC = () => {
  const [showScanModal, setShowScanModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState('all');
  const [scanInput, setScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);

  const inventoryItems = [
    {
      id: 1,
      barcode: '1234567890123',
      name: 'Blusa básica blanca',
      category: 'Blusas',
      size: 'M',
      color: 'Blanco',
      quantity: 12,
      location: 'A1-B2',
      lastCount: '2024-01-10',
      status: 'normal',
      minStock: 5
    },
    {
      id: 2,
      barcode: '1234567890124',
      name: 'Pantalón jean clásico',
      category: 'Pantalones',
      size: 'L',
      color: 'Azul',
      quantity: 3,
      location: 'B1-A3',
      lastCount: '2024-01-08',
      status: 'low',
      minStock: 5
    },
    {
      id: 3,
      barcode: '1234567890125',
      name: 'Vestido casual',
      category: 'Vestidos',
      size: 'S',
      color: 'Negro',
      quantity: 8,
      location: 'C2-B1',
      lastCount: '2024-01-12',
      status: 'normal',
      minStock: 3
    },
    {
      id: 4,
      barcode: '1234567890126',
      name: 'Falda midi',
      category: 'Faldas',
      size: 'M',
      color: 'Rojo',
      quantity: 0,
      location: 'A3-C1',
      lastCount: '2024-01-05',
      status: 'out',
      minStock: 2
    }
  ];

  const storeMap = {
    sections: [
      { id: 'A1', name: 'Sección A1', items: 45, type: 'blusas' },
      { id: 'A2', name: 'Sección A2', items: 32, type: 'blusas' },
      { id: 'A3', name: 'Sección A3', items: 28, type: 'faldas' },
      { id: 'B1', name: 'Sección B1', items: 38, type: 'pantalones' },
      { id: 'B2', name: 'Sección B2', items: 25, type: 'pantalones' },
      { id: 'B3', name: 'Sección B3', items: 41, type: 'pantalones' },
      { id: 'C1', name: 'Sección C1', items: 22, type: 'vestidos' },
      { id: 'C2', name: 'Sección C2', items: 35, type: 'vestidos' },
      { id: 'C3', name: 'Sección C3', items: 18, type: 'accesorios' }
    ]
  };

  const countSchedule = [
    { date: '2024-01-15', type: 'Semanal', sections: ['A1', 'A2'], status: 'pending' },
    { date: '2024-01-20', type: 'Semanal', sections: ['B1', 'B2'], status: 'scheduled' },
    { date: '2024-01-31', type: 'Mensual', sections: ['Todas'], status: 'scheduled' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'low': return 'warning';
      case 'out': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return 'Normal';
      case 'low': return 'Stock Bajo';
      case 'out': return 'Sin Stock';
      default: return status;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'blusas': return 'bg-blue-100 border-blue-300';
      case 'pantalones': return 'bg-green-100 border-green-300';
      case 'vestidos': return 'bg-purple-100 border-purple-300';
      case 'faldas': return 'bg-pink-100 border-pink-300';
      case 'accesorios': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const handleScan = () => {
    if (scanInput.trim()) {
      const item = inventoryItems.find(item => item.barcode === scanInput);
      if (item) {
        setScannedItems([...scannedItems, { ...item, scannedAt: new Date().toLocaleTimeString() }]);
        setScanInput('');
      } else {
        alert('Producto no encontrado');
      }
    }
  };

  const filteredItems = selectedSection === 'all' 
    ? inventoryItems 
    : inventoryItems.filter(item => item.location.startsWith(selectedSection));

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Gestión de Inventario</h1>
          <p className="text-gray-600">Control y seguimiento de mercancía</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowMapModal(true)}>
            <MapPin className="w-4 h-4 mr-2" />
            Mapa de Tienda
          </Button>
          <Button onClick={() => setShowScanModal(true)}>
            <Scan className="w-4 h-4 mr-2" />
            Escanear
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-50 rounded-lg">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-primary-600">
                {inventoryItems.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-primary-600">
                {inventoryItems.filter(item => item.status === 'low').length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Sin Stock</p>
              <p className="text-2xl font-bold text-primary-600">
                {inventoryItems.filter(item => item.status === 'out').length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Normal</p>
              <p className="text-2xl font-bold text-primary-600">
                {inventoryItems.filter(item => item.status === 'normal').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Count Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Cronograma de Conteos
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {countSchedule.map((schedule, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{schedule.date}</span>
                </div>
                <Badge variant="info">{schedule.type}</Badge>
                <span className="text-sm text-gray-600">
                  Secciones: {schedule.sections.join(', ')}
                </span>
              </div>
              <Badge variant={schedule.status === 'pending' ? 'warning' : 'default'}>
                {schedule.status === 'pending' ? 'Pendiente' : 'Programado'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters and Search */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Sección:</span>
          </div>
          
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas las secciones</option>
            <option value="A">Sección A</option>
            <option value="B">Sección B</option>
            <option value="C">Sección C</option>
          </select>

          <div className="relative ml-auto">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, nombre..."
              className="pl-9 pr-4 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <Button variant="outline" size="sm">
            <Download className="w-3 h-3 mr-1" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card padding={false}>
        <CardHeader>
          <CardTitle className='pl-6 mt-2'>Inventario Actual</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla/Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Conteo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{item.barcode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.size} / {item.color}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="default" size="sm">{item.location}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{item.quantity}</div>
                    <div className="text-xs text-gray-500">Min: {item.minStock}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.lastCount}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scan Modal */}
      <Modal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        title="Escaneo de Inventario"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Simulación de Escáner
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ingresa o escanea el código de barras del producto
            </p>
            
            <div className="flex space-x-2 max-w-md mx-auto">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Código de barras"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button onClick={handleScan}>
                Escanear
              </Button>
            </div>
          </div>

          {/* Scanned Items */}
          {scannedItems.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Productos Escaneados ({scannedItems.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {scannedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm font-medium text-green-900">{item.name}</p>
                      <p className="text-xs text-green-600">{item.barcode} - {item.scannedAt}</p>
                    </div>
                    <Badge variant="success" size="sm">Escaneado</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowScanModal(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setScannedItems([])}>
              Limpiar Lista
            </Button>
          </div>
        </div>
      </Modal>

      {/* Store Map Modal */}
      <Modal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        title="Mapa de Ubicaciones"
        size="xl"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Layout de la Tienda
            </h3>
            <p className="text-sm text-gray-600">
              Distribución de secciones y ubicación de productos
            </p>
          </div>

          {/* Store Layout Grid */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-lg">
            {storeMap.sections.map((section) => (
              <div
                key={section.id}
                className={`p-6 rounded-lg border-2 hover:shadow-md transition-all cursor-pointer ${getSectionColor(section.type)}`}
              >
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-1">{section.id}</h4>
                  <p className="text-sm text-gray-700 mb-2 capitalize">{section.type}</p>
                  <div className="flex items-center justify-center space-x-1">
                    <Package className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{section.items}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { type: 'blusas', label: 'Blusas', color: 'bg-blue-100 border-blue-300' },
              { type: 'pantalones', label: 'Pantalones', color: 'bg-green-100 border-green-300' },
              { type: 'vestidos', label: 'Vestidos', color: 'bg-purple-100 border-purple-300' },
              { type: 'faldas', label: 'Faldas', color: 'bg-pink-100 border-pink-300' },
              { type: 'accesorios', label: 'Accesorios', color: 'bg-yellow-100 border-yellow-300' }
            ].map((item) => (
              <div key={item.type} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded border-2 ${item.color}`}></div>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowMapModal(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;