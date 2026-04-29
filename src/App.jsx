import { useState, useRef, useCallback } from 'react'
import { CATS } from './data'
import { useTTS } from './useTTS'
import './App.css'

// Chave da API do Claude — configure no .env ou substitua aqui
const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

export default function App() {
  const [selected, setSelected] = useState([])
  const [activeCat, setActiveCat] = useState('familia')
  const [context, setContext] = useState(() => {
    try { return localStorage.getItem('voz_ctx') || '' } catch { return '' }
  })
  const [ctxDraft, setCtxDraft] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showCtx, setShowCtx] = useState(false)
  const [toast, setToast] = useState({ msg: '', show: false })
  const toastTimer = useRef(null)
  const { speak, supported: ttsSupported } = useTTS()

  const cat = CATS.find(c => c.id === activeCat)

  const showToast = useCallback((msg) => {
    setToast({ msg, show: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, show: false })),
      2500
    )
  }, [])

  const addWord = (word) => {
    setSelected(s => [...s, word])
    setSuggestion('')
    try { if (navigator.vibrate) navigator.vibrate(30) } catch {}
  }

  const removeWord = (i) => {
    setSelected(s => s.filter((_, idx) => idx !== i))
    setSuggestion('')
  }

  const clearAll = () => { setSelected([]); setSuggestion('') }

  const handleSpeak = (text) => {
    const msg = text || selected.join(', ')
    if (!msg) return
    if (!ttsSupported) {
      showToast('Abra no Chrome para usar a voz')
      return
    }
    const ok = speak(msg)
    if (ok) showToast('🔊 Falando...')
    else showToast('Erro ao falar — tente no Chrome')
  }

  const askAI = async () => {
    if (!selected.length) { showToast('Selecione ao menos uma palavra'); return }
    if (!API_KEY) { showToast('Configure VITE_ANTHROPIC_KEY no .env'); return }

    setAiLoading(true)
    setSuggestion('')

    const palavras = selected.join(', ')
    const ctx = context
      ? `Contexto pessoal: ${context}`
      : 'Pessoa com afasia progressiva primária. Cognição completamente intacta, apenas a fala comprometida.'

    const prompt = `Você é um assistente de comunicação aumentativa (AAC).
${ctx}

A pessoa selecionou estas palavras/intenções: "${palavras}"

Gere UMA frase natural, completa e humanizada na primeira pessoa (5 a 20 palavras) que expresse o que ela quer comunicar. Use o contexto pessoal se relevante. Responda APENAS com a frase, sem aspas, sem explicações.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text?.trim()
      if (text) setSuggestion(text)
      else showToast('Erro ao gerar sugestão')
    } catch {
      showToast('Erro de conexão com a IA')
    } finally {
      setAiLoading(false)
    }
  }

  const saveContext = () => {
    setContext(ctxDraft)
    try { localStorage.setItem('voz_ctx', ctxDraft) } catch {}
    setShowCtx(false)
    showToast('✓ Contexto salvo')
  }

  return (
    <div className="root">
      {/* HEADER */}
      <header className="header">
        <div className="logo">voz<span>.</span></div>
        <button
          className="icon-btn"
          onClick={() => { setCtxDraft(context); setShowCtx(true) }}
          title="Contexto pessoal"
        >
          👤
        </button>
      </header>

      {/* FRASE CONSTRUÍDA */}
      <div className="phrase-area">
        {selected.length > 0 && (
          <div className="chips">
            {selected.map((w, i) => (
              <button key={i} className="chip" onClick={() => removeWord(i)}>
                {w} <span className="chip-x">×</span>
              </button>
            ))}
          </div>
        )}

        <div className={`phrase-text ${selected.length ? '' : 'empty'}`}>
          {selected.length ? selected.join(' · ') : 'Toque nas palavras abaixo...'}
        </div>

        <div className="actions">
          <button
            className="btn-speak"
            onClick={() => handleSpeak()}
            disabled={!selected.length}
          >
            🔊 Falar
          </button>
          <button
            className="btn-ai"
            onClick={askAI}
            disabled={aiLoading}
          >
            {aiLoading ? '⏳ Pensando...' : '✦ Completar com IA'}
          </button>
          <button className="btn-clear" onClick={clearAll}>
            ✕ Limpar
          </button>
        </div>

        {suggestion && (
          <div className="suggestion">
            <div className="sugg-label">✦ Sugestão — toque para falar</div>
            <div
              className="sugg-text"
              onClick={() => handleSpeak(suggestion)}
            >
              {suggestion}
            </div>
          </div>
        )}
      </div>

      {/* CATEGORIAS */}
      <nav className="cats-bar">
        {CATS.map(c => (
          <button
            key={c.id}
            className={`cat-btn ${c.id === activeCat ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>

      {/* GRID DE PALAVRAS */}
      <main className="words-area">
        <div className="words-grid">
          {cat.words.map((w, i) => (
            <button
              key={i}
              className="word-btn"
              onClick={() => addWord(w.l)}
            >
              <span className="word-emoji">{w.e}</span>
              <span className="word-label">{w.l}</span>
            </button>
          ))}
        </div>
      </main>

      {/* TOAST */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>

      {/* PAINEL CONTEXTO */}
      {showCtx && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCtx(false)}>
          <div className="sheet">
            <h2 className="sheet-title">Contexto pessoal</h2>
            <p className="sheet-sub">
              Escreva memórias, família, hábitos e vocabulário favorito.
              A IA usa isso para sugerir frases mais próximas da realidade dele.
            </p>
            <textarea
              className="ctx-input"
              value={ctxDraft}
              onChange={e => setCtxDraft(e.target.value)}
              placeholder="Ex: Chama-se Carlos, 68 anos. Adora futebol, Flamengo. Filhos: Ana e Pedro. Gosta de café forte pela manhã. Esposa: Maria..."
            />
            <div className="sheet-actions">
              <button className="btn-cancel" onClick={() => setShowCtx(false)}>
                Cancelar
              </button>
              <button className="btn-save" onClick={saveContext}>
                Salvar contexto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
