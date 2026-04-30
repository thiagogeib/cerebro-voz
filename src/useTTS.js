// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────
// Vozes configuradas — troque os IDs se quiser adicionar mais
export const ELEVEN_VOICES = [
  { id: "Qrdut83w0Cr152Yb4Xn3", label: "Voz 1" },
  { id: "oArP4WehPe3qjqvCwHNo", label: "Voz 2" },
  { id: "sXSV9RZ095VZyL64w3ap", label: "Voz 3" },
  { id: "xHUwLsLfyqiYOIVTzLRW", label: "Voz 4" },
  { id: "TY3h8ANhQUsJaa0Bga5F", label: "Voz 5" },
];

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVEN_KEY || "";
const MODEL_ID = "eleven_multilingual_v2";

let currentAudio = null;

export async function speakElevenLabs(text, voiceId) {
  // Para qualquer áudio anterior
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if (!ELEVEN_API_KEY || !voiceId) {
    return fallbackSpeak(text);
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("ElevenLabs erro:", res.status);
      return fallbackSpeak(text);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.play();
    return true;
  } catch (e) {
    console.warn("ElevenLabs falhou, usando fallback:", e);
    return fallbackSpeak(text);
  }
}

// Fallback pra Web Speech API se ElevenLabs falhar
function fallbackSpeak(text) {
  try {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "pt-BR";
    utt.rate = 0.82;
    const voices = window.speechSynthesis.getVoices();
    const pt = voices.find(v => v.lang === "pt-BR") || voices.find(v => v.lang.startsWith("pt"));
    if (pt) utt.voice = pt;
    window.speechSynthesis.speak(utt);
    return true;
  } catch { return false; }
}
