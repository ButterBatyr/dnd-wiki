import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' + HashRouter = работает на GitHub Pages под любым именем репозитория
export default defineConfig({
  base: './',
  plugins: [react()],
});
