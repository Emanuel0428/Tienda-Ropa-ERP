import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  Trash2,
  Search,
  Camera,
  Scan,
  CheckCircle
} from 'lucide-react';

const Documents: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // Iniciar sin categoría seleccionada
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('ventas');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [noDatafonoSales, setNoDatafonoSales] = useState<string[]>([]); // Días marcados como "sin ventas por datáfono"

  // Categorías específicas de documentos de tienda
  const documentCategories = [
    {
      id: 'ventas',
      name: 'Ventas',
      description: 'Reportes mensuales de ventas (subir a principio de mes)',
      frequency: 'Mensual',
      icon: '💰',
      color: 'green',
      drivePath: '/ERP_GMCO/Documentos/Ventas'
    },
    {
      id: 'cierre-caja',
      name: 'Cierre de Caja', 
      description: 'Cierre diario de caja registradora',
      frequency: 'Diario',
      icon: '📦',
      color: 'blue',
      drivePath: '/ERP_GMCO/Documentos/Cierre_Caja'
    },
    {
      id: 'cierre-voucher',
      name: 'Cierre de Voucher',
      description: 'Cierre de vouchers de datafono (solo cuando hay compras)',
      frequency: 'Condicional',
      icon: '💳',
      color: 'purple',
      drivePath: '/ERP_GMCO/Documentos/Cierre_Voucher'
    },
    {
      id: 'consignaciones',
      name: 'Consignaciones',
      description: 'Documentos de consignación (diario excepto domingos)',
      frequency: 'Lun-Sáb',
      icon: '📋',
      color: 'orange',
      drivePath: '/ERP_GMCO/Documentos/Consignaciones'
    },
    {
      id: 'facturas-gastos',
      name: 'Facturas de Gastos',
      description: 'Facturas de gastos y compras de la tienda',
      frequency: 'Según necesidad',
      icon: '🧾',
      color: 'red',
      drivePath: '/ERP_GMCO/Documentos/Facturas_Gastos'
    }
  ];

  // Array de documentos (vacío inicialmente)
  const documents: Array<{
    id: number;
    name: string;
    type: string;
    category: string;
    uploadDate: string;
    size: string;
    uploadedBy: string;
    status: string;
  }> = [];

  // Función para obtener la categoría completa por ID
  const getCategoryById = (id: string) => {
    return documentCategories.find(cat => cat.id === id) || documentCategories[0];
  };

  // Función para obtener ícono según tipo de archivo
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Función para filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    if (selectedCategory === 'all') return true;
    return doc.category === selectedCategory;
  });

  // Función para obtener color del badge según categoría
  const getCategoryBadgeVariant = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    switch (category.color) {
      case 'green': return 'success';
      case 'blue': return 'info';
      case 'purple': return 'default';
      case 'orange': return 'warning';
      case 'red': return 'error';
      default: return 'default';
    }
  };

  // Función para verificar si un documento diario ya se subió hoy
  const isDocumentUploadedToday = (categoryId: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return documents.some(doc => 
      doc.category === categoryId && 
      doc.uploadDate === today
    );
  };

  // Función para verificar si se marcó "sin ventas por datáfono" hoy
  const isMarkedNoDatafonoToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return noDatafonoSales.includes(today);
  };

  // Función para verificar si una categoría requiere subida diaria
  const isDailyCategory = (categoryId: string) => {
    const dailyCategories = ['cierre-caja', 'consignaciones', 'cierre-voucher'];
    return dailyCategories.includes(categoryId);
  };

  // Función para obtener el color de estado de una categoría
  const getCategoryStatusColor = (categoryId: string) => {
    if (!isDailyCategory(categoryId)) {
      return 'border-gray-300 bg-white'; // Categorías no diarias mantienen color normal
    }

    // Caso especial para cierre de voucher
    if (categoryId === 'cierre-voucher') {
      return (isDocumentUploadedToday(categoryId) || isMarkedNoDatafonoToday())
        ? 'border-green-500 bg-green-50' // Verde si se subió o se marcó sin ventas
        : 'border-red-500 bg-red-50';    // Rojo si no se ha subido ni marcado
    }
    
    return isDocumentUploadedToday(categoryId) 
      ? 'border-green-500 bg-green-50' // Verde si ya se subió hoy
      : 'border-red-500 bg-red-50';    // Rojo si no se ha subido hoy
  };

  // Función para marcar "sin ventas por datáfono"
  const markNoDatafonoSales = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!noDatafonoSales.includes(today)) {
      setNoDatafonoSales([...noDatafonoSales, today]);
    }
  };

  // Función para inicializar cámara
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Usar cámara trasera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara');
    }
  }, []);

  // Función para capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setScannedImage(imageData);

    // Detener la cámara
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  }, []);

  // Función para simular subida de archivo
  const handleUpload = (file: File | null, isScanned: boolean = false) => {
    if (!file && !isScanned) {
      alert('Por favor selecciona un archivo o escanea un documento');
      return;
    }

    const category = getCategoryById(selectedUploadCategory);
    
    // Simular proceso de subida
    console.log(`Subiendo archivo a: ${category.drivePath}`);
    console.log(`Categoría: ${category.name}`);
    console.log(`Tipo: ${isScanned ? 'Documento escaneado' : 'Archivo PDF'}`);
    
    alert(`¡Documento subido exitosamente!\n\nCategoría: ${category.name}\nRuta de Drive: ${category.drivePath}`);
    
    setShowUploadModal(false);
    setShowScanModal(false);
    setScannedImage(null);
  };

  return (
    <div className="p-6 pt-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📂 Gestión de Documentos</h1>
          <p className="text-gray-600">Sube documentos diarios de la tienda organizados por categoría</p>
        </div>
      </div>

      {/* Categorías de documentos organizadas en dos filas */}
      
      {/* Primera fila: Categorías principales (Ventas y Facturas de Gastos) */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Documentos Principales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentCategories
            .filter(cat => ['ventas', 'facturas-gastos'].includes(cat.id))
            .map((category) => (
            <div 
              key={category.id} 
              className={`border-2 rounded-lg p-4 transition-all ${getCategoryStatusColor(category.id)}`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">{category.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getCategoryBadgeVariant(category.id)} size="sm">
                      {category.frequency}
                    </Badge>
                    <span className="text-xs text-gray-500">{category.drivePath}</span>
                  </div>
                  {isDailyCategory(category.id) && (
                    <div className="mt-2 text-xs font-medium">
                      {isDocumentUploadedToday(category.id) ? (
                        <span className="text-green-600">✅ Subido hoy</span>
                      ) : (
                        <span className="text-red-600">⚠️ Pendiente hoy</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Botones de acción para esta categoría */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setSelectedUploadCategory(category.id);
                    setShowScanModal(true);
                  }}
                  className="flex items-center gap-2 flex-1"
                  variant="outline"
                  size="sm"
                >
                  <Camera className="w-4 h-4" />
                  Escanear
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedUploadCategory(category.id);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-2 flex-1"
                  size="sm"
                >
                  <Upload className="w-4 h-4" />
                  Subir PDF
                </Button>
              </div>
              
              {/* Mostrar documentos de esta categoría */}
              <div className="mt-4">
                {documents.filter(doc => doc.category === category.id).length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {documents.filter(doc => doc.category === category.id).length} documento(s)
                    <button 
                      onClick={() => setSelectedCategory(category.id)}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      Ver detalles
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Sin documentos</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segunda fila: Documentos de Cierre Diarios */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Documentos de Cierre Diarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {documentCategories
            .filter(cat => ['cierre-caja', 'cierre-voucher', 'consignaciones'].includes(cat.id))
            .map((category) => (
            <div 
              key={category.id} 
              className={`border-2 rounded-lg p-4 transition-all ${getCategoryStatusColor(category.id)}`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">{category.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getCategoryBadgeVariant(category.id)} size="sm">
                      {category.frequency}
                    </Badge>
                    <span className="text-xs text-gray-500">{category.drivePath}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium">
                    {category.id === 'cierre-voucher' ? (
                      (isDocumentUploadedToday(category.id) || isMarkedNoDatafonoToday()) ? (
                        <span className="text-green-600">✅ {isMarkedNoDatafonoToday() ? 'Sin ventas datáfono' : 'Subido hoy'}</span>
                      ) : (
                        <span className="text-red-600">⚠️ Pendiente hoy</span>
                      )
                    ) : (
                      isDocumentUploadedToday(category.id) ? (
                        <span className="text-green-600">✅ Subido hoy</span>
                      ) : (
                        <span className="text-red-600">⚠️ Pendiente hoy</span>
                      )
                    )}
                  </div>
                </div>
              </div>
              
              {/* Botones de acción para esta categoría */}
              <div className="flex gap-2 mb-2">
                <Button 
                  onClick={() => {
                    setSelectedUploadCategory(category.id);
                    setShowScanModal(true);
                  }}
                  className="flex items-center gap-2 flex-1"
                  variant="outline"
                  size="sm"
                >
                  <Camera className="w-4 h-4" />
                  Escanear
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedUploadCategory(category.id);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-2 flex-1"
                  size="sm"
                >
                  <Upload className="w-4 h-4" />
                  Subir PDF
                </Button>
              </div>

              {/* Botón especial para cierre de voucher */}
              {category.id === 'cierre-voucher' && !isDocumentUploadedToday(category.id) && !isMarkedNoDatafonoToday() && (
                <Button 
                  onClick={markNoDatafonoSales}
                  className="w-full text-xs"
                  variant="outline"
                  size="sm"
                >
                  Sin ventas datáfono hoy
                </Button>
              )}
              
              {/* Mostrar documentos de esta categoría */}
              <div className="mt-4">
                {documents.filter(doc => doc.category === category.id).length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {documents.filter(doc => doc.category === category.id).length} documento(s)
                    <button 
                      onClick={() => setSelectedCategory(category.id)}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      Ver detalles
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Sin documentos</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección para ver todos los documentos */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedCategory === 'all' ? 'Todos los Documentos' : `Documentos: ${getCategoryById(selectedCategory).name}`}
          </h2>
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'all' ? '' : 'all')}
            className="text-sm text-blue-600 hover:underline"
          >
            {selectedCategory === 'all' ? 'Ocultar lista' : `Ver todos (${documents.length})`}
          </button>
        </div>
      </div>

      {/* Buscador y Lista de documentos - Solo se muestra cuando se selecciona una categoría */}
      {selectedCategory && selectedCategory !== '' && (
        <>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="space-y-4">
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => {
                  const category = getCategoryById(doc.category);
                  return (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getCategoryBadgeVariant(doc.category)} size="sm">
                          {category.name}
                        </Badge>
                        <Badge variant="success" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Subido
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Por {doc.uploadedBy}
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
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedCategory === 'all' 
                ? 'No hay documentos disponibles' 
                : `No hay documentos en la categoría "${getCategoryById(selectedCategory).name}"`
              }
            </p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal de subida de PDF */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Subir Documento PDF"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría del Documento
            </label>
            <select
              value={selectedUploadCategory}
              onChange={(e) => setSelectedUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {documentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name} - {category.frequency}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Se guardará en: {getCategoryById(selectedUploadCategory).drivePath}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF (máx. 10MB)
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleUpload(null)}>
              Subir a Drive
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de escaneado */}
      <Modal
        isOpen={showScanModal}
        onClose={() => {
          setShowScanModal(false);
          setScannedImage(null);
          setIsScanning(false);
        }}
        title="Escanear Documento"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría del Documento
            </label>
            <select
              value={selectedUploadCategory}
              onChange={(e) => setSelectedUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {documentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {!scannedImage ? (
            <div className="text-center">
              {!isScanning ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Escanear Documento
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Usa la cámara para escanear documentos como CamScanner
                  </p>
                  <Button onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" />
                    Iniciar Cámara
                  </Button>
                </div>
              ) : (
                <div>
                  <video 
                    ref={videoRef} 
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                    autoPlay 
                    playsInline
                  />
                  <div className="mt-4">
                    <Button onClick={capturePhoto} className="mr-2">
                      <Scan className="w-4 h-4 mr-2" />
                      Capturar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsScanning(false);
                        if (videoRef.current?.srcObject) {
                          const stream = videoRef.current.srcObject as MediaStream;
                          stream.getTracks().forEach(track => track.stop());
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <img 
                src={scannedImage} 
                alt="Documento escaneado" 
                className="w-full max-w-md mx-auto rounded-lg shadow-lg mb-4"
              />
              <div className="flex justify-center space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setScannedImage(null);
                    startCamera();
                  }}
                >
                  Escanear de Nuevo
                </Button>
                <Button onClick={() => handleUpload(null, true)}>
                  Subir Documento
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </Modal>
    </div>
  );
};

export default Documents;