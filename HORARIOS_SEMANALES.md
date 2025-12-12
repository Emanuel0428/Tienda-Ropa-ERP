# 📅 SISTEMA DE HORARIOS SEMANALES

## Descripción General

El sistema de asistencia ahora soporta **horarios diferentes para cada día de la semana**. Cada tienda puede configurar horarios de entrada distintos para Lunes, Martes, Miércoles, Jueves, Viernes, Sábado y Domingo.

---

## 🎯 Características

✅ **Horarios por día**: Configura un horario diferente para cada día de la semana  
✅ **Verificación GPS obligatoria**: Se eliminaron las referencias a WiFi  
✅ **Cálculo automático**: El sistema detecta automáticamente qué día es hoy y usa el horario correspondiente  
✅ **Interfaz intuitiva**: Panel de configuración visual con emojis para identificar cada día  
✅ **Compatible**: Si no se configuran horarios semanales, usa el horario general como fallback

---

## 📋 Pasos para Implementar

### 1. Ejecutar Migración SQL

1. Abre Supabase Dashboard → SQL Editor
2. Copia todo el contenido del archivo `weekly_schedule_migration.sql`
3. Ejecuta el script
4. Verifica los mensajes de confirmación:
   ```
   ✅ Campo monday_check_in_deadline agregado
   ✅ Campo tuesday_check_in_deadline agregado
   ✅ Campo wednesday_check_in_deadline agregado
   ... etc
   ✅ Función get_check_in_deadline_for_day creada correctamente
   ✅ MIGRACIÓN COMPLETADA
   ```

### 2. Configurar Horarios por Tienda

1. Inicia sesión como **admin**
2. Ve a **Asistencia → Configuración**
3. Verás una nueva sección: **"Horarios por Día de la Semana"**

#### Ejemplo de Configuración:

```
🔵 Lunes:      09:00
🔵 Martes:     09:00
🔵 Miércoles:  09:00
🔵 Jueves:     09:00
🔵 Viernes:    09:00
🟢 Sábado:     10:00
🟢 Domingo:    Cerrado o 10:00
```

4. Configura también las **coordenadas GPS** (obligatorio):
   - **Latitud**: Ej: `4.678901`
   - **Longitud**: Ej: `-74.123456`
   - **Radio**: Ej: `100` metros

5. Haz clic en **"Guardar Configuración"**

---

## 🛠️ Estructura de Base de Datos

### Nuevas Columnas en `store_schedules`

```sql
monday_check_in_deadline      TIME  -- Horario de Lunes
tuesday_check_in_deadline     TIME  -- Horario de Martes
wednesday_check_in_deadline   TIME  -- Horario de Miércoles
thursday_check_in_deadline    TIME  -- Horario de Jueves
friday_check_in_deadline      TIME  -- Horario de Viernes
saturday_check_in_deadline    TIME  -- Horario de Sábado
sunday_check_in_deadline      TIME  -- Horario de Domingo
```

### Función SQL Disponible

```sql
-- Obtiene el horario del día actual para una tienda
SELECT get_check_in_deadline_for_day(1, CURRENT_DATE);

-- Parámetros:
-- 1. id_tienda (INTEGER)
-- 2. fecha (DATE, opcional, por defecto es hoy)
```

**Ejemplo de uso:**
```sql
-- ¿Cuál es el horario de entrada para la tienda 1 hoy?
SELECT get_check_in_deadline_for_day(1, CURRENT_DATE);

-- ¿Cuál será el horario para la tienda 2 el próximo Sábado?
SELECT get_check_in_deadline_for_day(2, '2025-12-14');
```

---

## 💻 Código TypeScript

### Interfaz StoreSchedule

```typescript
interface StoreSchedule {
  check_in_deadline: string;              // Horario general (fallback)
  notification_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  location_radius_meters: number;
  // Horarios semanales
  monday_check_in_deadline?: string;
  tuesday_check_in_deadline?: string;
  wednesday_check_in_deadline?: string;
  thursday_check_in_deadline?: string;
  friday_check_in_deadline?: string;
  saturday_check_in_deadline?: string;
  sunday_check_in_deadline?: string;
}
```

### Función Helper para Obtener Horario del Día

```typescript
const getTodayDeadline = (schedule: StoreSchedule | null): string => {
  if (!schedule) return '09:00:00';
  
  const dayOfWeek = new Date().getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  
  switch (dayOfWeek) {
    case 0: return schedule.sunday_check_in_deadline || schedule.check_in_deadline;
    case 1: return schedule.monday_check_in_deadline || schedule.check_in_deadline;
    case 2: return schedule.tuesday_check_in_deadline || schedule.check_in_deadline;
    case 3: return schedule.wednesday_check_in_deadline || schedule.check_in_deadline;
    case 4: return schedule.thursday_check_in_deadline || schedule.check_in_deadline;
    case 5: return schedule.friday_check_in_deadline || schedule.check_in_deadline;
    case 6: return schedule.saturday_check_in_deadline || schedule.check_in_deadline;
    default: return schedule.check_in_deadline;
  }
};
```

---

## 🔄 Flujo de Verificación

### Para Empleados (Attendance.tsx)

1. El empleado abre **"Mi Asistencia"**
2. El sistema obtiene la configuración de la tienda desde `store_schedules`
3. Se ejecuta `getTodayDeadline()` para obtener el horario del día actual
4. Se compara la hora actual con el horario límite del día
5. Si llega tarde, se muestra alerta: **"⚠️ Llegada tarde - Hora límite: 09:00"**
6. Al dar entrada, se verifica:
   - ✅ Conexión a internet
   - ✅ Ubicación GPS dentro del radio configurado
7. Si todo está bien, se registra la entrada

### Para Administradores (AttendanceSettings.tsx)

1. El admin abre **"Configuración de Asistencia"**
2. Ve la lista de todas las tiendas
3. Para cada tienda puede configurar:
   - 7 horarios diferentes (uno por cada día)
   - Coordenadas GPS (latitud, longitud, radio)
   - Notificaciones de tardanzas
4. Al guardar, se actualizan todos los campos en `store_schedules`

---

## 📊 Ejemplos de Uso

### Caso 1: Tienda con Horario Fijo
Si tu tienda abre siempre a las 9:00 AM:

```
Lunes:     09:00
Martes:    09:00
Miércoles: 09:00
Jueves:    09:00
Viernes:   09:00
Sábado:    09:00
Domingo:   09:00
```

### Caso 2: Horario Variable Fin de Semana
Tienda que abre más tarde los fines de semana:

```
Lunes:     08:00  ← Abre temprano entre semana
Martes:    08:00
Miércoles: 08:00
Jueves:    08:00
Viernes:   08:00
Sábado:    10:00  ← Abre tarde el sábado
Domingo:   10:00  ← Abre tarde el domingo
```

### Caso 3: Horario por Temporada
Tienda con horarios especiales:

```
Lunes:     09:00
Martes:    09:00
Miércoles: 09:00
Jueves:    09:00
Viernes:   09:00  ← Día normal
Sábado:    08:00  ← Sábado más temprano (Black Friday)
Domingo:   Cerrado o 12:00
```

---

## 🧪 Pruebas

### Prueba 1: Verificar Horario del Día Actual

1. Configura horarios diferentes para cada día
2. Inicia sesión como empleado
3. Ve a **"Mi Asistencia"**
4. Observa la alerta de tardanza (si aplica)
5. Debe mostrar el horario correcto según el día de hoy

### Prueba 2: Cambio de Día

1. Espera a que cambie el día (o simula cambiando la hora del sistema)
2. Recarga la página
3. El horario límite debe cambiar automáticamente

### Prueba 3: Fallback

1. Crea una nueva tienda sin configurar horarios semanales
2. Solo configura GPS y horario general (`check_in_deadline`)
3. El sistema debe usar el horario general para todos los días

---

## ⚠️ Notas Importantes

### Compatibilidad hacia atrás
- El campo `check_in_deadline` se mantiene como **fallback**
- Si no existen horarios semanales, el sistema usa este valor
- Las configuraciones antiguas siguen funcionando

### Migración automática
- Al ejecutar el SQL, se copian los horarios existentes a todos los días
- No necesitas reconfigurar tiendas existentes (a menos que quieras horarios diferentes)

### Eliminación de WiFi
- Se eliminaron **todos** los campos y referencias a verificación WiFi
- La verificación GPS es ahora **obligatoria**
- Los navegadores no pueden acceder al nombre del WiFi por seguridad

---

## 🚀 Mejoras Futuras Posibles

1. **Horarios de Salida**: Agregar horarios de salida esperados por día
2. **Días festivos**: Configurar excepciones para días específicos
3. **Turnos múltiples**: Soportar turno mañana y tarde el mismo día
4. **Horarios por empleado**: Permitir que cada empleado tenga su propio horario
5. **Notificaciones push**: Recordatorios antes del horario límite

---

## 📞 Soporte

Si tienes problemas:

1. Verifica que ejecutaste `weekly_schedule_migration.sql` correctamente
2. Confirma que los campos nuevos existen en Supabase (Table Editor → store_schedules)
3. Asegúrate de tener coordenadas GPS configuradas (obligatorio)
4. Revisa la consola del navegador (F12) para errores

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `weekly_schedule_migration.sql` en Supabase
- [ ] Verificar que las 7 columnas nuevas existen en `store_schedules`
- [ ] Verificar que la función `get_check_in_deadline_for_day` existe
- [ ] Configurar horarios semanales para cada tienda (panel admin)
- [ ] Configurar coordenadas GPS para cada tienda (obligatorio)
- [ ] Probar entrada de empleado en día entre semana
- [ ] Probar entrada de empleado en fin de semana
- [ ] Verificar que las alertas de tardanza usan el horario correcto
- [ ] Confirmar que no hay errores en consola del navegador

---

## 📄 Archivos Modificados

- `weekly_schedule_migration.sql` - Migración SQL (NUEVO)
- `src/pages/AttendanceSettings.tsx` - Panel de configuración actualizado
- `src/pages/Attendance.tsx` - Verificación de horario por día
- `HORARIOS_SEMANALES.md` - Esta documentación (NUEVO)

---

**Última actualización**: Diciembre 12, 2025  
**Versión**: 2.0 - Sistema de Horarios Semanales con GPS
