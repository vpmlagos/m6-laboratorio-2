import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // Asegura que se ejecuta en localhost
    port: 3001, // Cambia si es necesario
    strictPort: true, // Evita que cambie el puerto automáticamente
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
})
