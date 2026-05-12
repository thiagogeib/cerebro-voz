import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SOURCE_LABELS = {
  button:     'Botão',
  favorita:   'Favorita',
  historico:  'Histórico',
  fragmento:  'Fragmento',
}

export default function HistoryPage() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [events, setEvents] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email', { ascending: true })
      setUsers(data ?? [])
      setLoadingUsers(false)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    if (!selectedUser) {
      setEvents([])
      return
    }
    async function loadEvents() {
      setLoadingEvents(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('usage_events')
        .select('*')
        .eq('user_id', selectedUser)
        .order('created_at', { ascending: false })
        .limit(100)
      if (err) {
        setError(err.message)
      } else {
        setEvents(data ?? [])
      }
      setLoadingEvents(false)
    }
    loadEvents()
  }, [selectedUser])

  return (
    <div>
      <h1 style={s.pageTitle}>Histórico de uso</h1>

      <div style={s.selectWrap}>
        {loadingUsers ? (
          <span style={s.stateText}>Carregando usuários...</span>
        ) : (
          <select
            style={s.select}
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
          >
            <option value="">Selecione um usuário...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.email}{u.full_name ? ` — ${u.full_name}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div style={s.errorBox}>Erro ao carregar histórico: {error}</div>
      )}

      {!selectedUser && !loadingUsers && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 36 }}>👆</span>
          <p style={s.emptyText}>Selecione um usuário para ver o histórico</p>
        </div>
      )}

      {selectedUser && loadingEvents && (
        <div style={s.stateText}>Carregando...</div>
      )}

      {selectedUser && !loadingEvents && !error && events.length === 0 && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 36 }}>🕐</span>
          <p style={s.emptyText}>Nenhum evento registrado para este usuário.</p>
        </div>
      )}

      {!loadingEvents && !error && events.length > 0 && (
        <>
          <p style={s.countText}>{events.length} evento{events.length !== 1 ? 's' : ''} (últimos 100)</p>
          <div style={s.list}>
            {events.map(ev => (
              <div key={ev.id} style={s.item}>
                <div style={s.itemLeft}>
                  <span style={s.emoji}>{ev.emoji ?? '💬'}</span>
                  <div style={s.itemBody}>
                    <div style={s.phraseText}>{ev.phrase_text ?? ev.phrase_label ?? '—'}</div>
                    <div style={s.meta}>
                      {ev.phrase_label && ev.phrase_label !== ev.phrase_text && (
                        <span style={s.tag}>{ev.phrase_label}</span>
                      )}
                      {ev.source && (
                        <span style={s.tag}>{SOURCE_LABELS[ev.source] ?? ev.source}</span>
                      )}
                      {ev.was_ai_enhanced && (
                        <span style={{ ...s.tag, ...s.tagAI }}>✨ IA</span>
                      )}
                    </div>
                  </div>
                </div>
                <span style={s.dateText}>{formatDateTime(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </>
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
  selectWrap: {
    marginBottom: 24,
  },
  select: {
    width: '100%',
    maxWidth: 460,
    padding: '10px 14px',
    border: '1.5px solid #E2D9C8',
    borderRadius: 10,
    fontSize: 14,
    color: '#2C2416',
    background: '#FFFDF8',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    cursor: 'pointer',
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
    marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 0',
    color: '#8A7D6A',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  countText: {
    fontSize: 12,
    color: '#8A7D6A',
    marginBottom: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 12,
    padding: '12px 16px',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  emoji: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 1,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  phraseText: {
    fontSize: 14,
    color: '#2C2416',
    lineHeight: 1.4,
    fontFamily: 'Georgia, serif',
    marginBottom: 4,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#8A7D6A',
    background: '#F5F0E8',
    padding: '2px 8px',
    borderRadius: 20,
    textTransform: 'capitalize',
  },
  tagAI: {
    background: '#EAF2EF',
    color: '#5B7B6F',
  },
  dateText: {
    fontSize: 11,
    color: '#8A7D6A',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 2,
  },
}
