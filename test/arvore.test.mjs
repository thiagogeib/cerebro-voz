// Testa a arvore de frases sem abrir navegador: integridade dos nos, as
// regras de cada nivel e a injecao dos botoes com nome de gente.
//
// Rode com: npm run test:arvore
import { TREE, getCats, getNosPessoas, fraseFalarCom, RELACOES } from '../src/data/tree.js'

let falhas = 0
const ok = (n, d = '') => console.log(`  ok     ${n}${d ? '  — ' + d : ''}`)
const nok = (n, d = '') => { falhas++; console.log(` FALHA  ${n}${d ? '  — ' + d : ''}`) }

function percorrer(nos, caminho = [], saida = []) {
  for (const n of nos) {
    saida.push({ ...n, caminho: [...caminho, n.l] })
    if (n.filhos) percorrer(n.filhos, [...caminho, n.l], saida)
  }
  return saida
}

// ── Integridade da árvore estática ──
const todos = percorrer([...TREE.basico, ...TREE.intermediario])
const ids = todos.map(n => n.id)
const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
dup.length ? nok('ids unicos', dup.join(', ')) : ok('ids unicos', `${ids.length} nos`)

const ambiguos = todos.filter(n => n.frase && n.filhos)
ambiguos.length ? nok('nenhum no com frase E filhos', ambiguos.map(n => n.id).join(', ')) : ok('nenhum no com frase E filhos')

const mudos = todos.filter(n => !n.frase && !n.filhos)
mudos.length ? nok('nenhuma folha sem frase', mudos.map(n => n.id).join(', ')) : ok('nenhuma folha sem frase')

const longos = todos.filter(n => n.l.length > 16)
longos.length ? nok('rotulos ate 16 caracteres', longos.map(n => `${n.l} (${n.l.length})`).join(', ')) : ok('rotulos ate 16 caracteres')

function irmaosComEmojiRepetido(nos, nome = 'raiz') {
  const problemas = []
  const es = nos.map(n => n.e)
  const rep = [...new Set(es.filter((x, i) => es.indexOf(x) !== i))]
  if (rep.length) problemas.push(`${nome}: ${rep.join(' ')}`)
  for (const n of nos) if (n.filhos) problemas.push(...irmaosComEmojiRepetido(n.filhos, n.l))
  return problemas
}
const repetidos = irmaosComEmojiRepetido([...TREE.basico, ...TREE.intermediario])
repetidos.length ? nok('emoji repetido entre irmaos', repetidos.join(' | ')) : ok('emoji repetido entre irmaos')

// ── As quatro melhorias ──
const sede = TREE.basico.find(c => c.id === 'sede')
const labelsSede = sede.filhos.map(f => f.l)
const esperadoSede = ['Água', 'Café', 'Café adoçante', 'Café açúcar', 'Suco', 'Suco laranja', 'Suco de uva', 'Água de coco', 'Chá']
JSON.stringify(labelsSede) === JSON.stringify(esperadoSede)
  ? ok('Sede com as bebidas novas', `${labelsSede.length} botoes, sem submenu`)
  : nok('Sede com as bebidas novas', labelsSede.join(' | '))

sede.filhos.find(f => f.id === 'cafe_adocante')?.frase.includes('cinco gotas')
  ? ok('cafe com adocante fala as cinco gotas')
  : nok('cafe com adocante fala as cinco gotas')

const sentir = TREE.intermediario.find(c => c.id === 'sentir')
const idsSentir = sentir.filhos.map(f => f.id)
!idsSentir.includes('mal') && ['cansado', 'triste', 'ansioso', 'confuso'].every(i => idsSentir.includes(i))
  ? ok('Me sinto achatado', `${idsSentir.length} botoes, um toque por sentimento`)
  : nok('Me sinto achatado', idsSentir.join(', '))

sentir.filhos.every(f => f.frase && !f.filhos)
  ? ok('todo sentimento fala direto, sem submenu')
  : nok('todo sentimento fala direto, sem submenu')

// ── Regressão: sem ninguém cadastrado, árvore idêntica ──
const semPessoas = JSON.stringify(getCats('intermediario'))
const listaVazia = JSON.stringify(getCats('intermediario', []))
semPessoas === listaVazia && semPessoas === JSON.stringify([...TREE.basico, ...TREE.intermediario])
  ? ok('sem cadastro, a arvore nao muda em nada')
  : nok('sem cadastro, a arvore nao muda em nada')

const familiaOriginal = TREE.intermediario.find(c => c.id === 'familia').filhos.map(f => f.l)
familiaOriginal.includes('Filho') && familiaOriginal.includes('Filha')
  ? ok('genericos Filho/Filha presentes sem cadastro')
  : nok('genericos Filho/Filha presentes sem cadastro', familiaOriginal.join(', '))

// ── Com pessoas cadastradas ──
const pessoas = [
  { nome: 'João', e: '👨', relacao: 'filho', casa: true },
  { nome: 'Maria', e: '👩', relacao: 'filha', casa: false },
]
const arvore = getCats('intermediario', pessoas)
const familia = arvore.find(c => c.id === 'familia').filhos

familia[0].l === 'João' && familia[1].l === 'Maria'
  ? ok('pessoas cadastradas aparecem primeiro em Familia')
  : nok('pessoas cadastradas aparecem primeiro em Familia', familia.map(f => f.l).join(', '))

familia.find(f => f.frase === 'Quero falar com o João.')
  ? ok('artigo masculino correto', 'Quero falar com o João.')
  : nok('artigo masculino correto', JSON.stringify(familia.map(f => f.frase)))

familia.find(f => f.frase === 'Quero falar com a Maria.')
  ? ok('artigo feminino correto', 'Quero falar com a Maria.')
  : nok('artigo feminino correto')

!familia.some(f => f.l === 'Filho') && !familia.some(f => f.l === 'Filha')
  ? ok('genericos somem quando a relacao foi cadastrada')
  : nok('genericos somem quando a relacao foi cadastrada', familia.map(f => f.l).join(', '))

familia.some(f => f.l === 'Esposa') && familia.some(f => f.l === 'Amor')
  ? ok('Esposa (nao cadastrada) e Amor continuam na tela')
  : nok('Esposa (nao cadastrada) e Amor continuam na tela', familia.map(f => f.l).join(', '))

const sair = arvore.find(c => c.id === 'sair').filhos
const casaJoao = sair.find(f => f.id === 'sair_casa_joao')
casaJoao?.frase === 'Quero ir na casa do João.'
  ? ok('Casa do João aparece em Sair', casaJoao.l)
  : nok('Casa do João aparece em Sair', JSON.stringify(sair.slice(0, 3)))

!sair.some(f => f.id === 'sair_casa_maria')
  ? ok('quem nao marcou casa nao gera botao em Sair')
  : nok('quem nao marcou casa nao gera botao em Sair')

!sair.some(f => f.id === 'sair_pais')
  ? ok('Casa dos pais saiu da tela')
  : nok('Casa dos pais saiu da tela')

const arvoreFilha = getCats('intermediario', [{ nome: 'Ana', e: '👩', relacao: 'filha', casa: true }])
arvoreFilha.find(c => c.id === 'sair').filhos.find(f => f.frase === 'Quero ir na casa da Ana.')
  ? ok('contracao feminina correta', 'casa DA Ana')
  : nok('contracao feminina correta')

const arvoreAcento = getCats('intermediario', [
  { nome: 'José', e: '👨', relacao: 'filho', casa: false },
  { nome: 'Jose', e: '👨', relacao: 'neto', casa: false },
])
const idsPessoas = arvoreAcento.find(c => c.id === 'familia').filhos.map(f => f.id)
idsPessoas.includes('falar_jose') && idsPessoas.includes('falar_jose_2')
  ? ok('nomes iguais/acentuados geram ids distintos', 'falar_jose + falar_jose_2')
  : nok('nomes iguais/acentuados geram ids distintos', idsPessoas.join(', '))

fraseFalarCom({ nome: 'Ana', relacao: 'filha' }) === 'Quero falar com a Ana.'
  ? ok('preview da frase no cadastro')
  : nok('preview da frase no cadastro', fraseFalarCom({ nome: 'Ana', relacao: 'filha' }))

RELACOES.every(r => ['o', 'a'].includes(fraseFalarCom({ nome: 'X', relacao: r.id }).split(' ')[3]))
  ? ok('toda relacao da lista tem artigo definido', `${RELACOES.length} relacoes`)
  : nok('toda relacao da lista tem artigo definido')

const nomeLongo = getCats('intermediario', [{ nome: 'Bartolomeu', e: '👨', relacao: 'filho', casa: true }])
const labelLongo = nomeLongo.find(c => c.id === 'sair').filhos[0].l
labelLongo.length <= 20
  ? ok('rotulo de casa com nome longo', `"${labelLongo}" (${labelLongo.length})`)
  : nok('rotulo de casa com nome longo', `"${labelLongo}" (${labelLongo.length})`)

// ── Familia no nivel BASICO (as pessoas aparecem em todos os niveis) ──
const basicoSem = getCats('basico')
const basicoSemLista = getCats('basico', [])
JSON.stringify(basicoSem) === JSON.stringify(TREE.basico) && JSON.stringify(basicoSemLista) === JSON.stringify(TREE.basico)
  ? ok('basico sem cadastro fica identico ao de hoje', `${basicoSem.length} botoes`)
  : nok('basico sem cadastro fica identico ao de hoje')

const basicoCom = getCats('basico', pessoas)
const posicoesAntes = TREE.basico.map(c => c.l).join(' ')
const posicoesDepois = basicoCom.slice(0, TREE.basico.length).map(c => c.l).join(' ')
posicoesAntes === posicoesDepois
  ? ok('nenhum botao do basico muda de lugar', posicoesDepois)
  : nok('nenhum botao do basico muda de lugar', `antes: ${posicoesAntes} / depois: ${posicoesDepois}`)

const familiaBasico = basicoCom[basicoCom.length - 1]
familiaBasico.id === 'familia'
  ? ok('Familia entra no FIM da grade do basico', `${basicoCom.length}o botao (a celula que estava vazia)`)
  : nok('Familia entra no FIM da grade do basico', JSON.stringify(familiaBasico && familiaBasico.l))

familiaBasico.filhos.length === pessoas.length && familiaBasico.filhos.every(f => f.id.startsWith('falar_'))
  ? ok('no basico a Familia tem so as pessoas cadastradas', familiaBasico.filhos.map(f => f.l).join(', '))
  : nok('no basico a Familia tem so as pessoas cadastradas', JSON.stringify(familiaBasico.filhos.map(f => f.l)))

basicoCom.filter(c => c.id === 'familia').length === 1
  ? ok('nao duplica a categoria Familia')
  : nok('nao duplica a categoria Familia')

const idIntermediario = getCats('intermediario', pessoas).find(c => c.id === 'familia').filhos[0].id
familiaBasico.filhos[0].id === idIntermediario
  ? ok('mesmo id de botao nos dois niveis (relatorio nao se parte)', idIntermediario)
  : nok('mesmo id de botao nos dois niveis')

// ── Nivel avancado ──
getNosPessoas([]).length === 0
  ? ok('avancado sem cadastro nao mostra ninguem')
  : nok('avancado sem cadastro nao mostra ninguem')

const avancado = getNosPessoas(pessoas)
avancado.length === 2 && avancado[0].frase === 'Quero falar com o João.'
  ? ok('avancado lista as pessoas com a frase certa', avancado.map(p => p.l).join(', '))
  : nok('avancado lista as pessoas com a frase certa', JSON.stringify(avancado))

console.log(`\n${falhas ? falhas + ' FALHA(S)' : 'tudo certo'} — arvore com ${ids.length} nos`)
process.exit(falhas ? 1 : 0)
