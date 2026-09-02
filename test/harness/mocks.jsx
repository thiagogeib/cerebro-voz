// Substitutos do Supabase e do useAuth para os testes.
//
// Deixam o app abrir sem login e sem rede, com os dados que cada teste quiser:
//   window.__mockRows   — o que cada tabela devolve
//   window.__mockCalls  — o que o app tentou gravar

const linhasDe = (tabela) => (window.__mockRows && window.__mockRows[tabela]) || []

function query(tabela) {
  window.__mockCalls = window.__mockCalls || []
  const resposta = { data: linhasDe(tabela), error: null }

  const chain = {
    select: () => chain,
    insert: (payload) => { window.__mockCalls.push({ tabela, op: 'insert', payload }); return chain },
    update: (payload) => { window.__mockCalls.push({ tabela, op: 'update', payload }); return chain },
    delete: () => { window.__mockCalls.push({ tabela, op: 'delete' }); return chain },
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (fn) => Promise.resolve(resposta).then(fn),
    catch: () => Promise.resolve(resposta),
    finally: (fn) => Promise.resolve(resposta).finally(fn),
  }
  return chain
}

export const supabase = {
  from: (tabela) => query(tabela),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    getUser: () => Promise.resolve({ data: { user: null } }),
    signOut: () => Promise.resolve({}),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
}

export function useAuth() {
  return {
    user: { id: '00000000-0000-0000-0000-000000000000' },
    session: { access_token: 'token-de-teste' },
    profile: {
      role: 'user',
      nivel: localStorage.getItem('voz_nivel') || 'intermediario',
      selected_voice: '',
    },
    loading: false,
    signOut: () => {},
  }
}

export function jaLogouNesteAparelho() { return true }
