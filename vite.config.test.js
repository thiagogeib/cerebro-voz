import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// Config do harness de teste: troca o cliente Supabase e o useAuth pelos
// substitutos de test/harness/mocks.jsx, para abrir o app sem login e sem rede.
const mock = fileURLToPath(new URL('./test/harness/mocks.jsx', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^(\.\.?\/)+lib\/supabase$/, replacement: mock },
      { find: /^\.\/supabase$/, replacement: mock },
      { find: /^(\.\.?\/)+hooks\/useAuth$/, replacement: mock },
    ],
  },
  server: { port: 5199 },
})
