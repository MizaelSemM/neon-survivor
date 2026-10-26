import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o build funciona tanto na raiz do domínio
  // quanto em subdiretórios (ex.: usuario.github.io/neon-survivor/)
  base: './',
})
