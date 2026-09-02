import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

// ─── VISÃO GERAL ─────────────────────────────────────────────────────────────
//
// O painel tinha quatro listas e nenhuma resposta às perguntas que a família
// realmente faz: ele está usando? quando? o que mais pede? tem sentido dor?
//
// Os dados para isso já estavam no banco desde maio — só nunca tinham sido
// olhados juntos. Esta página não cria nada novo: lê `usage_events` e agrupa.

const PERIODOS = [
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
  { label: 'Tudo', dias: 3650 },
]

// Teto de leitura. Em ~4 meses de uso real o app gerou ~400 eventos, então
// isto dá muitos anos de folga; se um dia apertar, o caminho é agregar no
// banco em vez de aumentar o número.
const LIMITE = 5000

const desde = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

const soData = (iso) => new Date(iso).toISOString().slice(0, 10)

function formatarDia(iso) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** "Dor 7" → 7. A escala de dor grava o nível no rótulo. */
function nivelDeDor(ev) {
  const m = /^Dor (\d{1,2})$/.exec(ev.phrase_label || '')
  return m ? Number(m[1]) : null
}

const COR_DOR = (n) =>
  n <= 2 ? '#4CAF50' : n <= 4 ? '#FFC107' : n <= 6 ? '#FF9800' : n <= 8 ? '#F44336' : '#B71C1C'

export default function OverviewPage() {
  const [periodo, setPeriodo] = useState(PERIODOS[1])
  const [usuarios, setUsuarios] = useState([])
  const [usuario, setUsuario] = useState('')
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .then(({ data }) => setUsuarios(data ?? []))
  }, [])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setCarregando(true)
      setErro(null)
      let q = supabase
        .from('usage_events')
        .select('phrase_label, phrase_text, emoji, source, nivel, node_id, created_at, user_id')
        .gte('created_at', desde(periodo.dias))
        .order('created_at', { ascending: false })
        .limit(LIMITE)
      if (usuario) q = q.eq('user_id', usuario)

      const { data, error } = await q
      if (!ativo) return
      if (error) setErro(error.message)
      else setEventos(data ?? [])
      setCarregando(false)
    }
    carregar()
    return () => { ativo = false }
  }, [periodo, usuario])

  const resumo = useMemo(() => {
    const hoje = soData(new Date().toISOString())
    const porDia = {}
    const porHora = Array(24).fill(0)
    const porOrigem = {}
    const porFrase = {}
    const porPessoa = {}
    const dores = []

    for (const ev of eventos) {
      const dia = soData(ev.created_at)
      porDia[dia] = (porDia[dia] || 0) + 1
      porHora[new Date(ev.created_at).getHours()]++
      porOrigem[ev.source || 'button'] = (porOrigem[ev.source || 'button'] || 0) + 1
      porPessoa[ev.user_id] = (porPessoa[ev.user_id] || 0) + 1

      const chave = ev.phrase_label || ev.phrase_text || '—'
      if (!porFrase[chave]) porFrase[chave] = { label: chave, emoji: ev.emoji || '💬', total: 0 }
      porFrase[chave].total++

      const dor = nivelDeDor(ev)
      if (dor !== null) dores.push({ nivel: dor, quando: ev.created_at })
    }

    const dias = Object.keys(porDia).sort()

    // Sete dias CORRIDOS, não os sete últimos dias em que houve uso — a
    // diferença engana: se ele passou duas semanas sem usar, somar os últimos
    // sete dias com registro daria a impressão de uso recente.
    const limiteSemana = soData(desde(7))
    const totalSemana = dias
      .filter(d => d >= limiteSemana)
      .reduce((soma, d) => soma + porDia[d], 0)

    const maisAtivo = Object.entries(porPessoa).sort((a, b) => b[1] - a[1])[0]
    const picoHora = porHora.indexOf(Math.max(...porHora))

    return {
      total: eventos.length,
      ultimoDia: dias.length ? formatarDia(dias[dias.length - 1]) : null,
      hoje: porDia[hoje] || 0,
      totalSemana,
      diasAtivos: dias.length,
      mediaPorDia: dias.length ? Math.round(eventos.length / dias.length) : 0,
      porDia,
      dias,
      porHora,
      picoHora: Math.max(...porHora) > 0 ? picoHora : null,
      porOrigem,
      topFrases: Object.values(porFrase).sort((a, b) => b.total - a.total).slice(0, 8),
      maisAtivo,
      dores: dores.slice(0, 40).reverse(),
      // Dor 8 ou mais nos ultimos 7 dias: o que merece ser visto hoje.
      doresAltas: dores.filter(d => d.nivel >= 8 && d.quando >= desde(7)),
      dorMedia: dores.length ? (dores.reduce((s, d) => s + d.nivel, 0) / dores.length).toFixed(1) : null,
    }
  }, [eventos])

  const nomeDe = (id) => {
    const u = usuarios.find(x => x.id === id)
    return u ? (u.full_name || u.email) : '—'
  }

  return (
    <div>
      <h1 style={s.pageTitle}>Visão geral</h1>
      <p style={s.pageSub}>Como o app vem sendo usado</p>

      <div style={s.filtros}>
        <div style={s.periodRow}>
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              onClick={() => setPeriodo(p)}
              style={{ ...s.periodBtn, ...(periodo.dias === p.dias ? s.periodBtnAtivo : {}) }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select style={s.select} value={usuario} onChange={e => setUsuario(e.target.value)}>
          <option value="">Todas as pessoas</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>
      </div>

      {carregando && <div style={s.stateText}>Carregando...</div>}
      {erro && <div style={s.errorBox}>Erro ao carregar: {erro}</div>}

      {!carregando && !erro && eventos.length === 0 && (
        <div style={s.vazio}>Nenhuma frase falada neste período.</div>
      )}

      {!carregando && !erro && eventos.length > 0 && (
        <>
          {/* Dor alta recente sobe para o topo: é a única coisa aqui que pode
              exigir uma atitude hoje, e estava enterrada no banco. */}
          {resumo.doresAltas.length > 0 && (
            <div style={s.alerta}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={s.alertaTitulo}>
                  {resumo.doresAltas.length === 1
                    ? 'Ele registrou dor forte'
                    : `Ele registrou dor forte ${resumo.doresAltas.length} vezes`}
                </div>
                <div style={s.alertaTexto}>
                  {resumo.doresAltas.slice(0, 3).map((d, i) => (
                    <span key={i}>
                      {i > 0 && ' · '}
                      nível <strong>{d.nivel}</strong> em {new Date(d.quando).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  ))}
                  {resumo.doresAltas.length > 3 && ` · e mais ${resumo.doresAltas.length - 3}`}
                </div>
              </div>
            </div>
          )}

          <div style={s.cards}>
            <Card titulo="Frases faladas" valor={resumo.total} nota={`${resumo.mediaPorDia} por dia em média`} />
            <Card
              titulo="Hoje"
              valor={resumo.hoje}
              nota={resumo.totalSemana > 0
                ? `${resumo.totalSemana} nos últimos 7 dias`
                : `nada nos últimos 7 dias · último uso ${resumo.ultimoDia || "—"}`}
            />
            <Card titulo="Dias com uso" valor={resumo.diasAtivos} nota={`no período escolhido`} />
            <Card
              titulo="Horário de pico"
              valor={resumo.picoHora === null ? '—' : `${String(resumo.picoHora).padStart(2, '0')}h`}
              nota={resumo.maisAtivo && !usuario ? `quem mais usa: ${nomeDe(resumo.maisAtivo[0])}` : 'quando ele mais fala'}
            />
          </div>

          {/* ── Rotina do dia ── */}
          <Secao titulo="Rotina — em que horas ele fala">
            <div style={s.horasGrade}>
              {resumo.porHora.map((qtd, h) => {
                const maior = Math.max(...resumo.porHora) || 1
                return (
                  <div key={h} style={s.horaColuna} title={`${h}h — ${qtd} frase(s)`}>
                    <div style={s.horaBarraFundo}>
                      <div style={{ ...s.horaBarra, height: `${(qtd / maior) * 100}%`, opacity: qtd ? 1 : 0.15 }} />
                    </div>
                    {h % 3 === 0 && <span style={s.horaLabel}>{h}</span>}
                  </div>
                )
              })}
            </div>
            <div style={s.legenda}>hora do dia (0 a 23)</div>
          </Secao>

          {/* ── Dor: o dado clinicamente mais útil ── */}
          {resumo.dores.length > 0 && (
            <Secao titulo={`Dor registrada — média ${resumo.dorMedia} de 10`}>
              <div style={s.doresLinha}>
                {resumo.dores.map((d, i) => (
                  <div key={i} style={s.dorItem} title={`${new Date(d.quando).toLocaleString('pt-BR')} — nível ${d.nivel}`}>
                    <div style={{ ...s.dorBarra, height: `${Math.max(d.nivel, 0.4) * 9}px`, background: COR_DOR(d.nivel) }} />
                    <span style={s.dorNum}>{d.nivel}</span>
                  </div>
                ))}
              </div>
              <div style={s.legenda}>
                cada barra é uma vez em que ele usou a escala de dor — da mais antiga à mais recente
              </div>
            </Secao>
          )}

          {/* ── Frases mais pedidas ── */}
          <Secao titulo="O que ele mais pede">
            {resumo.topFrases.map((f, i) => (
              <div key={i} style={s.fraseLinha}>
                <span style={{ fontSize: 18, width: 26 }}>{f.emoji}</span>
                <span style={s.fraseLabel}>{f.label}</span>
                <div style={s.fraseBarraFundo}>
                  <div style={{ ...s.fraseBarra, width: `${(f.total / resumo.topFrases[0].total) * 100}%` }} />
                </div>
                <span style={s.fraseTotal}>{f.total}</span>
              </div>
            ))}
          </Secao>

          {/* ── Como ele fala ── */}
          <Secao titulo="Por onde ele fala">
            <div style={s.origens}>
              {Object.entries(resumo.porOrigem).sort((a, b) => b[1] - a[1]).map(([origem, qtd]) => (
                <div key={origem} style={s.origemItem}>
                  <span style={s.origemQtd}>{qtd}</span>
                  <span style={s.origemNome}>{ORIGENS[origem] || origem}</span>
                </div>
              ))}
            </div>
            <div style={s.legenda}>
              "digitado" é ele escrevendo a frase inteira — se crescer, vale virar botão
            </div>
          </Secao>

          {/* ── Dias ── */}
          <Secao titulo="Frases por dia">
            <div style={s.diasGrade}>
              {resumo.dias.slice(-30).map(dia => {
                const maior = Math.max(...resumo.dias.map(d => resumo.porDia[d])) || 1
                return (
                  <div key={dia} style={s.diaColuna} title={`${formatarDia(dia)} — ${resumo.porDia[dia]} frase(s)`}>
                    <div style={s.horaBarraFundo}>
                      <div style={{ ...s.diaBarra, height: `${(resumo.porDia[dia] / maior) * 100}%` }} />
                    </div>
                    <span style={s.horaLabel}>{formatarDia(dia)}</span>
                  </div>
                )
              })}
            </div>
          </Secao>
        </>
      )}
    </div>
  )
}

const ORIGENS = {
  button: 'Botão da grade',
  favorita: 'Favorita',
  historico: 'Usada recentemente',
  fragmento: 'Digitado à mão',
}

function Card({ titulo, valor, nota }) {
  return (
    <div style={s.card}>
      <div style={s.cardTitulo}>{titulo}</div>
      <div style={s.cardValor}>{valor}</div>
      <div style={s.cardNota}>{nota}</div>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div style={s.secao}>
      <div style={s.secaoTitulo}>{titulo}</div>
      {children}
    </div>
  )
}

const s = {
  alerta: { display: 'flex', gap: 12, alignItems: 'center', background: '#FEF3F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 16 },
  alertaTitulo: { fontSize: 14, fontWeight: 700, color: '#991B1B' },
  alertaTexto: { fontSize: 12, color: '#7F1D1D', marginTop: 2 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#2C2416', margin: '0 0 4px', fontFamily: 'Georgia, serif' },
  pageSub: { fontSize: 13, color: '#8A7D6A', marginBottom: 20 },
  filtros: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20 },
  periodRow: { display: 'flex', gap: 6 },
  periodBtn: { padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E2D9C8', background: '#FFFDF8', color: '#8A7D6A', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  periodBtnAtivo: { border: '1.5px solid #5B7B6F', background: '#5B7B6F', color: 'white', fontWeight: 600 },
  select: { padding: '7px 12px', borderRadius: 10, border: '1.5px solid #E2D9C8', background: '#FFFDF8', color: '#2C2416', fontSize: 13, fontFamily: "'DM Sans',sans-serif", maxWidth: 260 },
  stateText: { fontSize: 15, color: '#8A7D6A', padding: '32px 0', textAlign: 'center' },
  errorBox: { background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#991B1B' },
  vazio: { background: '#FFFDF8', border: '1.5px solid #E2D9C8', borderRadius: 14, padding: 32, textAlign: 'center', color: '#8A7D6A', fontSize: 14 },

  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  card: { background: '#FFFDF8', border: '1.5px solid #E2D9C8', borderRadius: 14, padding: '14px 16px' },
  cardTitulo: { fontSize: 11, fontWeight: 700, color: '#8A7D6A', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardValor: { fontSize: 30, fontWeight: 700, color: '#5B7B6F', fontFamily: 'Georgia, serif', lineHeight: 1.2, margin: '4px 0 2px' },
  cardNota: { fontSize: 11, color: '#8A7D6A' },

  secao: { background: '#FFFDF8', border: '1.5px solid #E2D9C8', borderRadius: 14, padding: 16, marginBottom: 16 },
  secaoTitulo: { fontSize: 13, fontWeight: 700, color: '#2C2416', marginBottom: 14 },
  legenda: { fontSize: 11, color: '#8A7D6A', marginTop: 8 },

  horasGrade: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 },
  horaColuna: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  horaBarraFundo: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' },
  horaBarra: { width: '100%', background: '#5B7B6F', borderRadius: '3px 3px 0 0', minHeight: 2 },
  horaLabel: { fontSize: 9, color: '#8A7D6A', marginTop: 3 },

  doresLinha: { display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 100, overflowX: 'auto', paddingBottom: 4 },
  dorItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 },
  dorBarra: { width: 14, borderRadius: '3px 3px 0 0' },
  dorNum: { fontSize: 9, color: '#8A7D6A' },

  fraseLinha: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  fraseLabel: { fontSize: 13, color: '#2C2416', width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fraseBarraFundo: { flex: 1, height: 8, background: '#F5F0E8', borderRadius: 4, overflow: 'hidden' },
  fraseBarra: { height: '100%', background: '#5B7B6F', borderRadius: 4 },
  fraseTotal: { fontSize: 12, color: '#8A7D6A', width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },

  origens: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  origemItem: { background: '#F5F0E8', borderRadius: 10, padding: '8px 14px', minWidth: 92 },
  origemQtd: { display: 'block', fontSize: 20, fontWeight: 700, color: '#5B7B6F', fontFamily: 'Georgia, serif' },
  origemNome: { fontSize: 11, color: '#8A7D6A' },

  diasGrade: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto' },
  diaColuna: { display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', minWidth: 26 },
  diaBarra: { width: '100%', background: '#C4956A', borderRadius: '3px 3px 0 0', minHeight: 2 },
}
