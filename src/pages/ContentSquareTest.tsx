import { useState, useEffect } from 'react';
import { useContentSquare } from '../hooks/useContentSquare';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function ContentSquareTest() {
  const { user } = useAuth();
  const { 
    isEnabled, 
    isReady,
    retryCount,
    sendEvent, 
    setCustomVariable, 
    setUserId, 
    startTransaction, 
    endTransaction, 
    tagSession, 
    trackAuditEvent,
    getDiagnostics,
    contentSquareId 
  } = useContentSquare();

  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Verificar inicialización
  useEffect(() => {
    if (isEnabled) {
      addResult(`✅ ContentSquare inicializado - ID: ${contentSquareId}`);
    } else {
      addResult(`❌ ContentSquare NO inicializado`);
    }

    // Verificar si el objeto global existe
    if (window.CS_CONF) {
      addResult(`✅ Objeto window.CS_CONF disponible`);
    } else {
      addResult(`❌ Objeto window.CS_CONF NO disponible`);
    }
  }, [isEnabled, contentSquareId]);

  // Test 1: Identificación de usuario
  const testUserIdentification = () => {
    addResult(`🧪 Test 1: Identificando usuario`);
    if (user) {
      setUserId(user.id);
      setCustomVariable('test_user_email', user.email || 'no-email');
      setCustomVariable('test_timestamp', Date.now().toString());
      addResult(`✅ Usuario identificado: ${user.id}`);
    } else {
      addResult(`❌ No hay usuario logueado`);
    }
  };

  // Test 2: Eventos básicos
  const testBasicEvents = () => {
    addResult(`🧪 Test 2: Enviando eventos básicos`);
    
    const events = [
      { name: 'test_page_view', data: { page: 'content_square_test' } },
      { name: 'test_button_click', data: { button: 'test_button' } },
      { name: 'test_form_interaction', data: { form: 'test_form' } }
    ];

    events.forEach(event => {
      sendEvent(event.name, event.data);
      addResult(`📤 Evento enviado: ${event.name}`);
    });
  };

  // Test 3: Variables personalizadas
  const testCustomVariables = () => {
    addResult(`🧪 Test 3: Estableciendo variables personalizadas`);
    
    const variables = [
      { key: 'test_environment', value: 'development' },
      { key: 'test_feature_flag', value: 'content_square_testing' },
      { key: 'test_user_type', value: 'admin' },
      { key: 'test_session_id', value: Math.random().toString(36) }
    ];

    variables.forEach(variable => {
      setCustomVariable(variable.key, variable.value);
      addResult(`🏷️ Variable establecida: ${variable.key} = ${variable.value}`);
    });
  };

  // Test 4: Transacciones
  const testTransactions = () => {
    addResult(`🧪 Test 4: Probando transacciones`);
    
    // Iniciar transacción
    startTransaction('test_transaction');
    addResult(`🚀 Transacción iniciada: test_transaction`);
    
    // Simular trabajo
    setTimeout(() => {
      endTransaction('test_transaction');
      addResult(`✅ Transacción finalizada: test_transaction`);
    }, 2000);
  };

  // Test 5: Etiquetas de sesión
  const testSessionTags = () => {
    addResult(`🧪 Test 5: Etiquetando sesión`);
    
    const tags = [
      'test_session',
      'qa_testing',
      'content_square_verification',
      new Date().toISOString().split('T')[0] // fecha actual
    ];

    tagSession(tags);
    addResult(`🏷️ Sesión etiquetada con: ${tags.join(', ')}`);
  };

  // Test 6: Eventos de auditoría específicos
  const testAuditEvents = () => {
    addResult(`🧪 Test 6: Eventos de auditoría específicos`);
    
    const auditEvents = [
      {
        type: 'test_started',
        data: {
          auditId: 999,
          storeId: 1,
          questionsCount: 50
        }
      },
      {
        type: 'test_completed',
        data: {
          auditId: 999,
          storeId: 1,
          score: 85,
          questionsCount: 50
        }
      }
    ];

    auditEvents.forEach(event => {
      trackAuditEvent(event.type, event.data);
      addResult(`📊 Evento de auditoría: audit_${event.type}`);
    });
  };

  // Test 7: Verificar objetos globales con diagnósticos
  const testGlobalObjects = () => {
    addResult(`🧪 Test 7: Verificando objetos globales`);
    
    const diagnostics = getDiagnostics();
    addResult(`🔍 Diagnóstico completo:`);
    addResult(`  - isReady: ${diagnostics.isReady}`);
    addResult(`  - isEnabled: ${diagnostics.isEnabled}`);
    addResult(`  - retryCount: ${diagnostics.retryCount}`);
    addResult(`  - hasWindow: ${diagnostics.hasWindow}`);
    addResult(`  - hasUxa: ${diagnostics.hasUxa}`);
    addResult(`  - uxaType: ${diagnostics.uxaType}`);
    addResult(`  - hasCSConf: ${diagnostics.hasCSConf}`);
    addResult(`  - contentSquareId: ${diagnostics.contentSquareId}`);
    
    if (diagnostics.uxaMethods.length > 0) {
      addResult(`📝 Métodos UXA: ${diagnostics.uxaMethods.join(', ')}`);
    }

    // Estado general
    if (diagnostics.hasUxa && diagnostics.isReady) {
      addResult(`✅ ContentSquare completamente funcional`);
    } else if (diagnostics.hasUxa && !diagnostics.isReady) {
      addResult(`⚠️ ContentSquare cargado pero no listo`);
    } else {
      addResult(`❌ ContentSquare no disponible`);
    }
  };

  // Ejecutar todos los tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    addResult(`🚀 Iniciando suite completa de tests de ContentSquare`);
    
    // Ejecutar tests con delays para ver el flujo
    testUserIdentification();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testBasicEvents();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testCustomVariables();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testSessionTags();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testAuditEvents();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testTransactions();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testGlobalObjects();
    
    setIsRunning(false);
    addResult(`🏁 Suite de tests completada`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 ContentSquare Testing Dashboard
        </h1>
        <p className="text-gray-600">
          Herramienta para verificar y probar todas las funciones de ContentSquare
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">📊 Estado de ContentSquare</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium mb-2 ${
            isReady ? 'bg-green-100 text-green-800' : 
            isEnabled ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>
            {isReady ? '✅ Listo' : isEnabled ? '⏳ Cargando...' : '❌ Deshabilitado'}
          </div>
          {contentSquareId && (
            <p className="text-sm text-gray-600">ID: {contentSquareId}</p>
          )}
          {retryCount > 0 && (
            <p className="text-xs text-gray-500">Reintentos: {retryCount}</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">👤 Usuario Actual</h3>
          {user ? (
            <div>
              <p className="text-sm text-green-600">✅ Logueado</p>
              <p className="text-xs text-gray-600">ID: {user.id}</p>
              <p className="text-xs text-gray-600">Email: {user.email}</p>
            </div>
          ) : (
            <p className="text-sm text-red-600">❌ No logueado</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">🌐 Objeto Global</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isReady ? '✅ window.CS_CONF OK' : '❌ window.CS_CONF NO'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isReady ? 'API completamente disponible' : 'API no disponible'}
          </p>
        </Card>
      </div>

      {/* Controles */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎮 Controles de Testing</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Button
            onClick={testUserIdentification}
            disabled={isRunning}
            className="text-sm"
          >
            👤 Test Usuario
          </Button>
          
          <Button
            onClick={testBasicEvents}
            disabled={isRunning}
            className="text-sm"
          >
            📤 Test Eventos
          </Button>
          
          <Button
            onClick={testCustomVariables}
            disabled={isRunning}
            className="text-sm"
          >
            🏷️ Test Variables
          </Button>
          
          <Button
            onClick={testSessionTags}
            disabled={isRunning}
            className="text-sm"
          >
            🏷️ Test Tags
          </Button>
          
          <Button
            onClick={testAuditEvents}
            disabled={isRunning}
            className="text-sm"
          >
            📊 Test Auditoría
          </Button>
          
          <Button
            onClick={testTransactions}
            disabled={isRunning}
            className="text-sm"
          >
            🔄 Test Transacciones
          </Button>
          
          <Button
            onClick={testGlobalObjects}
            disabled={isRunning}
            className="text-sm"
          >
            🌐 Test Globales
          </Button>
          
          <Button
            onClick={clearResults}
            disabled={isRunning}
            variant="outline"
            className="text-sm"
          >
            🗑️ Limpiar
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? '⏳ Ejecutando...' : '🚀 Ejecutar Todos los Tests'}
          </Button>
        </div>
      </Card>

      {/* Resultados */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📝 Resultados de Tests</h2>
        
        <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
          {testResults.length === 0 ? (
            <div className="text-gray-500">
              Ejecuta algún test para ver los resultados aquí...
            </div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
        
        {testResults.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total de líneas: {testResults.length} | 
            Última actualización: {new Date().toLocaleTimeString()}
          </div>
        )}
      </Card>

      {/* Instrucciones */}
      <Card className="p-6 mt-6 bg-blue-50">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">📖 Instrucciones</h2>
        <div className="space-y-2 text-sm text-blue-700">
          <p><strong>1.</strong> Asegúrate de estar logueado para probar la identificación de usuario</p>
          <p><strong>2.</strong> Abre las DevTools (F12) y ve a la pestaña Console para ver logs adicionales</p>
          <p><strong>3.</strong> Ve a la pestaña Network para verificar que se envían requests a ContentSquare</p>
          <p><strong>4.</strong> Los eventos aparecerán en tu dashboard de ContentSquare en 24-48 horas</p>
          <p><strong>5.</strong> Para testing en tiempo real, usa la extensión de ContentSquare en Chrome</p>
        </div>
      </Card>
    </div>
  );
}