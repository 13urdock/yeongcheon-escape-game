// src/main.tsx — React 진입점. App을 #root에 마운트
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
