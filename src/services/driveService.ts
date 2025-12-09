const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = window.location.origin;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class DriveService {
  private accessToken: string | null = null;

  /**
   * Inicia el flujo de autenticación OAuth 2.0
   */
  async signIn(): Promise<void> {
    sessionStorage.setItem('pre_auth_path', window.location.pathname);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('state', 'drive_auth');
    
    window.location.href = authUrl.toString();
  }

  /**
   * Procesa el token de la URL después de la redirección
   */
  async handleAuthCallback(): Promise<boolean> {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const state = params.get('state');

      if (accessToken && state === 'drive_auth') {
        this.accessToken = accessToken;
        sessionStorage.setItem('google_drive_token', accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    if (this.accessToken) return true;
    
    // Verificar en sessionStorage
    const storedToken = sessionStorage.getItem('google_drive_token');
    if (storedToken) {
      this.accessToken = storedToken;
      return true;
    }
    
    return false;
  }

  /**
   * Cierra sesión
   */
  signOut(): void {
    this.accessToken = null;
    sessionStorage.removeItem('google_drive_token');
  }

  /**
   * Realiza una solicitud a la API de Google Drive
   */
  private async driveRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No autenticado. Por favor inicia sesión.');
    }

    const url = `https://www.googleapis.com/drive/v3${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      this.signOut();
      throw new Error('Token expirado. Por favor inicia sesión nuevamente.');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error en Drive API: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Busca o crea una carpeta
   */
  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const searchResponse = await this.driveRequest(`/files?q=${encodeURIComponent(query)}&fields=files(id,name)`);

    if (searchResponse.files && searchResponse.files.length > 0) {
      return searchResponse.files[0].id;
    }

    const createResponse = await this.driveRequest('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : [],
      }),
    });

    return createResponse.id;
  }

  /**
   * Obtiene el ID de la carpeta de categoría
   */
  private async getCategoryFolderId(categoryPath: string): Promise<string> {
    // Crear estructura: ERP_GMCO/Documentos/{Categoria}
    const rootFolderId = await this.findOrCreateFolder('ERP_GMCO');
    const documentsFolderId = await this.findOrCreateFolder('Documentos', rootFolderId);
    
    const categoryName = categoryPath.split('/').pop() || '';
    const categoryFolderId = await this.findOrCreateFolder(categoryName, documentsFolderId);
    
    return categoryFolderId;
  }

  /**
   * Sube un archivo a Google Drive
   */
  async uploadFile(
    file: File,
    categoryPath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveFile> {
    if (!this.accessToken) {
      throw new Error('No autenticado');
    }
    
    const folderId = await this.getCategoryFolderId(categoryPath);

    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Error al subir archivo: ${response.status}`);
    }

    const result = await response.json();
    
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return result;
  }

  /**
   * Lista archivos de una categoría
   */
  async listFiles(categoryPath: string): Promise<DriveFile[]> {
    const folderId = await this.getCategoryFolderId(categoryPath);

    const response = await this.driveRequest(
      `/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=modifiedTime desc`
    );

    return response.files || [];
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.driveRequest(`/files/${fileId}`, { method: 'DELETE' });
  }

  /**
   * Descarga un archivo
   */
  async downloadFile(fileId: string, fileName: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No autenticado');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Error al descargar archivo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const driveService = new DriveService();
export type { DriveFile, UploadProgress };

