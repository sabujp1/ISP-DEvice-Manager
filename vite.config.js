import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spawn-snmp-backend',
      configureServer() {
        console.log('Spawning SNMP Backend Server (server.js)...');
        const child = spawn('node', ['server.js'], {
          stdio: 'inherit',
          shell: true
        });
        child.on('error', (err) => {
          console.error('Failed to start SNMP backend server:', err);
        });
        process.on('exit', () => child.kill());
      }
    }
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
