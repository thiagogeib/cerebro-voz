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
        setLoading(false)
        return
      }

      // Quantas frases cada um falou.
      //
      // Sem isto, a lista é um monte de e-mail igual — e o painel existe para
      // acompanhar UMA pessoa. Com a contagem, quem de fato usa o app aparece
      // no topo, e as contas de teste ficam visíveis pelo que são.
      const { data: eventos } = await supabase
        .from('usage_events')
        .select('user_id, created_at')
        .limit(10000)

      const porUsuario = {}
      for (const ev of eventos ?? []) {
        const atual = porUsuario[ev.user_id] || { total: 0, ultimo: null }
        atual.total++
        if (!atual.ultimo || ev.created_at > atual.ultimo) atual.ultimo = ev.created_at
        porUsuario[ev.user_id] = atual
      }

      const comUso = (data ?? []).map(u => ({
        ...u,
        totalFrases: porUsuario[u.id]?.total ?? 0,
        // O último acesso real é o da última frase falada. A coluna
        // `last_seen_at` só passou a ser preenchida agora, e o histórico
        // anterior vive nos eventos.
        ultimoUso: porUsuario[u.id]?.ultimo ?? u.last_seen_at ?? null,
      }))

      comUso.sort((a, b) => b.totalFrases - a.totalFrases)
      setUsers(comUso)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 style={s.pageTitle}>Usuários</h1>
      <p style={s.pageSub}>
        {users.length} conta{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}
        {' · '}
        {users.filter(u => u.totalFrases > 0).length} chegaram a falar alguma frase
      </p>

      {loading && <div style={s.stateText}>Carregando...</div>}

      {error && (
        <div style={s.errorBox}>Erro ao carregar usuários: {error}</div>
      )}

      {!loading && !error && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Pessoa', 'Nível', 'Frases faladas', 'Último uso', 'Criado em'].map(col => (
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
                  <td style={s.td}>
                    <div style={{ fontWeight: u.totalFrases > 0 ? 700 : 400 }}>
                      {u.full_name || u.email || '—'}
                      {u.role === 'admin' && <span style={s.adminTag}>admin</span>}
                    </div>
                    {u.full_name && <div style={s.subEmail}>{u.email}</div>}
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...nivelColor(u.nivel) }}>{u.nivel ?? '—'}</span>
                  </td>
                  <td style={s.tdMono}>
                    {u.totalFrases > 0
                      ? <strong style={{ color: '#5B7B6F', fontSize: 14 }}>{u.totalFrases}</strong>
                      : <span style={{ color: '#C9BCA6' }}>nunca falou</span>}
                  </td>
                  <td style={s.tdMono}>{formatDate(u.ultimoUso)}</td>
                  <td style={s.tdMono}>{formatDate(u.created_at)}</td>
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
  adminTag: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 700,
    color: '#C4956A',
    background: '#FFF4E6',
    padding: '2px 7px',
    borderRadius: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subEmail: {
    fontSize: 11,
    color: '#8A7D6A',
    marginTop: 2,
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#8A7D6A',
    fontSize: 14,
  },
}
