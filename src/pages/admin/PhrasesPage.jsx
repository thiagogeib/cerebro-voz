import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { TREE } from '../../data/tree'

const PERIODS = [
  { label: '7 dias',  days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

function getStartDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// Todos os botões da árvore que falam alguma coisa (folhas).
function todasAsFolhas(nos = [...TREE.basico, ...TREE.intermediario], caminho = [], saida = []) {
  for (const n of nos) {
    if (n.filhos) todasAsFolhas(n.filhos, [...caminho, n.l], saida)
    else if (n.frase) saida.push({ id: n.id, label: n.l, emoji: n.e, onde: caminho.join(' › ') || 'Início' })
  }
  return saida
}

function groupByLabel(events) {
  const map = {}
  for (const ev of events) {
    const key = ev.phrase_label ?? ev.phrase_text ?? 'Sem label'
    if (!map[key]) {
      map[key] = { label: key, emoji: ev.emoji ?? '💬', count: 0 }
    }
    map[key].count++
  }
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

export default function PhrasesPage() {
  const [period, setPeriod] = useState(PERIODS[0])
  const [phrases, setPhrases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [eventosCrus, setEventosCrus] = useState([])
  const [verNaoUsadas, setVerNaoUsadas] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('usage_events')
        .select('phrase_label, emoji, phrase_text, source, nivel, created_at')
        .gte('created_at', getStartDate(period.days))
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setPhrases(groupByLabel(data ?? []))
      setEventosCrus(data ?? [])
      setLoading(false)
    }
    load()
  }, [period])

  async function handleDelete(item) {
    if (!window.confirm(`Apagar todos os registros de "${item.label}"?`)) return
    setDeleting(item.label)

    // O filtro `.or()` do PostgREST separa condições por vírgula, então um
    // rótulo que contenha vírgula ou parêntese quebrava a consulta — e isso
    // acontece de verdade com frases digitadas à mão ("Sai daqui, Thor").
    // Duas chamadas simples evitam montar essa expressão à mão.
    const alvo = item.label
    const { error: err1 } = await supabase
      .from('usage_events')
      .delete()
      .eq('phrase_label', alvo)

    const { error: err2 } = await supabase
      .from('usage_events')
      .delete()
      .is('phrase_label', null)
      .eq('phrase_text', alvo)

    const err = err1 || err2
    setDeleting(null)
    if (err) {
      alert('Erro ao apagar: ' + err.message)
      return
    }
    setPhrases(prev => prev.filter(p => p.label !== item.label))
  }

  const maxCount = phrases[0]?.count ?? 1

  // Botões que existem na tela dele e NUNCA foram tocados no período.
  //
  // Serve para podar: cada botão que não é usado ocupa espaço e atenção numa
  // grade que precisa ser rápida de varrer. O cruzamento é pelo rótulo, que é
  // o que o app grava em `phrase_label`.
  const usados = new Set(eventosCrus.map(e => e.phrase_label).filter(Boolean))
  const naoUsadas = todasAsFolhas().filter(f => !usados.has(f.label))

  function baixarCSV() {
    const linhas = [
      ['frase', 'rotulo', 'emoji', 'origem', 'nivel', 'quando'],
      ...eventosCrus.map(e => [
        e.phrase_text ?? '',
        e.phrase_label ?? '',
        e.emoji ?? '',
        e.source ?? '',
        e.nivel ?? '',
        e.created_at ?? '',
      ]),
    ]
    // ; como separador e BOM no começo: é o que o Excel em português abre
    // direto, sem passar pelo assistente de importação.
    const csv = '\uFEFF' + linhas
      .map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `vicente-frases-${period.days}dias.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 style={s.pageTitle}>Frases mais usadas</h1>

      <div style={s.periodRow}>
        {PERIODS.map(p => (
          <button
            key={p.days}
            style={{ ...s.periodBtn, ...(period.days === p.days ? s.periodBtnActive : {}) }}
            onClick={() => setPeriod(p)}
          >
            {p.label}
          </button>
        ))}

        <button style={s.btnExportar} onClick={baixarCSV} disabled={!eventosCrus.length}>
          ⬇ Baixar planilha
        </button>
      </div>

      {loading && <div style={s.stateText}>Carregando...</div>}

      {error && (
        <div style={s.errorBox}>Erro ao carregar dados: {error}</div>
      )}

      {!loading && !error && phrases.length === 0 && (
        <div style={s.stateText}>Nenhum evento registrado no período.</div>
      )}

      {!loading && !error && phrases.length > 0 && (
        <div style={s.list}>
          {phrases.map((item, i) => (
            <div key={item.label} style={s.item}>
              <span style={s.rank}>#{i + 1}</span>
              <span style={s.emoji}>{item.emoji}</span>
              <div style={s.info}>
                <div style={s.label}>{item.label}</div>
                <div style={s.barWrap}>
                  <div
                    style={{
                      ...s.bar,
                      width: `${Math.round((item.count / maxCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span style={s.count}>{item.count}</span>
              <button
                onClick={() => handleDelete(item)}
                disabled={deleting === item.label}
                style={s.btnDelete}
                title="Apagar registros desta frase"
              >
                {deleting === item.label ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── O que NÃO está sendo usado ── */}
      {!loading && !error && (
        <div style={s.naoUsadasBox}>
          <button style={s.naoUsadasTitulo} onClick={() => setVerNaoUsadas(v => !v)}>
            {verNaoUsadas ? '▾' : '▸'} {naoUsadas.length} bot{naoUsadas.length === 1 ? 'ão' : 'ões'} sem nenhum toque em {period.label}
          </button>

          {verNaoUsadas && (
            <>
              <p style={s.naoUsadasSub}>
                Estão na tela dele e não foram usados no período. Cada botão a menos
                é uma tela mais rápida de varrer — vale considerar tirar os que
                nunca servem. Para editar, veja <code>src/data/tree.js</code>.
              </p>
              <div style={s.naoUsadasLista}>
                {naoUsadas.map(f => (
                  <div key={f.id} style={s.naoUsadaItem}>
                    <span style={{ fontSize: 17 }}>{f.emoji}</span>
                    <span style={s.naoUsadaLabel}>{f.label}</span>
                    <span style={s.naoUsadaOnde}>{f.onde}</span>
                  </div>
                ))}
                {!naoUsadas.length && (
                  <div style={s.naoUsadaItem}>Todos os botões foram usados neste período.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  btnExportar: { marginLeft: 'auto', padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E2D9C8', background: '#FFFDF8', color: '#5B7B6F', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  naoUsadasBox: { marginTop: 20, background: '#FFFDF8', border: '1.5px solid #E2D9C8', borderRadius: 14, padding: 14 },
  naoUsadasTitulo: { background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, color: '#2C2416', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  naoUsadasSub: { fontSize: 12, color: '#8A7D6A', margin: '8px 0 12px', lineHeight: 1.5 },
  naoUsadasLista: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 },
  naoUsadaItem: { display: 'flex', alignItems: 'center', gap: 8, background: '#F5F0E8', borderRadius: 10, padding: '7px 10px', fontSize: 12 },
  naoUsadaLabel: { fontWeight: 600, color: '#2C2416' },
  naoUsadaOnde: { marginLeft: 'auto', fontSize: 10, color: '#8A7D6A' },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#2C2416',
    margin: '0 0 20px',
    fontFamily: 'Georgia, serif',
  },
  periodRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  periodBtn: {
    padding: '7px 16px',
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    color: '#8A7D6A',
    cursor: 'pointer',
  },
  periodBtnActive: {
    background: '#5B7B6F',
    borderColor: '#5B7B6F',
    color: 'white',
    fontWeight: 700,
  },
  stateText: {
    fontSize: 15,
    color: '#8A7D6A',
    padding: '32px 0',
    textAlign: 'center',
  },
  errorBox: {
    background: '#FEE2E2',
    border: '1.5px solid #FECACA',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    color: '#991B1B',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 12,
    padding: '12px 16px',
  },
  rank: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8A7D6A',
    width: 28,
    flexShrink: 0,
    textAlign: 'right',
  },
  emoji: {
    fontSize: 22,
    flexShrink: 0,
    width: 28,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2C2416',
    marginBottom: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  barWrap: {
    height: 6,
    background: '#E2D9C8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    background: '#5B7B6F',
    borderRadius: 4,
    transition: 'width 0.4s ease',
    minWidth: 4,
  },
  count: {
    fontSize: 15,
    fontWeight: 700,
    color: '#5B7B6F',
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  },
  btnDelete: {
    flexShrink: 0,
    width: 28,
    height: 28,
    background: 'none',
    border: '1.5px solid #E2D9C8',
    borderRadius: 8,
    color: '#B07070',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
}
