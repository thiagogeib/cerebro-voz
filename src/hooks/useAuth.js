import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Marca que este aparelho já teve um login bem-sucedido. É o que autoriza o
// app a continuar abrindo quando não há internet para renovar a sessão
// (ver src/components/ProtectedRoute.jsx).
const CHAVE_JA_LOGOU = 'voz_ja_logou'

export function jaLogouNesteAparelho() {
  try { return localStorage.getItem(CHAVE_JA_LOGOU) === '1' } catch { return false }
}

function marcarLogin() {
  try { localStorage.setItem(CHAVE_JA_LOGOU, '1') } catch {}
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, nivel, context_text, selected_voice')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 8000)
    )

    Promise.race([supabase.auth.getSession(), timeout])
      .then(({ data: { session: currentSession } }) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession?.user) marcarLogin()
        return loadProfile(currentSession?.user?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) marcarLogin()
      loadProfile(newSession?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    // Sair de verdade: o app volta a exigir login mesmo sem internet.
    try { localStorage.removeItem(CHAVE_JA_LOGOU) } catch {}
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return { user, session, profile, loading, signOut }
}
