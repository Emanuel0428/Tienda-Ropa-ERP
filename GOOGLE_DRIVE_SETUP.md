# Configuración de Google Drive API

## 📝 Pasos para configurar la integración con Google Drive

### 1. Crear proyecto en Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto o seleccionar uno existente
3. Nombre sugerido: "ERP-GMCO-Drive"

### 2. Habilitar Google Drive API

1. En el menú lateral, ir a **APIs y servicios** > **Biblioteca**
2. Buscar "Google Drive API"
3. Hacer clic en "Google Drive API" y luego **"Habilitar"**

### 3. Crear credenciales

#### 3.1 Crear clave API
1. Ir a **APIs y servicios** > **Credenciales**
2. Clic en **"+ CREAR CREDENCIALES"** > **"Clave de API"**
3. Copiar la clave generada para `VITE_GOOGLE_API_KEY`

#### 3.2 Crear ID de cliente OAuth 2.0
1. En la misma página de credenciales, clic en **"+ CREAR CREDENCIALES"** > **"ID de cliente de OAuth"**
2. Si es la primera vez, configurar la pantalla de consentimiento OAuth:
   - Tipo de usuario: **Externo**
   - Nombre de la aplicación: "ERP GMCO"
   - Correo electrónico de asistencia: tu email
   - Dominios autorizados: tu dominio (ej: `tudominio.com`)
3. Crear ID de cliente:
   - Tipo de aplicación: **Aplicación web**
   - Nombre: "ERP GMCO Web Client"
   - Orígenes autorizados de JavaScript:
     - `http://localhost:5173` (desarrollo)
     - `http://localhost:5174` (desarrollo alternativo)
     - `https://tu-dominio.vercel.app` (producción)
4. Copiar el ID del cliente para `VITE_GOOGLE_CLIENT_ID`

### 4. Configurar variables de entorno

Añadir al archivo `.env`:

```env
# Google Drive API
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyA_1B2C3d4E5F6g7H8i9J0k1L2m3N4o5P6
```

### 5. Estructura de carpetas en Drive

La aplicación creará automáticamente esta estructura:

```
📁 ERP_GMCO/
├── 📁 Documentos/
│   ├── 📁 General/
│   ├── 📁 Ventas/
│   ├── 📁 Inventario/
│   ├── 📁 Capacitación/
│   ├── 📁 Legal/
│   ├── 📁 Recursos Humanos/
│   ├── 📁 Marketing/
│   ├── 📁 Finanzas/
│   └── 📁 Auditoría/
```

### 6. Funcionalidades implementadas

- ✅ **Autenticación OAuth 2.0**: Login seguro con Google
- ✅ **Subida de archivos**: Solo PDFs por seguridad
- ✅ **Organización automática**: Carpetas por categoría
- ✅ **Visualización**: Ver y descargar archivos
- ✅ **Eliminación**: Borrar documentos con confirmación
- ✅ **Progreso de subida**: Barra de progreso en tiempo real
- ✅ **Filtrado y búsqueda**: Encontrar documentos rápidamente

### 7. Consideraciones de seguridad

- Solo archivos PDF permitidos
- Autenticación OAuth obligatoria
- Permisos mínimos necesarios (`https://www.googleapis.com/auth/drive.file`)
- Validación en frontend y backend

### 8. Límites de Google Drive API

- **Consultas por día**: 1,000,000,000
- **Consultas por usuario por 100 segundos**: 1,000
- **Consultas por 100 segundos**: 1,000
- **Tamaño máximo de archivo**: 5TB

### 9. Troubleshooting

#### Error: "API key not valid"
- Verificar que la API key esté correcta en `.env`
- Confirmar que Google Drive API esté habilitada

#### Error: "Invalid OAuth client"
- Verificar que el CLIENT_ID esté correcto
- Confirmar que el dominio esté autorizado en OAuth

#### Error: "Access blocked"
- Verificar la configuración de la pantalla de consentimiento
- Asegurar que el usuario tenga permisos

### 10. Comandos útiles

```bash
# Instalar dependencias (ya incluidas)
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

---

## 🔄 Flujo de uso

1. **Usuario accede a Documentos** → Se inicializa Google Drive API
2. **Clic en "Conectar Google Drive"** → Proceso de autenticación OAuth
3. **Selecciona categoría** → Se listan archivos de esa carpeta
4. **Sube nuevo archivo** → Se crea en la carpeta correspondiente
5. **Gestiona archivos** → Ver, descargar o eliminar documentos

¡La integración está lista para usar! 🚀