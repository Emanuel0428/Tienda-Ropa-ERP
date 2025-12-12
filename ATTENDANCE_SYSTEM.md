# Sistema de Control de Asistencia

## 📋 Descripción General

Sistema completo de control de asistencia con:
- ✅ Registro de entrada/salida para empleados
- ✅ Validación de WiFi de la tienda
- ✅ Notificaciones de tardanza
- ✅ Monitor en tiempo real para admin/coordinador
- ✅ Alertas visuales en el header

## 🗄️ Base de Datos

### 1. Ejecutar la migración en Supabase

Ejecuta el archivo `attendance_migration.sql` en el SQL Editor de Supabase:

```sql
-- Crear tablas: attendance_records y store_schedules
-- Configurar políticas RLS
-- Insertar configuraciones iniciales
```

### 2. Configurar horarios de tiendas

En la tabla `store_schedules`, configura:
- `check_in_deadline`: Hora límite para entrada (ej: '09:00:00')
- `expected_wifi_name`: Nombre del WiFi de la tienda
- `notification_enabled`: true/false para notificaciones

Ejemplo:
```sql
INSERT INTO public.store_schedules (id_tienda, check_in_deadline, expected_wifi_name, notification_enabled)
VALUES 
  (1, '09:00:00', 'WiFi_Tienda_Centro', true),
  (2, '08:30:00', 'WiFi_Tienda_Norte', true);
```

## 🎨 Características

### Para Empleados (Todas)

#### Header
- **Ícono de reloj** al lado de notificaciones
- **Badge rojo con "!"** si llegó tarde y no ha dado entrada
- Clic en el reloj → Página de Control de Asistencia

#### Página de Asistencia (`/attendance`)
- **Estado de WiFi**: Muestra si está conectado al WiFi de la tienda
- **Alerta de tardanza**: Si pasó la hora límite sin registrar entrada
- **Botón "Registrar Entrada"**: 
  - Verde cuando se puede dar entrada
  - Verifica WiFi (opcional, con advertencia)
  - Guarda fecha/hora y verificación de WiFi
- **Botón "Registrar Salida"**: 
  - Rojo cuando ya está dentro
  - Requiere confirmación
- **Historial del día**: Todos los registros de entrada/salida del día actual

### Para Admin y Coordinadora

#### Sidebar
- Nueva opción: **"Monitor Asistencia"**

#### Página Monitor (`/attendance-monitor`)
- **Vista en tiempo real** de todos los empleados activos
- **Por tienda**: Agrupa empleados por tienda
- **Información mostrada**:
  - Nombre del empleado
  - Rol (con badge de color)
  - Hora de entrada
  - Duración actual
  - Estado de verificación WiFi
- **Auto-actualización**: Cada 60 segundos
- **Botón manual**: "Actualizar" para refresh inmediato
- **Resumen**: Total de tiendas activas, empleados activos, etc.

## 🔧 Configuración WiFi

### Limitación actual
Por seguridad del navegador, **no se puede obtener el SSID del WiFi** directamente desde JavaScript.

### Soluciones implementables:

#### Opción 1: Backend IP-based (Recomendado)
```javascript
// En el backend, verificar IP del empleado
// Comparar con IPs conocidas de cada tienda
```

#### Opción 2: App nativa
- Desarrollar app móvil con React Native
- Acceso nativo a información de WiFi
- 100% confiable

#### Opción 3: Manual con advertencia (Actual)
- Usuario puede registrar entrada sin WiFi
- Sistema muestra advertencia
- Registro marca si fue verificado o no

## 📱 Flujo de Uso

### Empleado

1. **Llegar a la tienda** (antes de la hora límite)
2. **Abrir la app** → Ver badge rojo si llegó tarde
3. **Clic en reloj** en el header
4. **Ver estado de WiFi** (conectado/no conectado)
5. **Clic en "Registrar Entrada"**
6. **Confirmar** (o aceptar advertencia si sin WiFi)
7. ✅ **Entrada registrada** → Badge desaparece
8. **Durante el día**: Ver duración en la página
9. **Al salir**: Clic en "Registrar Salida"
10. ✅ **Salida registrada** → Listo para el día siguiente

### Admin/Coordinadora

1. **Ir a "Monitor Asistencia"** en el sidebar
2. **Ver todas las tiendas** con empleados activos
3. **Verificar**:
   - ¿Quién está en cada tienda?
   - ¿A qué hora llegó cada uno?
   - ¿Cuánto tiempo lleva trabajando?
   - ¿Se verificó su WiFi?
4. **Actualizar manualmente** o esperar auto-refresh

## 🔔 Sistema de Notificaciones

### En el Header (Badge rojo "!")
- **Aparece cuando**:
  - Pasó la hora límite configurada
  - No hay registro de entrada del día
  - Solo desaparece al registrar entrada

### Verificación automática
- Cada 60 segundos verifica estado
- Se actualiza en tiempo real
- No requiere recargar página

## 🛠️ Archivos Creados/Modificados

### Nuevos archivos:
1. `attendance_migration.sql` - Migración de base de datos
2. `src/pages/Attendance.tsx` - Página de control personal
3. `src/pages/AttendanceMonitor.tsx` - Monitor para admin/coordinadora
4. `ATTENDANCE_SYSTEM.md` - Este archivo

### Archivos modificados:
1. `src/components/layout/Header.tsx` - Ícono de reloj con notificación
2. `src/components/layout/Sidebar.tsx` - Opción "Monitor Asistencia"
3. `src/App.tsx` - Rutas nuevas

## 📊 Estructura de Datos

### Tabla `attendance_records`
```sql
- id: SERIAL PRIMARY KEY
- id_usuario: INTEGER (FK a usuarios)
- id_tienda: INTEGER
- check_in: TIMESTAMPTZ (hora entrada)
- check_out: TIMESTAMPTZ (hora salida, NULL si activo)
- wifi_verified: BOOLEAN (si se verificó WiFi)
- wifi_name: TEXT (nombre del WiFi detectado)
```

### Tabla `store_schedules`
```sql
- id: SERIAL PRIMARY KEY
- id_tienda: INTEGER UNIQUE
- check_in_deadline: TIME (hora límite entrada)
- expected_wifi_name: TEXT (WiFi esperado)
- notification_enabled: BOOLEAN (activar notificaciones)
```

## 🚀 Próximos Pasos

### Para producción:
1. **Implementar verificación real de WiFi**:
   - Backend que valide IP del empleado
   - Tabla de rangos IP por tienda
   - Endpoint: `POST /api/verify-wifi`

2. **Notificaciones push**:
   - Firebase Cloud Messaging
   - Notificar al empleado si no dio entrada

3. **Reportes avanzados**:
   - Página de estadísticas de asistencia
   - Exportar a Excel
   - Gráficas de puntualidad

4. **Geolocalización** (opcional):
   - Verificar que esté físicamente en la tienda
   - Complementa verificación de WiFi

## ✅ Testing

### Probar como Empleado:
1. Login con usuario normal
2. Ver reloj en header (debe estar visible)
3. No dar entrada → Badge debe aparecer después de hora límite
4. Dar entrada → Badge desaparece
5. Ver historial en la página
6. Dar salida → Confirmar y verificar

### Probar como Admin:
1. Login con admin
2. Ir a "Monitor Asistencia"
3. Ver empleados activos
4. Verificar auto-actualización cada minuto
5. Hacer clic en "Actualizar" manualmente

## 🐛 Troubleshooting

### El badge no aparece
- Verificar que existe configuración en `store_schedules` para la tienda
- Revisar que `check_in_deadline` esté correctamente configurado
- Verificar que el usuario tenga `id_tienda` asignado

### No se puede dar entrada
- Verificar que `id_usuario` e `id_tienda` no sean NULL
- Revisar políticas RLS en Supabase
- Confirmar que el usuario esté autenticado

### Monitor muestra vacío
- Verificar que haya registros activos (check_out IS NULL)
- Revisar que la tabla `tiendas` tenga datos
- Confirmar join con tabla `usuarios`

## 📞 Soporte

Si necesitas ayuda con:
- Configuración de WiFi avanzada
- Implementación de geolocalización
- Reportes personalizados
- Integraciones adicionales

¡El sistema está listo para usar! 🎉
