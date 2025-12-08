import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Check,
  RefreshCw,
  Zap,
  AlertCircle,
  Edit3,
  X,
  RotateCcw,
  Upload,
  Loader2
} from 'lucide-react';
import jscanify from 'jscanify/src/jscanify';
import { initializeGoogleDrive, uploadPDFToDrive } from '../services/googleDriveService';
import { convertImageToPDF, generateFileName } from '../utils/pdfConverter';

interface Corner {
  x: number;
  y: number;
}

const CameraCapture: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const categoryName = searchParams.get('categoryName') || 'Documentos';
  
  // ID de carpeta de Drive (por ahora usamos la de prueba)
  const DRIVE_FOLDER_ID = '10WJQndXOOPA8ZhBXxtEr5bVE9JNAk0Zd';
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEditingCorners, setIsEditingCorners] = useState(false);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [capturedImageData, setCapturedImageData] = useState<ImageData | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Inicializar Google Drive API
    initializeGoogleDrive().catch(err => {
      console.error('Error inicializando Google Drive:', err);
    });
  }, []);

  useEffect(() => {
    const checkCv = setInterval(() => {
      if ((window as any).cv && (window as any).cv.Mat) {
        setCvLoaded(true);
        clearInterval(checkCv);
        try {
          scannerRef.current = new jscanify();
        } catch (e) {
          console.error("Error inicializando scanner:", e);
        }
      }
    }, 100);

    const cvTimeout = setTimeout(() => {
      if (!scannerRef.current) {
        setCvLoaded(true);
        clearInterval(checkCv);
      }
    }, 8000);

    startCamera();

    // Agregar listeners táctiles nativos para evitar el error de passive event
    const canvas = editCanvasRef.current;
    if (canvas) {
      const touchMoveHandler = (e: TouchEvent) => {
        if (draggingIndex !== null && e.touches.length > 0) {
          e.preventDefault();
        }
      };
      
      canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
      
      return () => {
        canvas.removeEventListener('touchmove', touchMoveHandler);
        clearInterval(checkCv);
        clearTimeout(cvTimeout);
      };
    }

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
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
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
      setError("No se pudo acceder a la cámara. Por favor permite el acceso.");
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
    if (!videoRef.current || !previewCanvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);
    
    if (scannerRef.current && cvLoaded) {
      try {
        const highlightedCanvas = scannerRef.current.highlightPaper(canvas);
        ctx.drawImage(highlightedCanvas, 0, 0);
        
        // Detectar si hay documento
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let greenPixels = 0;
        for (let i = 1; i < data.length; i += 4) {
          if (data[i] > 200 && data[i-1] < 100 && data[i+1] < 100) {
            greenPixels++;
          }
        }
        setDocumentDetected(greenPixels > 1000);
      } catch (e) {
        // Ignorar errores de detección
      }
    }

    animationFrameRef.current = requestAnimationFrame(processVideo);
  };

  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    
    // Animación de captura
    setTimeout(() => setIsCapturing(false), 300);

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

    // Guardar imagen original para edición
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCapturedImageData(imageData);

    if (scannerRef.current && cvLoaded) {
      try {
        // Intentar detectar esquinas automáticamente
        const detectedCorners = await detectCorners(canvas);
        
        if (detectedCorners && detectedCorners.length === 4) {
          setCorners(detectedCorners);
          // Extraer automáticamente
          const resultCanvas = scannerRef.current.extractPaper(canvas, canvas.width, canvas.height);
          setScannedImage(resultCanvas.toDataURL('image/jpeg', 0.95));
        } else {
          // Si no detecta bien, usar imagen completa y sugerir edición manual
          setScannedImage(canvas.toDataURL('image/jpeg', 0.95));
          // Establecer esquinas con margen del 10% (mejor práctica)
          const margin = 0.1;
          const marginX = canvas.width * margin;
          const marginY = canvas.height * margin;
          setCorners([
            { x: marginX, y: marginY },
            { x: canvas.width - marginX, y: marginY },
            { x: canvas.width - marginX, y: canvas.height - marginY },
            { x: marginX, y: canvas.height - marginY }
          ]);
        }
        stopCamera();
      } catch (e) {
        // Modo fallback: captura completa sin detección
        setScannedImage(canvas.toDataURL('image/jpeg', 0.95));
        const margin = 0.1;
        const marginX = canvas.width * margin;
        const marginY = canvas.height * margin;
        setCorners([
          { x: marginX, y: marginY },
          { x: canvas.width - marginX, y: marginY },
          { x: canvas.width - marginX, y: canvas.height - marginY },
          { x: marginX, y: canvas.height - marginY }
        ]);
        stopCamera();
      }
    } else {
      setScannedImage(canvas.toDataURL('image/jpeg', 0.95));
      const margin = 0.1;
      const marginX = canvas.width * margin;
      const marginY = canvas.height * margin;
      setCorners([
        { x: marginX, y: marginY },
        { x: canvas.width - marginX, y: marginY },
        { x: canvas.width - marginX, y: canvas.height - marginY },
        { x: marginX, y: canvas.height - marginY }
      ]);
      stopCamera();
    }
  };

  // Detectar esquinas del documento
  const detectCorners = async (canvas: HTMLCanvasElement): Promise<Corner[] | null> => {
    try {
      if (!scannerRef.current) return null;

      // jscanify internamente detecta las esquinas, pero necesitamos acceder a ellas
      // Como workaround, usamos la imagen destacada para inferir las esquinas
      const highlightedCanvas = scannerRef.current.highlightPaper(canvas);
      const ctx = highlightedCanvas.getContext('2d');
      if (!ctx) return null;

      // Buscar píxeles verdes (que indican el borde detectado)
      const imageData = ctx.getImageData(0, 0, highlightedCanvas.width, highlightedCanvas.height);
      const data = imageData.data;
      
      let minX = highlightedCanvas.width, maxX = 0;
      let minY = highlightedCanvas.height, maxY = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Detectar píxeles verdes (borde destacado)
        if (g > 200 && r < 100 && b < 100) {
          const pixelIndex = i / 4;
          const x = pixelIndex % highlightedCanvas.width;
          const y = Math.floor(pixelIndex / highlightedCanvas.width);
          
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      // Si encontramos un área razonable
      if (maxX - minX > 100 && maxY - minY > 100) {
        // Aplicar margen si las esquinas están muy cerca de los bordes
        const edgeThreshold = 20;
        const margin = 30;
        
        const adjustedMinX = minX < edgeThreshold ? minX + margin : minX;
        const adjustedMinY = minY < edgeThreshold ? minY + margin : minY;
        const adjustedMaxX = maxX > highlightedCanvas.width - edgeThreshold ? maxX - margin : maxX;
        const adjustedMaxY = maxY > highlightedCanvas.height - edgeThreshold ? maxY - margin : maxY;
        
        return [
          { x: adjustedMinX, y: adjustedMinY },
          { x: adjustedMaxX, y: adjustedMinY },
          { x: adjustedMaxX, y: adjustedMaxY },
          { x: adjustedMinX, y: adjustedMaxY }
        ];
      }

      return null;
    } catch (e) {
      console.error("Error detectando esquinas:", e);
      return null;
    }
  };

  const handleRetake = () => {
    setScannedImage(null);
    setCapturedImageData(null);
    setCorners([]);
    setIsEditingCorners(false);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!scannedImage) {
      alert('❌ No hay imagen para subir');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generar nombre de archivo
      const fileName = generateFileName(categoryName);

      // Convertir imagen a PDF
      setUploadProgress(20);
      const pdfBlob = await convertImageToPDF(scannedImage, fileName);

      // Subir a Google Drive (el servicio manejará la autenticación)
      setUploadProgress(40);
      
      await uploadPDFToDrive(
        pdfBlob,
        fileName,
        DRIVE_FOLDER_ID,
        (progress) => {
          // Mapear progreso de 40% a 90%
          const mappedProgress = 40 + (progress * 0.5);
          setUploadProgress(mappedProgress);
        }
      );

      setUploadProgress(100);

      // Mostrar éxito
      alert(`✅ Documento "${fileName}" subido exitosamente a Google Drive!`);
      
      // Navegar de vuelta
      navigate('/documents');
    } catch (error: any) {
      console.error('❌ Error subiendo documento:', error);
      
      // Mensajes más claros para el usuario
      let errorMessage = 'Error desconocido';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error === 'access_denied') {
        errorMessage = 'Acceso denegado por Google.\n\nPor favor verifica:\n1. Tu correo debe estar en la lista de usuarios de prueba\n2. Ve a Google Cloud Console\n3. APIs & Services → OAuth consent screen → Test users';
      } else if (error.error === 'popup_closed_by_user') {
        errorMessage = 'Popup cerrado. Por favor intenta de nuevo y completa la autenticación.';
      } else if (error.error === 'server_error') {
        errorMessage = 'Error del servidor de Google.\n\nAsegúrate de que tu correo esté autorizado en Google Cloud Console (Test users).';
      }
      
      alert(`❌ Error al subir documento:\n\n${errorMessage}`);
      
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Resetear esquinas a posición por defecto
  const resetCorners = () => {
    if (!capturedImageData) return;
    
    const margin = 0.1;
    const marginX = capturedImageData.width * margin;
    const marginY = capturedImageData.height * margin;
    
    setCorners([
      { x: marginX, y: marginY },
      { x: capturedImageData.width - marginX, y: marginY },
      { x: capturedImageData.width - marginX, y: capturedImageData.height - marginY },
      { x: marginX, y: capturedImageData.height - marginY }
    ]);
    
    setTimeout(() => drawCorners(), 10);
  };

  // Edición manual de esquinas
  const startEditingCorners = () => {
    setIsEditingCorners(true);
    setShowInstructions(true); // Mostrar instrucciones al entrar al editor
    
    // Dibujar imagen con esquinas en canvas de edición
    setTimeout(() => {
      if (editCanvasRef.current && capturedImageData) {
        const canvas = editCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = capturedImageData.width;
        canvas.height = capturedImageData.height;
        ctx.putImageData(capturedImageData, 0, 0);
        
        drawCorners();
      }
    }, 100);
  };

  const drawCorners = () => {
    if (!editCanvasRef.current || !capturedImageData) return;
    
    const canvas = editCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redibujar imagen completamente visible
    ctx.putImageData(capturedImageData, 0, 0);

    // Dibujar overlay semi-transparente SOLO fuera del área seleccionada
    // Primero llenar todo el canvas
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Luego crear un "recorte" del área interna para mostrar la imagen
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    corners.forEach((corner, i) => {
      if (i === 0) {
        ctx.moveTo(corner.x, corner.y);
      } else {
        ctx.lineTo(corner.x, corner.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dibujar líneas entre esquinas con gradiente brillante
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#00ff88');
    gradient.addColorStop(1, '#00ff00');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    ctx.setLineDash([]);
    ctx.beginPath();
    corners.forEach((corner, i) => {
      if (i === 0) {
        ctx.moveTo(corner.x, corner.y);
      } else {
        ctx.lineTo(corner.x, corner.y);
      }
    });
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dibujar esquinas como "L" gruesas (estilo CamScanner)
    const cornerSize = 60; // Tamaño de la L
    const cornerThickness = 8; // Grosor de la L

    corners.forEach((corner, i) => {
      const isBeingDragged = draggingIndex === i;
      
      // Determinar dirección de la L según la esquina
      let dx1 = 1, dy1 = 0, dx2 = 0, dy2 = 1;
      
      if (i === 0) { // Top-left
        dx1 = 1; dy1 = 0;  // Horizontal derecha
        dx2 = 0; dy2 = 1;  // Vertical abajo
      } else if (i === 1) { // Top-right
        dx1 = -1; dy1 = 0; // Horizontal izquierda
        dx2 = 0; dy2 = 1;  // Vertical abajo
      } else if (i === 2) { // Bottom-right
        dx1 = -1; dy1 = 0; // Horizontal izquierda
        dx2 = 0; dy2 = -1; // Vertical arriba
      } else { // Bottom-left
        dx1 = 1; dy1 = 0;  // Horizontal derecha
        dx2 = 0; dy2 = -1; // Vertical arriba
      }

      // Dibujar sombra para mejor visibilidad
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = cornerThickness + 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(corner.x + dx1 * 5, corner.y + dy1 * 5);
      ctx.lineTo(corner.x + dx1 * cornerSize + dx1 * 5, corner.y + dy1 * cornerSize + dy1 * 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(corner.x + dx2 * 5, corner.y + dy2 * 5);
      ctx.lineTo(corner.x + dx2 * cornerSize + dx2 * 5, corner.y + dy2 * cornerSize + dy2 * 5);
      ctx.stroke();

      // Dibujar L en color verde brillante (más gruesa si se está arrastrando)
      ctx.strokeStyle = isBeingDragged ? '#00ffff' : '#00ff00';
      ctx.lineWidth = isBeingDragged ? cornerThickness + 2 : cornerThickness;
      ctx.lineCap = 'round';
      ctx.shadowColor = isBeingDragged ? '#00ffff' : '#00ff00';
      ctx.shadowBlur = isBeingDragged ? 20 : 0;
      
      // Brazo horizontal de la L
      ctx.beginPath();
      ctx.moveTo(corner.x, corner.y);
      ctx.lineTo(corner.x + dx1 * cornerSize, corner.y + dy1 * cornerSize);
      ctx.stroke();
      
      // Brazo vertical de la L
      ctx.beginPath();
      ctx.moveTo(corner.x, corner.y);
      ctx.lineTo(corner.x + dx2 * cornerSize, corner.y + dy2 * cornerSize);
      ctx.stroke();
      
      ctx.shadowBlur = 0;

      // Círculo en el centro para indicar el punto exacto (más grande si se arrastra)
      const circleRadius = isBeingDragged ? 18 : 14;
      ctx.fillStyle = isBeingDragged ? '#00ffff' : '#00ff00';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = isBeingDragged ? '#00ffff' : '#00ff00';
      ctx.shadowBlur = isBeingDragged ? 15 : 5;
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, circleRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Número de esquina dentro del círculo
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isBeingDragged ? '16px' : '14px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText((i + 1).toString(), corner.x, corner.y);
      ctx.shadowBlur = 0;
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editCanvasRef.current) return;

    const rect = editCanvasRef.current.getBoundingClientRect();
    const scaleX = capturedImageData!.width / rect.width;
    const scaleY = capturedImageData!.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Encontrar esquina más cercana
    const threshold = 70;
    const cornerIndex = corners.findIndex(c => 
      Math.sqrt((c.x - x) ** 2 + (c.y - y) ** 2) < threshold
    );

    if (cornerIndex !== -1) {
      setDraggingIndex(cornerIndex);
      // Ocultar instrucciones cuando el usuario empieza a arrastrar
      setShowInstructions(false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null || !editCanvasRef.current) return;

    const rect = editCanvasRef.current.getBoundingClientRect();
    const scaleX = capturedImageData!.width / rect.width;
    const scaleY = capturedImageData!.height / rect.height;
    
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, capturedImageData!.width));
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, capturedImageData!.height));

    const newCorners = [...corners];
    newCorners[draggingIndex] = { x, y };
    setCorners(newCorners);
    
    drawCorners();
  };

  const handleCanvasMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!editCanvasRef.current || e.touches.length === 0) return;

    const rect = editCanvasRef.current.getBoundingClientRect();
    const scaleX = capturedImageData!.width / rect.width;
    const scaleY = capturedImageData!.height / rect.height;
    
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    const threshold = 100; // Mayor threshold para touch
    const cornerIndex = corners.findIndex(c => 
      Math.sqrt((c.x - x) ** 2 + (c.y - y) ** 2) < threshold
    );

    if (cornerIndex !== -1) {
      setDraggingIndex(cornerIndex);
      // Ocultar instrucciones cuando el usuario empieza a arrastrar
      setShowInstructions(false);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null || !editCanvasRef.current || e.touches.length === 0) return;

    const rect = editCanvasRef.current.getBoundingClientRect();
    const scaleX = capturedImageData!.width / rect.width;
    const scaleY = capturedImageData!.height / rect.height;
    
    const touch = e.touches[0];
    const x = Math.max(0, Math.min((touch.clientX - rect.left) * scaleX, capturedImageData!.width));
    const y = Math.max(0, Math.min((touch.clientY - rect.top) * scaleY, capturedImageData!.height));

    const newCorners = [...corners];
    newCorners[draggingIndex] = { x, y };
    setCorners(newCorners);
    
    drawCorners();
  };

  const handleCanvasTouchEnd = () => {
    setDraggingIndex(null);
  };

  const applyManualCrop = () => {
    if (!capturedImageData || corners.length !== 4) return;

    try {
      // Crear canvas temporal con la imagen original
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = capturedImageData.width;
      tempCanvas.height = capturedImageData.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(capturedImageData, 0, 0);

      // Ordenar esquinas: top-left, top-right, bottom-right, bottom-left
      const orderedCorners = orderCorners(corners);

      // Si OpenCV está disponible, usar transformación de perspectiva
      if ((window as any).cv) {
        const cv = (window as any).cv;
        
        // Convertir canvas a Mat
        const src = cv.imread(tempCanvas);
        
        // Calcular dimensiones del documento final
        const widthA = Math.sqrt(
          Math.pow(orderedCorners[2].x - orderedCorners[3].x, 2) +
          Math.pow(orderedCorners[2].y - orderedCorners[3].y, 2)
        );
        const widthB = Math.sqrt(
          Math.pow(orderedCorners[1].x - orderedCorners[0].x, 2) +
          Math.pow(orderedCorners[1].y - orderedCorners[0].y, 2)
        );
        const maxWidth = Math.max(widthA, widthB);

        const heightA = Math.sqrt(
          Math.pow(orderedCorners[1].x - orderedCorners[2].x, 2) +
          Math.pow(orderedCorners[1].y - orderedCorners[2].y, 2)
        );
        const heightB = Math.sqrt(
          Math.pow(orderedCorners[0].x - orderedCorners[3].x, 2) +
          Math.pow(orderedCorners[0].y - orderedCorners[3].y, 2)
        );
        const maxHeight = Math.max(heightA, heightB);

        // Puntos de origen (esquinas detectadas)
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          orderedCorners[0].x, orderedCorners[0].y,
          orderedCorners[1].x, orderedCorners[1].y,
          orderedCorners[2].x, orderedCorners[2].y,
          orderedCorners[3].x, orderedCorners[3].y
        ]);

        // Puntos de destino (rectángulo perfecto)
        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          maxWidth, 0,
          maxWidth, maxHeight,
          0, maxHeight
        ]);

        // Calcular matriz de transformación de perspectiva
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
        
        // Aplicar transformación
        const dst = new cv.Mat();
        const dsize = new cv.Size(maxWidth, maxHeight);
        cv.warpPerspective(src, dst, M, dsize);

        // Convertir resultado a canvas
        const resultCanvas = document.createElement('canvas');
        cv.imshow(resultCanvas, dst);

        // Limpiar memoria
        src.delete();
        dst.delete();
        M.delete();
        srcPoints.delete();
        dstPoints.delete();

        setScannedImage(resultCanvas.toDataURL('image/jpeg', 0.95));
        setIsEditingCorners(false);
      } else {
        // Fallback: recortar usando bounding box
        const minX = Math.min(...orderedCorners.map(c => c.x));
        const maxX = Math.max(...orderedCorners.map(c => c.x));
        const minY = Math.min(...orderedCorners.map(c => c.y));
        const maxY = Math.max(...orderedCorners.map(c => c.y));
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = cropWidth;
        resultCanvas.height = cropHeight;
        const resultCtx = resultCanvas.getContext('2d');
        if (!resultCtx) return;

        resultCtx.drawImage(
          tempCanvas,
          minX, minY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        setScannedImage(resultCanvas.toDataURL('image/jpeg', 0.95));
        setIsEditingCorners(false);
      }
    } catch (e) {
      console.error("Error aplicando recorte manual:", e);
      alert("Error al aplicar el recorte. Intenta ajustar las esquinas nuevamente.");
    }
  };

  // Ordenar esquinas en el orden: top-left, top-right, bottom-right, bottom-left
  const orderCorners = (corners: Corner[]): Corner[] => {
    // Calcular el centro
    const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
    const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;

    // Ordenar por ángulo desde el centro
    const sortedCorners = [...corners].sort((a, b) => {
      const angleA = Math.atan2(a.y - centerY, a.x - centerX);
      const angleB = Math.atan2(b.y - centerY, b.x - centerX);
      return angleA - angleB;
    });

    // Encontrar top-left (el más cercano a 0,0)
    const topLeftIndex = sortedCorners.reduce((minIdx, corner, idx, arr) => {
      const distCurrent = Math.sqrt(corner.x ** 2 + corner.y ** 2);
      const distMin = Math.sqrt(arr[minIdx].x ** 2 + arr[minIdx].y ** 2);
      return distCurrent < distMin ? idx : minIdx;
    }, 0);

    // Rotar array para que top-left sea el primero
    const ordered = [
      ...sortedCorners.slice(topLeftIndex),
      ...sortedCorners.slice(0, topLeftIndex)
    ];

    return ordered;
  };

  const cancelEditing = () => {
    setIsEditingCorners(false);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent text-white p-4 absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/documents')} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="font-semibold text-lg">{categoryName}</h1>
            {!cvLoaded && (
              <p className="text-xs text-gray-300 mt-1">Cargando escáner...</p>
            )}
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Error de Cámara</h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button 
                onClick={startCamera} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : scannedImage ? (
          <>
            {isEditingCorners ? (
              /* Editor de esquinas */
              <div className="h-full flex flex-col bg-gray-900">
                {/* Canvas con padding en la parte inferior para evitar que se solape con los controles */}
                <div className="flex-1 flex items-center justify-center p-4 pb-32 overflow-hidden">
                  <canvas 
                    ref={editCanvasRef}
                    className="max-w-full max-h-full object-contain cursor-crosshair touch-none"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onTouchStart={handleCanvasTouchStart}
                    onTouchMove={handleCanvasTouchMove}
                    onTouchEnd={handleCanvasTouchEnd}
                  />
                </div>
                
                {/* Instrucciones de edición */}
                {showInstructions && (
                  <div className="absolute top-24 left-0 right-0 z-15 flex justify-center px-4">
                    <div className="bg-blue-600/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-lg max-w-md relative">
                      <button
                        onClick={() => setShowInstructions(false)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
                      >
                        <X className="w-5 h-5 text-gray-700" />
                      </button>
                      <div className="flex items-start gap-3">
                        <Edit3 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-semibold mb-1">Ajusta las esquinas del documento</p>
                          <p className="text-xs text-blue-100">Arrastra las esquinas verdes a los bordes del documento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controles del editor */}
                <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                  <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent p-6 pb-8">
                    <div className="flex justify-center items-center gap-4 pointer-events-auto">
                      <button
                        onClick={cancelEditing}
                        className="flex flex-col items-center gap-2 text-white hover:scale-110 transition-transform"
                      >
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                          <ArrowLeft className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium">Cancelar</span>
                      </button>

                      <button
                        onClick={resetCorners}
                        className="flex flex-col items-center gap-2 text-white hover:scale-110 transition-transform"
                      >
                        <div className="w-14 h-14 rounded-full bg-orange-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-orange-500 transition-colors shadow-lg">
                          <RotateCcw className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium">Resetear</span>
                      </button>
                      
                      <button
                        onClick={applyManualCrop}
                        className="flex flex-col items-center gap-2 text-white hover:scale-110 transition-transform"
                      >
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/50 hover:bg-blue-700 transition-all">
                          <Check className="w-10 h-10" />
                        </div>
                        <span className="text-sm font-semibold">Aplicar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Vista previa normal */
              <div className="h-full flex items-center justify-center bg-gray-900 p-4">
                <img 
                  src={scannedImage} 
                  alt="Documento escaneado" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}
          </>
        ) : (
          <div className="relative w-full h-full">
            {/* Video */}
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover"
              playsInline 
              muted 
            />
            
            {/* Canvas overlay con detección */}
            <canvas 
              ref={previewCanvasRef} 
              className="absolute inset-0 w-full h-full object-contain z-10"
            />
            
            {/* Guía de marco */}
            <div className="absolute inset-0 z-5 pointer-events-none">
              <div className="relative w-full h-full p-6">
                <div className="relative w-full h-full border-4 border-white/40 border-dashed rounded-3xl">
                  {/* Esquinas */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                </div>
              </div>
            </div>

            {/* Instrucciones */}
            {!cvLoaded ? (
              <div className="absolute top-24 left-0 right-0 z-15 flex justify-center px-4">
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Inicializando escáner...</span>
                  </div>
                </div>
              </div>
            ) : documentDetected ? (
              <div className="absolute top-24 left-0 right-0 z-15 flex justify-center px-4">
                <div className="bg-green-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-semibold">Documento detectado</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute top-24 left-0 right-0 z-15 flex justify-center px-4">
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg">
                  <span className="text-sm">Posiciona el documento dentro del marco</span>
                </div>
              </div>
            )}

            {/* Flash de captura */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white z-30 animate-flash"></div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent p-6 pb-8 absolute bottom-0 left-0 right-0 z-20">
        <div className="flex justify-center items-center gap-6">
          {scannedImage && !isEditingCorners ? (
            <>
              <button
                onClick={handleRetake}
                className="flex flex-col items-center gap-2 text-white hover:scale-110 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <RefreshCw className="w-7 h-7" />
                </div>
                <span className="text-sm font-medium">Repetir</span>
              </button>

              <button
                onClick={startEditingCorners}
                className="flex flex-col items-center gap-2 text-white hover:scale-110 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-blue-600/80 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Edit3 className="w-7 h-7" />
                </div>
                <span className="text-sm font-medium">Ajustar</span>
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={isUploading}
                className={`flex flex-col items-center gap-2 text-white transition-transform ${
                  isUploading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-110'
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/50 hover:bg-green-700 transition-all relative">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin" />
                      {/* Círculo de progreso */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="38"
                          fill="none"
                          stroke="#ffffff40"
                          strokeWidth="4"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="38"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 38}`}
                          strokeDashoffset={`${2 * Math.PI * 38 * (1 - uploadProgress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </svg>
                    </>
                  ) : (
                    <Upload className="w-10 h-10" />
                  )}
                </div>
                <span className="text-sm font-semibold">
                  {isUploading ? `Subiendo ${uploadProgress}%` : 'Subir a Drive'}
                </span>
              </button>
            </>
          ) : !isEditingCorners && (
            <button
              onClick={handleCapture}
              disabled={!cvLoaded}
              className={`group flex flex-col items-center gap-3 ${!cvLoaded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
            >
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl ${documentDetected ? 'ring-4 ring-green-500 ring-offset-4 ring-offset-black' : ''}`}>
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-gray-800 flex items-center justify-center">
                    {documentDetected && (
                      <Zap className="w-8 h-8 text-green-600 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-white text-sm font-semibold">
                {cvLoaded ? 'Capturar' : 'Espera...'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
