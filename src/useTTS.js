// ─── ResponsiveVoice TTS ──────────────────────────────────────────────────────
// Gratuito, funciona direto no browser, sem chave de API
// Vozes pt-BR disponíveis no plano free

export const RV_VOICES = [
  { id: "Brazilian Portuguese Female", label: "Feminina 1" },
  { id: "Brazilian Portuguese Male",   label: "Masculina 1" },
  { id: "Portuguese Female",           label: "Feminina 2 (PT)" },
  { id: "Portuguese Male",             label: "Masculino 2 (PT)" },
];

function getRV() {
  return window.responsiveVoice;
}

export function speakElevenLabs(text, voiceId) {
  const rv = getRV();
  if (!rv) {
    console.warn("ResponsiveVoice não carregou, usando fallback");
    return fallbackSpeak(text);
  }

  rv.cancel();
  rv.speak(text, voiceId || "Brazilian Portuguese Female", {
    rate: 0.9,
    pitch: 1,
    volume: 1,
  });
  return true;
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

// Exporta ELEVEN_VOICES como alias pra não precisar mudar o App.jsx
export const ELEVEN_VOICES = RV_VOICES;
