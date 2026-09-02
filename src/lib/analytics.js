import { supabase } from './supabase'

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
//
// Regra de ouro (ADR-003): nada aqui pode atrasar a fala. Toda função é
// "dispara e esquece" e engole os próprios erros.
//
// Duas coisas foram resolvidas aqui:
//   · Eventos gerados sem internet não somem mais — ficam numa fila local e
//     sobem sozinhos no próximo acesso com rede.
//   · O fechamento da sessão usa `keepalive`, porque uma requisição normal é
//     cancelada pelo navegador quando a aba fecha.

const FILA_KEY = 'voz_eventos_pendentes'
const FILA_MAX = 200

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function startSession(userId) {
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenW: window.screen.width,
    screenH: window.screen.height,
    mobile: /Mobi|Android/i.test(navigator.userAgent),
  }

  // Aproveita que tem rede para mandar o que ficou pendente.
  void flushFila()

  // O id é gerado AQUI, não lido de volta do banco.
  //
  // Antes era `insert(...).select('id')`, e a leitura dependia de uma permissão
  // que a tabela não tinha: a linha era criada, mas o id voltava vazio. Sem
  // id, todo evento era gravado órfão (412 de 425 em produção) e a sessão
  // nunca era encerrada. Gerando o id no cliente, a sessão funciona mesmo que
  // a leitura falhe — e o insert deixa de precisar de resposta.
  const id = novoId()

  try {
    const { error } = await supabase
      .from('sessions')
      .insert({ id, user_id: userId, device_info: deviceInfo })

    if (error) return null

    // "Último acesso" do painel. A coluna existia desde o início e ninguém
    // escrevia nela — a coluna inteira vivia vazia.
    void supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})

    return id
  } catch {
    return null
  }
}

/** UUID v4 — usa o do navegador quando existe, com alternativa manual. */
function novoId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function trackEvent(event) {
  try {
    supabase
      .from('usage_events')
      .insert(event)
      .then(({ error }) => { if (error) enfileirar(event) })
  } catch {
    enfileirar(event)
  }
}

/**
 * Encerra a sessão. `accessToken` é obrigatório para o RLS aceitar o update.
 *
 * Roda em dois modos:
 *   · normal   — quando o app é desmontado com calma.
 *   · keepalive — quando a aba está fechando/indo para segundo plano. O
 *     navegador só garante a entrega da requisição com essa flag ligada.
 */
export function endSession(sessionId, phraseCount, accessToken) {
  if (!sessionId) return
  const body = JSON.stringify({
    ended_at: new Date().toISOString(),
    phrase_count: phraseCount,
  })

  try {
    void fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body,
    }).catch(() => {})
  } catch {}
}

/**
 * Últimas frases faladas pelo usuário, direto do banco.
 *
 * Serve para reconstruir o "Usadas recentemente" quando ele abre o app num
 * aparelho novo — antes esse histórico só existia no localStorage do celular.
 */
export async function fetchHistoricoRemoto(userId, limite = 20) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .select('phrase_text, phrase_label, emoji, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error || !data) return []

    // Sem repetir frase, e na ordem que a tela espera (mais antiga primeiro).
    const vistas = new Set()
    const unicas = []
    for (const ev of data) {
      if (vistas.has(ev.phrase_text)) continue
      vistas.add(ev.phrase_text)
      unicas.push({ e: ev.emoji || '💬', l: ev.phrase_label || ev.phrase_text, frase: ev.phrase_text })
      if (unicas.length >= limite) break
    }
    return unicas.reverse()
  } catch {
    return []
  }
}

// ─── FILA OFFLINE ────────────────────────────────────────────────────────────

function enfileirar(event) {
  try {
    const fila = lerFila()
    fila.push(event)
    localStorage.setItem(FILA_KEY, JSON.stringify(fila.slice(-FILA_MAX)))
  } catch {}
}

function lerFila() {
  try { return JSON.parse(localStorage.getItem(FILA_KEY) || '[]') } catch { return [] }
}

/** Sobe os eventos acumulados offline. Só limpa a fila se o envio deu certo. */
export async function flushFila() {
  const fila = lerFila()
  if (!fila.length) return
  try {
    const { error } = await supabase.from('usage_events').insert(fila)
    if (!error) localStorage.removeItem(FILA_KEY)
  } catch {}
}
