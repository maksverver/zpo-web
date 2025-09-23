import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ViewPage from '../ui/ViewPage';
import { parseUrlArguments } from '../ui/UrlArguments';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ViewPage urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
