// ─── CACHE DE ÁUDIO DAS FRASES ───────────────────────────────────────────────
//
// Guarda no navegador o MP3 de cada frase já falada. Serve para três coisas:
//
//   1. Economia — a mesma frase só é gerada UMA vez na ElevenLabs. Da segunda
//      vez em diante sai do cache e não consome crédito.
//   2. Velocidade — frase repetida fala na hora, sem esperar a internet.
//      Para quem depende do app para falar, esse atraso é o que mais incomoda.
//   3. Offline — sem internet, tudo que ele já falou antes continua falando
//      com a voz de verdade (não com a voz robótica do celular).
//
// Usa a Cache Storage API do navegador (a mesma do service worker), que
// aguenta bem mais dados que o localStorage e guarda binário nativamente.
// A URL abaixo é só uma CHAVE — nunca é acessada de verdade pela rede.

const CACHE_NAME = 'vicente-tts-v1'

// Teto de frases guardadas. A árvore tem ~60 nós; 300 dá folga para
// favoritas e frases digitadas sem estourar o disco do celular.
const MAX_ENTRIES = 300

function supported() {
  return typeof caches !== 'undefined'
}

function keyFor(text, voiceId) {
  return `https://tts.vicente.local/${encodeURIComponent(voiceId || 'default')}/${encodeURIComponent(text)}`
}

/** Devolve o ArrayBuffer do áudio já guardado, ou null se nunca foi gerado. */
export async function getCachedAudio(text, voiceId) {
  if (!supported()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const hit = await cache.match(keyFor(text, voiceId))
    if (!hit) return null
    return await hit.arrayBuffer()
  } catch {
    return null
  }
}

/** Guarda o áudio. Falha em silêncio — cache cheio nunca pode impedir a fala. */
export async function putCachedAudio(text, voiceId, arrayBuffer) {
  if (!supported()) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      keyFor(text, voiceId),
      new Response(arrayBuffer, { headers: { 'Content-Type': 'audio/mpeg' } })
    )
    void trim(cache)
  } catch {
    // Quota estourada ou modo privativo: segue sem cache.
  }
}

/** Remove as entradas mais antigas quando passa do teto (FIFO). */
async function trim(cache) {
  try {
    const keys = await cache.keys()
    if (keys.length <= MAX_ENTRIES) return
    const excedente = keys.slice(0, keys.length - MAX_ENTRIES)
    await Promise.all(excedente.map(k => cache.delete(k)))
  } catch {}
}

/** Limpa tudo (usado ao trocar de voz — o áudio antigo é de outra voz). */
export async function clearAudioCache() {
  if (!supported()) return
  try { await caches.delete(CACHE_NAME) } catch {}
}

/** Quantas frases estão guardadas — mostrado na tela de configuração. */
export async function countCachedAudio() {
  if (!supported()) return 0
  try {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.keys()).length
  } catch {
    return 0
  }
}
