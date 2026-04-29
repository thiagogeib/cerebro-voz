import { useState, useCallback } from "react";

const CATS = [
  {
    id: "necessidades",
    label: "Necessidades",
    icon: "💧",
    words: [
      { e: "💧", l: "água",      frase: "Estou com sede, gostaria de tomar água." },
      { e: "🍽️", l: "comida",    frase: "Estou com fome, gostaria de comer alguma coisa." },
      { e: "🚽", l: "banheiro",  frase: "Preciso ir ao banheiro." },
      { e: "💊", l: "remédio",   frase: "Está na hora do meu remédio." },
      { e: "🛏️", l: "descansar", frase: "Estou cansado e preciso descansar um pouco." },
      { e: "🥵", l: "calor",     frase: "Estou sentindo muito calor." },
      { e: "🥶", l: "frio",      frase: "Estou sentindo frio." },
      { e: "😣", l: "dor",       frase: "Estou sentindo dor." },
      { e: "🙏", l: "obrigado",  frase: "Muito obrigado por tudo." },
    ],
  },
  {
    id: "sentimentos",
    label: "Sentimentos",
    icon: "💛",
    words: [
      { e: "😊", l: "bem",       frase: "Estou me sentindo bem hoje." },
      { e: "😔", l: "triste",    frase: "Estou me sentindo um pouco triste." },
      { e: "😡", l: "irritado",  frase: "Estou me sentindo irritado agora." },
      { e: "😰", l: "ansioso",   frase: "Estou me sentindo ansioso." },
      { e: "😴", l: "cansado",   frase: "Estou muito cansado." },
      { e: "🥰", l: "feliz",     frase: "Estou feliz e contente." },
      { e: "😕", l: "confuso",   frase: "Estou um pouco confuso, pode repetir?" },
      { e: "👍", l: "sim",       frase: "Sim, concordo." },
      { e: "👎", l: "não",       frase: "Não, não concordo." },
    ],
  },
  {
    id: "familia",
    label: "Família",
    icon: "👨‍👩‍👧",
    words: [
      { e: "👨", l: "filho",     frase: "Quero falar com meu filho." },
      { e: "👩", l: "filha",     frase: "Quero falar com minha filha." },
      { e: "👵", l: "esposa",    frase: "Quero falar com minha esposa." },
      { e: "👴", l: "irmão",     frase: "Quero falar com meu irmão." },
      { e: "👶", l: "neto",      frase: "Quero ver meu neto." },
      { e: "❤️", l: "amor",      frase: "Eu amo muito vocês." },
      { e: "🤗", l: "abraço",    frase: "Quero dar um abraço." },
      { e: "😢", l: "saudade",   frase: "Estou com saudade de vocês." },
      { e: "🏠", l: "casa",      frase: "Quero ir para casa." },
    ],
  },
  {
    id: "acoes",
    label: "Ações",
    icon: "▶️",
    words: [
      { e: "📺", l: "TV",        frase: "Quero assistir televisão." },
      { e: "☕", l: "café",      frase: "Quero tomar um café." },
      { e: "🎵", l: "música",    frase: "Quero ouvir uma música." },
      { e: "🚶", l: "sair",      frase: "Quero sair para caminhar um pouco." },
      { e: "📞", l: "ligar",     frase: "Quero ligar para alguém." },
      { e: "✋", l: "parar",     frase: "Por favor, pode parar." },
      { e: "🔁", l: "repetir",   frase: "Pode repetir o que disse?" },
      { e: "⏩", l: "continuar", frase: "Pode continuar, por favor." },
      { e: "🆘", l: "ajuda",     frase: "Preciso de ajuda." },
    ],
  },
  {
    id: "memorias",
    label: "Memórias",
    icon: "✨",
    words: [
      { e: "⚽", l: "futebol",      frase: "Vamos ver o jogo de futebol?" },
      { e: "🏖️", l: "praia",        frase: "Estou lembrando das nossas idas à praia." },
      { e: "🎉", l: "festa",        frase: "Estou lembrando de uma festa especial." },
      { e: "🍺", l: "churrasco",    frase: "Quero fazer um churrasco em família." },
      { e: "🎂", l: "aniversário",  frase: "Hoje é aniversário de alguém especial." },
      { e: "🚗", l: "viagem",       frase: "Estou lembrando das nossas viagens." },
      { e: "📸", l: "foto",         frase: "Quero ver as fotos da família." },
      { e: "🌳", l: "natureza",     frase: "Gostaria de estar em contato com a natureza." },
      { e: "🏡", l: "infância",     frase: "Estou pensando na minha infância." },
    ],
  },
];

function safeSpeak(text) {
  try {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "pt-BR";
    utt.rate = 0.82;
    utt.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const pt = voices.find((v) => v.lang === "pt-BR") || voices.find((v) => v.lang.startsWith("pt"));
    if (pt) utt.voice = pt;
    window.speechSynthesis.speak(utt);
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const [activeCat, setActiveCat] = useState("necessidades");
  const [lastSpoken, setLastSpoken] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showCtx, setShowCtx] = useState(false);
  const [context, setContext] = useState(() => {
    try { return localStorage.getItem("voz_ctx") || ""; } catch { return ""; }
  });
  const [ctxDraft, setCtxDraft] = useState("");

  const cat = CATS.find((c) => c.id === activeCat);

  const handleWord = useCallback(async (word) => {
    if (speaking) return;
    setSpeaking(true);
    setLastSpoken(word);
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}

    // Se tem contexto pessoal, usa IA pra personalizar a frase
    // Caso contrário, usa a frase padrão direto
    if (context.trim()) {
      try {
        const prompt = `Você é um assistente de comunicação aumentativa (AAC) para uma pessoa com afasia progressiva primária. Cognição intacta, só a fala comprometida.\n\nContexto pessoal: ${context}\n\nA pessoa quer expressar: "${word.frase}"\n\nReescreva essa frase de forma mais pessoal e natural, usando o contexto acima se relevante. Máximo 20 palavras, primeira pessoa. Só a frase, sem aspas.`;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 80,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await res.json();
        const text = data?.content?.[0]?.text?.trim();
        if (text) {
          safeSpeak(text);
          setLastSpoken({ ...word, frase: text });
          setSpeaking(false);
          return;
        }
      } catch {}
    }

    safeSpeak(word.frase);
    setTimeout(() => setSpeaking(false), 2500);
  }, [speaking, context]);

  const replay = () => {
    if (lastSpoken) safeSpeak(lastSpoken.frase);
  };

  const saveContext = () => {
    setContext(ctxDraft);
    try { localStorage.setItem("voz_ctx", ctxDraft); } catch {}
    setShowCtx(false);
  };

  return (
    <div style={s.root}>
      {/* HEADER */}
      <div style={s.header}>
        <span style={s.logo}>voz<span style={s.dot}>.</span></span>
        {lastSpoken && (
          <button style={s.replayBtn} onClick={replay} title="Repetir">
            🔊
          </button>
        )}
        <button style={s.ctxBtn} onClick={() => { setCtxDraft(context); setShowCtx(true); }}>
          👤
        </button>
      </div>

      {/* ÚLTIMA FRASE FALADA */}
      <div style={s.lastPhrase}>
        {lastSpoken ? (
          <>
            <span style={s.lastEmoji}>{lastSpoken.e}</span>
            <span style={s.lastText}>{lastSpoken.frase}</span>
          </>
        ) : (
          <span style={s.placeholder}>Toque em uma palavra para falar...</span>
        )}
      </div>

      {/* CATEGORIAS */}
      <div style={s.catsBar}>
        {CATS.map((c) => (
          <button
            key={c.id}
            style={{ ...s.catBtn, ...(c.id === activeCat ? s.catActive : {}) }}
            onClick={() => setActiveCat(c.id)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div style={s.wordsArea}>
        <div style={s.grid}>
          {cat.words.map((w, i) => (
            <button
              key={i}
              style={{ ...s.wordBtn, ...(speaking ? s.wordBtnDisabled : {}) }}
              onClick={() => handleWord(w)}
              disabled={speaking}
            >
              <span style={s.wordEmoji}>{w.e}</span>
              <span style={s.wordLabel}>{w.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PAINEL CONTEXTO */}
      {showCtx && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowCtx(false)}>
          <div style={s.sheet}>
            <div style={s.sheetTitle}>Contexto pessoal</div>
            <div style={s.sheetSub}>
              Escreva quem ele é: nome, família, hábitos, frases favoritas.
              A IA usa isso pra personalizar as frases com a voz dele.
            </div>
            <textarea
              style={s.textarea}
              value={ctxDraft}
              onChange={(e) => setCtxDraft(e.target.value)}
              placeholder="Ex: Carlos, 68 anos. Adora futebol, Flamengo. Filhos: Ana e Pedro. Esposa: Maria. Gosta de café forte. Era engenheiro..."
            />
            <div style={s.sheetBtns}>
              <button style={s.btnCancel} onClick={() => setShowCtx(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={saveContext}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#F5F0E8",
    color: "#2C2416",
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    maxWidth: 540,
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "14px 18px 10px",
    background: "#FFFDF8",
    borderBottom: "1px solid #E2D9C8",
    flexShrink: 0,
    gap: 8,
  },
  logo: {
    flex: 1,
    fontFamily: "Georgia, serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#5B7B6F",
    letterSpacing: -0.5,
  },
  dot: { color: "#C4956A" },
  replayBtn: {
    background: "#EAF2EF",
    border: "none",
    borderRadius: 40,
    padding: "6px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "#5B7B6F",
    fontWeight: 600,
  },
  ctxBtn: {
    width: 36, height: 36,
    background: "none", border: "none",
    borderRadius: "50%", cursor: "pointer",
    fontSize: 18,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  lastPhrase: {
    background: "#FFFDF8",
    borderBottom: "1px solid #E2D9C8",
    padding: "14px 18px",
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  lastEmoji: { fontSize: 28, flexShrink: 0 },
  lastText: {
    fontFamily: "Georgia, serif",
    fontSize: 17,
    lineHeight: 1.4,
    color: "#2C2416",
  },
  placeholder: {
    fontFamily: "Georgia, serif",
    fontSize: 15,
    fontStyle: "italic",
    color: "#8A7D6A",
  },
  catsBar: {
    display: "flex",
    overflowX: "auto",
    background: "#FFFDF8",
    borderBottom: "1px solid #E2D9C8",
    flexShrink: 0,
    scrollbarWidth: "none",
  },
  catBtn: {
    padding: "10px 16px",
    background: "none", border: "none",
    borderBottom: "2px solid transparent",
    color: "#8A7D6A",
    fontSize: 12, fontWeight: 500,
    cursor: "pointer", whiteSpace: "nowrap",
    flexShrink: 0, transition: "all 0.2s",
  },
  catActive: {
    color: "#5B7B6F",
    borderBottomColor: "#5B7B6F",
  },
  wordsArea: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  wordBtn: {
    background: "#FFFDF8",
    border: "1.5px solid #E2D9C8",
    borderRadius: 14,
    padding: "14px 8px",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8,
    cursor: "pointer",
    minHeight: 82,
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(44,36,22,0.07)",
    transition: "transform 0.1s, background 0.1s",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  },
  wordBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  wordEmoji: { fontSize: 28, lineHeight: 1 },
  wordLabel: {
    fontSize: 11, fontWeight: 600,
    color: "#2C2416", textAlign: "center",
    lineHeight: 1.2, textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(44,36,22,0.5)",
    zIndex: 200,
    display: "flex", alignItems: "flex-end",
  },
  sheet: {
    background: "#FFFDF8", width: "100%",
    borderRadius: "20px 20px 0 0",
    padding: 20, maxHeight: "75vh", overflowY: "auto",
  },
  sheetTitle: {
    fontFamily: "Georgia, serif", fontSize: 20,
    color: "#2C2416", marginBottom: 4,
  },
  sheetSub: { fontSize: 13, color: "#8A7D6A", marginBottom: 14, lineHeight: 1.5 },
  textarea: {
    width: "100%", minHeight: 130,
    border: "1.5px solid #E2D9C8",
    borderRadius: 12, padding: 12,
    fontSize: 14, color: "#2C2416",
    background: "#F5F0E8",
    resize: "vertical", outline: "none",
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  sheetBtns: { display: "flex", gap: 8, marginTop: 12 },
  btnSave: {
    flex: 1, padding: 13,
    background: "#5B7B6F", color: "white",
    border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  btnCancel: {
    padding: "13px 18px",
    background: "#E2D9C8", color: "#8A7D6A",
    border: "none", borderRadius: 12,
    fontSize: 15, cursor: "pointer",
  },
};
