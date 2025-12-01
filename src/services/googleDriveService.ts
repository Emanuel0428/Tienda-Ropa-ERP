/* eslint-disable @typescript-eslint/no-explicit-any */
import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

let isInitialized = false;
let isSignedIn = false;

/**
 * Inicializar Google Drive API
 */
export const initializeGoogleDrive = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized) {
      resolve();
      return;
    }

    try {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES,
          });

          // Escuchar cambios en el estado de autenticación
          gapi.auth2.getAuthInstance().isSignedIn.listen((signedIn: boolean) => {
            isSignedIn = signedIn;
            console.log('📊 Estado de autenticación:', signedIn ? 'Conectado' : 'Desconectado');
          });

          // Verificar si ya está autenticado
          isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
          isInitialized = true;

          console.log('✅ Google Drive API inicializada');
          resolve();
        } catch (error) {
          console.error('❌ Error inicializando Google Drive API:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('❌ Error cargando GAPI:', error);
      reject(error);
    }
  });
};

/**
 * Autenticar usuario con Google
 */
export const signInToGoogle = async (): Promise<void> => {
  try {
    // Asegurar que está inicializado
    if (!isInitialized) {
      console.log('🔄 Inicializando Google Drive API...');
      await initializeGoogleDrive();
    }

    // Esperar un momento para que auth2 esté disponible
    let retries = 0;
    while (retries < 10) {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance) {
        // Verificar si ya está autenticado
        if (authInstance.isSignedIn.get()) {
          console.log('✅ Ya está autenticado');
          isSignedIn = true;
          return;
        }

        // Solicitar autenticación
        console.log('🔐 Solicitando autenticación...');
        await authInstance.signIn();
        isSignedIn = true;
        console.log('✅ Autenticación exitosa');
        return;
      }

      // Esperar 100ms antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    throw new Error('No se pudo obtener la instancia de autenticación después de varios intentos');
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    throw error;
  }
};

/**
 * Verificar si el usuario está autenticado
 */
export const isUserSignedIn = (): boolean => {
  if (!isInitialized) return false;
  
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.warn('⚠️ AuthInstance no disponible');
      return false;
    }
    return authInstance.isSignedIn.get();
  } catch (error) {
    console.error('❌ Error verificando autenticación:', error);
    return false;
  }
};

/**
 * Cerrar sesión de Google
 */
export const signOutFromGoogle = async (): Promise<void> => {
  if (!isInitialized) return;

  try {
    await gapi.auth2.getAuthInstance().signOut();
    isSignedIn = false;
    console.log('✅ Sesión cerrada');
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error);
    throw error;
  }
};

/**
 * Subir archivo PDF a Google Drive
 * @param pdfBlob - Blob del archivo PDF
 * @param fileName - Nombre del archivo
 * @param folderId - ID de la carpeta destino
 * @param onProgress - Callback para progreso (0-100)
 */
export const uploadPDFToDrive = async (
  pdfBlob: Blob,
  fileName: string,
  folderId: string,
  onProgress?: (progress: number) => void
): Promise<{ id: string; webViewLink: string }> => {
  try {
    // Asegurar inicialización y autenticación
    if (!isInitialized) {
      console.log('🔄 Inicializando Google Drive API...');
      await initializeGoogleDrive();
    }

    if (!isSignedIn || !isUserSignedIn()) {
      console.log('🔐 Usuario no autenticado, solicitando login...');
      await signInToGoogle();
    }

    // Asegurar que el nombre termina en .pdf
    const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    console.log('📤 Subiendo archivo:', finalFileName, 'a carpeta:', folderId);

    // Crear metadata del archivo
    const metadata = {
      name: finalFileName,
      mimeType: 'application/pdf',
      parents: [folderId],
    };

    // Crear FormData para subir
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', pdfBlob);

    // Obtener access token
    const token = gapi.auth.getToken();
    if (!token || !token.access_token) {
      throw new Error('No se pudo obtener el token de acceso');
    }
    const accessToken = token.access_token;

    // Subir usando XMLHttpRequest para tener progreso
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      // Progreso de subida
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
          console.log(`📊 Progreso: ${progress}%`);
        }
      });

      // Éxito
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log('✅ Archivo subido exitosamente:', response);

          // Obtener link de visualización
          const fileId = response.id;
          const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;

          resolve({
            id: fileId,
            webViewLink,
          });
        } else {
          console.error('❌ Error en respuesta:', xhr.status, xhr.responseText);
          reject(new Error(`Error ${xhr.status}: ${xhr.responseText}`));
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        console.error('❌ Error de red al subir archivo');
        reject(new Error('Error de red al subir archivo'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        console.error('❌ Timeout al subir archivo');
        reject(new Error('Timeout al subir archivo'));
      });

      // Enviar
      xhr.send(formData);
    });
  } catch (error) {
    console.error('❌ Error subiendo archivo:', error);
    throw error;
  }
};

/**
 * Obtener información del usuario autenticado
 */
export const getCurrentUser = (): any => {
  if (!isInitialized || !isSignedIn) return null;

  const user = gapi.auth2.getAuthInstance().currentUser.get();
  const profile = user.getBasicProfile();

  return {
    id: profile.getId(),
    name: profile.getName(),
    email: profile.getEmail(),
    imageUrl: profile.getImageUrl(),
  };
};
