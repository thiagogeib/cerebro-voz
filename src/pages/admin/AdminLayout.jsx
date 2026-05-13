import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import UsersPage from './UsersPage'
import PhrasesPage from './PhrasesPage'
import HistoryPage from './HistoryPage'
import SessionsPage from './SessionsPage'

const NAV_LINKS = [
  { to: 'users',   label: 'Usuários',          icon: '👥' },
  { to: 'phrases', label: 'Frases mais usadas', icon: '📊' },
  { to: 'history', label: 'Histórico',           icon: '🕐' },
  { to: 'sessions',label: 'Sessões',             icon: '📡' },
]

export default function AdminLayout() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return (
      <div style={s.centered}>
        <span style={s.loadingText}>Carregando...</span>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div style={s.centered}>
        <div style={s.deniedBox}>
          <span style={{ fontSize: 40 }}>🔒</span>
          <p style={s.deniedTitle}>Acesso negado</p>
          <p style={s.deniedSub}>Você não tem permissão para acessar o painel administrativo.</p>
          <button style={s.backBtn} onClick={() => navigate('/app')}>Voltar ao app</button>
        </div>
      </div>
    )
  }

  const navLinkStyle = ({ isActive }) => ({
    ...s.navLink,
    ...(isActive ? s.navLinkActive : {}),
  })

  return (
    <div style={s.root}>
      {/* Sidebar desktop */}
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <span style={s.logo}>Admin<span style={s.dot}>.</span></span>
          <span style={s.logoSub}>cerebro-voz</span>
        </div>
        <nav style={s.nav}>
          {NAV_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} style={navLinkStyle} onClick={() => setMenuOpen(false)}>
              <span style={{ fontSize: 16 }}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <button style={s.backAppBtn} onClick={() => navigate('/app')}>
            ← Voltar ao app
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div style={s.mobileHeader}>
        <span style={s.logo}>Admin<span style={s.dot}>.</span></span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.mobileBackBtn} onClick={() => navigate('/app')}>← App</button>
          <button style={s.menuBtn} onClick={() => setMenuOpen(o => !o)}>☰</button>
        </div>
      </div>

      {menuOpen && (
        <div style={s.mobileMenu}>
          {NAV_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} style={navLinkStyle} onClick={() => setMenuOpen(false)}>
              <span style={{ fontSize: 16 }}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Content */}
      <main style={s.content}>
        <Routes>
          <Route path="users"    element={<UsersPage />} />
          <Route path="phrases"  element={<PhrasesPage />} />
          <Route path="history"  element={<HistoryPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="*"        element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  )
}

const s = {
  root: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'flex',
    height: '100dvh',
    overflow: 'hidden',
    background: '#F5F0E8',
    color: '#2C2416',
  },
  centered: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    background: '#F5F0E8',
  },
  loadingText: {
    fontSize: 16,
    color: '#8A7D6A',
  },
  deniedBox: {
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 14,
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: 360,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#2C2416',
    margin: '12px 0 6px',
  },
  deniedSub: {
    fontSize: 14,
    color: '#8A7D6A',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  sidebar: {
    width: 220,
    background: '#FFFDF8',
    borderRight: '1.5px solid #E2D9C8',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100dvh',
    '@media (max-width: 640px)': { display: 'none' },
  },
  sidebarHeader: {
    padding: '24px 20px 16px',
    borderBottom: '1.5px solid #E2D9C8',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  logo: {
    fontFamily: 'Georgia, serif',
    fontSize: 22,
    fontWeight: 700,
    color: '#5B7B6F',
    letterSpacing: -0.5,
  },
  dot: { color: '#C4956A' },
  logoSub: {
    fontSize: 11,
    color: '#8A7D6A',
    fontWeight: 500,
    letterSpacing: 0.3,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 10px',
    gap: 4,
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#8A7D6A',
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
  navLinkActive: {
    background: '#EAF2EF',
    color: '#5B7B6F',
    fontWeight: 700,
  },
  sidebarFooter: {
    padding: '12px 10px 20px',
    borderTop: '1.5px solid #E2D9C8',
  },
  backAppBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'none',
    border: '1.5px solid #E2D9C8',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#8A7D6A',
    cursor: 'pointer',
  },
  backBtn: {
    padding: '10px 24px',
    background: '#5B7B6F',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  mobileHeader: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: '#FFFDF8',
    borderBottom: '1.5px solid #E2D9C8',
    padding: '12px 16px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileBackBtn: {
    padding: '6px 12px',
    background: 'none',
    border: '1.5px solid #E2D9C8',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: '#8A7D6A',
    cursor: 'pointer',
  },
  menuBtn: {
    padding: '6px 12px',
    background: '#5B7B6F',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
  mobileMenu: {
    position: 'fixed',
    top: 57,
    left: 0,
    right: 0,
    zIndex: 99,
    background: '#FFFDF8',
    borderBottom: '1.5px solid #E2D9C8',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 10px',
    gap: 4,
  },
  content: {
    flex: 1,
    padding: '32px 28px',
    overflowY: 'auto',
  },
}
