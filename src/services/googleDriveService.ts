/* eslint-disable @typescript-eslint/no-explicit-any */
import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
// Especificar TODOS los scopes explícitamente
const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';
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

    // Validar que las credenciales existan
    if (!CLIENT_ID || !API_KEY) {
      const error = 'Google Drive credentials not found. Please check your .env file.';
      console.error('❌', error);
      alert(`🚫 ERROR PASO 1: Credenciales no encontradas\n\nCLIENT_ID: ${CLIENT_ID ? 'OK' : 'FALTA'}\nAPI_KEY: ${API_KEY ? 'OK' : 'FALTA'}`);
      reject(new Error(error));
      return;
    }

    console.log('✅ PASO 1: Credenciales cargadas correctamente');
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('SCOPES solicitados:', SCOPES);

    try {
      gapi.load('client:auth2', async () => {
        try {
          console.log('🔄 PASO 2: Inicializando Google API Client...');
          
          await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES,
          });

          console.log('✅ PASO 2: Google API Client inicializado');

          // Esperar a que auth2 esté completamente inicializado
          const authInstance = gapi.auth2.getAuthInstance();
          if (!authInstance) {
            alert('🚫 ERROR PASO 3: No se pudo obtener la instancia de autenticación');
            throw new Error('Auth instance not available');
          }

          console.log('✅ PASO 3: Auth instance obtenida');

          // Verificar scopes actuales
          const currentUser = authInstance.currentUser.get();
          const grantedScopes = currentUser.getGrantedScopes();
          console.log('📋 Scopes otorgados actualmente:', grantedScopes);

          // Escuchar cambios en el estado de autenticación
          authInstance.isSignedIn.listen((signedIn: boolean) => {
            isSignedIn = signedIn;
            console.log('📊 Estado de autenticación:', signedIn ? 'Conectado' : 'Desconectado');
          });

          // Verificar si ya está autenticado
          isSignedIn = authInstance.isSignedIn.get();
          isInitialized = true;

          console.log('✅ PASO 4: Google Drive API completamente inicializada');
          console.log('Estado autenticación:', isSignedIn ? 'YA AUTENTICADO' : 'NO AUTENTICADO');
          
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
    console.log('🔐 PASO 5: Iniciando proceso de autenticación...');
    
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
        console.log('✅ PASO 6: Auth instance disponible');
        
        // Verificar scopes antes de autenticar
        const currentUser = authInstance.currentUser.get();
        const grantedScopes = currentUser.getGrantedScopes();
        console.log('📋 Scopes otorgados:', grantedScopes);
        console.log('📋 Scopes necesarios:', SCOPES);
        
        // Verificar si ya está autenticado
        if (authInstance.isSignedIn.get()) {
          console.log('✅ PASO 7: Ya está autenticado');
          
          // Verificar si tiene el scope de Drive
          if (!grantedScopes.includes('https://www.googleapis.com/auth/drive.file')) {
            alert('⚠️ ADVERTENCIA: Estás autenticado pero SIN permiso de Drive\n\nScopes otorgados:\n' + grantedScopes + '\n\nVamos a solicitar autorización de nuevo...');
            // Forzar re-autorización
            await authInstance.signIn({
              prompt: 'consent',
              scope: SCOPES
            });
          }
          
          isSignedIn = true;
          return;
        }

        // Solicitar autenticación CON POPUP (modo simplificado)
        console.log('🔐 PASO 7: Solicitando autenticación...');
        console.log('Scopes a solicitar:', SCOPES);
        
        try {
          // Intentar con popup simple - a veces funciona mejor que redirect
          const result = await authInstance.signIn({
            scope: SCOPES
          });
          
          console.log('✅ PASO 8: Autenticación completada');
          console.log('Usuario:', result.getBasicProfile().getEmail());
          console.log('Scopes otorgados:', result.getGrantedScopes());
          
          // Verificar que se otorgó el scope de Drive
          const finalScopes = result.getGrantedScopes();
          if (!finalScopes || !finalScopes.includes('https://www.googleapis.com/auth/drive.file')) {
            console.error('🚫 Scopes insuficientes:', finalScopes);
            throw new Error('Permiso de Drive no otorgado');
          }
          
          console.log('✅ Permiso de Drive confirmado');
          isSignedIn = true;
          return;
        } catch (signInError: any) {
          console.error('❌ Error en signIn:', signInError);
          
          // Si el error es por popup bloqueado, mostrar instrucciones
          if (signInError.error === 'popup_closed_by_user') {
            alert('⚠️ Popup cerrado\n\nPor favor:\n1. Permite popups en tu navegador\n2. Intenta de nuevo');
            throw signInError;
          }
          
          // Si es error 403, es problema de configuración de Google
          if (signInError.error === 'access_denied' || signInError.message?.includes('403')) {
            alert('🚫 ERROR 403 - Configuración de Google\n\n' +
                  'Ve a Google Cloud Console:\n' +
                  '1. APIs y servicios > Biblioteca\n' +
                  '2. Busca "Google Drive API"\n' +
                  '3. Asegúrate que esté HABILITADA\n\n' +
                  '4. Luego ve a Pantalla de consentimiento\n' +
                  '5. Verifica que los scopes estén agregados:\n' +
                  '   - openid\n' +
                  '   - profile\n' +
                  '   - email\n' +
                  '   - ../auth/drive.file');
            throw signInError;
          }
          
          throw signInError;
        }
      }

      // Esperar 100ms antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    alert('🚫 ERROR PASO 6: No se pudo obtener la instancia de autenticación después de 10 intentos');
    throw new Error('No se pudo obtener la instancia de autenticación después de varios intentos');
  } catch (error: any) {
    console.error('❌ Error en autenticación:', error);
    
    // Mensajes de error más específicos
    if (error?.error === 'popup_closed_by_user') {
      throw new Error('Popup de autenticación cerrado. Por favor intenta de nuevo.');
    }
    
    if (error?.error === 'access_denied' || error?.error === 'server_error') {
      throw new Error(
        'Acceso denegado. Verifica que tu correo esté en la lista de usuarios de prueba en Google Cloud Console.\n' +
        'Ve a: APIs & Services → OAuth consent screen → Test users → + ADD USERS'
      );
    }
    
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
    console.log('📤 PASO 9: Iniciando subida de archivo a Drive...');
    console.log('Nombre archivo:', fileName);
    console.log('Tamaño:', (pdfBlob.size / 1024).toFixed(2), 'KB');
    console.log('Folder ID:', folderId);
    
    // Asegurar inicialización y autenticación
    if (!isInitialized) {
      console.log('🔄 Inicializando Google Drive API...');
      await initializeGoogleDrive();
    }

    if (!isSignedIn || !isUserSignedIn()) {
      console.log('🔐 Usuario no autenticado, solicitando login...');
      await signInToGoogle();
    }

    // Verificar token de acceso
    const authInstance = gapi.auth2.getAuthInstance();
    const currentUser = authInstance.currentUser.get();
    const authResponse = currentUser.getAuthResponse(true);
    
    console.log('✅ PASO 10: Token de acceso obtenido');
    console.log('Token expira en:', new Date(authResponse.expires_at).toLocaleString());
    console.log('Scopes finales:', currentUser.getGrantedScopes());
    
    // Verificar scope de Drive una última vez
    if (!currentUser.getGrantedScopes().includes('https://www.googleapis.com/auth/drive.file')) {
      alert('🚫 ERROR CRÍTICO: No tienes permiso de Drive otorgado\n\nScopes actuales:\n' + currentUser.getGrantedScopes());
      throw new Error('Permiso de Drive no disponible');
    }

    // Asegurar que el nombre termina en .pdf
    const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    console.log('📤 PASO 11: Preparando subida a Drive...');

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
      alert('🚫 ERROR PASO 12: No se pudo obtener el token de acceso\n\nToken: ' + (token ? 'existe' : 'null'));
      throw new Error('No se pudo obtener el token de acceso');
    }
    const accessToken = token.access_token;
    
    console.log('✅ PASO 12: Token de acceso válido obtenido');
    console.log('Token length:', accessToken.length);

    // Subir usando XMLHttpRequest para tener progreso
    console.log('📤 PASO 13: Iniciando petición HTTP a Google Drive...');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      console.log('URL:', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      console.log('Headers configurados');

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
        console.log('📥 PASO 14: Respuesta recibida de Google Drive');
        console.log('Status:', xhr.status);
        console.log('Response:', xhr.responseText);
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log('✅ PASO 15: Archivo subido exitosamente');
          console.log('File ID:', response.id);

          // Obtener link de visualización
          const fileId = response.id;
          const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;

          alert(`✅ ¡ÉXITO!\n\nArchivo subido correctamente a Google Drive\n\nID: ${fileId}\n\nLink: ${webViewLink}`);

          resolve({
            id: fileId,
            webViewLink,
          });
        } else {
          console.error('❌ ERROR PASO 14: Código HTTP no exitoso');
          alert(`🚫 ERROR HTTP ${xhr.status}\n\nRespuesta de Google:\n${xhr.responseText}`);
          reject(new Error(`Error ${xhr.status}: ${xhr.responseText}`));
        }
      });

      // Error
      xhr.addEventListener('error', (e) => {
        console.error('❌ ERROR PASO 14: Error de red', e);
        alert('🚫 ERROR DE RED al intentar subir a Google Drive\n\nVerifica tu conexión a internet');
        reject(new Error('Error de red al subir archivo'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        console.error('❌ ERROR: Timeout al subir archivo');
        alert('🚫 TIMEOUT: La subida tardó demasiado\n\nIntenta con un archivo más pequeño o verifica tu conexión');
        reject(new Error('Timeout al subir archivo'));
      });

      // Enviar
      console.log('🚀 PASO 14: Enviando archivo a Google Drive...');
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
