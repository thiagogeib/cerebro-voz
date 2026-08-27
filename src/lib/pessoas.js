import { supabase } from './supabase'

// ─── PESSOAS DA FAMÍLIA ──────────────────────────────────────────────────────
//
// Os nomes reais da família ficam AQUI (no banco do usuário), nunca no código.
// São eles que viram os botões "João", "Maria" no lugar dos genéricos "Filho",
// "Filha" — e, para quem tiver marcado, os botões "Casa do João" em Sair.
//
// Mesmo desenho de src/lib/favoritas.js: o banco é a fonte quando há internet,
// o localStorage é cache offline. A leitura local é síncrona de propósito —
// os botões com nome precisam aparecer na primeira pintura da tela, mesmo sem
// rede, sem piscar os genéricos antes.
//
// Formato na tela:  { nome, e, relacao, casa }
// Formato no banco: { nome, emoji, relacao, mostrar_casa, sort_order }

const LOCAL_KEY = 'voz_pessoas'

export function lerPessoasLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') } catch { return [] }
}

function gravarLocal(lista) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(lista)) } catch {}
}

const paraTela = (row) => ({
  nome: row.nome,
  e: row.emoji,
  relacao: row.relacao,
  casa: !!row.mostrar_casa,
})

const paraBanco = (p, userId, i) => ({
  user_id: userId,
  nome: p.nome,
  emoji: p.e,
  relacao: p.relacao,
  mostrar_casa: !!p.casa,
  sort_order: i,
})

/** Carrega as pessoas do usuário. Sem internet, devolve o cache local. */
export async function carregarPessoas(userId) {
  const local = lerPessoasLocal()
  if (!userId) return local

  try {
    const { data, error } = await supabase
      .from('people')
      .select('nome, emoji, relacao, mostrar_casa, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) return local

    // Banco vazio e cadastro feito offline: sobe o que está no aparelho.
    if (!data.length && local.length) {
      await salvarPessoas(userId, local)
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
 * Salva a lista inteira: grava local na hora (a tela nunca espera a rede) e
 * substitui o conjunto no banco. São poucas pessoas — apagar e reinserir é
 * mais simples que calcular diferença, e preserva a ordem escolhida.
 */
export async function salvarPessoas(userId, lista) {
  gravarLocal(lista)
  if (!userId) return { ok: false, motivo: 'sem-usuario' }

  try {
    const { error: errDelete } = await supabase.from('people').delete().eq('user_id', userId)
    if (errDelete) return { ok: false, motivo: errDelete.message }

    if (!lista.length) return { ok: true }

    const { error } = await supabase
      .from('people')
      .insert(lista.map((p, i) => paraBanco(p, userId, i)))

    return error ? { ok: false, motivo: error.message } : { ok: true }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
}
