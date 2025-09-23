import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { parseUrlArguments } from '../ui/UrlArguments.ts';
import EditPage from '../ui/EditPage.tsx';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <EditPage urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
