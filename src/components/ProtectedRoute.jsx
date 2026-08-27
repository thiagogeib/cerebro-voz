import { Navigate } from 'react-router-dom'
import { useAuth, jaLogouNesteAparelho } from '../hooks/useAuth'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth()

  // Quando o Supabase não responde — sem internet, sinal ruim, ou o projeto
  // free tier pausado — a sessão volta vazia. Mandar para a tela de login
  // nesse momento tiraria do Vicente o único jeito que ele tem de falar,
  // justamente na hora em que nada está funcionando.
  //
  // Então, num aparelho onde ele já entrou e não saiu, o app continua
  // abrindo. Nada sensível fica exposto: as frases são as mesmas para todo
  // mundo e já estão no código do site; gravar qualquer coisa no banco
  // continua exigindo sessão válida, e o painel admin (requireRole) também.
  //
  // A marca é apagada no "Sair" — logout de verdade volta a exigir login.
  const modoOffline = !user && !requireRole && jaLogouNesteAparelho()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: '#F5F0E8',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 36,
            height: 36,
            border: '3px solid #E2D9C8',
            borderTopColor: '#5B7B6F',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 13, color: '#8A7D6A' }}>Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user && !modoOffline) {
    return <Navigate to="/login" replace />
  }

  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/app" replace />
  }

  return children
}
