import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '',  // use relative instead of absolute paths
  build: {
    rollupOptions: {
      input: ['index.html', 'play.html', 'edit.html', 'view.html'],
    },
  },
});
