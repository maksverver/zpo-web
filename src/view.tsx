import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { parseUrlArguments, ViewApp } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ViewApp urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
