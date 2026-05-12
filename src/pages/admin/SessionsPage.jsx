import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function calcDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '—'
  const diff = new Date(endedAt) - new Date(startedAt)
  if (diff < 0) return '—'
  const totalSec = Math.floor(diff / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}min ${sec}s`
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('sessions')
        .select('*, profiles(email)')
        .order('started_at', { ascending: false })
        .limit(50)
      if (err) {
        setError(err.message)
      } else {
        setSessions(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 style={s.pageTitle}>Sessões</h1>
      <p style={s.pageSub}>Últimas 50 sessões registradas</p>

      {loading && <div style={s.stateText}>Carregando...</div>}

      {error && (
        <div style={s.errorBox}>Erro ao carregar sessões: {error}</div>
      )}

      {!loading && !error && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Email', 'Início', 'Fim', 'Duração', 'Frases', 'Dispositivo', 'Plataforma'].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={s.emptyCell}>Nenhuma sessão encontrada.</td>
                </tr>
              ) : sessions.map(sess => {
                const device = sess.device_info ?? {}
                const isMobile = device.mobile === true
                return (
                  <tr key={sess.id} style={s.tr}>
                    <td style={s.td}>{sess.profiles?.email ?? '—'}</td>
                    <td style={s.tdMono}>{formatDate(sess.started_at)}</td>
                    <td style={s.tdMono}>{formatDate(sess.ended_at)}</td>
                    <td style={s.tdMono}>{calcDuration(sess.started_at, sess.ended_at)}</td>
                    <td style={s.tdCenter}>{sess.phrase_count ?? '—'}</td>
                    <td style={s.tdCenter}>
                      <span style={{ ...s.badge, ...(isMobile ? s.badgeMobile : s.badgeDesktop) }}>
                        {isMobile ? '📱 Mobile' : '🖥️ Desktop'}
                      </span>
                    </td>
                    <td style={s.tdSmall}>{device.platform ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
    margin: '0 0 4px',
    fontFamily: 'Georgia, serif',
  },
  pageSub: {
    fontSize: 13,
    color: '#8A7D6A',
    marginBottom: 24,
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
  tableWrap: {
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 14,
    overflow: 'hidden',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: '#8A7D6A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    background: '#F5F0E8',
    borderBottom: '1.5px solid #E2D9C8',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2D9C8',
  },
  td: {
    padding: '12px 16px',
    color: '#2C2416',
    verticalAlign: 'middle',
  },
  tdMono: {
    padding: '12px 16px',
    color: '#8A7D6A',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  tdCenter: {
    padding: '12px 16px',
    textAlign: 'center',
    verticalAlign: 'middle',
    color: '#2C2416',
  },
  tdSmall: {
    padding: '12px 16px',
    fontSize: 11,
    color: '#8A7D6A',
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  badgeMobile: {
    background: '#FFF4E6',
    color: '#C4956A',
  },
  badgeDesktop: {
    background: '#EAF2EF',
    color: '#5B7B6F',
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#8A7D6A',
    fontSize: 14,
  },
}
