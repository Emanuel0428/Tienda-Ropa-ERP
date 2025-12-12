# 🎯 Guía de Implementación: Sistema de Asistencia con Verificación GPS

## ✅ Estado Actual
El sistema de verificación GPS ya está **completamente implementado** en el código. Solo necesitas ejecutar la migración SQL y configurar las coordenadas.

---

## 📋 Paso 1: Ejecutar Migración SQL en Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** (icono de código en el menú lateral)
3. Copia y pega el contenido completo del archivo `attendance_migration.sql`
4. Haz clic en **RUN** o presiona `Ctrl + Enter`

### ✅ Verificación:
Deberías ver estos mensajes:
```
✅ Tabla attendance_records creada
✅ Tabla store_schedules creada con campos GPS
✅ Índices creados
✅ Políticas RLS aplicadas
```

---

## 📍 Paso 2: Obtener Coordenadas GPS de tus Tiendas

### Usando Google Maps:

1. Abre [Google Maps](https://maps.google.com)
2. Busca tu tienda o dirección exacta
3. **Clic derecho** en la ubicación exacta del punto de venta
4. Selecciona las coordenadas que aparecen en la parte superior (ej: `4.123456, -74.123456`)
5. Copia las coordenadas

**Formato de coordenadas:**
- **Latitud** (primer número): Puede ser positivo o negativo
- **Longitud** (segundo número): Puede ser positivo o negativo
- Ejemplo: `4.678901, -74.123456`

### Ejemplo real (Bogotá):
- Centro Comercial Andino: `4.6707, -74.0561`
- Plaza de Bolívar: `4.5981, -74.0758`
- Unicentro: `4.7110, -74.0721`

---

## ⚙️ Paso 3: Configurar Asistencia (Solo Admin)

### Acceso:
1. Inicia sesión como **admin**
2. Ve al menú lateral → **Asistencia** → **Configuración**
3. Verás todas tus tiendas listadas

### Por cada tienda configura:

#### 🕐 Hora Límite de Entrada
- Ejemplo: `09:00` para 9:00 AM
- Los empleados que lleguen después verán alerta de tardanza

#### 📍 Coordenadas GPS (RECOMENDADO)
- **Latitud:** `4.678901` (ejemplo)
- **Longitud:** `-74.123456` (ejemplo)
- **Radio (metros):** `100` (distancia máxima permitida)
  - 50m = Edificio pequeño
  - 100m = Edificio grande o centro comercial
  - 200m = Zona amplia

#### 📶 WiFi (Opcional - Solo informativo)
- Nombre del WiFi de la tienda (ej: `GMCO_Centro`)
- **NOTA:** El navegador NO puede verificar el WiFi real
- Solo se muestra al empleado como referencia

#### 🔔 Notificaciones
- ✅ Activar para mostrar alerta de tardanza en el header
- ❌ Desactivar si no quieres notificaciones

### Ejemplo de configuración completa:
```
Tienda: GMCO Centro
├─ Hora límite: 09:00
├─ Latitud: 4.678901
├─ Longitud: -74.123456
├─ Radio: 100 metros
├─ WiFi: GMCO_Centro (informativo)
└─ Notificaciones: ✅ Activadas
```

4. Haz clic en **Guardar Configuración** para cada tienda

---

## 📱 Paso 4: Prueba del Sistema

### Como Empleado:

1. Inicia sesión con cualquier usuario (empleado, coordinador, admin)
2. Ve a **Asistencia** → **Mi Asistencia**
3. Verás tres tarjetas de estado:

#### 🌐 Estado de Internet
- ✅ Verde: Conectado a internet → Puede dar entrada
- ❌ Rojo: Sin conexión → No puede dar entrada

#### 📍 Estado de Ubicación GPS (si está configurada)
- 📍 Gris: "Se verificará tu ubicación al dar entrada"
- ⏳ Amarillo: "Verificando ubicación..." (solicitando permisos)
- ✅ Verde: "Ubicación verificada (50m)" → Puede dar entrada
- ❌ Rojo: "Estás a 250m de la tienda (máximo: 100m)" → No puede dar entrada

#### ⏰ Alerta de Tardanza (si aplica)
- ⚠️ Rojo: "Llegada tarde. Hora límite: 09:00"

### Probar Check-In:

1. **Permitir ubicación:** El navegador pedirá permisos la primera vez
2. Si estás dentro del radio configurado: ✅ Entrada registrada
3. Si estás fuera del radio: ❌ Error "Ubicación incorrecta"

### Como Coordinador/Admin:

1. Ve a **Asistencia** → **Monitor Tiendas**
2. Verás todas las tiendas con empleados activos
3. Por cada empleado verás:
   - Nombre y rol
   - Hora de entrada
   - Duración actual
   - Estado WiFi (si estaba conectado)

---

## 🔐 Permisos del Sistema

### Todos los empleados:
- ✅ Ver "Mi Asistencia" (dar entrada/salida)
- ❌ Ver otras tiendas
- ❌ Configuración

### Coordinadores:
- ✅ Ver "Mi Asistencia"
- ✅ Ver "Monitor Tiendas" (todas las tiendas)
- ❌ Configuración

### Administradores:
- ✅ Ver "Mi Asistencia"
- ✅ Ver "Monitor Tiendas"
- ✅ Acceder a "Configuración" (definir horarios, GPS, etc.)

---

## 🚨 Solución de Problemas

### "No se pudo determinar tu ubicación"
**Causas:**
- GPS desactivado en el dispositivo
- Permisos de ubicación bloqueados
- Navegador no soporta geolocalización

**Solución:**
1. Activar GPS/ubicación en el dispositivo
2. Permitir ubicación en el navegador (icono de candado en barra de direcciones)
3. Recargar la página

### "Estás a Xm de la tienda (máximo: Ym)"
**Causa:** El empleado está fuera del radio permitido

**Soluciones:**
- Empleado: Acércate más al punto de venta
- Admin: Aumenta el radio en Configuración (ej: 100m → 200m)

### "Debes permitir el acceso a tu ubicación"
**Causa:** Permisos bloqueados

**Solución:**
1. Chrome/Edge: Clic en el candado → Configuración del sitio → Ubicación → Permitir
2. Firefox: Clic en el candado → Permisos → Ubicación → Permitir
3. Safari: Configuración → Sitios web → Ubicación → Permitir

### "No hay ubicación configurada para esta tienda"
**Causa:** Admin no configuró coordenadas GPS

**Solución:** El sistema permitirá entrada (no bloqueará). Configura GPS en Configuración de Asistencia.

---

## 📊 Ventajas del Sistema GPS vs WiFi

| Aspecto | GPS | WiFi |
|---------|-----|------|
| **Verificación real** | ✅ Sí | ❌ No (navegador no puede leer SSID) |
| **Precisión** | ✅ Alta (±10-50m) | ⚠️ N/A |
| **Falsificación** | 🔒 Muy difícil | ⚠️ Fácil (puede conectarse desde casa) |
| **Requiere permisos** | ✅ Sí | ❌ No |
| **Funciona en móvil** | ✅ Sí | ✅ Sí |
| **Funciona en PC** | ⚠️ Solo con GPS/Ubicación | ✅ Sí |

**Recomendación:** Usar GPS como método principal de verificación.

---

## 🎯 Mejores Prácticas

### Radio de Tolerancia:
- **Tiendas pequeñas:** 50 metros
- **Centros comerciales:** 100-150 metros
- **Complejos grandes:** 200 metros

### Horarios:
- Configurar hora límite realista (ej: 09:00, no 08:59)
- Considerar tiempo de desplazamiento dentro del edificio

### Notificaciones:
- Activar para roles que requieren puntualidad estricta
- Desactivar para turnos flexibles

---

## 📝 Resumen de Archivos Modificados

✅ **attendance_migration.sql** - Migración con campos GPS  
✅ **Attendance.tsx** - Verificación GPS al dar entrada  
✅ **AttendanceMonitor.tsx** - Monitor para coordinadores/admin  
✅ **AttendanceSettings.tsx** - Configuración GPS por tienda  
✅ **Header.tsx** - Notificación de tardanza  
✅ **App.tsx** - Rutas y permisos  

---

## 🚀 Siguiente Paso

**¡Ejecuta la migración SQL ahora mismo!**

1. Abre Supabase SQL Editor
2. Copia el contenido de `attendance_migration.sql`
3. Ejecuta el script
4. Configura las coordenadas GPS de tus tiendas
5. ¡Prueba el sistema!

---

## 💡 Notas Adicionales

- El sistema verifica GPS **solo al dar entrada**, no constantemente
- Los permisos de ubicación se solicitan una vez por navegador/dispositivo
- La duración se calcula automáticamente desde check-in hasta ahora
- Los registros se guardan incluso si hay error de GPS (para auditoría)
- Coordinadores pueden ver todas las tiendas, empleados solo la suya

---

**¿Necesitas ayuda?** Revisa los errores en la consola del navegador (F12 → Console) y comparte el mensaje de error.
