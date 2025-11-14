import { useEffect, useState, useCallback } from 'react';

// Tipos para ContentSquare
declare global {
  interface Window {
    CS_CONF?: {
      (command: string, action: string, data?: any): void;
      q?: any[];
    };
    _csq?: any[];
    uxa?: {
      send?: (eventName: string, properties?: any) => void;
      setCustomVariable?: (key: string, value: string) => void;
      setUserId?: (userId: string) => void;
      startTransaction?: (name: string, properties?: any) => void;
      endTransaction?: (name: string, properties?: any) => void;
      tagRecording?: (tags: string[]) => void;
      [key: string]: any;
    };
    _hjSettings?: {
      hjid: number;
      hjsv: number;
    };
  }
}

interface ContentSquareConfig {
  id?: string;
  enabled?: boolean;
}

/**
 * Hook personalizado para manejar ContentSquare Analytics
 * Proporciona funciones para tracking de eventos y variables personalizadas
 */
export const useContentSquare = (config?: ContentSquareConfig) => {
  const contentSquareId = config?.id || import.meta.env.VITE_CONTENTSQUARE_ID || null;
  const isEnabled = config?.enabled !== false && !!contentSquareId && contentSquareId !== 'tu-id-contentsquare';
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isEnabled || !contentSquareId) {
      console.log('📊 ContentSquare: Deshabilitado o ID no configurado');
      return;
    }

    const maxRetries = 20; // 10 segundos con intervalos de 500ms
    
    const checkAvailability = () => {
      // Verificar si ContentSquare está completamente disponible
      if (typeof window !== 'undefined' && 
          typeof window.CS_CONF === 'function') {
        console.log('📊 ContentSquare: API completamente disponible');
        setIsReady(true);
        return true;
      }
      
      if (retryCount < maxRetries) {
        console.log(`⏳ ContentSquare: Reintento ${retryCount + 1}/${maxRetries}`);
        setRetryCount(prev => prev + 1);
        setTimeout(checkAvailability, 500);
      } else {
        console.error('❌ ContentSquare: No disponible después de múltiples reintentos');
        console.log('🔍 Diagnóstico:', {
          hasWindow: typeof window !== 'undefined',
          hasCS_CONF: typeof window.CS_CONF,
          csConfQueue: window.CS_CONF && window.CS_CONF.q ? window.CS_CONF.q.length : 'N/A'
        });
      }
      
      return false;
    };
    
    if (!isReady) {
      checkAvailability();
    }
  }, [contentSquareId, isEnabled, retryCount, isReady]);

  // Funciones del hook
  const sendEvent = (eventName: string, data?: any) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: sendEvent ignorado -', eventName, data);
      return;
    }

    try {
      window.CS_CONF('send', 'event', {
        event_name: eventName,
        ...data
      });
      console.log('📊 ContentSquare: Evento enviado -', eventName, data);
    } catch (error) {
      console.error('📊 ContentSquare: Error en sendEvent:', error);
    }
  };

  const setCustomVariable = (key: string, value: string | number) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: setCustomVariable ignorado -', key, value);
      return;
    }

    try {
      window.CS_CONF('send', 'custom', {
        [key]: String(value)
      });
      console.log('📊 ContentSquare: Variable personalizada establecida -', key, value);
    } catch (error) {
      console.error('📊 ContentSquare: Error en setCustomVariable:', error);
    }
  };

  const setUserId = (userId: string) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: setUserId ignorado -', userId);
      return;
    }

    try {
      window.CS_CONF('send', 'user', {
        user_id: userId
      });
      console.log('📊 ContentSquare: Usuario identificado -', userId);
    } catch (error) {
      console.error('📊 ContentSquare: Error en setUserId:', error);
    }
  };

  const startTransaction = (name: string) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: startTransaction ignorado -', name);
      return;
    }

    try {
      window.CS_CONF('send', 'transaction', {
        action: 'start',
        name: name
      });
      console.log('📊 ContentSquare: Transacción iniciada -', name);
    } catch (error) {
      console.error('📊 ContentSquare: Error en startTransaction:', error);
    }
  };

  const endTransaction = (name: string) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: endTransaction ignorado -', name);
      return;
    }

    try {
      window.CS_CONF('send', 'transaction', {
        action: 'end',
        name: name
      });
      console.log('📊 ContentSquare: Transacción finalizada -', name);
    } catch (error) {
      console.error('📊 ContentSquare: Error en endTransaction:', error);
    }
  };

  const tagSession = (tags: string[]) => {
    if (!isEnabled || !window.CS_CONF) {
      console.log('📊 ContentSquare: tagSession ignorado -', tags);
      return;
    }

    try {
      // ContentSquare: enviamos las etiquetas como variables personalizadas
      tags.forEach((tag, index) => {
        window.CS_CONF!('send', 'custom', {
          [`session_tag_${index}`]: tag
        });
      });
      console.log('📊 ContentSquare: Sesión etiquetada -', tags);
    } catch (error) {
      console.error('📊 ContentSquare: Error en tagSession:', error);
    }
  };

  // Función específica para auditorías
  const trackAuditEvent = (eventType: string, auditData: any) => {
    if (!isEnabled) return;

    const eventName = `audit_${eventType}`;
    sendEvent(eventName, auditData);

    // También establecer variables personalizadas para mejor análisis
    if (auditData.auditId) {
      setCustomVariable('current_audit_id', auditData.auditId);
    }
    if (auditData.storeId) {
      setCustomVariable('current_store_id', auditData.storeId);
    }
    if (auditData.score !== undefined) {
      setCustomVariable('audit_score', auditData.score);
    }
  };

  // Función de diagnóstico
  const getDiagnostics = useCallback(() => {
    return {
      isReady,
      isEnabled,
      contentSquareId,
      retryCount,
      hasWindow: typeof window !== 'undefined',
      hasCS_CONF: typeof window.CS_CONF,
      csConfQueue: window.CS_CONF && window.CS_CONF.q ? window.CS_CONF.q.length : 'N/A',
      envId: import.meta.env.VITE_CONTENTSQUARE_ID,
    };
  }, [isReady, isEnabled, contentSquareId, retryCount]);

  return {
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
  };
};

// Hook simplificado para casos básicos
export const useContentSquareBasic = () => {
  return useContentSquare();
};

export default useContentSquare;