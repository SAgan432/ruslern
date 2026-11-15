import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { app } from './server/index.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(app)
      }
    }
  ],
  server: {
    port: 3000,
  },
})
