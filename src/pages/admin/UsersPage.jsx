import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) {
        setError(err.message)
      } else {
        setUsers(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 style={s.pageTitle}>Usuários</h1>
      <p style={s.pageSub}>{users.length} conta{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}</p>

      {loading && <div style={s.stateText}>Carregando...</div>}

      {error && (
        <div style={s.errorBox}>Erro ao carregar usuários: {error}</div>
      )}

      {!loading && !error && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Email', 'Nome', 'Nível', 'Criado em', 'Último acesso'].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={s.emptyCell}>Nenhum usuário encontrado.</td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} style={s.tr}>
                  <td style={s.td}>{u.email ?? '—'}</td>
                  <td style={s.td}>{u.full_name ?? '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...nivelColor(u.nivel) }}>{u.nivel ?? '—'}</span>
                  </td>
                  <td style={s.tdMono}>{formatDate(u.created_at)}</td>
                  <td style={s.tdMono}>{formatDate(u.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function nivelColor(nivel) {
  if (nivel === 'basico')        return { background: '#EAF2EF', color: '#5B7B6F' }
  if (nivel === 'intermediario') return { background: '#FFF4E6', color: '#C4956A' }
  if (nivel === 'avancado')      return { background: '#F5F0E8', color: '#8A7D6A' }
  return { background: '#F5F0E8', color: '#8A7D6A' }
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
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#8A7D6A',
    fontSize: 14,
  },
}
