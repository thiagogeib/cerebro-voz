export const ELEVEN_VOICES = [
  { id: "Qrdut83w0Cr152Yb4Xn3", label: "Voz 1" },
  { id: "oArP4WehPe3qjqvCwHNo", label: "Voz 2" },
  { id: "sXSV9RZ095VZyL64w3ap", label: "Voz 3" },
  { id: "xHUwLsLfyqiYOIVTzLRW", label: "Voz 4" },
  { id: "TY3h8ANhQUsJaa0Bga5F", label: "Voz 5" },
];

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVEN_KEY || "";

let currentAudio = null;

export async function speakElevenLabs(text, voiceId) {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }

  if (!ELEVEN_API_KEY || !voiceId) {
    console.warn("ElevenLabs: chave ou voiceId ausente, usando fallback");
    return fallbackSpeak(text);
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.warn("ElevenLabs erro:", response.status, err);
      return fallbackSpeak(text);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    };
    await currentAudio.play();
    return true;
  } catch (e) {
    console.warn("ElevenLabs falhou:", e.message);
    return fallbackSpeak(text);
  }
}

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
