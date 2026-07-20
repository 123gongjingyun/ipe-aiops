import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, ToastProvider } from '@aiops/shared';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
