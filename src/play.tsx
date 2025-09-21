import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { parseUrlArguments, PlayApp } from './app.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <PlayApp urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
