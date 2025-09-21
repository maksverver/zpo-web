import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getUrlArguments, PlayApp } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <PlayApp urlArgs={getUrlArguments()}/>
  </StrictMode>,
);
