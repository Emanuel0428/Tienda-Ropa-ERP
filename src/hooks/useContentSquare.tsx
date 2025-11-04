import { useEffect } from 'react';

// Tipos para ContentSquare
declare global {
  interface Window {
    CS_CONF?: {
      id: string;
    };
    uxa?: {
      send: (eventName: string, data?: any) => void;
      setCustomVariable: (key: string, value: string | number) => void;
      setUserId: (userId: string) => void;
      startTransaction: (name: string) => void;
      endTransaction: (name: string) => void;
      tagSession: (tags: string[]) => void;
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

  useEffect(() => {
    // Solo inicializar si tenemos un ID válido y está habilitado
    if (!isEnabled || !contentSquareId) {
      console.log('📊 ContentSquare: Deshabilitado o ID no configurado');
      return;
    }

    // Verificar si ya está inicializado
    if (window.uxa) {
      console.log('📊 ContentSquare: Ya inicializado');
      return;
    }

    // ContentSquare se inicializa automáticamente con el script en el HTML
    // Solo necesitamos esperar a que esté disponible
    const checkContentSquare = () => {
      if (window.uxa) {
        console.log('📊 ContentSquare: Inicializado correctamente con ID:', contentSquareId);
        return true;
      }
      return false;
    };

    // Verificar cada 100ms hasta que esté disponible (máximo 5 segundos)
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (checkContentSquare() || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (attempts >= maxAttempts && !window.uxa) {
          console.warn('📊 ContentSquare: No se pudo inicializar después de 5 segundos');
        }
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [contentSquareId, isEnabled]);

  // Funciones del hook
  const sendEvent = (eventName: string, data?: any) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: sendEvent ignorado -', eventName, data);
      return;
    }

    try {
      window.uxa.send(eventName, data);
      console.log('📊 ContentSquare: Evento enviado -', eventName, data);
    } catch (error) {
      console.error('📊 ContentSquare: Error en sendEvent:', error);
    }
  };

  const setCustomVariable = (key: string, value: string | number) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: setCustomVariable ignorado -', key, value);
      return;
    }

    try {
      window.uxa.setCustomVariable(key, value);
      console.log('📊 ContentSquare: Variable personalizada establecida -', key, value);
    } catch (error) {
      console.error('📊 ContentSquare: Error en setCustomVariable:', error);
    }
  };

  const setUserId = (userId: string) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: setUserId ignorado -', userId);
      return;
    }

    try {
      window.uxa.setUserId(userId);
      console.log('📊 ContentSquare: Usuario identificado -', userId);
    } catch (error) {
      console.error('📊 ContentSquare: Error en setUserId:', error);
    }
  };

  const startTransaction = (name: string) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: startTransaction ignorado -', name);
      return;
    }

    try {
      window.uxa.startTransaction(name);
      console.log('📊 ContentSquare: Transacción iniciada -', name);
    } catch (error) {
      console.error('📊 ContentSquare: Error en startTransaction:', error);
    }
  };

  const endTransaction = (name: string) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: endTransaction ignorado -', name);
      return;
    }

    try {
      window.uxa.endTransaction(name);
      console.log('📊 ContentSquare: Transacción finalizada -', name);
    } catch (error) {
      console.error('📊 ContentSquare: Error en endTransaction:', error);
    }
  };

  const tagSession = (tags: string[]) => {
    if (!isEnabled || !window.uxa) {
      console.log('📊 ContentSquare: tagSession ignorado -', tags);
      return;
    }

    try {
      // ContentSquare no tiene tagSession nativo, usamos variables personalizadas
      tags.forEach((tag, index) => {
        window.uxa!.setCustomVariable(`session_tag_${index}`, tag);
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

  return {
    isEnabled,
    sendEvent,
    setCustomVariable,
    setUserId,
    startTransaction,
    endTransaction,
    tagSession,
    trackAuditEvent,
    contentSquareId
  };
};

// Hook simplificado para casos básicos
export const useContentSquareBasic = () => {
  return useContentSquare();
};

export default useContentSquare;