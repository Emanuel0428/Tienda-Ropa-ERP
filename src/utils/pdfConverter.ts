import { jsPDF } from 'jspdf';

/**
 * Convierte una imagen (base64) a PDF
 * @param imageDataUrl - Imagen en formato base64 (data:image/jpeg;base64,...)
 * @param fileName - Nombre del archivo (sin extensión)
 * @returns Blob del PDF generado
 */
export const convertImageToPDF = async (
  imageDataUrl: string,
  fileName: string = 'documento'
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Crear imagen para obtener dimensiones
      const img = new Image();
      
      img.onload = () => {
        try {
          // Obtener dimensiones de la imagen
          const imgWidth = img.width;
          const imgHeight = img.height;

          // Calcular orientación y tamaño del PDF
          const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
          
          // Calcular tamaño A4 en mm
          const a4Width = orientation === 'portrait' ? 210 : 297;
          const a4Height = orientation === 'portrait' ? 297 : 210;

          // Crear documento PDF
          const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: 'a4',
          });

          // Calcular dimensiones para ajustar imagen al PDF manteniendo aspecto
          const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
          const finalWidth = imgWidth * ratio;
          const finalHeight = imgHeight * ratio;

          // Centrar imagen en el PDF
          const x = (a4Width - finalWidth) / 2;
          const y = (a4Height - finalHeight) / 2;

          // Agregar imagen al PDF
          pdf.addImage(imageDataUrl, 'JPEG', x, y, finalWidth, finalHeight);

          // Agregar metadata
          pdf.setProperties({
            title: fileName,
            subject: 'Documento escaneado',
            creator: 'ERP GMCO - Scanner',
            keywords: 'documento, escaneo',
          });

          // Convertir a Blob
          const pdfBlob = pdf.output('blob');
          
          console.log('✅ PDF generado:', {
            fileName,
            size: `${(pdfBlob.size / 1024).toFixed(2)} KB`,
            dimensions: `${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)} mm`,
          });

          resolve(pdfBlob);
        } catch (error) {
          console.error('❌ Error generando PDF:', error);
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error cargando imagen'));
      };

      // Cargar imagen
      img.src = imageDataUrl;
    } catch (error) {
      console.error('❌ Error en conversión a PDF:', error);
      reject(error);
    }
  });
};

/**
 * Generar nombre de archivo con timestamp
 * @param category - Categoría del documento
 * @returns Nombre del archivo
 */
export const generateFileName = (category: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${category}_${year}${month}${day}_${hours}${minutes}${seconds}`;
};
