import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Upload, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  Trash2,
  Filter,
  Search,
  Calendar
} from 'lucide-react';

const Documents: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const documents = [
    {
      id: 1,
      name: 'Reporte_Ventas_Enero.pdf',
      type: 'pdf',
      category: 'Ventas',
      month: 'Enero 2024',
      uploadDate: '2024-01-15',
      size: '2.3 MB',
      uploadedBy: 'María González'
    },
    {
      id: 2,
      name: 'Inventario_Completo.xlsx',
      type: 'excel',
      category: 'Inventario',
      month: 'Enero 2024',
      uploadDate: '2024-01-14',
      size: '1.8 MB',
      uploadedBy: 'Ana López'
    },
    {
      id: 3,
      name: 'Capacitacion_Personal.jpg',
      type: 'image',
      category: 'Capacitación',
      month: 'Enero 2024',
      uploadDate: '2024-01-12',
      size: '856 KB',
      uploadedBy: 'Carmen Ruiz'
    },
    {
      id: 4,
      name: 'Politicas_Nuevas.pdf',
      type: 'pdf',
      category: 'Políticas',
      month: 'Diciembre 2023',
      uploadDate: '2023-12-28',
      size: '1.2 MB',
      uploadedBy: 'Laura Jiménez'
    }
  ];

  const categories = ['Ventas', 'Inventario', 'Capacitación', 'Políticas', 'Finanzas', 'Otros'];
  const months = ['Enero 2024', 'Diciembre 2023', 'Noviembre 2023', 'Octubre 2023'];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const categoryMatch = selectedCategory === 'all' || doc.category === selectedCategory;
    const monthMatch = selectedMonth === 'all' || doc.month === selectedMonth;
    return categoryMatch && monthMatch;
  });

  return (
    <div className="space-y-6 mt-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">Gestión de Documentos</h1>
          <p className="text-gray-600">Sube y organiza documentos por categoría y mes</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Subir Documento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todos los meses</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              className="pl-9 pr-4 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                {getFileIcon(doc.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.size} • {doc.uploadDate}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="info" size="sm">{doc.category}</Badge>
                  <Badge variant="default" size="sm">{doc.month}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Subido por {doc.uploadedBy}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  Descargar
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Subir Documento"
        size="lg"
      >
        <div className="space-y-6">
          {/* Drag and Drop Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Soporta PDF, DOC, XLS, JPG, PNG (máx. 10MB)
            </p>
            <Button variant="outline">
              Seleccionar Archivos
            </Button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Seleccionar categoría</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes/Período
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Seleccionar mes</option>
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Agrega una descripción del documento..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button>
              Subir Documento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Documents;