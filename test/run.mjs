// Sobe o harness, roda os testes e derruba tudo.
// Uso: npm test

import { spawn, spawnSync } from 'node:child_process'

const esperar = (ms) => new Promise(r => setTimeout(r, ms))

async function servidorPronto(url, tentativas = 30) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) return true
    } catch {}
    await esperar(500)
  }
  return false
}

const URL_HARNESS = 'http://localhost:5199/test/harness/index.html'

console.log('\n── arvore (sem navegador) ──')
const arvore = spawnSync(process.execPath, ['test/arvore.test.mjs'], { stdio: 'inherit' })

console.log('\n── app (Chrome) ──')
const vite = spawn('npx', ['vite', '--config', 'vite.config.test.js', '--port', '5199'], {
  stdio: 'ignore', shell: true,
})

let app = { status: 1 }
try {
  if (!(await servidorPronto(URL_HARNESS))) {
    console.error('o harness nao subiu em localhost:5199')
  } else {
    app = spawnSync(process.execPath, ['test/app.test.cjs', 'test'], { stdio: 'inherit' })
  }
} finally {
  vite.kill()
  // no Windows o vite roda em processo filho do shell
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(vite.pid), '/f', '/t'], { stdio: 'ignore' })
}

const falhou = (arvore.status ?? 1) !== 0 || (app.status ?? 1) !== 0
console.log(falhou ? '\n✗ algum teste falhou\n' : '\n✓ tudo passou\n')
process.exit(falhou ? 1 : 0)
