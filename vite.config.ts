
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo (development/production)
  // Fix: Cast process to any to resolve TS error where cwd() is not found on the Process type definition.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Isso garante que process.env.VITE_... funcione no código do cliente
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Garante que o index.html seja o ponto de entrada
      rollupOptions: {
        input: {
          main: './index.html'
        }
      }
    }
  };
});
