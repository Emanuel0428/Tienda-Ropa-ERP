# 🔍 Checklist de verificación - Google OAuth 403 Error

## El problema
Recibes error **403 Forbidden** aunque tu correo está en Test users.

## ✅ Verificación paso a paso

### 1. Estado de publicación
- [ ] Ve a: https://console.cloud.google.com/apis/credentials/consent
- [ ] Verifica que el **"Publishing status"** sea **"Testing"** (NO "In production")
- [ ] Si está en producción, haz clic en **"BACK TO TESTING"**

### 2. Scopes configurados
- [ ] En la misma página, ve a la sección **"Scopes"**
- [ ] Haz clic en **"EDIT APP"** o **"EDITAR APLICACIÓN"**
- [ ] Ve a la sección de **Scopes** (paso 2)
- [ ] Asegúrate de tener estos scopes:
  - `openid`
  - `profile`
  - `email`
  - `https://www.googleapis.com/auth/drive.file` ← **CRÍTICO**

### 3. Verificar credenciales correctas
- [ ] Ve a: https://console.cloud.google.com/apis/credentials
- [ ] Busca tu OAuth 2.0 Client ID
- [ ] Verifica que el Client ID en `.env` coincida EXACTAMENTE con el de la consola
  ```
  Tu .env: 105750118866-btsfefft4em61oav4ag7b69loj2ekbg9.apps.googleusercontent.com
  ```
- [ ] Verifica los **"Authorized JavaScript origins"**:
  - ✅ `http://localhost:5173`
  - ✅ `http://localhost:5174`
  - ✅ `https://tienda-ropa-erp.vercel.app`

### 4. Drive API habilitada
- [ ] Ve a: https://console.cloud.google.com/apis/library/drive.googleapis.com
- [ ] Debe decir **"ADMINISTRAR"** (no "HABILITAR")
- [ ] Si dice "HABILITAR", haz clic para habilitar la API

### 5. Test users correctos
- [ ] Ve a: https://console.cloud.google.com/apis/credentials/consent
- [ ] Scroll hasta **"Test users"**
- [ ] Verifica que `federicoml2004@gmail.com` esté en la lista
- [ ] **IMPORTANTE**: El correo debe estar escrito EXACTAMENTE igual (sin espacios, sin mayúsculas extra)

### 6. Verificar proyecto correcto
- [ ] En la parte superior de Google Cloud Console, verifica que estés en el proyecto correcto
- [ ] El nombre del proyecto debe ser el que creaste para esta app
- [ ] Si tienes varios proyectos, asegúrate de estar en el correcto

## 🚨 Si todo lo anterior está correcto:

### Opción A: Crear nuevas credenciales
A veces las credenciales se corrompen. Prueba crear un nuevo OAuth Client ID:

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Clic en **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Tipo: **"Web application"**
4. Nombre: "ERP GMCO Web Client New"
5. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `https://tienda-ropa-erp.vercel.app`
6. Copia el **nuevo Client ID** y **nuevo API Key**
7. Actualiza el archivo `.env` con las nuevas credenciales
8. Reinicia el servidor: `npm run dev`

### Opción B: Verificar dominio en Gmail
Si usas Gmail para federicoml2004@gmail.com:

1. Ve a: https://myaccount.google.com/permissions
2. Revisa si "ERP GMCO" o "My First Project" aparece
3. Si aparece, **revoca el acceso**
4. Vuelve a intentar autenticarte en la app

### Opción C: Cambiar a modo "Público" temporalmente
**SOLO PARA PRUEBAS** (no recomendado en producción):

1. Ve a OAuth consent screen
2. Haz clic en **"PUBLISH APP"**
3. Confirma que quieres publicar
4. Esto permitirá que cualquier cuenta de Google acceda (sin estar en Test users)
5. **IMPORTANTE**: Después de probar, vuelve a modo Testing

## 📞 Si nada funciona:

El problema puede ser específico de tu cuenta de Google Cloud. Considera:

1. **Crear un proyecto completamente nuevo** en Google Cloud Console
2. Configurar todo desde cero con las instrucciones del archivo `GOOGLE_DRIVE_SETUP.md`
3. Usar las nuevas credenciales

## 🆘 Información para debugging

Si necesitas ayuda adicional, recopila esta información:

- [ ] Client ID actual: `___________________________`
- [ ] Estado de publicación: `___________________________`
- [ ] Scopes configurados: `___________________________`
- [ ] Test users: `___________________________`
- [ ] Drive API habilitada: Sí / No
- [ ] Proyecto en uso: `___________________________`

---

**Última actualización**: Diciembre 2, 2025
