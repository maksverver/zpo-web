import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EditApp, parseUrlArguments } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <EditApp urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
