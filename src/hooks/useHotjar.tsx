import { useEffect } from 'react';

// Tipos para Hotjar
declare global {
  interface Window {
    hj?: (command: string, ...args: any[]) => void;
    _hjSettings?: {
      hjid: number;
      hjsv: number;
    };
  }
}

interface HotjarConfig {
  hjid: number;
  hjsv?: number;
  enabled?: boolean;
}

/**
 * Hook personalizado para manejar Hotjar Analytics
 * Proporciona funciones para tracking de eventos y gestión de sesiones
 */
export const useHotjar = (config?: HotjarConfig) => {
  const hotjarId = config?.hjid || Number(import.meta.env.VITE_HOTJAR_ID) || null;
  const isEnabled = config?.enabled !== false && !!hotjarId && hotjarId !== 9999999;

  useEffect(() => {
    // Solo inicializar si tenemos un ID válido y está habilitado
    if (!isEnabled || !hotjarId) {
      console.log('🔥 Hotjar: Deshabilitado o ID no configurado');
      return;
    }

    // Verificar si ya está inicializado
    if (window.hj && window._hjSettings) {
      console.log('🔥 Hotjar: Ya inicializado');
      return;
    }

    // Inicializar Hotjar
    try {
      (function(h: any, o: any, t: any, j: any, a: any, r: any) {
        h.hj = h.hj || function() {
          (h.hj.q = h.hj.q || []).push(arguments);
        };
        h._hjSettings = { hjid: hotjarId, hjsv: 6 };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script');
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

      console.log('🔥 Hotjar: Inicializado correctamente con ID:', hotjarId);
    } catch (error) {
      console.error('🔥 Hotjar: Error en inicialización:', error);
    }
  }, [hotjarId, isEnabled]);

  // Funciones del hook
  const trackEvent = (eventName: string, data?: any) => {
    if (!isEnabled || !window.hj) {
      console.log('🔥 Hotjar: trackEvent ignorado -', eventName, data);
      return;
    }

    try {
      window.hj('event', eventName);
      console.log('🔥 Hotjar: Evento rastreado -', eventName, data);
    } catch (error) {
      console.error('🔥 Hotjar: Error en trackEvent:', error);
    }
  };

  const identifyUser = (userId: string, attributes?: Record<string, any>) => {
    if (!isEnabled || !window.hj) {
      console.log('🔥 Hotjar: identifyUser ignorado -', userId);
      return;
    }

    try {
      window.hj('identify', userId);
      if (attributes) {
        window.hj('tagRecording', Object.entries(attributes).map(([k, v]) => `${k}:${v}`));
      }
      console.log('🔥 Hotjar: Usuario identificado -', userId, attributes);
    } catch (error) {
      console.error('🔥 Hotjar: Error en identifyUser:', error);
    }
  };

  const startRecording = () => {
    if (!isEnabled || !window.hj) {
      console.log('🔥 Hotjar: startRecording ignorado');
      return;
    }

    try {
      window.hj('trigger', 'start_recording');
      console.log('🔥 Hotjar: Grabación iniciada');
    } catch (error) {
      console.error('🔥 Hotjar: Error en startRecording:', error);
    }
  };

  const stopRecording = () => {
    if (!isEnabled || !window.hj) {
      console.log('🔥 Hotjar: stopRecording ignorado');
      return;
    }

    try {
      window.hj('trigger', 'stop_recording');
      console.log('🔥 Hotjar: Grabación detenida');
    } catch (error) {
      console.error('🔥 Hotjar: Error en stopRecording:', error);
    }
  };

  const tagSession = (tags: string[]) => {
    if (!isEnabled || !window.hj) {
      console.log('🔥 Hotjar: tagSession ignorado -', tags);
      return;
    }

    try {
      tags.forEach(tag => window.hj!('tagRecording', [tag]));
      console.log('🔥 Hotjar: Sesión etiquetada -', tags);
    } catch (error) {
      console.error('🔥 Hotjar: Error en tagSession:', error);
    }
  };

  return {
    isEnabled,
    trackEvent,
    identifyUser,
    startRecording,
    stopRecording,
    tagSession,
    hotjarId
  };
};

// Hook simplificado para casos básicos
export const useHotjarBasic = () => {
  return useHotjar();
};

export default useHotjar;