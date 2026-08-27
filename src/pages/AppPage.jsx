import { useState, useCallback, useEffect, useRef } from "react";
import { speakElevenLabs, stopSpeaking, ELEVEN_VOICES } from "../useTTS";
import { supabase } from "../lib/supabase";
import { startSession, trackEvent, endSession, fetchHistoricoRemoto } from "../lib/analytics";
import { carregarFavoritas, salvarFavoritas } from "../lib/favoritas";
import { carregarPessoas, salvarPessoas, lerPessoasLocal } from "../lib/pessoas";
import { countCachedAudio, clearAudioCache } from "../lib/audioCache";
import { useAuth } from "../hooks/useAuth";
import { getCats, fraseFalarCom, rotuloCasaDe, RELACOES } from "../data/tree";

// Trava de segurança: se o áudio travar e nunca avisar que terminou, os botões
// voltam a funcionar depois desse tempo. No caminho normal quem libera é o
// próprio fim da fala, não este limite.
const LIMITE_FALA_MS = 12000;

function getSugestoes(historico) {
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

  const recentes = historico
    .slice(-3)
    .reverse()
    .filter(f => !base.find(b => b.frase === f.frase));

  return [...base, ...recentes].slice(0, 5);
}

const NIVEIS = [
  { id: "basico",        label: "Básico",        icon: "🟢", desc: "Botões grandes, só necessidades essenciais" },
  { id: "intermediario", label: "Intermediário",  icon: "🟡", desc: "Categorias completas com árvore de opções" },
  { id: "avancado",      label: "Avançado",       icon: "🔴", desc: "Favoritas, predição por horário e escrita livre" },
];

// ─── ESCALA DE DOR ───────────────────────────────────────────────────────────
function PainScale({ onSelect, speaking }) {
  const levels = [
    { n: 0,  color: "#4CAF50", frase: "Não estou sentindo dor agora." },
    { n: 1,  color: "#8BC34A", frase: "Estou com uma dor mínima, quase nada." },
    { n: 2,  color: "#CDDC39", frase: "Estou com uma dor leve." },
    { n: 3,  color: "#FFEB3B", frase: "Estou com uma dor leve, mas percebo ela." },
    { n: 4,  color: "#FFC107", frase: "Estou com uma dor moderada." },
    { n: 5,  color: "#FF9800", frase: "Estou com uma dor moderada, está me incomodando." },
    { n: 6,  color: "#FF7043", frase: "Estou com uma dor forte." },
    { n: 7,  color: "#F44336", frase: "Estou com uma dor intensa, preciso de ajuda." },
    { n: 8,  color: "#E53935", frase: "Estou com uma dor muito intensa." },
    { n: 9,  color: "#C62828", frase: "Estou com uma dor insuportável, preciso de socorro." },
    { n: 10, color: "#B71C1C", frase: "Estou com dor no nível máximo, é uma emergência!" },
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
              flex: 1, height: 44, background: l.color, border: "none", borderRadius: 8,
              color: l.n <= 2 ? "#2C2416" : "white", fontSize: 14, fontWeight: 700,
              cursor: speaking ? "not-allowed" : "pointer", opacity: speaking ? 0.5 : 1,
              transition: "transform 0.1s", display: "flex", alignItems: "center", justifyContent: "center",
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

// ─── APP PAGE ────────────────────────────────────────────────────────────────
export default function AppPage() {
  const { user, session, profile, signOut } = useAuth();

  const [nivel, setNivel] = useState(() => profile?.nivel || localStorage.getItem("voz_nivel") || "basico");
  const [stack, setStack] = useState([]);
  const [lastSpoken, setLastSpoken] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState("nivel");
  const [selectedVoice, setSelectedVoice] = useState(() => profile?.selected_voice || localStorage.getItem("voz_voice") || ELEVEN_VOICES[0]?.id || "");
  const [testingVoice, setTestingVoice] = useState("");
  const [favoritas, setFavoritas] = useState(() => { try { return JSON.parse(localStorage.getItem("voz_favoritas") || "[]"); } catch { return []; } });
  const [favDraft, setFavDraft] = useState([]);
  const [historico, setHistorico] = useState(() => { try { return JSON.parse(localStorage.getItem("voz_historico") || "[]"); } catch { return []; } });
  const [fragmento, setFragmento] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [cacheCount, setCacheCount] = useState(0);
  // Leitura síncrona do aparelho: os botões com nome precisam aparecer já na
  // primeira pintura, sem piscar os genéricos antes nem esperar a rede.
  const [pessoas, setPessoas] = useState(() => lerPessoasLocal());
  const [pessoasDraft, setPessoasDraft] = useState([]);

  const sessionIdRef = useRef(null);
  const phraseCountRef = useRef(0);
  const tokenRef = useRef(null);
  const falaTimerRef = useRef(null);

  // O token fica numa ref para que o controle de sessão não seja recriado a
  // cada renovação de login.
  useEffect(() => { tokenRef.current = session?.access_token ?? null; }, [session]);

  // Sessão de uso (analytics).
  //
  // No celular, apagar a tela dispara `visibilitychange`. Antes a sessão era
  // encerrada aí e nunca mais reaberta — tudo que ele falasse depois era
  // gravado numa sessão já fechada. Agora, ao voltar para o app, uma sessão
  // nova é aberta. O `pagehide` cobre o fechamento da aba melhor que o
  // `beforeunload`, que o Safari do iPhone costuma ignorar.
  useEffect(() => {
    if (!user?.id) return;
    let ativo = true;

    const abrir = async () => {
      const id = await startSession(user.id);
      if (!ativo) return;
      sessionIdRef.current = id;
      phraseCountRef.current = 0;
    };

    const fechar = () => {
      if (!sessionIdRef.current) return;
      endSession(sessionIdRef.current, phraseCountRef.current, tokenRef.current);
      sessionIdRef.current = null;
      phraseCountRef.current = 0;
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") fechar();
      else if (!sessionIdRef.current) void abrir();
    };

    void abrir();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", fechar);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", fechar);
      fechar();
    };
  }, [user?.id]);

  // Favoritas e histórico vêm do Supabase quando há internet, para seguirem o
  // Vicente se ele trocar de aparelho. Sem rede, fica o que está no celular.
  useEffect(() => {
    if (!user?.id) return;
    let ativo = true;

    carregarFavoritas(user.id).then(lista => {
      if (ativo && lista.length) setFavoritas(lista);
    });

    carregarPessoas(user.id).then(lista => {
      if (ativo && lista.length) setPessoas(lista);
    });

    setHistorico(atual => {
      if (atual.length) return atual;
      fetchHistoricoRemoto(user.id).then(remoto => {
        if (!ativo || !remoto.length) return;
        setHistorico(h => (h.length ? h : remoto));
      });
      return atual;
    });

    return () => { ativo = false; };
  }, [user?.id]);

  // Libera o áudio ao sair da tela.
  useEffect(() => () => {
    stopSpeaking();
    if (falaTimerRef.current) clearTimeout(falaTimerRef.current);
  }, []);

  // Sincroniza profile quando carregado
  useEffect(() => {
    if (profile) {
      if (NIVEIS.some(n => n.id === profile.nivel)) setNivel(profile.nivel);
      if (profile.selected_voice) setSelectedVoice(profile.selected_voice);
    }
  }, [profile]);

  useEffect(() => {
    if (nivel === "avancado") setSugestoes(getSugestoes(historico));
  }, [nivel, historico]);

  useEffect(() => {
    if (showConfig && configTab === "voz") countCachedAudio().then(setCacheCount);
  }, [showConfig, configTab]);

  // Destrava os botões quando a frase ACABA de ser falada.
  //
  // Antes era um tempo fixo de 2,5s: frase curta deixava o Vicente esperando à
  // toa, frase longa liberava no meio e a próxima cortava a anterior.
  const liberarQuandoTerminar = useCallback((fala) => {
    if (falaTimerRef.current) clearTimeout(falaTimerRef.current);
    falaTimerRef.current = setTimeout(() => setSpeaking(false), LIMITE_FALA_MS);

    Promise.resolve(fala).finally(() => {
      if (falaTimerRef.current) clearTimeout(falaTimerRef.current);
      setSpeaking(false);
    });
  }, []);

  const falarFrase = useCallback(async (node, fraseBase, source = "button") => {
    if (speaking) return;
    setSpeaking(true);
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}

    const frase = fraseBase || node.frase;

    liberarQuandoTerminar(speakElevenLabs(frase, selectedVoice));
    const spoken = { ...node, frase };
    setLastSpoken(spoken);
    phraseCountRef.current += 1;

    // Analytics fire-and-forget
    if (user?.id) {
      trackEvent({
        user_id: user.id,
        node_id: node.id ?? null,
        phrase_text: frase,
        phrase_label: node.l,
        emoji: node.e,
        nivel,
        source,
        was_ai_enhanced: false,
        session_id: sessionIdRef.current,
        device_info: { userAgent: navigator.userAgent, mobile: /Mobi|Android/i.test(navigator.userAgent) },
      });
    }

    setHistorico(h => {
      const semDup = h.filter(item => item.frase !== spoken.frase);
      const novo = [...semDup, spoken].slice(-20);
      try { localStorage.setItem("voz_historico", JSON.stringify(novo)); } catch {}
      return novo;
    });

    setStack([]);
  }, [speaking, selectedVoice, user, nivel, liberarQuandoTerminar]);

  const handleNode = useCallback((node) => {
    if (speaking) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}
    if (node.filhos?.length) { setStack(s => [...s, node]); return; }
    if (node.frase) falarFrase(node);
  }, [speaking, falarFrase]);

  const gerarDoFragmento = () => {
    if (!fragmento.trim() || speaking) return;
    const node = { e: "✍️", l: fragmento, frase: fragmento };
    setSpeaking(true);
    liberarQuandoTerminar(speakElevenLabs(fragmento, selectedVoice));
    setLastSpoken(node);
    phraseCountRef.current += 1;
    if (user?.id) {
      trackEvent({ user_id: user.id, node_id: null, phrase_text: fragmento, phrase_label: fragmento, emoji: "✍️", nivel, source: "fragmento", was_ai_enhanced: false, session_id: sessionIdRef.current, device_info: {} });
    }
    setHistorico(h => {
      const semDup = h.filter(item => item.frase !== node.frase);
      const novo = [...semDup, node].slice(-20);
      try { localStorage.setItem("voz_historico", JSON.stringify(novo)); } catch {}
      return novo;
    });
    setFragmento("");
  };

  const saveConfig = () => {
    setFavoritas(favDraft);
    setPessoas(pessoasDraft);
    try {
      localStorage.setItem("voz_voice", selectedVoice);
      localStorage.setItem("voz_nivel", nivel);
    } catch {}

    // Grava local na hora e sincroniza com o banco em segundo plano.
    void salvarFavoritas(user?.id, favDraft);
    void salvarPessoas(user?.id, pessoasDraft);

    // O caminho aberto guarda os botões de ANTES do cadastro. Voltar para a
    // raiz evita que ele fique olhando uma tela que não existe mais.
    setStack([]);

    if (user?.id) {
      supabase.from("profiles").update({ nivel, selected_voice: selectedVoice }).eq("id", user.id).then(() => {});
    }
    setShowConfig(false);
  };

  const currentNodes = stack.length > 0 ? stack[stack.length - 1].filhos : getCats(nivel, pessoas);
  // Se o nível vier com um valor inesperado do banco, cai no básico em vez de
  // quebrar a tela inteira.
  const nivelInfo = NIVEIS.find(n => n.id === nivel) || NIVEIS[0];
  const GRID_COLS = nivel === "basico" ? 2 : 3;

  // No básico os botões são propositalmente grandes. Mas em tela pequena uma
  // lista longa (as 9 bebidas da Sede) empurraria a última opção para fora da
  // vista, e rolar é um gesto que ele pode simplesmente não fazer — o botão
  // que não aparece, para ele, não existe. Nessas telas o botão encolhe um
  // pouco em vez de sumir. 84px continua bem acima do mínimo confortável.
  const listaLonga = (currentNodes?.length || 0) > 6;
  const BTN_HEIGHT = nivel === "basico" ? (listaLonga ? 84 : 100) : 82;

  return (
    <div style={s.root}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, flex: 1 }}>
          <span style={s.logo}>Vicente<span style={s.dot}>.</span></span>
          <span style={{ fontSize: 10, color: "#8A7D6A", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, letterSpacing: 0.3 }}>seu assistente de voz</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...s.badge, cursor: "pointer" }} onClick={() => { setFavDraft(favoritas); setPessoasDraft(pessoas); setShowConfig(true); setConfigTab("nivel"); }}>
            {nivelInfo.icon} {nivelInfo.label}
          </span>
          {lastSpoken && <button style={s.replayBtn} onClick={() => speakElevenLabs(lastSpoken.frase, selectedVoice)}>🔊</button>}
          <button style={s.cfgBtn} onClick={() => { setFavDraft(favoritas); setPessoasDraft(pessoas); setShowConfig(true); setConfigTab("voz"); }}>🎙️</button>
          <button style={s.cfgBtn} onClick={() => { setFavDraft(favoritas); setPessoasDraft(pessoas); setShowConfig(true); setConfigTab("nivel"); }}>⚙️</button>
          {profile?.role === "admin" && (
            <a href="#/admin" style={{ ...s.cfgBtn, textDecoration: "none", fontSize: 15 }} title="Painel admin">📊</a>
          )}
          <button style={{ ...s.cfgBtn, fontSize: 13, color: "#8A7D6A" }} onClick={signOut} title="Sair">🚪</button>
        </div>
      </div>

      {/* ÚLTIMA FRASE */}
      <div style={s.lastPhrase}>
        {lastSpoken
          ? <><span style={s.lastEmoji}>{lastSpoken.e}</span><span style={s.lastText}>{lastSpoken.frase}</span></>
          : <span style={s.placeholder}>Toque em uma opção para começar...</span>}
      </div>

      {/* MODO AVANÇADO */}
      {nivel === "avancado" ? (
        <div style={s.wordsArea}>
          {favoritas.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>⭐ Favoritas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {favoritas.map((f, i) => (
                  <button key={i} style={s.favBtn} onClick={() => falarFrase(f, null, "favorita")} disabled={speaking}>
                    <span style={{ fontSize: 22 }}>{f.e}</span>
                    <span style={s.favLabel}>{f.l}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
              <button style={s.fragmentoBtn} onClick={gerarDoFragmento} disabled={!fragmento.trim()}>📢</button>
            </div>
          </div>

          {historico.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>🕐 Usadas recentemente</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...historico].reverse().slice(0, 5).map((h, i) => (
                  <button key={i} style={s.historicoBtn} onClick={() => falarFrase(h, null, "historico")} disabled={speaking}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{h.e}</span>
                    <span style={s.historicoText}>{h.frase}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
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

      {/* CONFIG */}
      {showConfig && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowConfig(false)}>
          <div style={s.sheet}>
            <div style={s.tabs}>
              {["nivel", "voz", "favoritas", "familia"].map(t => (
                <button key={t} style={{ ...s.tab, ...(configTab === t ? s.tabActive : {}) }} onClick={() => setConfigTab(t)}>
                  {t === "nivel" ? "🎯" : t === "voz" ? "🎙️" : t === "favoritas" ? "⭐" : "👥"}
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

            {configTab === "voz" && (
              <>
                <div style={s.sheetSub}>Toque em ▶ para testar cada voz e escolha a favorita.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {ELEVEN_VOICES.map(v => (
                    <div key={v.id} style={{ ...s.voiceItem, ...(selectedVoice === v.id ? s.voiceSelected : {}) }} onClick={() => setSelectedVoice(v.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#2C2416" }}>🎙️ {v.label}</div>
                        <div style={{ fontSize: 11, color: "#8A7D6A", marginTop: 2 }}>ElevenLabs · Toque ▶ para ouvir</div>
                      </div>
                      {selectedVoice === v.id && <span style={{ color: "#5B7B6F", fontWeight: 700, marginRight: 8, fontSize: 18 }}>✓</span>}
                      <button
                        style={{ ...s.voiceTestBtn, ...(testingVoice === v.id ? { background: "#C4956A" } : {}) }}
                        onClick={e => { e.stopPropagation(); setTestingVoice(v.id); speakElevenLabs("Olá, estou me sentindo bem hoje.", v.id); setTimeout(() => setTestingVoice(""), 4000); }}
                      >
                        {testingVoice === v.id ? "⏸" : "▶"}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Frases guardadas no aparelho — é o que permite falar sem internet */}
                <div style={s.cacheBox}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2C2416" }}>
                      📥 {cacheCount} {cacheCount === 1 ? "frase salva" : "frases salvas"} no aparelho
                    </div>
                    <div style={{ fontSize: 11, color: "#8A7D6A", marginTop: 2 }}>
                      Essas frases falam sem internet e não gastam crédito de voz.
                    </div>
                  </div>
                  {cacheCount > 0 && (
                    <button
                      style={s.cacheBtn}
                      onClick={() => { clearAudioCache().then(() => setCacheCount(0)); }}
                    >
                      Limpar
                    </button>
                  )}
                </div>
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

            {configTab === "familia" && (
              <>
                <div style={s.sheetSub}>
                  Cadastre a família pelo nome. O botão "Filho" vira "João", e a frase sai falada com o nome dele.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {pessoasDraft.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F5F0E8", borderRadius: 10 }}>
                      <span style={{ fontSize: 20 }}>{p.e}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2416" }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: "#8A7D6A" }}>
                          {RELACOES.find(r => r.id === p.relacao)?.label || p.relacao}
                          {p.casa && " · aparece no Sair"}
                        </div>
                      </div>
                      <button onClick={() => setPessoasDraft(d => d.filter((_, j) => j !== i))}
                        style={{ background: "#E2D9C8", border: "none", borderRadius: 20, padding: "2px 10px", cursor: "pointer", color: "#8A7D6A", fontSize: 13 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  {!pessoasDraft.length && (
                    <div style={{ fontSize: 12, color: "#8A7D6A", textAlign: "center", padding: "10px 0" }}>
                      Ninguém cadastrado — os botões seguem genéricos ("Filho", "Filha").
                    </div>
                  )}
                </div>
                <AddPessoa onAdd={p => setPessoasDraft(d => [...d, p])} />
              </>
            )}

            <div style={s.sheetBtns}>
              <button style={s.btnCancel} onClick={() => setShowConfig(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={saveConfig}>Salvar</button>
            </div>

            <div style={s.sheetDev}>
              <a
                href="https://wa.me/5519987801102?text=Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida%20sobre%20o%20Vicente"
                target="_blank"
                rel="noopener noreferrer"
                style={s.sheetDevLink}
              >
                Dúvidas? Fale com Thiago Geib (desenvolvedor)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD FAVORITA ─────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  { id: "saude",      label: "🏥", title: "Saúde",      emojis: ["💊","🏥","🤕","💉","🩺","😷","🩹","🌡️","🆘","🚑","🛌","🧠","💪","🦽","🦷","👁️","👂"] },
  { id: "sentir",     label: "😊", title: "Sentimentos", emojis: ["😊","😢","😡","😰","🥰","😴","😕","😣","😤","😂","😨","🤔","😩","🥺","😌","😶","🤗","😳","😱","🤯","😔","🥵","🥶"] },
  { id: "comida",     label: "🍽️", title: "Comida",      emojis: ["🍽️","🍎","🍞","🥣","🍕","🍰","🍌","🥗","🍗","🥚","🥩","🍝","🍲","🥪","🫐","🍇","🍓","🥑","🧀","🥕"] },
  { id: "bebida",     label: "☕", title: "Bebida",      emojis: ["☕","💧","🧃","🍵","🥤","🍺","🍷","🥛","🫖","🧋","🍶","🥂"] },
  { id: "atividade",  label: "🎵", title: "Atividades",  emojis: ["🎵","📺","📱","🚶","🛏️","📖","🎮","🎨","✍️","🎲","🧩","🎬","🎧","🏊","🚴","🌳","🌸","🌙","☀️","❄️"] },
  { id: "pessoas",    label: "👨", title: "Pessoas",     emojis: ["👨","👩","👴","👵","👶","🤗","❤️","🙏","👍","👎","🤝","✋","👋","💋","🫂","👪","🧑‍⚕️","📞","📲"] },
  { id: "lugares",    label: "🏠", title: "Lugares",     emojis: ["🏠","🚽","🛁","🚿","🏥","🚗","🌳","🛒","🍴","🏪","🚌","✈️","🛶","🏖️","🕌"] },
];

function AddFavorita({ onAdd }) {
  const [cat, setCat] = useState("saude");
  const [emoji, setEmoji] = useState("💊");
  const [label, setLabel] = useState("");
  const [frase, setFrase] = useState("");

  const currentEmojis = EMOJI_CATS.find(c => c.id === cat)?.emojis || [];

  return (
    <div style={{ background: "#EAF2EF", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5B7B6F", marginBottom: 8 }}>+ Nova favorita</div>

      {/* Abas de categoria */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
        {EMOJI_CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ flexShrink: 0, fontSize: 18, background: cat === c.id ? "#5B7B6F" : "#FFFDF8", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", opacity: cat === c.id ? 1 : 0.6 }}
            title={c.title}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid de emojis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10, maxHeight: 130, overflowY: "auto" }}>
        {currentEmojis.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            style={{ fontSize: 22, background: emoji === e ? "#5B7B6F" : "#FFFDF8", border: emoji === e ? "2px solid #5B7B6F" : "2px solid transparent", borderRadius: 8, padding: "4px 2px", cursor: "pointer", lineHeight: 1.3 }}>
            {e}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#5B7B6F", marginBottom: 8 }}>
        Selecionado: <span style={{ fontSize: 20 }}>{emoji}</span>
      </div>

      <input style={{ ...inputStyle, marginBottom: 8 }} value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome curto (ex: Café)" />
      <input style={{ ...inputStyle, marginBottom: 10 }} value={frase} onChange={e => setFrase(e.target.value)} placeholder="Frase completa (ex: Quero tomar um café.)" />
      <button
        style={{ width: "100%", padding: 10, background: label && frase ? "#5B7B6F" : "#E2D9C8", color: label && frase ? "white" : "#8A7D6A", border: "none", borderRadius: 10, fontWeight: 600, cursor: label && frase ? "pointer" : "not-allowed", fontSize: 14 }}
        onClick={() => { if (label && frase) { onAdd({ e: emoji, l: label, frase }); setLabel(""); setFrase(""); setEmoji(emoji); } }}
      >
        Adicionar
      </button>
    </div>
  );
}

const inputStyle = { width: "100%", border: "1.5px solid #E2D9C8", borderRadius: 10, padding: "8px 12px", fontSize: 13, background: "#FFFDF8", outline: "none", fontFamily: "'DM Sans',sans-serif" };

// ─── ADD PESSOA ───────────────────────────────────────────────────────────────
//
// A relação (filho, filha, esposa...) não é só organização: é ela que decide o
// artigo da frase — "falar com O João" ou "falar com A Maria". Por isso a
// frase pronta aparece na tela antes de salvar: quem cadastra confere como vai
// sair na voz dele.
function AddPessoa({ onAdd }) {
  const [nome, setNome] = useState("");
  const [relacao, setRelacao] = useState("filho");
  const [emoji, setEmoji] = useState("👨");
  const [casa, setCasa] = useState(false);

  // Só rostos e figuras de gente. A categoria "pessoas" do seletor de
  // favoritas traz coração, telefone e mãos — não servem para dizer QUEM é.
  const emojisPessoas = [
    "👨", "👩", "🧑", "👴", "👵", "👦", "👧", "👶",
    "👨‍🦰", "👩‍🦰", "👨‍🦳", "👩‍🦳", "👨‍🦲", "🧔", "👳", "🧕",
    "👨‍⚕️", "👩‍⚕️", "👨‍🌾", "👩‍🌾", "👮", "🧑‍🍳", "👨‍🏫", "👩‍🏫",
  ];
  const pronto = nome.trim().length > 0;

  const escolherRelacao = (r) => {
    setRelacao(r.id);
    setEmoji(r.emoji);   // sugestão; dá para trocar logo abaixo
  };

  const adicionar = () => {
    if (!pronto) return;
    onAdd({ nome: nome.trim(), e: emoji, relacao, casa });
    setNome("");
    setCasa(false);
  };

  return (
    <div style={{ background: "#EAF2EF", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5B7B6F", marginBottom: 8 }}>+ Nova pessoa</div>

      <input
        style={{ ...inputStyle, marginBottom: 8 }}
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome (ex: João)"
        onKeyDown={e => e.key === "Enter" && adicionar()}
      />

      {/* Relação — define o artigo da frase */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
        {RELACOES.map(r => (
          <button
            key={r.id}
            onClick={() => escolherRelacao(r)}
            style={{
              flexShrink: 0, padding: "5px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              border: "1.5px solid " + (relacao === r.id ? "#5B7B6F" : "#E2D9C8"),
              background: relacao === r.id ? "#5B7B6F" : "#FFFDF8",
              color: relacao === r.id ? "white" : "#8A7D6A",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Emoji do botão */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {emojisPessoas.map(em => (
          <button
            key={em}
            onClick={() => setEmoji(em)}
            style={{
              width: 32, height: 32, fontSize: 17, cursor: "pointer", borderRadius: 8,
              border: "1.5px solid " + (emoji === em ? "#5B7B6F" : "transparent"),
              background: emoji === em ? "#FFFDF8" : "transparent",
            }}
          >
            {em}
          </button>
        ))}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 12, color: "#2C2416" }}>
        <input type="checkbox" checked={casa} onChange={e => setCasa(e.target.checked)} style={{ width: 16, height: 16 }} />
        Criar também o botão "{rotuloCasaDe({ nome: nome.trim(), relacao })}" no Sair
      </label>

      {/* Confere como vai sair falado antes de salvar */}
      <div style={{ background: "#FFFDF8", borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#8A7D6A", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Vai falar</div>
        <div style={{ fontSize: 13, color: "#2C2416", fontFamily: "'Lora',serif" }}>
          {emoji} {fraseFalarCom({ nome: nome.trim(), relacao })}
        </div>
      </div>

      <button
        style={{ width: "100%", padding: 10, background: pronto ? "#5B7B6F" : "#E2D9C8", color: pronto ? "white" : "#8A7D6A", border: "none", borderRadius: 10, fontWeight: 600, cursor: pronto ? "pointer" : "not-allowed", fontSize: 14 }}
        onClick={adicionar}
      >
        Adicionar
      </button>
    </div>
  );
}

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
  voiceItem: { display: "flex", alignItems: "center", padding: "10px 14px", border: "1.5px solid #E2D9C8", borderRadius: 12, cursor: "pointer", background: "#F5F0E8" },
  voiceSelected: { borderColor: "#5B7B6F", background: "#EAF2EF" },
  voiceTestBtn: { width: 30, height: 30, background: "#5B7B6F", color: "white", border: "none", borderRadius: "50%", fontSize: 11, cursor: "pointer", flexShrink: 0 },
  cacheBox: { display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 12px", background: "#EAF2EF", borderRadius: 12 },
  cacheBtn: { background: "#E2D9C8", color: "#8A7D6A", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", flexShrink: 0 },
  sheetBtns: { display: "flex", gap: 8, marginTop: 16 },
  btnSave: { flex: 1, padding: 13, background: "#5B7B6F", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnCancel: { padding: "13px 18px", background: "#E2D9C8", color: "#8A7D6A", border: "none", borderRadius: 12, fontSize: 15, cursor: "pointer" },
  sheetDev: { textAlign: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2D9C8" },
  sheetDevLink: { fontSize: 11, color: "#8A7D6A", textDecoration: "none" },
};
