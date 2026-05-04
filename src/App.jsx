import { useState, useCallback, useEffect, useRef } from "react";
import { speakElevenLabs, ELEVEN_VOICES, loadVoices } from "./useTTS";

// ─── ÁRVORE BÁSICO / INTERMEDIÁRIO ─────────────────────────────────────────── v2
const TREE = {
  basico: [
    { id: "sede", e: "💧", l: "Sede", filhos: [
      { id: "agua",      e: "💧", l: "Água",    frase: "Estou com sede, quero água por favor." },
      { id: "suco",      e: "🧃", l: "Suco",    frase: "Quero tomar um suco, por favor." },
      { id: "cafe",      e: "☕", l: "Café",    frase: "Quero tomar um café, por favor." },
      { id: "cha",       e: "🍵", l: "Chá",     frase: "Quero tomar um chá, por favor." },
    ]},
    { id: "fome", e: "🍽️", l: "Fome", filhos: [
      { id: "refeicao",  e: "🍽️", l: "Refeição", frase: "Estou com fome, quero comer alguma coisa." },
      { id: "fruta",     e: "🍎", l: "Fruta",    frase: "Quero comer uma fruta." },
      { id: "pao",       e: "🍞", l: "Pão",      frase: "Quero comer um pão." },
      { id: "sopa",      e: "🥣", l: "Sopa",     frase: "Quero comer uma sopa." },
    ]},
    { id: "dor", e: "😣", l: "Dor", filhos: [
      { id: "dor_cabeca",  e: "🤕", l: "Cabeça",  frase: "Estou com dor de cabeça." },
      { id: "dor_corpo",   e: "💪", l: "Corpo",   frase: "Estou com dor no corpo." },
      { id: "dor_barriga", e: "🤢", l: "Barriga", frase: "Estou com dor de barriga." },
      { id: "dor_forte",   e: "🆘", l: "Forte",   frase: "Estou sentindo uma dor muito forte, preciso de ajuda." },
    ]},
    { id: "banheiro", e: "🚽", l: "Banheiro", frase: "Preciso ir ao banheiro." },
    { id: "remedios", e: "💊", l: "Remédio", filhos: [
      { id: "rem_hora",   e: "⏰", l: "Hora certa",  frase: "Está na hora do meu remédio." },
      { id: "rem_dor",    e: "😣", l: "Para dor",    frase: "Preciso de remédio para dor." },
      { id: "rem_dormir", e: "😴", l: "Para dormir", frase: "Preciso do remédio para dormir." },
    ]},
    { id: "ajuda", e: "🆘", l: "Ajuda", frase: "Preciso de ajuda agora, por favor." },
  ],
  intermediario: [
    { id: "sentir", e: "💛", l: "Me sinto", filhos: [
      { id: "bem",      e: "😊", l: "Bem",      frase: "Estou me sentindo bem hoje." },
      { id: "mal", e: "😔", l: "Mal", filhos: [
        { id: "cansado",  e: "😴", l: "Cansado",  frase: "Estou me sentindo muito cansado." },
        { id: "triste",   e: "😢", l: "Triste",   frase: "Estou me sentindo triste." },
        { id: "ansioso",  e: "😰", l: "Ansioso",  frase: "Estou me sentindo ansioso e agitado." },
        { id: "confuso",  e: "😕", l: "Confuso",  frase: "Estou me sentindo confuso, pode me ajudar?" },
      ]},
      { id: "feliz",    e: "🥰", l: "Feliz",    frase: "Estou feliz e contente hoje." },
      { id: "irritado", e: "😡", l: "Irritado", frase: "Estou me sentindo irritado agora." },
    ]},
    { id: "familia", e: "👨‍👩‍👧", l: "Família", filhos: [
      { id: "falar_filho",  e: "👨", l: "Filho",  frase: "Quero falar com meu filho." },
      { id: "falar_filha",  e: "👩", l: "Filha",  frase: "Quero falar com minha filha." },
      { id: "falar_esposa", e: "👵", l: "Esposa", frase: "Quero falar com minha esposa." },
      { id: "amor",         e: "❤️", l: "Amor",   frase: "Eu amo muito vocês." },
      { id: "abraco",       e: "🤗", l: "Abraço", frase: "Quero dar um abraço." },
    ]},
    { id: "quero", e: "▶️", l: "Quero", filhos: [
      { id: "tv",        e: "📺", l: "TV",       frase: "Quero assistir televisão." },
      { id: "musica",    e: "🎵", l: "Música",   frase: "Quero ouvir uma música." },
      { id: "sair",      e: "🚶", l: "Sair",     frase: "Quero sair para caminhar um pouco." },
      { id: "descansar", e: "🛏️", l: "Descansar",frase: "Quero descansar, estou cansado." },
      { id: "cafe_int",  e: "☕", l: "Café",     frase: "Quero tomar um café." },
    ]},
    { id: "simnas", e: "👍", l: "Sim / Não", filhos: [
      { id: "sim",      e: "👍", l: "Sim",      frase: "Sim, concordo." },
      { id: "nao",      e: "👎", l: "Não",      frase: "Não, não concordo." },
      { id: "talvez",   e: "🤔", l: "Talvez",   frase: "Talvez, preciso pensar." },
      { id: "repetir",  e: "🔁", l: "Repetir",  frase: "Pode repetir o que disse?" },
      { id: "obrigado", e: "🙏", l: "Obrigado", frase: "Muito obrigado por tudo." },
    ]},
  ],
};

function getCats(nivel) {
  if (nivel === "basico") return TREE.basico;
  return [...TREE.basico, ...TREE.intermediario];
}

// Sugestões por horário do dia
function getSugestoes(historico, context) {
  const h = new Date().getHours();
  const base = h >= 5 && h < 12
    ? [
        { e: "☕", l: "Café da manhã",  frase: "Quero tomar meu café da manhã." },
        { e: "💊", l: "Remédio manhã",  frase: "Está na hora do meu remédio da manhã." },
        { e: "😊", l: "Bom dia",        frase: "Bom dia! Dormi bem." },
      ]
    : h >= 12 && h < 18
    ? [
        { e: "🍽️", l: "Almoço",        frase: "Estou com fome, está na hora do almoço." },
        { e: "😴", l: "Soneca",         frase: "Estou com sono, quero descansar um pouco." },
        { e: "☕", l: "Café da tarde",  frase: "Quero tomar um café com alguma coisa." },
      ]
    : [
        { e: "🌙", l: "Boa noite",      frase: "Boa noite, estou com sono." },
        { e: "💊", l: "Remédio noite",  frase: "Está na hora do meu remédio da noite." },
        { e: "🛏️", l: "Dormir",         frase: "Quero ir dormir agora." },
      ];

  // Adiciona do histórico recente (últimas usadas)
  const recentes = historico
    .slice(-3)
    .reverse()
    .filter(f => !base.find(b => b.frase === f.frase));

  return [...base, ...recentes].slice(0, 5);
}

// TTS via ElevenLabs (ver useTTS.js)

const NIVEIS = [
  { id: "basico",        label: "Básico",        icon: "🟢", desc: "Botões grandes, só necessidades essenciais" },
  { id: "intermediario", label: "Intermediário",  icon: "🟡", desc: "Categorias completas com árvore de opções" },
  { id: "avancado",      label: "Avançado",       icon: "🔴", desc: "Favoritas, predição por horário e escrita livre" },
];


// ─── ESCALA DE DOR ────────────────────────────────────────────────────────────
function PainScale({ onSelect, speaking }) {
  const levels = [
    { n: 0,  color: "#4CAF50", label: "Sem dor",       frase: "Não estou sentindo dor agora." },
    { n: 1,  color: "#8BC34A", label: "Mínima",         frase: "Estou com uma dor mínima, quase nada." },
    { n: 2,  color: "#CDDC39", label: "Leve",           frase: "Estou com uma dor leve." },
    { n: 3,  color: "#FFEB3B", label: "Leve",           frase: "Estou com uma dor leve, mas percebo ela." },
    { n: 4,  color: "#FFC107", label: "Moderada",       frase: "Estou com uma dor moderada." },
    { n: 5,  color: "#FF9800", label: "Moderada",       frase: "Estou com uma dor moderada, está me incomodando." },
    { n: 6,  color: "#FF7043", label: "Forte",          frase: "Estou com uma dor forte." },
    { n: 7,  color: "#F44336", label: "Intensa",        frase: "Estou com uma dor intensa, preciso de ajuda." },
    { n: 8,  color: "#E53935", label: "Muito intensa",  frase: "Estou com uma dor muito intensa." },
    { n: 9,  color: "#C62828", label: "Insuportável",   frase: "Estou com uma dor insuportável, preciso de socorro." },
    { n: 10, color: "#B71C1C", label: "Máxima",         frase: "Estou com dor no nível máximo, é uma emergência!" },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7D6A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        📊 Nível de dor — toque para falar
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {levels.map(l => (
          <button
            key={l.n}
            disabled={speaking}
            onClick={() => onSelect(l)}
            style={{
              flex: 1,
              height: 44,
              background: l.color,
              border: "none",
              borderRadius: 8,
              color: l.n <= 2 ? "#2C2416" : "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: speaking ? "not-allowed" : "pointer",
              opacity: speaking ? 0.5 : 1,
              transition: "transform 0.1s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onTouchStart={e => { if (!speaking) e.currentTarget.style.transform = "scale(0.9)"; }}
            onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {l.n}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#8A7D6A" }}>😊 Sem dor</span>
        <span style={{ fontSize: 10, color: "#8A7D6A" }}>😱 Dor máxima</span>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [nivel, setNivel] = useState(() => { try { return localStorage.getItem("voz_nivel") || "basico"; } catch { return "basico"; } });
  const [stack, setStack] = useState([]);
  const [lastSpoken, setLastSpoken] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState("nivel");
  const [context, setContext] = useState(() => { try { return localStorage.getItem("voz_ctx") || ""; } catch { return ""; } });
  const [ctxDraft, setCtxDraft] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => { try { return localStorage.getItem("voz_voice") || ELEVEN_VOICES[0]?.id || ""; } catch { return ""; } });
  const [testingVoice, setTestingVoice] = useState("");

  // Avançado
  const [favoritas, setFavoritas] = useState(() => { try { return JSON.parse(localStorage.getItem("voz_favoritas") || "[]"); } catch { return []; } });
  const [favDraft, setFavDraft] = useState([]);
  const [historico, setHistorico] = useState(() => { try { return JSON.parse(localStorage.getItem("voz_historico") || "[]"); } catch { return []; } });
  const [fragmento, setFragmento] = useState("");

  const [sugestoes, setSugestoes] = useState([]);

  useEffect(() => {
    setVoices(ELEVEN_VOICES);
  }, []);

  useEffect(() => {
    if (nivel === "avancado") {
      setSugestoes(getSugestoes(historico, context));
    }
  }, [nivel, historico, context]);

  const falarFrase = useCallback(async (node, fraseBase) => {
    if (speaking) return;
    setSpeaking(true);
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}

    let frase = fraseBase || node.frase;

    if (context.trim()) {
      try {
        const prompt = `AAC para pessoa com afasia. Contexto pessoal: ${context}\nFrase base: "${frase}"\nReescreva de forma pessoal e natural (máx 20 palavras, 1ª pessoa). Só a frase, sem aspas.`;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 80, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await res.json();
        const text = data?.content?.[0]?.text?.trim();
        if (text) frase = text;
      } catch {}
    }

    speakElevenLabs(frase, selectedVoice);
    const spoken = { ...node, frase };
    setLastSpoken(spoken);

    // Salva no histórico
    setHistorico(h => {
      const novo = [...h, spoken].slice(-20);
      try { localStorage.setItem("voz_historico", JSON.stringify(novo)); } catch {}
      return novo;
    });

    setStack([]);
    setTimeout(() => setSpeaking(false), 2500);
  }, [speaking, context, selectedVoice]);

  const handleNode = useCallback((node) => {
    if (speaking) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}
    if (node.filhos?.length) { setStack(s => [...s, node]); return; }
    if (node.frase) falarFrase(node);
  }, [speaking, falarFrase]);

  const gerarDoFragmento = () => {
    if (!fragmento.trim()) return;
    const node = { e: "✍️", l: fragmento, frase: fragmento };
    speakElevenLabs(fragmento, selectedVoice);
    setLastSpoken(node);
    setHistorico(h => {
      const novo = [...h, node].slice(-20);
      try { localStorage.setItem("voz_historico", JSON.stringify(novo)); } catch {}
      return novo;
    });
    setFragmento("");
  };

  const saveConfig = () => {
    setContext(ctxDraft);
    setFavoritas(favDraft);
    try {
      localStorage.setItem("voz_ctx", ctxDraft);
      localStorage.setItem("voz_voice", selectedVoice);
      localStorage.setItem("voz_nivel", nivel);
      localStorage.setItem("voz_favoritas", JSON.stringify(favDraft));
    } catch {}
    setShowConfig(false);
  };

  const currentNodes = stack.length > 0 ? stack[stack.length - 1].filhos : getCats(nivel);
  const nivelInfo = NIVEIS.find(n => n.id === nivel);
  const GRID_COLS = nivel === "basico" ? 2 : 3;
  const BTN_HEIGHT = nivel === "basico" ? 100 : 82;

  return (
    <div style={s.root}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{display:"flex",flexDirection:"column",lineHeight:1.1}}><span style={s.logo}>Vicente<span style={s.dot}>.</span></span><span style={{fontSize:10,color:"#8A7D6A",fontFamily:"'DM Sans',sans-serif",fontWeight:500,letterSpacing:0.5}}>seu assistente de voz</span></div>
        <span style={s.badge}>{nivelInfo.icon} {nivelInfo.label}</span>
        {lastSpoken && <button style={s.replayBtn} onClick={() => speakElevenLabs(lastSpoken.frase, selectedVoice)}>🔊</button>}
        <button style={s.cfgBtn} onClick={() => { setCtxDraft(context); setFavDraft(favoritas); setShowConfig(true); }}>⚙️</button>
      </div>

      {/* ÚLTIMA FRASE */}
      <div style={s.lastPhrase}>
        {lastSpoken
          ? <><span style={s.lastEmoji}>{lastSpoken.e}</span><span style={s.lastText}>{lastSpoken.frase}</span></>
          : <span style={s.placeholder}>Toque em uma opção para começar...</span>}
      </div>

      {/* ── MODO AVANÇADO ── */}
      {nivel === "avancado" ? (
        <div style={s.wordsArea}>

          {/* FAVORITAS */}
          {favoritas.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>⭐ Favoritas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {favoritas.map((f, i) => (
                  <button key={i} style={s.favBtn} onClick={() => falarFrase(f)} disabled={speaking}>
                    <span style={{ fontSize: 22 }}>{f.e}</span>
                    <span style={s.favLabel}>{f.l}</span>
                  </button>
                ))}
              </div>
            </div>
          )}



          {/* FRAGMENTO LIVRE */}
          <div style={s.section}>
            <div style={s.sectionTitle}>✍️ Digite e fale</div>
            <div style={s.fragmentoRow}>
              <input
                style={s.fragmentoInput}
                value={fragmento}
                onChange={e => setFragmento(e.target.value)}
                placeholder="Digite a frase completa e toque →"
                onKeyDown={e => e.key === "Enter" && gerarDoFragmento()}
              />
              <button
                style={s.fragmentoBtn}
                onClick={gerarDoFragmento}
                disabled={!fragmento.trim()}
              >
                📢
              </button>
            </div>
          </div>

          {/* HISTÓRICO RECENTE */}
          {historico.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>🕐 Usadas recentemente</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...historico].reverse().slice(0, 5).map((h, i) => (
                  <button key={i} style={s.historicoBtn} onClick={() => falarFrase(h)} disabled={speaking}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{h.e}</span>
                    <span style={s.historicoText}>{h.frase}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      ) : (
        /* ── MODO BÁSICO / INTERMEDIÁRIO ── */
        <>
          {stack.length > 0 && (
            <div style={s.breadcrumb}>
              <button style={s.backBtn} onClick={() => setStack(s => s.slice(0, -1))}>← Voltar</button>
              <span style={s.breadcrumbText}>{stack.map(n => n.l).join(" › ")}</span>
            </div>
          )}
          <div style={s.wordsArea}>
            {stack.length > 0 && stack[stack.length - 1].id === "dor" && (
            <PainScale speaking={speaking} onSelect={(level) => {
              falarFrase({ e: "😣", l: `Dor ${level.n}`, frase: level.frase });
            }} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: 10 }}>
              {currentNodes?.map((node, i) => (
                <button
                  key={node.id || i}
                  style={{ ...s.wordBtn, minHeight: BTN_HEIGHT, ...(node.filhos ? s.wordBtnNav : {}), ...(speaking ? s.wordDisabled : {}) }}
                  onClick={() => handleNode(node)}
                  disabled={speaking}
                >
                  <span style={{ fontSize: nivel === "basico" ? 36 : 28, lineHeight: 1 }}>{node.e}</span>
                  <span style={{ ...s.wordLabel, fontSize: nivel === "basico" ? 13 : 11 }}>{node.l}</span>
                  {node.filhos && <span style={s.navArrow}>›</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── CONFIG ── */}
      {showConfig && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowConfig(false)}>
          <div style={s.sheet}>
            <div style={s.tabs}>
              {["nivel","contexto","voz","favoritas"].map(t => (
                <button key={t} style={{ ...s.tab, ...(configTab === t ? s.tabActive : {}) }} onClick={() => setConfigTab(t)}>
                  {t === "nivel" ? "🎯" : t === "contexto" ? "👤" : t === "voz" ? "🎙️" : "⭐"}
                </button>
              ))}
            </div>

            {configTab === "nivel" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {NIVEIS.map(n => (
                  <div key={n.id} style={{ ...s.nivelItem, ...(nivel === n.id ? s.nivelSelected : {}) }} onClick={() => setNivel(n.id)}>
                    <span style={{ fontSize: 24 }}>{n.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: "#8A7D6A" }}>{n.desc}</div>
                    </div>
                    {nivel === n.id && <span style={{ color: "#5B7B6F", fontWeight: 700 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}

            {configTab === "contexto" && (
              <>
                <div style={s.sheetSub}>Escreva quem ele é: nome, família, hábitos. A IA usa isso pra personalizar as frases.</div>
                <textarea style={s.textarea} value={ctxDraft} onChange={e => setCtxDraft(e.target.value)}
                  placeholder="Ex: Carlos, 68 anos. Adora Flamengo. Filhos: Ana e Pedro. Esposa: Maria. Era engenheiro..." />
              </>
            )}

            {configTab === "voz" && (
              <>
                <div style={s.sheetSub}>Toque em ▶ para testar cada voz e escolha a favorita.</div>
                {voices.length === 0
                  ? <div style={s.noVoices}>Abra no Chrome para ter vozes em pt-BR.</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                      {ELEVEN_VOICES.map(v => (
                        <div key={v.id} style={{ ...s.voiceItem, ...(selectedVoice === v.id ? s.voiceSelected : {}) }} onClick={() => setSelectedVoice(v.id)}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#2C2416" }}>🎙️ {v.label}</div>
                            <div style={{ fontSize: 11, color: "#8A7D6A", marginTop: 2 }}>ElevenLabs · Toque ▶ para ouvir</div>
                          </div>
                          {selectedVoice === v.id && <span style={{ color: "#5B7B6F", fontWeight: 700, marginRight: 8, fontSize: 18 }}>✓</span>}
                          <button style={{ ...s.voiceTestBtn, ...(testingVoice === v.id ? { background: "#C4956A" } : {}) }}
                            onClick={e => { e.stopPropagation(); setTestingVoice(v.id); speakElevenLabs("Olá, estou me sentindo bem hoje.", v.id); setTimeout(() => setTestingVoice(""), 4000); }}>
                            {testingVoice === v.id ? "⏸" : "▶"}
                          </button>
                        </div>
                      ))}
                    </div>
                }
              </>
            )}

            {configTab === "favoritas" && (
              <>
                <div style={s.sheetSub}>Adicione frases que ele usa com frequência. Aparecem sempre no topo do modo Avançado.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {favDraft.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F5F0E8", borderRadius: 10 }}>
                      <span style={{ fontSize: 20 }}>{f.e}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{f.frase}</span>
                      <button onClick={() => setFavDraft(d => d.filter((_, j) => j !== i))}
                        style={{ background: "#E2D9C8", border: "none", borderRadius: 20, padding: "2px 10px", cursor: "pointer", color: "#8A7D6A", fontSize: 13 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <AddFavorita onAdd={f => setFavDraft(d => [...d, f])} />
              </>
            )}

            <div style={s.sheetBtns}>
              <button style={s.btnCancel} onClick={() => setShowConfig(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={saveConfig}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD FAVORITA ─────────────────────────────────────────────────────────────
function AddFavorita({ onAdd }) {
  const EMOJIS = ["☕","💧","🍽️","💊","📺","🎵","🚶","❤️","🙏","😊","🆘","🤗","📞","🛏️","🍺"];
  const [emoji, setEmoji] = useState("☕");
  const [label, setLabel] = useState("");
  const [frase, setFrase] = useState("");

  return (
    <div style={{ background: "#EAF2EF", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5B7B6F", marginBottom: 8 }}>+ Nova favorita</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            style={{ fontSize: 20, background: emoji === e ? "#5B7B6F" : "#FFFDF8", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
            {e}
          </button>
        ))}
      </div>
      <input style={{ ...inputStyle, marginBottom: 8 }} value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome curto (ex: Café)" />
      <input style={{ ...inputStyle, marginBottom: 10 }} value={frase} onChange={e => setFrase(e.target.value)} placeholder="Frase completa (ex: Quero tomar um café.)" />
      <button
        style={{ width: "100%", padding: 10, background: label && frase ? "#5B7B6F" : "#E2D9C8", color: label && frase ? "white" : "#8A7D6A", border: "none", borderRadius: 10, fontWeight: 600, cursor: label && frase ? "pointer" : "not-allowed", fontSize: 14 }}
        onClick={() => { if (label && frase) { onAdd({ e: emoji, l: label, frase }); setLabel(""); setFrase(""); } }}
      >
        Adicionar
      </button>
    </div>
  );
}

const inputStyle = { width: "100%", border: "1.5px solid #E2D9C8", borderRadius: 10, padding: "8px 12px", fontSize: 13, background: "#FFFDF8", outline: "none", fontFamily: "'DM Sans',sans-serif" };

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = {
  root: { fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F5F0E8", color: "#2C2416", display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 540, margin: "0 auto", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", padding: "12px 16px 10px", background: "#FFFDF8", borderBottom: "1px solid #E2D9C8", flexShrink: 0, gap: 8 },
  logo: { flex: 1, fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: "#5B7B6F", letterSpacing: -0.5 },
  dot: { color: "#C4956A" },
  badge: { fontSize: 11, fontWeight: 600, color: "#8A7D6A", background: "#F5F0E8", padding: "4px 10px", borderRadius: 20 },
  replayBtn: { background: "#EAF2EF", border: "none", borderRadius: 40, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#5B7B6F", fontWeight: 600 },
  cfgBtn: { width: 34, height: 34, background: "none", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" },
  lastPhrase: { background: "#FFFDF8", borderBottom: "1px solid #E2D9C8", padding: "12px 16px", minHeight: 58, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  lastEmoji: { fontSize: 24, flexShrink: 0 },
  lastText: { fontFamily: "Georgia,serif", fontSize: 15, lineHeight: 1.4, color: "#2C2416" },
  placeholder: { fontFamily: "Georgia,serif", fontSize: 14, fontStyle: "italic", color: "#8A7D6A" },
  breadcrumb: { display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "#EAF2EF", borderBottom: "1px solid #D4E7E1", flexShrink: 0 },
  backBtn: { background: "#5B7B6F", color: "white", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  breadcrumbText: { fontSize: 12, color: "#5B7B6F", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  wordsArea: { flex: 1, overflowY: "auto", padding: 12 },
  wordBtn: { background: "#FFFDF8", border: "1.5px solid #E2D9C8", borderRadius: 14, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", justifyContent: "center", boxShadow: "0 2px 8px rgba(44,36,22,0.07)", WebkitTapHighlightColor: "transparent", userSelect: "none", position: "relative" },
  wordBtnNav: { borderColor: "#D4E7E1", background: "#F5FAF8" },
  wordDisabled: { opacity: 0.5, cursor: "not-allowed" },
  wordLabel: { fontWeight: 600, color: "#2C2416", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: 0.5 },
  navArrow: { position: "absolute", bottom: 6, right: 10, fontSize: 16, color: "#5B7B6F", fontWeight: 700, opacity: 0.6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#8A7D6A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  favBtn: { background: "#FFFDF8", border: "1.5px solid #E2D9C8", borderRadius: 14, padding: "10px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", minWidth: 72, boxShadow: "0 2px 8px rgba(44,36,22,0.06)" },
  favLabel: { fontSize: 10, fontWeight: 700, color: "#2C2416", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  sugestaoBtn: { background: "#FFFDF8", border: "1.5px solid #E2D9C8", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 6px rgba(44,36,22,0.06)" },
  sugestaoText: { fontSize: 14, color: "#2C2416", lineHeight: 1.3, fontFamily: "Georgia,serif" },
  fragmentoRow: { display: "flex", gap: 8 },
  fragmentoInput: { flex: 1, border: "1.5px solid #E2D9C8", borderRadius: 12, padding: "10px 14px", fontSize: 14, background: "#FFFDF8", outline: "none", fontFamily: "'DM Sans',sans-serif", color: "#2C2416" },
  fragmentoBtn: { width: 46, background: "#5B7B6F", color: "white", border: "none", borderRadius: 12, fontSize: 18, cursor: "pointer", fontWeight: 700, flexShrink: 0 },
  historicoBtn: { background: "#F5F0E8", border: "1px solid #E2D9C8", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" },
  historicoText: { fontSize: 13, color: "#8A7D6A", lineHeight: 1.3 },
  overlay: { position: "fixed", inset: 0, background: "rgba(44,36,22,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  sheet: { background: "#FFFDF8", width: "100%", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "82vh", overflowY: "auto" },
  tabs: { display: "flex", gap: 4, marginBottom: 16, background: "#F5F0E8", borderRadius: 12, padding: 4 },
  tab: { flex: 1, padding: "8px 6px", background: "none", border: "none", borderRadius: 10, fontSize: 18, cursor: "pointer", color: "#8A7D6A" },
  tabActive: { background: "#FFFDF8", boxShadow: "0 1px 4px rgba(44,36,22,0.1)" },
  sheetSub: { fontSize: 13, color: "#8A7D6A", marginBottom: 12, lineHeight: 1.5 },
  textarea: { width: "100%", minHeight: 110, border: "1.5px solid #E2D9C8", borderRadius: 12, padding: 12, fontSize: 14, color: "#2C2416", background: "#F5F0E8", resize: "vertical", outline: "none", lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif" },
  nivelItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1.5px solid #E2D9C8", borderRadius: 12, cursor: "pointer", background: "#F5F0E8" },
  nivelSelected: { borderColor: "#5B7B6F", background: "#EAF2EF" },
  noVoices: { padding: 16, textAlign: "center", color: "#8A7D6A", fontSize: 14, background: "#F5F0E8", borderRadius: 12 },
  voiceItem: { display: "flex", alignItems: "center", padding: "10px 14px", border: "1.5px solid #E2D9C8", borderRadius: 12, cursor: "pointer", background: "#F5F0E8" },
  voiceSelected: { borderColor: "#5B7B6F", background: "#EAF2EF" },
  voiceTestBtn: { width: 30, height: 30, background: "#5B7B6F", color: "white", border: "none", borderRadius: "50%", fontSize: 11, cursor: "pointer", flexShrink: 0 },
  sheetBtns: { display: "flex", gap: 8, marginTop: 16 },
  btnSave: { flex: 1, padding: 13, background: "#5B7B6F", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnCancel: { padding: "13px 18px", background: "#E2D9C8", color: "#8A7D6A", border: "none", borderRadius: 12, fontSize: 15, cursor: "pointer" },
};
