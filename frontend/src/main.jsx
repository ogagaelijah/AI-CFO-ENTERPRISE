import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initSentry } from './services/sentry';
import './index.css';
import App from './App.jsx';

// Init Sentry before anything renders
initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);