// ─── VOZ (TEXT-TO-SPEECH) ────────────────────────────────────────────────────
//
// Ordem que o app tenta para falar uma frase:
//
//   1. Cache do navegador  — frase já falada antes. Instantâneo, sem internet,
//                            sem gastar crédito da ElevenLabs.
//   2. ElevenLabs          — voz de verdade. Via proxy do Supabase quando a
//                            chave não está no navegador (ver rota abaixo).
//   3. Voz do celular      — Web Speech API. Robótica, mas funciona offline e
//                            de graça. É a rede de segurança: o Vicente nunca
//                            fica sem conseguir falar.
//
// ROTA DA CHAVE ELEVENLABS
// Se VITE_ELEVEN_KEY existir no build, o navegador chama a ElevenLabs direto
// (modo antigo — a chave fica visível no código do site para quem abrir o
// DevTools). Sem essa variável, o app passa a chamar a Edge Function
// `tts-proxy` do Supabase, que guarda a chave no servidor. Para migrar, basta
// deployar a function e apagar o secret VITE_ELEVEN_KEY do GitHub Actions —
// nenhuma mudança de código é necessária.

import { supabase } from './lib/supabase'
import { getCachedAudio, putCachedAudio } from './lib/audioCache'

export const ELEVEN_VOICES = [
  { id: "Qrdut83w0Cr152Yb4Xn3", label: "Voz 1" },
  { id: "oArP4WehPe3qjqvCwHNo", label: "Voz 2" },
  { id: "sXSV9RZ095VZyL64w3ap", label: "Voz 3" },
  { id: "xHUwLsLfyqiYOIVTzLRW", label: "Voz 4" },
  { id: "TY3h8ANhQUsJaa0Bga5F", label: "Voz 5" },
];

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVEN_KEY || "";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

let currentAudio = null;
let currentUrl = null;

/** Interrompe o que estiver tocando. Chamado antes de cada nova frase. */
export function stopSpeaking() {
  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    if (currentUrl) { try { URL.revokeObjectURL(currentUrl) } catch {} }
    currentAudio = null;
    currentUrl = null;
  }
  try { window.speechSynthesis?.cancel() } catch {}
}

/**
 * Fala uma frase.
 * A Promise resolve QUANDO O ÁUDIO TERMINA (não quando começa) — é isso que
 * permite liberar os botões na hora certa, em vez de chutar um tempo fixo.
 *
 * Resolve com: { ok: boolean, engine: 'cache' | 'eleven' | 'fallback' }
 */
export async function speakElevenLabs(text, voiceId) {
  stopSpeaking();
  if (!text) return { ok: false, engine: null };

  // 1. Já falamos essa frase antes?
  const cached = await getCachedAudio(text, voiceId);
  if (cached) {
    const ok = await playBuffer(cached);
    if (ok) return { ok: true, engine: 'cache' };
  }

  // 2. Gerar na ElevenLabs (direto ou via proxy).
  const buffer = await fetchAudio(text, voiceId);
  if (buffer) {
    void putCachedAudio(text, voiceId, buffer.slice(0));
    const ok = await playBuffer(buffer);
    if (ok) return { ok: true, engine: 'eleven' };
  }

  // 3. Voz do próprio aparelho.
  const ok = await fallbackSpeak(text);
  return { ok, engine: 'fallback' };
}

/** Busca o MP3 na ElevenLabs. Devolve ArrayBuffer ou null se falhar. */
async function fetchAudio(text, voiceId) {
  if (!voiceId) return null;
  try {
    const response = ELEVEN_API_KEY
      ? await fetchDireto(text, voiceId)
      : await fetchViaProxy(text, voiceId);

    if (!response) return null;
    if (!response.ok) {
      console.warn("TTS erro:", response.status, await safeText(response));
      return null;
    }
    return await response.arrayBuffer();
  } catch (e) {
    console.warn("TTS falhou:", e.message);
    return null;
  }
}

// Modo antigo: chave embutida no navegador.
function fetchDireto(text, voiceId) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
}

// Modo seguro: a chave fica na Edge Function, o navegador só manda o texto.
async function fetchViaProxy(text, voiceId) {
  if (!SUPABASE_URL) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  return fetch(`${SUPABASE_URL}/functions/v1/tts-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });
}

/** Toca o MP3 e só resolve quando ele acaba. */
function playBuffer(arrayBuffer) {
  return new Promise(resolve => {
    try {
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mpeg" }));
      const audio = new Audio(url);
      currentAudio = audio;
      currentUrl = url;

      const finish = (ok) => {
        if (currentAudio === audio) {
          try { URL.revokeObjectURL(url) } catch {}
          currentAudio = null;
          currentUrl = null;
        }
        resolve(ok);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    } catch {
      resolve(false);
    }
  });
}

/**
 * Voz do aparelho. Também só resolve quando termina de falar.
 *
 * Alguns aparelhos (e o WebView de apps) nunca disparam `onend`. Por isso há
 * um limite estimado pelo tamanho do texto: sem ele, os botões do app
 * ficariam bloqueados esperando um aviso que nunca chega.
 */
function fallbackSpeak(text) {
  return new Promise(resolve => {
    let pronto = false;
    const terminar = (ok) => { if (!pronto) { pronto = true; resolve(ok); } };

    try {
      if (!("speechSynthesis" in window)) return terminar(false);
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "pt-BR";
      utt.rate = 0.82;
      const voices = window.speechSynthesis.getVoices();
      const pt = voices.find(v => v.lang === "pt-BR") || voices.find(v => v.lang.startsWith("pt"));
      if (pt) utt.voice = pt;

      utt.onend = () => terminar(true);
      utt.onerror = () => terminar(false);
      window.speechSynthesis.speak(utt);

      // Aparelho sem voz instalada aceita o `speak` e não fala nada. Se em
      // 300ms nada começou, desiste na hora em vez de travar os botões.
      setTimeout(() => {
        const sintetizando = window.speechSynthesis.speaking || window.speechSynthesis.pending;
        if (!sintetizando) terminar(false);
      }, 300);

      // ~90ms por caractere na velocidade 0.82, com uma folga inicial.
      setTimeout(() => terminar(true), Math.min(15000, 1200 + text.length * 90));
    } catch {
      terminar(false);
    }
  });
}

async function safeText(response) {
  try { return await response.text() } catch { return "" }
}

// Aliases mantidos por compatibilidade com código antigo.
export function loadVoices() { return Promise.resolve([]); }
export function getAvailableVoices() { return ELEVEN_VOICES; }
