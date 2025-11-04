# 🔍 **Guía Completa de Verificación de ContentSquare**

## 📋 **Checklist de Verificación**

### ✅ **1. Verificación Básica de Instalación**

#### **A. En el navegador:**
1. Ve a: `https://tienda-ropa-erp.vercel.app/contentsquare-test`
2. Abre DevTools (F12) → Console
3. Busca estos mensajes:
   ```
   📊 ContentSquare: Inicializado correctamente con ID: 2544eebed02b8
   ✅ ContentSquare inicializado - ID: 2544eebed02b8
   ✅ Objeto window.uxa disponible
   ```

#### **B. En Network (DevTools):**
1. Ve a Network → Filtrar por "contentsquare" 
2. Deberías ver requests a:
   - `t.contentsquare.net/uxa/2544eebed02b8.js` ✅
   - `api.contentsquare.net` ✅

### ✅ **2. Verificación de Funciones**

#### **A. Página de Testing:**
1. **Acceso:** `/contentsquare-test` (solo admins)
2. **Tests disponibles:**
   - 👤 Test Usuario - Identifica usuario actual
   - 📤 Test Eventos - Envía eventos básicos
   - 🏷️ Test Variables - Establece variables personalizadas
   - 🏷️ Test Tags - Etiqueta la sesión
   - 📊 Test Auditoría - Eventos específicos de auditoría
   - 🔄 Test Transacciones - Prueba start/end transaction
   - 🌐 Test Globales - Verifica objetos window

#### **B. Ejecutar Suite Completa:**
1. Clic en "🚀 Ejecutar Todos los Tests"
2. Verificar que todos los tests muestren ✅
3. No debe haber errores ❌ en la consola

### ✅ **3. Verificación en Producción**

#### **A. Eventos Automáticos:**
- **Login de usuario** → `setUserId()` + variables personalizadas
- **Nueva auditoría** → `audit_started` + transacción iniciada
- **Revisión auditoría** → `audit_review_started`  
- **Completar auditoría** → `audit_completed` + transacción finalizada

#### **B. Variables que se rastrean:**
- `user_email` - Email del usuario logueado
- `user_id` - ID del usuario
- `current_audit_id` - ID de auditoría actual
- `current_store_id` - ID de tienda actual
- `audit_score` - Calificación de la auditoría

#### **C. Tags de sesión:**
- `authenticated` - Usuario logueado
- `erp_user` - Usuario del ERP
- `audit_session` - Sesión de auditoría
- `active_auditor` - Auditor activo
- `audit_completion` - Auditoría completada
- `productive_session` - Sesión productiva

### ✅ **4. Verificación Avanzada**

#### **A. Extensión de Chrome (Opcional):**
1. Instala: "ContentSquare Debugger" (si existe)
2. Verifica eventos en tiempo real

#### **B. Console Commands:**
```javascript
// Verificar objeto ContentSquare
window.uxa

// Verificar configuración
window.CS_CONF

// Enviar evento de prueba
window.uxa.send('test_event', {test: true})

// Establecer variable
window.uxa.setCustomVariable('test_var', 'test_value')
```

### ✅ **5. Dashboard de ContentSquare (24-48h)**

#### **A. Datos que aparecerán:**
- **Session Recordings** con usuarios reales
- **Heatmaps** de la aplicación
- **Journey Analysis** del flujo de auditorías
- **Custom Events** que configuramos
- **Variables** personalizadas para segmentación

#### **B. Métricas importantes:**
- Tasa de finalización de auditorías
- Tiempo promedio por auditoría
- Abandono en preguntas específicas
- Comportamiento móvil vs desktop

## 🚨 **Troubleshooting**

### **Problema: "ContentSquare no inicializa"**
```bash
# Solución:
1. Verificar variables de entorno en Vercel
2. Verificar que el script se carga en Network
3. Revisar Console por errores de JavaScript
```

### **Problema: "window.uxa undefined"**
```bash
# Solución:
1. Script de ContentSquare bloqueado por AdBlocker
2. Network lenta - esperar más tiempo
3. ID incorrecto en las variables
```

### **Problema: "No aparecen eventos en dashboard"**
```bash
# Solución:
1. Esperar 24-48 horas (delay normal)
2. Verificar que los eventos se envían (Network tab)
3. Contactar soporte de ContentSquare si persiste
```

## 📊 **Eventos Configurados**

| Evento | Cuándo se dispara | Datos incluidos |
|--------|------------------|----------------|
| `audit_started` | Al iniciar nueva auditoría | auditId, storeId, questionsCount |
| `audit_review_started` | Al revisar auditoría existente | auditId, storeId, score |
| `audit_completed` | Al finalizar auditoría | auditId, storeId, score, questionsCount |
| `test_*` | Durante testing manual | Varios datos de prueba |

## 🎯 **Próximos Pasos**

1. **Monitorear** dashboard en 24-48h
2. **Configurar dashboards** personalizados
3. **Establecer alertas** para métricas críticas
4. **Analizar heatmaps** para optimizar UX
5. **Revisar journey analytics** para mejorar flujos