import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/setupIonic';
import './theme/index.css';
import App from './app/App';
import { bootstrap } from './app/bootstrap';

void bootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
