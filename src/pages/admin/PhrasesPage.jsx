import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('usage_events')
        .select('phrase_label, emoji, phrase_text')
        .gte('created_at', getStartDate(period.days))
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setPhrases(groupByLabel(data ?? []))
      setLoading(false)
    }
    load()
  }, [period])

  const maxCount = phrases[0]?.count ?? 1

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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
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
}
