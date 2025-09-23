import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PlayPage from '../ui/PlayPage';
import { parseUrlArguments } from '../ui/UrlArguments';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <PlayPage urlArgs={parseUrlArguments()}/>
  </StrictMode>,
);
