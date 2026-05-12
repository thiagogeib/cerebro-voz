import { supabase } from './supabase'

export async function startSession(userId) {
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenW: window.screen.width,
    screenH: window.screen.height,
    mobile: /Mobi|Android/i.test(navigator.userAgent),
  }
  const { data } = await supabase
    .from('sessions')
    .insert({ user_id: userId, device_info: deviceInfo })
    .select('id')
    .single()
  return data?.id ?? null
}

export function trackEvent(event) {
  void supabase.from('usage_events').insert(event).then(() => {})
}

export async function endSession(sessionId, phraseCount) {
  if (!sessionId) return
  await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString(), phrase_count: phraseCount })
    .eq('id', sessionId)
}
