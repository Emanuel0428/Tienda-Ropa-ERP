import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { driveService } from './services/driveService.ts';

// Procesar callback de Google Drive antes de renderizar React
const hash = window.location.hash;
if (hash && hash.includes('access_token') && hash.includes('state=drive_auth')) {
  const success = await driveService.handleAuthCallback();
  
  if (success) {
    const prePath = sessionStorage.getItem('pre_auth_path');
    window.location.href = (prePath && prePath !== '/') ? prePath : '/documents';
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
