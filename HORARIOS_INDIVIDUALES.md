# 📅 SISTEMA DE HORARIOS INDIVIDUALES POR EMPLEADO

## Descripción General

El sistema de asistencia ahora permite **configurar horarios específicos día por día del mes para cada empleada**. Esto es ideal cuando los horarios varían semana a semana o cuando cada empleada tiene un horario diferente.

---

## 🎯 Características Principales

✅ **Horarios personalizados**: Configura horarios diferentes para cada empleada  
✅ **Calendario mensual**: Vista completa del mes con todos los días  
✅ **Días libres**: Marca días libres para empleadas específicas  
✅ **Notas por día**: Agrega notas como "Turno doble", "Medio día", etc.  
✅ **Prioridad automática**: Horario individual > Horario semanal de tienda > Default del sistema  
✅ **Copiar mes anterior**: Función rápida para replicar horarios del mes pasado  
✅ **Interfaz intuitiva**: Calendario visual con colores (hoy, pasado, fin de semana)  
✅ **Solo admin**: Solo administradores pueden configurar horarios

---

## 📋 Pasos de Implementación

### 1. Ejecutar Migración SQL

1. Abre **Supabase Dashboard → SQL Editor**
2. Copia y pega el contenido de `employee_schedules_migration.sql`
3. Haz clic en **Run**
4. Verifica los mensajes de confirmación:

```
✅ Tabla employee_schedules creada correctamente
✅ Función get_employee_check_in_deadline creada correctamente
✅ Políticas RLS configuradas
✅ MIGRACIÓN COMPLETADA
```

### 2. Acceder al Panel de Configuración

1. Inicia sesión como **admin**
2. Ve al menú lateral → **Asistencia**
3. Selecciona **"Horarios Individuales"** (nueva opción)
4. Verás la pantalla de configuración de horarios por empleado

---

## 🖥️ Uso del Sistema

### A. Configurar Horarios para una Empleada

#### Paso 1: Seleccionar Empleada
1. En el dropdown superior, selecciona la empleada
2. Se mostrará su información: nombre, tienda y rol
3. Se cargará su horario del mes actual

#### Paso 2: Navegar por el Mes
- Usa los botones **"◀ Anterior"** y **"Siguiente ▶"** para cambiar de mes
- El mes actual se muestra en el centro

#### Paso 3: Configurar Cada Día
Para cada día del mes puedes configurar:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Hora de entrada** | Hora límite de entrada | `09:00` |
| **Día libre** | Marcar si no trabaja ese día | ☑️ |
| **Notas** | Información adicional | "Turno doble" |

**Colores del calendario:**
- 🔵 **Azul**: Hoy
- ⚪ **Blanco**: Días entre semana futuros
- 🟢 **Verde**: Fin de semana
- ⚫ **Gris**: Días pasados

#### Paso 4: Guardar Cambios
1. Haz clic en **"💾 Guardar Cambios"**
2. Solo se guardan los días con cambios (no default de 09:00)
3. Aparecerá mensaje de confirmación con número de días guardados

### B. Copiar Horarios del Mes Anterior

Si los horarios se repiten mensualmente:

1. Selecciona la empleada
2. Navega al mes objetivo (Ej: Enero 2026)
3. Haz clic en **"🔄 Copiar mes anterior"**
4. Confirma la acción
5. Se copiarán todos los horarios de Diciembre 2025 → Enero 2026

**⚠️ Nota**: Solo copia horarios que no existen. No sobrescribe configuraciones existentes.

### C. Eliminar un Horario Específico

1. Localiza el día que quieres eliminar
2. Haz clic en el botón **❌** rojo a la derecha
3. Confirma la eliminación
4. El horario se elimina y volverá al default de la tienda

---

## 🔄 Flujo de Verificación del Sistema

### Cuando un Empleado Registra Entrada

El sistema verifica el horario en este orden de **prioridad**:

```
1. Horario Individual (employee_schedules)
   ├─ Si existe para hoy → Usar ese horario
   └─ Si no existe → Continuar...

2. Horario Semanal de Tienda (store_schedules)
   ├─ Según día de la semana (Lunes, Martes, etc.)
   └─ Si no existe → Continuar...

3. Default del Sistema
   └─ 09:00 AM para todos
```

### Ejemplo Real

**María trabaja en Tienda Centro**

- **Lunes 15 Dic**: Horario individual configurado a las `08:00` → Usa `08:00`
- **Martes 16 Dic**: Sin horario individual → Usa horario semanal de tienda (Martes = `09:00`)
- **Sábado 20 Dic**: Horario individual marcado como "Día libre" → No puede dar entrada
- **Domingo 21 Dic**: Sin configuración → Usa default de sistema `09:00`

---

## 🛠️ Estructura de Base de Datos

### Tabla: `employee_schedules`

```sql
CREATE TABLE employee_schedules (
  id                  SERIAL PRIMARY KEY,
  id_usuario          INTEGER NOT NULL,         -- FK a usuarios
  id_tienda           INTEGER NOT NULL,         -- FK a tiendas
  schedule_date       DATE NOT NULL,            -- Fecha específica
  check_in_deadline   TIME NOT NULL DEFAULT '09:00:00',
  is_day_off          BOOLEAN DEFAULT FALSE,    -- Día libre
  notes               TEXT,                     -- Notas opcionales
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_employee_schedule_per_day 
    UNIQUE (id_usuario, schedule_date)
);
```

### Función SQL: `get_employee_check_in_deadline`

```sql
-- Obtiene el horario de un empleado para una fecha específica
SELECT * FROM get_employee_check_in_deadline(
  p_user_id := 1,                    -- ID del usuario
  p_date := CURRENT_DATE             -- Fecha (default: hoy)
);

-- Resultado:
-- check_in_deadline | is_day_off | notes        | source
-- 08:00:00         | false      | Turno doble  | individual
```

**Columna `source` indica de dónde viene el horario:**
- `individual`: Configurado específicamente para ese día
- `store_default`: Tomado del horario semanal de la tienda
- `system_default`: Usando el default del sistema (09:00)

### Función SQL: `copy_schedules_from_previous_month`

```sql
-- Copia horarios del mes anterior al mes especificado
SELECT copy_schedules_from_previous_month('2026-01-01');

-- Retorna el número de horarios copiados
-- Ej: 62 (si la empleada tenía 62 días configurados)
```

### Vista: `v_current_month_schedules`

```sql
-- Ver todos los horarios del mes actual con información del empleado
SELECT * FROM v_current_month_schedules;

-- Incluye: id, usuario, tienda, fecha, horario, nombre empleado, rol, nombre tienda
```

---

## 💻 Código Frontend

### Componente: `EmployeeScheduleConfig.tsx`

**Ubicación**: `src/pages/EmployeeScheduleConfig.tsx`

**Funciones principales:**

```typescript
// Cargar empleados (solo asesoras y coordinadores)
loadEmployees()

// Cargar horarios del mes para la empleada seleccionada
loadSchedulesForMonth()

// Actualizar horario de un día específico
updateSchedule(dateString, field, value)

// Guardar todos los cambios
saveSchedules()

// Copiar del mes anterior
copyFromPreviousMonth()

// Eliminar horario de un día
clearSchedule(dateString)
```

### Componente: `Attendance.tsx` (Actualizado)

**Cambios realizados:**

1. **Nuevo estado**: `individualSchedule` para almacenar horario del día
2. **Nueva función**: `loadIndividualSchedule()` que consulta horario individual
3. **Función actualizada**: `getTodayDeadline()` ahora prioriza horario individual
4. **Validación nueva**: No permite entrada si es día libre
5. **UI actualizada**: Muestra card con horario personalizado o día libre

---

## 📊 Ejemplos de Uso Real

### Caso 1: Tienda con Turnos Rotativos

**María (Asesora) - Semana 1:**
```
Lun 15 Dic: 08:00 (Turno mañana)
Mar 16 Dic: 14:00 (Turno tarde)
Mié 17 Dic: 08:00 (Turno mañana)
Jue 18 Dic: Día libre
Vie 19 Dic: 14:00 (Turno tarde)
Sáb 20 Dic: 10:00 (Medio día)
Dom 21 Dic: Día libre
```

**María - Semana 2:**
```
Lun 22 Dic: 14:00 (Turno tarde)
Mar 23 Dic: 08:00 (Turno mañana)
...
```

### Caso 2: Coordinadora con Horario Especial

**Ana (Coordinadora) - Todo el mes:**
```
Lun-Vie: 07:00 (Llega temprano para abrir)
Sábados: 09:00 (Horario normal)
Domingos: Día libre
```

### Caso 3: Temporada Alta (Navidad)

**Todo el equipo - Diciembre:**
```
Dic 1-15:  Horario normal (09:00)
Dic 16-24: Horario extendido (08:00) + notas "Temporada alta"
Dic 25:    Día libre (Navidad)
Dic 26-31: Horario normal (09:00)
```

---

## 🎨 Interfaz de Usuario

### Pantalla Principal

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Horarios Individuales por Empleado                   │
│ Configura horarios día por día del mes para cada emp... │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 Seleccionar Empleada                                 │
│ [María García (Tienda Centro) - asesora          ▼]     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ María García                         [🔄 Copiar mes ant]│
│ Tienda Centro • asesora                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [◀ Anterior]      Diciembre 2025       [Siguiente ▶]    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Configuración del Mes              [💾 Guardar Cambios] │
│                                                          │
│ 🔵 Lun 15  [08:00]  [ ] Día libre  [Turno mañana   ] ❌ │
│ ⚪ Mar 16  [14:00]  [ ] Día libre  [Turno tarde    ] ❌ │
│ ⚪ Mié 17  [08:00]  [ ] Día libre  [                ] ❌ │
│ ⚪ Jue 18  [09:00]  [✓] Día libre  [                ] ❌ │
│ ⚪ Vie 19  [14:00]  [ ] Día libre  [                ] ❌ │
│ 🟢 Sáb 20  [10:00]  [ ] Día libre  [Medio día      ] ❌ │
│ 🟢 Dom 21  [09:00]  [✓] Día libre  [                ] ❌ │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘
```

### Vista del Empleado (Attendance.tsx)

Cuando María abre "Mi Asistencia":

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Horario personalizado                                │
│ Hora de entrada hoy: 08:00 • Turno mañana              │
└─────────────────────────────────────────────────────────┘

O si es día libre:

┌─────────────────────────────────────────────────────────┐
│ 🏖️ Día libre programado                                │
│ Hoy tienes el día libre según tu horario personalizado │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuración RLS (Seguridad)

Las políticas de seguridad garantizan:

1. **Empleados**: Solo ven sus propios horarios
2. **Coordinadores**: Ven todos los horarios de su tienda
3. **Admin**: Ve y edita todos los horarios
4. **Solo admin puede crear/modificar/eliminar** horarios

```sql
-- Ejemplo: Empleado consultando su horario
-- María (id_usuario=5) solo verá sus propios registros
SELECT * FROM employee_schedules WHERE id_usuario = 5;

-- Admin puede ver todos
SELECT * FROM employee_schedules; -- Ve todos los empleados
```

---

## 🔧 Mantenimiento

### Limpiar Horarios Antiguos (Opcional)

```sql
-- Eliminar horarios de más de 6 meses atrás
DELETE FROM employee_schedules
WHERE schedule_date < CURRENT_DATE - INTERVAL '6 months';
```

### Ver Estadísticas

```sql
-- Contar horarios configurados por empleado
SELECT 
  u.nombre,
  COUNT(*) as dias_configurados,
  SUM(CASE WHEN is_day_off THEN 1 ELSE 0 END) as dias_libres
FROM employee_schedules es
JOIN usuarios u ON es.id_usuario = u.id_usuario
WHERE es.schedule_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.nombre
ORDER BY dias_configurados DESC;
```

### Exportar Horarios del Mes

```sql
-- Ver todos los horarios del mes con detalles
SELECT 
  u.nombre as empleado,
  t.nombre as tienda,
  es.schedule_date as fecha,
  TO_CHAR(es.check_in_deadline, 'HH24:MI') as hora_entrada,
  es.is_day_off as dia_libre,
  es.notes as notas
FROM employee_schedules es
JOIN usuarios u ON es.id_usuario = u.id_usuario
JOIN tiendas t ON es.id_tienda = t.id_tienda
WHERE es.schedule_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND es.schedule_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY es.schedule_date, u.nombre;
```

---

## ⚠️ Notas Importantes

### Compatibilidad

- ✅ **Compatible** con sistema anterior de horarios semanales
- ✅ **Fallback automático**: Si no hay horario individual, usa horario de tienda
- ✅ **Sin migración necesaria**: No afecta configuraciones existentes

### Prioridad de Horarios

```
PRIORIDAD 1: Horario Individual
    ↓ (si no existe)
PRIORIDAD 2: Horario Semanal de Tienda
    ↓ (si no existe)
PRIORIDAD 3: Default del Sistema (09:00)
```

### Recomendaciones

1. **Configura al inicio del mes**: Es más fácil planificar horarios con anticipación
2. **Usa "Copiar mes anterior"**: Ahorra tiempo si los horarios se repiten
3. **Agrega notas**: Ayuda a recordar por qué ese día tiene horario especial
4. **Marca días libres**: Previene que empleados intenten dar entrada
5. **Revisa horarios semanalmente**: Ajusta según necesidades del negocio

---

## 🚀 Mejoras Futuras Posibles

1. **Plantillas de horarios**: Guardar patrones comunes y aplicarlos rápidamente
2. **Importar desde Excel**: Cargar horarios masivamente desde archivo
3. **Notificaciones**: Avisar a empleadas cuando se actualiza su horario
4. **Intercambio de turnos**: Permitir que empleadas intercambien días
5. **Vista semanal**: Además de mensual, agregar vista de semana
6. **Horarios de salida**: Configurar también hora de salida esperada
7. **Reportes**: Generar PDF con horarios del mes por empleada

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `employee_schedules_migration.sql` en Supabase
- [ ] Verificar que tabla `employee_schedules` existe
- [ ] Verificar que función `get_employee_check_in_deadline` existe
- [ ] Confirmar que políticas RLS están activas
- [ ] Acceder a "Horarios Individuales" como admin
- [ ] Seleccionar una empleada de prueba
- [ ] Configurar horarios para la primera semana
- [ ] Guardar cambios y verificar mensaje de éxito
- [ ] Iniciar sesión como esa empleada
- [ ] Ver que aparece card de "Horario personalizado"
- [ ] Verificar que el horario límite es el correcto
- [ ] Probar marcar un día como "Día libre"
- [ ] Intentar dar entrada ese día (debe bloquearse)
- [ ] Probar función "Copiar mes anterior"
- [ ] Verificar que no hay errores en consola del navegador

---

## 📞 Solución de Problemas

### Problema: No aparece la opción "Horarios Individuales"

**Solución**: Verifica que estás logueado como admin

### Problema: Error al guardar horarios

**Solución**: 
1. Verifica que ejecutaste la migración SQL
2. Revisa que la tabla `employee_schedules` existe en Supabase
3. Confirma que las políticas RLS están configuradas

### Problema: No carga los empleados

**Solución**:
1. Verifica que hay usuarios con rol `asesora` o `coordinador`
2. Confirma que tienen `id_tienda` asignado
3. Revisa la consola del navegador (F12) para errores

### Problema: Horario individual no se aplica

**Solución**:
1. Verifica que la fecha del horario coincide con hoy
2. Confirma que se guardó correctamente (revisa en Supabase Table Editor)
3. Recarga la página de asistencia

---

## 📄 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `employee_schedules_migration.sql` | Migración SQL para crear tabla y funciones |
| `src/pages/EmployeeScheduleConfig.tsx` | Componente de configuración de horarios |
| `src/pages/Attendance.tsx` | Actualizado para usar horarios individuales |
| `src/App.tsx` | Ruta `/employee-schedules` agregada |
| `HORARIOS_INDIVIDUALES.md` | Esta documentación |

---

**Última actualización**: Diciembre 12, 2025  
**Versión**: 3.0 - Sistema de Horarios Individuales por Empleado  
**Autor**: Sistema de Asistencia GMCO
