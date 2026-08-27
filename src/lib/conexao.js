const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * Diz se dá para falar com o servidor AGORA.
 *
 * `navigator.onLine` não serve para isso: ele mente nos dois sentidos — diz
 * que há internet quando só existe wi-fi sem saída, e volta a dizer `true`
 * assim que o service worker entrega a página do cache, mesmo sem rede
 * nenhuma (comportamento confirmado em teste).
 *
 * Então aqui a pergunta é respondida do único jeito confiável: tentando.
 * Também cobre o caso do projeto Supabase pausado por inatividade, que da
 * perspectiva do app é igual a estar sem internet.
 */
export async function temConexao(timeoutMs = 2500) {
  if (!navigator.onLine) return false      // quando ele diz que NÃO tem, é verdade
  if (!SUPABASE_URL) return false

  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), timeoutMs)
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      mode: 'no-cors',       // a resposta não importa, só o fato de ter chegado
      cache: 'no-store',
      signal: controle.signal,
    })
    clearTimeout(prazo)
    return true
  } catch {
    return false
  }
}
