import { useEffect } from 'react';

export const useDarkMode = () => {
  useEffect(() => {
    // Aplicar tema guardado al cargar la aplicación
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
};
