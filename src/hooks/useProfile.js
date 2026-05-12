import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function loadProfile(id) {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, nivel, context_text, selected_voice')
      .eq('id', id)
      .single()

    if (!error && data) {
      setProfile(data)
    }
    setLoading(false)
  }

  async function saveProfile(updates) {
    if (!userId) return { error: new Error('Usuário não autenticado') }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }
    setLoading(false)
    return { data, error }
  }

  useEffect(() => {
    loadProfile(userId)
  }, [userId])

  return { profile, loading, saveProfile }
}
