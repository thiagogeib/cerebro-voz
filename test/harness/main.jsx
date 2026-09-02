import React from 'react'
import ReactDOM from 'react-dom/client'
import AppPage from '../../src/pages/AppPage'
import '../../src/index.css'
import { getCachedAudio, putCachedAudio, countCachedAudio, clearAudioCache } from '../../src/lib/audioCache'

window.__erros = []
window.addEventListener('error', e => window.__erros.push(String(e.message)))
window.addEventListener('unhandledrejection', e => window.__erros.push('rejeicao: ' + String(e.reason)))

window.__audioCache = { getCachedAudio, putCachedAudio, countCachedAudio, clearAudioCache }

// TRAVA DE CUSTO — a razão de ela existir:
// a voz da ElevenLabs é paga. Nenhum teste pode gerar áudio de verdade. Toda
// tentativa é registrada e o teste falha no fim se alguma escapar.
window.__chamadasDeVoz = []
const fetchOriginal = window.fetch
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  if (url.includes('elevenlabs.io') || url.includes('tts-proxy')) {
    window.__chamadasDeVoz.push(url)
    return Promise.reject(new Error('bloqueado pelo teste: chamada de voz paga'))
  }
  return fetchOriginal(input, init)
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppPage />)
