import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/setupIonic';
import './theme/index.css';
import App from './app/App';
import { bootstrap } from './app/bootstrap';
import { installPwaUpdates } from './app/pwa';

void bootstrap();
if (import.meta.env.PROD) installPwaUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
