import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LogIn,
  LogOut,
  Settings
} from 'lucide-react';
import { driveService as driveService, DriveFile, extractFolderIdFromLink } from '../services/driveService';
import { supabase } from '../supabaseClient';

interface DriveConfig {
  id: number;
  id_tienda: number;
  mes: string;
  tipo_documento: string;
  drive_link: string;
}

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // Para mostrar lista de documentos
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('ventas');
  const [noDatafonoSales, setNoDatafonoSales] = useState<string[]>([]); // Días marcados como "sin ventas por datáfono"
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<DriveFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driveConfigs, setDriveConfigs] = useState<DriveConfig[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadValue, setUploadValue] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Inicializar Google Drive API
  useEffect(() => {
    const checkAuth = async () => {
      const authHandled = await driveService.handleAuthCallback();
      if (authHandled && window.location.pathname !== '/documents') {
        navigate('/documents');
      }
      
      setIsAuthenticated(driveService.isAuthenticated());
    };
    
    checkAuth();
  }, [navigate]);

  // Cargar información del usuario y configuraciones
  useEffect(() => {
    const loadUserAndConfigs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Obtener el id_tienda del usuario
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('id_tienda')
            .eq('id', user.id)
            .single();
          
          if (userError) {
            console.error('Error obteniendo usuario:', userError);
            return;
          }
          
          if (userData) {
            // Establecer mes actual
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            setCurrentMonth(month);
            
            // Cargar configuraciones de Drive para este mes
            await loadDriveConfigs(userData.id_tienda, month);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
      }
    };
    
    loadUserAndConfigs();
  }, []);

  // Recargar configs cuando la página se vuelve visible (ej: después de configurar)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentMonth) {
        // Recargar configs cuando la página vuelve a ser visible
        const reloadConfigs = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: userData } = await supabase
                .from('usuarios')
                .select('id_tienda')
                .eq('id', user.id)
                .single();
              
              if (userData) {
                console.log('🔄 Recargando configs después de volver a la página...');
                await loadDriveConfigs(userData.id_tienda, currentMonth);
              }
            }
          } catch (error) {
            console.error('Error recargando configs:', error);
          }
        };
        
        reloadConfigs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentMonth]);

  // Función para cargar configuraciones de Drive
  const loadDriveConfigs = async (storeId: number, month: string) => {
    try {
      console.log('🔍 Cargando configs de Drive:', { storeId, month });
      
      const { data, error } = await supabase
        .from('drive_configs')
        .select('*')
        .eq('id_tienda', storeId)
        .eq('mes', month);
      
      if (error) throw error;
      
      if (data) {
        console.log('✅ Configs cargados:', data);
        setDriveConfigs(data);
      } else {
        console.log('⚠️ No hay configs para este mes');
        setDriveConfigs([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar configuraciones de Drive:', error);
    }
  };

  // Función para obtener el link de Drive configurado para un tipo de documento
  const getDriveLinkForCategory = (categoryId: string): string | null => {
    // Mapeo de IDs de categoría a tipos de documento
    const categoryToType: { [key: string]: string } = {
      'ventas': 'ventas',
      'cierre-caja': 'cierre_caja',
      'cierre-voucher': 'cierre_voucher',
      'consignaciones': 'consignaciones',
      'facturas-gastos': 'facturas_gastos',
      'inventario': 'inventario',
      'nomina': 'nomina',
      'otros': 'otros'
    };
    
    const tipoDocumento = categoryToType[categoryId];
    if (!tipoDocumento) {
      console.warn('⚠️ Tipo de documento no encontrado para:', categoryId);
      return null;
    }
    
    const config = driveConfigs.find(c => c.tipo_documento === tipoDocumento);
    const link = config?.drive_link || null;
    
    console.log('📂 Link para', categoryId, '→', tipoDocumento, ':', link);
    
    return link;
  };

  // Cargar documentos cuando se selecciona una categoría
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all' && isAuthenticated) {
      loadDocuments(selectedCategory);
    }
  }, [selectedCategory, isAuthenticated]);

  // Categorías específicas de documentos de tienda
  const documentCategories = [
    {
      id: 'ventas',
      name: 'Ventas',
      description: 'Reportes de ventas mensuales',
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
      icon: '📊',
      color: 'blue',
      drivePath: '/ERP_GMCO/Documentos/Cierre_Caja'
    },
    {
      id: 'cierre-voucher',
      name: 'Cierre de Voucher',
      description: 'Cierre de compras por datáfono',
      frequency: 'Diario',
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

  // Función para cargar documentos de Google Drive
  const loadDocuments = async (categoryId: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const driveLink = getDriveLinkForCategory(categoryId);
      
      if (!driveLink) {
        alert(`No hay configuración de Drive para este tipo de documento en el mes ${currentMonth}. Por favor, configura el link en Configuración Drive.`);
        setDocuments([]);
        setIsLoading(false);
        return;
      }
      
      // Extraer el ID de la carpeta del link
      const folderId = extractFolderIdFromLink(driveLink);
      
      if (!folderId) {
        alert('El link de Drive configurado no es válido. Por favor, verifica la configuración.');
        setDocuments([]);
        setIsLoading(false);
        return;
      }
      
      const files = await driveService.listFiles(folderId);
      setDocuments(files);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      alert('Error al cargar documentos de Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para autenticarse con Google
  const handleSignIn = async () => {
    try {
      await driveService.signIn();
    } catch (error: any) {
      alert(`Error al conectar: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const handleSignOut = () => {
    driveService.signOut();
    setIsAuthenticated(false);
    setDocuments([]);
    alert('Sesión cerrada correctamente');
  };

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
  const filteredDocuments = documents.filter(() => {
    if (selectedCategory === 'all') return true;
    // Los archivos de Drive no tienen categoría, se asume que están en la carpeta correcta
    return true;
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
  const isDocumentUploadedToday = (_categoryId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Aquí necesitaríamos cargar los documentos de la categoría y verificar
    // Por ahora retorna false para mantener la lógica existente
    return documents.some(doc => {
      const docDate = new Date(doc.createdTime);
      docDate.setHours(0, 0, 0, 0);
      return docDate.getTime() === today.getTime();
    });
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

  // Función para subir archivo a Google Drive
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo');
      return;
    }

    if (!uploadValue.trim()) {
      alert('Por favor ingresa el valor del documento');
      return;
    }

    if (!isAuthenticated) {
      alert('Por favor inicia sesión con Google Drive primero');
      return;
    }

    const category = getCategoryById(selectedUploadCategory);
    const driveLink = getDriveLinkForCategory(selectedUploadCategory);
    
    console.log('📤 Intentando subir archivo:', {
      categoria: category.name,
      categoryId: selectedUploadCategory,
      mes: currentMonth,
      driveLink: driveLink
    });
    
    if (!driveLink) {
      alert(`No hay configuración de Drive para ${category.name} en el mes ${currentMonth}. Por favor, configura el link en Configuración Drive.`);
      return;
    }
    
    const folderId = extractFolderIdFromLink(driveLink);
    
    console.log('📁 Folder ID extraído:', folderId);
    
    if (!folderId) {
      alert('El link de Drive configurado no es válido. Por favor, verifica la configuración.');
      return;
    }
    
    try {
      setIsLoading(true);
      setUploadProgress(0);

      console.log('⬆️ Subiendo archivo a carpeta:', folderId);

      // Generar nombre de archivo: YYYYMMDD-TipoDocumento-$valor.pdf
      const dateFormatted = uploadDate.replace(/-/g, ''); // YYYYMMDD
      const categoryLabel = category.name.replace(/\s+/g, '-'); // Reemplazar espacios con guiones
      const formattedPrice = parseInt(uploadValue).toLocaleString('es-CO'); // Formatear con comas
      const newFileName = `${dateFormatted}-${categoryLabel}-$${formattedPrice}.pdf`;
      
      console.log('📝 Nombre de archivo:', newFileName);

      // Crear nuevo File con el nombre personalizado
      const renamedFile = new File([selectedFile], newFileName, { type: selectedFile.type });

      // Subir archivo a Google Drive usando el folder ID
      await driveService.uploadFile(
        renamedFile,
        folderId,
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      console.log('✅ Archivo subido exitosamente');
      alert(`¡Documento subido exitosamente a Google Drive!\n\nCategoría: ${category.name}\nMes: ${currentMonth}\nCarpeta ID: ${folderId}`);
      
      // Recargar documentos de la categoría que acabamos de subir
      await loadDocuments(selectedUploadCategory);
      
      // Si estamos viendo otra categoría, mantenerla seleccionada pero los documentos se habrán actualizado
      if (selectedCategory !== selectedUploadCategory) {
        setSelectedCategory(selectedUploadCategory);
      }

      setShowUploadModal(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setUploadValue('');
      setUploadDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('❌ Error al subir archivo:', error);
      alert('Error al subir el documento a Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar archivo
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${fileName}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await driveService.deleteFile(fileId);
      alert('Documento eliminado exitosamente');
      
      // Recargar documentos
      if (selectedCategory && selectedCategory !== 'all') {
        await loadDocuments(selectedCategory);
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      alert('Error al eliminar el documento');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para descargar archivo
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await driveService.downloadFile(fileId, fileName);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      alert('Error al descargar el documento');
    }
  };

  // Función para ver archivo (abrir en nueva pestaña)
  const handleView = (webViewLink: string) => {
    window.open(webViewLink, '_blank');
  };

  return (
    <div className="p-6 pt-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📂 Gestión de Documentos</h1>
          <p className="text-gray-600">Sube documentos diarios de la tienda organizados por categoría</p>
          {currentMonth && (
            <p className="text-sm text-gray-500 mt-1">
              📅 Mes actual: <span className="font-medium">{currentMonth}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate('/drive-config')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar Drive
          </Button>
          {!isAuthenticated ? (
            <Button onClick={handleSignIn} className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Conectar Google Drive
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-green-600">✓ Conectado a Google Drive</span>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Desconectar
              </Button>
            </div>
          )}
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
                    {getDriveLinkForCategory(category.id) ? (
                      <span className="text-xs text-green-600">✓ Configurado</span>
                    ) : (
                      <span className="text-xs text-orange-600">⚠ Sin configurar</span>
                    )}
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
                    navigate(`/camera-capture?category=${category.id}&categoryName=${encodeURIComponent(category.name)}`);
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
                <div className="text-sm text-gray-400">
                  {isAuthenticated ? 'Ver documentos en Google Drive' : 'Conecta Google Drive para ver documentos'}
                </div>
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
                    {getDriveLinkForCategory(category.id) ? (
                      <span className="text-xs text-green-600">✓ Configurado</span>
                    ) : (
                      <span className="text-xs text-orange-600">⚠ Sin configurar</span>
                    )}
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
                    navigate(`/camera-capture?category=${category.id}&categoryName=${encodeURIComponent(category.name)}`);
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
                <div className="text-sm text-gray-400">
                  {isAuthenticated ? 'Ver documentos en Google Drive' : 'Conecta Google Drive para ver documentos'}
                </div>
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
                  const category = getCategoryById(selectedCategory);
                  return (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          {getFileIcon('pdf')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {driveService.formatFileSize(parseInt(doc.size || '0'))} • {new Date(doc.createdTime).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getCategoryBadgeVariant(selectedCategory)} size="sm">
                              {category.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleView(doc.webViewLink)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(doc.id, doc.name)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Descargar
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(doc.id, doc.name)}
                        >
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
                {!isAuthenticated && (
                  <p className="text-sm text-gray-400 mt-2">
                    Conecta con Google Drive para ver tus documentos
                  </p>
                )}
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
          {!isAuthenticated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Primero debes conectarte a Google Drive
              </p>
            </div>
          )}

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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!isAuthenticated || isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF. Máximo 10MB.
            </p>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Documento
            </label>
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!isAuthenticated || isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor del Documento
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={uploadValue}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setUploadValue(value);
                }}
                placeholder="5000"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!isAuthenticated || isLoading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: Para $5,000 ingresa "5000"
            </p>
          </div>

          {selectedFile && uploadValue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Vista previa del nombre:</p>
              <p className="text-sm text-blue-700 font-mono break-all">
                {uploadDate.replace(/-/g, '')}-{getCategoryById(selectedUploadCategory).name.replace(/\s+/g, '-')}-${parseInt(uploadValue).toLocaleString('es-CO')}.pdf
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!isAuthenticated || isLoading || !selectedFile || !uploadValue}
              className="flex-1"
            >
              {isLoading ? 'Subiendo...' : 'Subir Documento'}
            </Button>
            <Button
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFile(null);
                setUploadValue('');
                setUploadDate(new Date().toISOString().split('T')[0]);
              }}
              variant="outline"
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>

          {/* Barra de progreso */}
          {isLoading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subiendo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Documents;