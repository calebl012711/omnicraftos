import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Recorder } from './recorder/Recorder';
const ModelStudio = React.lazy(() => import('./cad/ModelStudio').then(module => ({ default: module.ModelStudio })));
const MusicStudio = React.lazy(() => import('./music/MusicStudio').then(module => ({ default: module.MusicStudio })));
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={<p>Loading workspace…</p>}>
      {new URLSearchParams(location.search).get('tool') === 'model' ? <ModelStudio /> : new URLSearchParams(location.search).get('tool') === 'recorder' ? <Recorder /> : new URLSearchParams(location.search).get('tool') === 'music' ? <MusicStudio /> : <App />}
    </React.Suspense>
  </React.StrictMode>
);
