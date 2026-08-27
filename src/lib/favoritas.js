import { supabase } from './supabase'

// ─── FAVORITAS ───────────────────────────────────────────────────────────────
//
// As favoritas viviam só no localStorage: trocou de celular, perdeu tudo.
// Agora ficam na tabela `favorites` do Supabase (que já existia no schema e
// nunca tinha sido usada), com o localStorage virando cache offline.
//
// Formato usado na tela:   { e: emoji, l: rótulo, frase: texto }
// Formato no banco:        { emoji, label, phrase_text, sort_order }

const LOCAL_KEY = 'voz_favoritas'

function lerLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') } catch { return [] }
}

function gravarLocal(lista) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(lista)) } catch {}
}

const paraTela = (row) => ({ e: row.emoji, l: row.label, frase: row.phrase_text })

const paraBanco = (fav, userId, i) => ({
  user_id: userId,
  emoji: fav.e,
  label: fav.l,
  phrase_text: fav.frase,
  sort_order: i,
})

/**
 * Carrega as favoritas do usuário.
 *
 * Sem internet, devolve o que está no cache local.
 * Na primeira vez com o banco vazio, sobe as favoritas que já existiam no
 * celular (migração automática, uma vez só).
 */
export async function carregarFavoritas(userId) {
  const local = lerLocal()
  if (!userId) return local

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('emoji, label, phrase_text, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) return local

    if (!data.length && local.length) {
      await salvarFavoritas(userId, local)
      return local
    }

    const remotas = data.map(paraTela)
    gravarLocal(remotas)
    return remotas
  } catch {
    return local
  }
}

/**
 * Salva a lista inteira. Grava local primeiro (para a tela nunca ficar
 * esperando a rede) e depois substitui o conjunto no banco.
 *
 * A lista tem poucos itens, então apagar e reinserir é mais simples e seguro
 * do que calcular a diferença — e mantém a ordem que a família escolheu.
 */
export async function salvarFavoritas(userId, lista) {
  gravarLocal(lista)
  if (!userId) return { ok: false, motivo: 'sem-usuario' }

  try {
    const { error: errDelete } = await supabase.from('favorites').delete().eq('user_id', userId)
    if (errDelete) return { ok: false, motivo: errDelete.message }

    if (!lista.length) return { ok: true }

    const { error } = await supabase
      .from('favorites')
      .insert(lista.map((f, i) => paraBanco(f, userId, i)))

    return error ? { ok: false, motivo: error.message } : { ok: true }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
}
