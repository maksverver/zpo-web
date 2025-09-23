import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IndexPage from '../ui/IndexPage.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <IndexPage />
  </StrictMode>,
);
