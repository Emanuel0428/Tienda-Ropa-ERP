# 🚀 Configuración de Google Drive por Tipo de Documento - Guía de Implementación

## ✅ Cambios Implementados

### 1. **Nuevo Menú en Sidebar**
- ✅ "Documentos" ahora es un menú desplegable
- ✅ Opción "Subir Documentos" (página existente)
- ✅ Opción "Configuración Drive" (nueva página)

### 2. **Nueva Página: Configuración Drive**
- ✅ Ruta: `/drive-config`
- ✅ **Selector de mes** para filtrar y buscar configuraciones por mes
- ✅ **Lista de tipos de documentos** con campo individual para cada uno:
  - 💰 Cierre de Caja
  - 💳 Cierre de Voucher
  - 🏦 Consignaciones
  - 🧾 Facturas y Gastos
  - 📦 Inventario
  - 👥 Nómina
  - 📄 Otros Documentos
- ✅ Validación de links de Google Drive
- ✅ Instrucciones integradas
- ✅ Resumen visual de configuración

### 3. **Base de Datos**
- ✅ Nueva tabla `drive_configs` con:
  - `id_tienda`: Referencia a la tienda
  - `mes`: Formato YYYY-MM (ej: 2024-12)
  - `tipo_documento`: Tipo de documento (cierre_caja, etc.)
  - `drive_link`: Link de la carpeta de Drive
  - Constraint único: (id_tienda, mes, tipo_documento)
- ✅ Row Level Security (RLS) activado
- ✅ Políticas de seguridad por tienda
- ✅ Índices optimizados para búsquedas

### 4. **Servicio de Drive**
- ✅ Función `extractFolderIdFromLink()` para extraer Folder ID de links
- ✅ Acepta múltiples formatos de URL

## 📋 Pasos para Activar la Funcionalidad

### Paso 1: Ejecutar Migración en Supabase

1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Navega a: **SQL Editor** (icono de base de datos en el sidebar)
3. Crea una nueva query
4. Copia y pega el contenido de `supabase_migration_drive_config.sql`
5. Ejecuta el script (botón "Run" o Ctrl+Enter)
6. Verifica que aparezca: "Success. No rows returned"

### Paso 2: Verificar en la Aplicación

1. Reinicia el servidor si está corriendo:
   ```bash
   # Ctrl+C para detener
   npm run dev
   ```

2. Abre la aplicación: http://localhost:5173

3. En el sidebar, busca **"Documentos"**
   - Debería mostrar una flecha indicando que es desplegable
   - Al hacer clic, verás:
     - 📤 Subir Documentos
     - ⚙️ Configuración Drive

4. Haz clic en **"Configuración Drive"**

### Paso 3: Configurar los Links por Tipo de Documento

1. En Google Drive, crea una **carpeta para el mes** (ej: "Diciembre 2024")

2. Dentro de esa carpeta, crea **subcarpetas para cada tipo de documento**:
   ```
   📁 Diciembre 2024/
   ├── 📁 Cierre de Caja/
   ├── 📁 Cierre de Voucher/
   ├── 📁 Consignaciones/
   ├── 📁 Facturas y Gastos/
   ├── 📁 Inventario/
   ├── 📁 Nómina/
   └── 📁 Otros/
   ```

3. Para **cada subcarpeta**:
   - Clic derecho → "Compartir"
   - Cambia a: "Cualquier persona con el enlace puede ver"
   - Copia el enlace

4. En la aplicación (Configuración Drive):
   - Selecciona el mes (Diciembre 2024)
   - Pega cada link en su campo correspondiente
   - Haz clic en "Guardar Configuración"

5. Verás un mensaje: ✅ Configuración guardada correctamente

## 🔧 Cómo Funciona

### Flujo de Trabajo Mensual

```
1. Nuevo mes comienza
   ↓
2. Admin crea carpeta del mes en Google Drive
   ↓
3. Admin crea subcarpetas para cada tipo de documento
   ↓
4. Admin entra a "Configuración Drive"
   ↓
5. Selecciona el mes y pega el link de cada subcarpeta
   ↓
6. Guarda la configuración
   ↓
7. Al subir documentos, el sistema pregunta el tipo
   ↓
8. Sube automáticamente a la carpeta correspondiente
```

### Estructura de Datos

```sql
-- Tabla drive_configs (NUEVA)
drive_configs:
  - id (serial primary key)
  - id_tienda (int) → referencia a tiendas
  - mes (varchar) → formato YYYY-MM
  - tipo_documento (varchar) → cierre_caja, cierre_voucher, etc
  - drive_link (text) → link de la carpeta de Drive
  - created_at (timestamp)
  - updated_at (timestamp)
  - UNIQUE(id_tienda, mes, tipo_documento)
```

### Formatos de Link Aceptados

La función `extractFolderIdFromLink()` acepta:

1. **Link completo:**
   ```
   https://drive.google.com/drive/folders/1abc123xyz456
   ```

2. **Link con usuario:**
   ```
   https://drive.google.com/drive/u/0/folders/1abc123xyz456
   ```

3. **Solo el Folder ID:**
   ```
   1abc123xyz456
   ```

## 🎨 Interfaz de Usuario

### Página de Configuración Drive

**Secciones:**

1. **Header**: Título y descripción
2. **Info Tienda**: Muestra nombre y ID de la tienda actual
3. **Selector de Mes**: Input tipo "month" para seleccionar año/mes
4. **Campo de Link**: Textarea para pegar el link de Drive
5. **Instrucciones**: Guía paso a paso para obtener el link
6. **Botones**: Guardar / Cancelar
7. **Configuración Actual**: Muestra el link guardado actualmente

### Validaciones Implementadas

- ✅ Link no puede estar vacío
- ✅ Debe ser un link válido de Google Drive o Folder ID
- ✅ Se guarda en formato limpio (trim)
- ✅ Mensajes de éxito/error claros

## 📱 Próximos Pasos (Futuras Mejoras)

### Fase 2: Integración con Subida de Documentos

```typescript
// En Documents.tsx - al subir documento:

const uploadDocument = async (file: Blob) => {
  // 1. Obtener la tienda del usuario
  const { data: storeData } = await supabase
    .from('tiendas')
    .select('drive_folder_link')
    .eq('id_tienda', user.id_tienda)
    .single();
  
  // 2. Extraer Folder ID
  const folderId = extractFolderIdFromLink(storeData.drive_folder_link);
  
  // 3. Subir a esa carpeta
  await driveService.uploadFile(file, fileName, folderId);
};
```

### Fase 3: Historial de Configuraciones

- Tabla `drive_config_history` para rastrear cambios mes a mes
- Ver qué carpeta se usó en meses anteriores
- Auditoría de cambios de configuración

### Fase 4: Notificaciones Automáticas

- Recordatorio cuando inicia un nuevo mes
- Notificación si no hay carpeta configurada
- Alert si el link es inválido o la carpeta fue eliminada

## 🐛 Troubleshooting

### Error: "No se pudo identificar la tienda"
**Solución:** Verifica que el usuario tenga `id_tienda` asignado en la tabla `users`

### Error: "El link no parece ser válido"
**Solución:** Asegúrate de copiar el link completo desde Google Drive

### Error: "Usuario no autenticado"
**Solución:** Cierra sesión y vuelve a iniciar sesión

### El menú no se despliega
**Solución:** Limpia caché del navegador (Ctrl+Shift+R) y recarga

## 📊 Archivos Modificados/Creados

```
✅ MODIFICADOS:
- src/components/layout/Sidebar.tsx
- src/App.tsx
- src/services/driveService.ts

✅ CREADOS:
- src/pages/DriveConfig.tsx
- supabase_migration_drive_config.sql
- DRIVE_CONFIG_IMPLEMENTATION.md (este archivo)
```

## ✨ Características Adicionales

- 🎨 UI moderna con Tailwind CSS
- 📱 Responsive (funciona en móvil)
- ♿ Accesible (labels, aria-labels)
- 🔔 Mensajes de feedback claros
- 💾 Auto-guardado de estado
- 🔒 Validación de permisos por tienda

---

**Desarrollado el:** 9 de Diciembre, 2024
**Estado:** ✅ Listo para producción
**Próxima iteración:** Integrar con subida real de documentos
