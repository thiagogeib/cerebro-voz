export function useTTS() {
  const speak = (text) => {
    if (!text) return false

    // Web Speech API — suportada no Chrome Android nativamente
    if (!('speechSynthesis' in window)) {
      return false
    }

    try {
      window.speechSynthesis.cancel()

      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'pt-BR'
      utt.rate = 0.88
      utt.pitch = 1.0
      utt.volume = 1.0

      // Tenta voz pt-BR específica
      const voices = window.speechSynthesis.getVoices()
      const ptVoice =
        voices.find(v => v.lang === 'pt-BR') ||
        voices.find(v => v.lang.startsWith('pt'))
      if (ptVoice) utt.voice = ptVoice

      window.speechSynthesis.speak(utt)
      return true
    } catch {
      return false
    }
  }

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  return { speak, supported }
}
