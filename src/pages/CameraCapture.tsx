import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Check,
  RefreshCw
} from 'lucide-react';
import jscanify from 'jscanify/src/jscanify';

const CameraCapture: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const category = searchParams.get('category') || 'ventas';
  const categoryName = searchParams.get('categoryName') || 'Documentos';
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if OpenCV is loaded
    const checkCv = setInterval(() => {
      if ((window as any).cv && (window as any).cv.Mat) {
        setCvLoaded(true);
        clearInterval(checkCv);
        try {
          scannerRef.current = new jscanify();
          console.log("OpenCV loaded and jscanify initialized");
        } catch (e) {
          console.error("Error initializing jscanify:", e);
        }
      }
    }, 100);

    // Timeout to allow using camera even if OpenCV fails
    const cvTimeout = setTimeout(() => {
      if (!scannerRef.current) {
        console.log("OpenCV load timeout - enabling basic camera");
        setCvLoaded(true); // Enable UI anyway
        clearInterval(checkCv);
      }
    }, 5000);

    startCamera();

    return () => {
      clearInterval(checkCv);
      clearTimeout(cvTimeout);
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      // Try to get the back camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsScanning(true);
          processVideo();
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to any camera if environment fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true);
            processVideo();
            };
        }
      } catch (e) {
        setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const processVideo = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Match canvas size to video size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Only try to highlight if scanner is initialized (OpenCV loaded)
    if (scannerRef.current) {
        try {
            scannerRef.current.highlightPaper(canvas);
        } catch (e) {
            // Ignore errors during processing
        }
    }

    animationFrameRef.current = requestAnimationFrame(processVideo);
  };

  const handleCapture = () => {
    if (!videoRef.current || !scannerRef.current) {
        // If scanner not ready, just capture the raw image
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            setScannedImage(canvas.toDataURL('image/jpeg'));
            stopCamera();
        }
        return;
    }

    // Pause processing
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);

    try {
      // Extract the paper
      const resultCanvas = scannerRef.current.extractPaper(canvas, video.videoWidth, video.videoHeight);
      setScannedImage(resultCanvas.toDataURL('image/jpeg'));
      stopCamera();
    } catch (e) {
      console.error("Error extracting paper:", e);
      // Fallback to full image if extraction fails
      setScannedImage(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  const handleRetake = () => {
    setScannedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    // Here you would typically upload the image
    // For now, we'll just navigate back or show a success message
    console.log(`Procesando imagen para la categoría: ${category}`);
    alert(`Documento escaneado para ${categoryName} y listo para procesar.`);
    navigate('/documents');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/50 text-white p-4 flex justify-between items-center absolute top-0 left-0 right-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <span className="font-medium">Escanear: {categoryName}</span>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={startCamera} variant="outline" className="text-white border-white">
              Reintentar
            </Button>
          </div>
        ) : scannedImage ? (
          <img src={scannedImage} alt="Scanned" className="max-w-full max-h-full object-contain" />
        ) : (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover" 
              playsInline 
              muted 
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full object-contain" 
            />
            {!cvLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
                    <div className="text-white bg-black/50 px-4 py-2 rounded-full">Cargando motor de escaneo...</div>
                </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-6 pb-8">
        <div className="flex justify-center items-center gap-8">
          {scannedImage ? (
            <>
              <Button 
                onClick={handleRetake}
                variant="outline" 
                className="rounded-full w-14 h-14 p-0 border-white text-white hover:bg-white/20"
              >
                <RefreshCw className="w-6 h-6" />
              </Button>
              <Button 
                onClick={handleConfirm}
                className="rounded-full w-16 h-16 p-0 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-8 h-8" />
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleCapture}
              disabled={!cvLoaded}
              className={`rounded-full w-20 h-20 p-0 bg-white hover:bg-gray-200 border-4 border-gray-300 ${!cvLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-black"></div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;