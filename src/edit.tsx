import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EditApp } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <EditApp />
  </StrictMode>,
);
