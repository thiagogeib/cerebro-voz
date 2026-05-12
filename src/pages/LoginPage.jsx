import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ERRORS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Signup requires a valid password': 'Informe uma senha válida.',
  'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
}

function translateError(msg) {
  if (!msg) return 'Ocorreu um erro. Tente novamente.'
  for (const [key, value] of Object.entries(ERRORS)) {
    if (msg.includes(key)) return value
  }
  return msg
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(translateError(err.message))
      return
    }
    navigate('/app', { replace: true })
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) {
      setError(translateError(err.message))
      return
    }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
  }

  async function handleGoogle() {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/#/app',
      },
    })
    if (err) setError(translateError(err.message))
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError(null)
    setSuccess(null)
    setConfirmPassword('')
  }

  const isLogin = mode === 'login'

  return (
    <div style={s.root}>
      <div style={s.card}>

        {/* HEADER / LOGO */}
        <div style={s.logoArea}>
          <span style={s.logo}>
            Vicente<span style={s.dot}>.</span>
          </span>
          <span style={s.logoSub}>seu assistente de voz</span>
        </div>

        <p style={s.intro}>
          {isLogin ? 'Faça login para continuar' : 'Crie sua conta para começar'}
        </p>

        {/* FORMULÁRIO */}
        <form onSubmit={isLogin ? handleLogin : handleRegister} style={s.form}>

          <div style={s.fieldGroup}>
            <label style={s.label}>E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={s.input}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Senha</label>
            <input
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={s.input}
            />
          </div>

          {!isLogin && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Confirmar senha</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={s.input}
              />
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              {error}
            </div>
          )}

          {success && (
            <div style={s.successBox}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btnPrimary, ...(loading ? s.btnDisabled : {}) }}
          >
            {loading
              ? (isLogin ? 'Entrando...' : 'Criando conta...')
              : (isLogin ? 'Entrar' : 'Criar conta')
            }
          </button>
        </form>

        {/* DIVISOR */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>ou</span>
          <div style={s.dividerLine} />
        </div>

        {/* GOOGLE */}
        <button onClick={handleGoogle} style={s.btnGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        {/* TROCA DE MODO */}
        <div style={s.switchArea}>
          {isLogin ? (
            <>
              <span style={s.switchText}>Ainda não tem conta?</span>
              <button onClick={switchMode} style={s.switchLink}>Criar conta</button>
            </>
          ) : (
            <>
              <span style={s.switchText}>Já tem uma conta?</span>
              <button onClick={switchMode} style={s.switchLink}>Entrar</button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

const s = {
  root: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#F5F0E8',
    color: '#2C2416',
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    background: '#FFFDF8',
    border: '1.5px solid #E2D9C8',
    borderRadius: 20,
    padding: '36px 28px 28px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 6,
    lineHeight: 1.2,
  },
  logo: {
    fontFamily: 'Georgia, serif',
    fontSize: 34,
    fontWeight: 700,
    color: '#5B7B6F',
    letterSpacing: -0.5,
  },
  dot: {
    color: '#C4956A',
  },
  logoSub: {
    fontSize: 12,
    color: '#8A7D6A',
    fontWeight: 500,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  intro: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8A7D6A',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8A7D6A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    border: '1.5px solid #E2D9C8',
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 15,
    background: '#F5F0E8',
    color: '#2C2416',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  errorBox: {
    background: '#FDF0EE',
    border: '1.5px solid #E8C4BC',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#A03020',
    lineHeight: 1.5,
  },
  successBox: {
    background: '#EAF2EF',
    border: '1.5px solid #B8D9CE',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#3A6555',
    lineHeight: 1.5,
  },
  btnPrimary: {
    width: '100%',
    padding: '13px 0',
    background: '#5B7B6F',
    color: '#FFFDF8',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '22px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#E2D9C8',
  },
  dividerText: {
    fontSize: 12,
    color: '#8A7D6A',
    fontWeight: 500,
    letterSpacing: 0.5,
  },
  btnGoogle: {
    width: '100%',
    padding: '12px 0',
    background: '#FFFDF8',
    color: '#2C2416',
    border: '1.5px solid #E2D9C8',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  switchArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  switchText: {
    fontSize: 13,
    color: '#8A7D6A',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#5B7B6F',
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
}
