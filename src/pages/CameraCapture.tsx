import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Camera, 
  Scan, 
  ArrowLeft,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

const CameraCapture: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const category = searchParams.get('category') || 'ventas';
  const categoryName = searchParams.get('categoryName') || 'Documentos';
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Función para inicializar cámara
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('🎥 Iniciando proceso de cámara...');
      
      // Verificar disponibilidad de getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara. Prueba con Chrome o Firefox.');
      }

      // Verificar permisos primero
      console.log('🔒 Verificando permisos de cámara...');
      
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('🔒 Estado de permisos:', permissions.state);
        
        if (permissions.state === 'denied') {
          throw new Error('Permisos de cámara denegados. Ve a configuración del navegador y permite acceso a la cámara.');
        }
      } catch (permError) {
        console.log('⚠️ No se pudo verificar permisos (normal en algunos navegadores)');
      }

      console.log('🎥 Solicitando acceso a la cámara...');
      setError('Solicitando permisos de cámara...');

      // Intentar con configuración simple primero
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });
      } catch (envError) {
        console.log('⚠️ Fallo con cámara trasera, intentando con cualquier cámara...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 }
          }
        });
      }
      
      streamRef.current = stream;
      console.log('🎥 Cámara obtenida exitosamente');
      console.log('🎥 Tracks de video:', stream.getVideoTracks().length);
      
      if (stream.getVideoTracks().length === 0) {
        throw new Error('No se encontraron pistas de video en el stream');
      }
      
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            console.log('🎥 Video reproduciéndose');
            setIsScanning(true);
          } catch (playError) {
            console.error('Error en play:', playError);
            // Aún así mostrar el video
            setIsScanning(true);
          }
        };
      }
    } catch (error: any) {
      console.error('🎥 Error accessing camera:', error);
      setError(error.message || 'Error al acceder a la cámara');
    }
  }, []);

  // Función para capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video
    context.drawImage(video, 0, 0);
    
    // Convertir a imagen
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setScannedImage(imageData);
    
    console.log('📸 Foto capturada');
  }, []);

  // Función para detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎥 Track detenido');
      });
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Función para confirmar y volver
  const confirmCapture = () => {
    // Aquí podrías enviar la imagen al servidor
    console.log('✅ Imagen confirmada para categoría:', category);
    alert(`¡Documento escaneado exitosamente para ${categoryName}!`);
    stopCamera();
    navigate('/documents');
  };

  // Función para reiniciar
  const retakePhoto = () => {
    setScannedImage(null);
    startCamera();
  };

  // Función para cancelar
  const cancelCapture = () => {
    stopCamera();
    navigate('/documents');
  };

  // Auto-iniciar cámara cuando se monta el componente
  useEffect(() => {
    startCamera();
    
    // Timeout para mostrar ayuda si la cámara no se inicia
    const timeoutId = setTimeout(() => {
      if (!isScanning && !scannedImage && !error) {
        setError('La cámara está tardando mucho en iniciarse. Verifica que hayas dado permisos o intenta manualmente.');
      }
    }, 10000); // 10 segundos
    
    return () => {
      clearTimeout(timeoutId);
      stopCamera();
    };
  }, [startCamera, stopCamera, isScanning, scannedImage, error]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={cancelCapture}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Escanear Documento</h1>
            <p className="text-sm text-gray-600">{categoryName}</p>
            {location.protocol !== 'https:' && location.hostname !== 'localhost' && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Cámara requiere HTTPS o localhost
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center text-white max-w-md">
            <div className="bg-red-600 rounded-lg p-6 mb-4">
              <X className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                {error.includes('Solicitando') ? 'Esperando permisos...' : 'Error de Cámara'}
              </h3>
              <p className="text-sm">{error}</p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={startCamera} variant="outline" className="bg-white text-black w-full">
                <Camera className="w-4 h-4 mr-2" />
                Intentar de Nuevo
              </Button>
              
              <div className="text-xs text-gray-300 space-y-2">
                <p><strong>¿No aparece el popup de permisos?</strong></p>
                <p>• Verifica que estés usando HTTPS o localhost</p>
                <p>• Busca el ícono de cámara 📷 en la barra de direcciones</p>
                <p>• Ve a Configuración del navegador → Privacidad → Permisos de cámara</p>
                <p>• Prueba con Chrome o Firefox</p>
                <p>• Asegúrate de que no hay otra app usando la cámara</p>
              </div>
              
              <Button onClick={cancelCapture} variant="ghost" className="text-white w-full mt-4">
                Cancelar
              </Button>
            </div>
          </div>
        ) : scannedImage ? (
          <div className="text-center">
            <div className="mb-6">
              <img 
                src={scannedImage} 
                alt="Documento escaneado" 
                className="max-w-sm max-h-96 mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={retakePhoto} 
                variant="outline"
                className="bg-white text-black"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Tomar Otra
              </Button>
              <Button onClick={confirmCapture} className="bg-green-600 text-white">
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-white">
            {!isScanning ? (
              <div className="mb-6 max-w-md text-center">
                <Camera className="w-16 h-16 text-blue-400 animate-pulse mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Iniciando Cámara...</h3>
                <p className="text-gray-300 mb-4">
                  Permite el acceso a la cámara cuando se solicite
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={startCamera} 
                    className="bg-blue-600 text-white w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Activar Cámara Manualmente
                  </Button>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>💡 <strong>Tip:</strong> Busca el ícono 📷 en tu navegador</p>
                    <p>📱 En móvil: puede aparecer en la parte superior</p>
                    <p>💻 En PC: generalmente a la izquierda de la URL</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Video Container */}
                <div className="relative mb-6">
                  <video 
                    ref={videoRef} 
                    className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                    autoPlay 
                    playsInline
                    muted
                    style={{ maxHeight: '400px' }}
                  />
                  
                  {/* Overlay guide */}
                  <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
                      Posiciona el documento aquí
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-4 justify-center">
                  <Button onClick={cancelCapture} variant="ghost" className="text-white">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={capturePhoto} 
                    size="lg"
                    className="bg-blue-600 text-white"
                  >
                    <Scan className="w-5 h-5 mr-2" />
                    Capturar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CameraCapture;