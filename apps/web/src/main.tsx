import React from 'react';
import { createRoot } from 'react-dom/client';
import { App, Overlay } from './studio.js';
import './styles.css';
import './game/game.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname === '/overlay' ? <Overlay /> : <App />}
  </React.StrictMode>,
);
