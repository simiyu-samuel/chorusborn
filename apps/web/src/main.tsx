import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { CombatLab } from './game/combat-lab.js';
import { App, Overlay } from './studio.js';
import './styles.css';
import './game/game.css';

const ViewerGuide = lazy(() =>
  import('./viewer/guide.js').then((module) => ({ default: module.ViewerGuide })),
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {['/guide', '/guide/'].includes(window.location.pathname) ? (
      <Suspense
        fallback={
          <p className="viewer-loading" role="status">
            Opening the viewer guide…
          </p>
        }
      >
        <ViewerGuide />
      </Suspense>
    ) : window.location.pathname === '/combat-lab' ? (
      <CombatLab />
    ) : window.location.pathname === '/overlay' ? (
      <Overlay />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
