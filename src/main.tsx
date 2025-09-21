import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MainApp } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <MainApp />
  </StrictMode>,
);
