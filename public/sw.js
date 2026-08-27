// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
//
// Faz o app abrir sem internet. Para quem depende dele para falar, ficar sem
// sinal não pode significar ficar sem voz.
//
// O que fica offline:
//   · a tela do app (HTML, JavaScript, CSS, ícones e fontes);
//   · as frases já faladas antes, guardadas pelo src/lib/audioCache.js;
//   · a voz do próprio aparelho, que funciona sem rede de qualquer jeito.
//
// O que NÃO funciona offline (e nem deveria): login novo, painel admin e o
// envio de estatísticas — este último fica numa fila e sobe depois sozinho.
//
// Requisições ao Supabase e à ElevenLabs passam direto, sem cache: resposta
// velha de API seria pior que erro de rede.

const SHELL = 'vicente-shell-v1'
const FONTES = 'vicente-fontes-v1'

// Cache dos áudios (src/lib/audioCache.js). Listado aqui só para deixar claro
// que a limpeza de versões antigas não pode apagá-lo.
const CACHE_TTS = 'vicente-tts-v1'

const ESSENCIAIS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => cache.addAll(ESSENCIAIS))
      .catch(() => {})          // um item que falhe não pode abortar a instalação
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes
          .filter(n => n !== SHELL && n !== FONTES && n !== CACHE_TTS)
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // APIs sempre na rede.
  if (url.hostname.includes('supabase.co') || url.hostname.includes('elevenlabs.io')) return

  // Fontes do Google: uma vez baixadas, valem para sempre.
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(req, FONTES))
    return
  }

  if (url.origin !== self.location.origin) return

  // Abrir o app: tenta a rede (para pegar versão nova) e cai no cache se
  // não houver sinal.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          void guardar(SHELL, '/index.html', resp.clone())
          return resp
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    )
    return
  }

  // Demais arquivos do site: responde do cache na hora e atualiza por trás.
  event.respondWith(staleWhileRevalidate(req, SHELL))
})

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  if (hit) return hit
  try {
    const resp = await fetch(req)
    if (resp.ok || resp.type === 'opaque') void cache.put(req, resp.clone())
    return resp
  } catch (e) {
    return hit || Response.error()
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)

  const rede = fetch(req)
    .then(resp => {
      if (resp.ok) void cache.put(req, resp.clone())
      return resp
    })
    .catch(() => null)

  return hit || (await rede) || Response.error()
}

async function guardar(cacheName, chave, resp) {
  try {
    if (!resp.ok) return
    const cache = await caches.open(cacheName)
    await cache.put(chave, resp)
  } catch {}
}
