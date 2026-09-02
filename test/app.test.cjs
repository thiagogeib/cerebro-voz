// Testa o app rodando de verdade no Chrome, com Supabase e login simulados.
//
// Cobre o cadastro de pessoas, os tres niveis, e o caso que ja quebrou antes:
// cadastrar e fechar sem salvar.
//
// Rode com: npm test   (sobe o harness sozinho)
//
// Nenhum teste pode gerar voz — o harness bloqueia e falha se alguma escapar.
// O teste central é o primeiro: cadastrar e FECHAR SEM SALVAR — antes isso
// perdia tudo em silêncio.

const puppeteer = require('puppeteer-core')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL_TESTE || 'http://localhost:5199/test/harness/index.html'
const OUT = process.argv[2] || '.'

const r = []
const ok = (n, d = '') => r.push(['ok   ', n, d])
const nok = (n, d = '') => r.push(['FALHA', n, d])

const labels = (page) => page.$$eval('button', bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()))

let paginaAtual = null

async function clicar(page, texto) {
  paginaAtual = page
  const achou = await page.evaluate((t) => {
    const alvo = t.toUpperCase()
    const casa = (x) => x.innerText && x.innerText.replace(/\s+/g, ' ').trim().toUpperCase().includes(alvo)
    // BUTTON primeiro: o <div> que envolve um botao tem o mesmo texto dele, e
    // clicar no container nao dispara nada — foi o que fez o modal nunca fechar.
    const botoes = [...document.querySelectorAll('button')].filter(casa)
    const outros = [...document.querySelectorAll('div, label')].filter(casa)
    const cand = botoes.length ? botoes : outros
    const b = cand.sort((a, c) => a.innerText.length - c.innerText.length)[0]
    if (b) { b.click(); return true }
    return false
  }, texto)
  if (!achou) throw new Error(`nao achei "${texto}"`)
  await new Promise(res => setTimeout(res, 450))
}

async function novaPagina(browser, { nivel = 'intermediario', rows = {} } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await page.evaluateOnNewDocument((n, rw) => {
    localStorage.clear()
    localStorage.setItem('voz_nivel', n)
    window.__mockRows = rw
  }, nivel, rows)
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
  page._erros = erros
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await new Promise(res => setTimeout(res, 700))
  return page
}

async function abrirCadastro(page) {
  await clicar(page, '⚙️')
  await clicar(page, '👥')
}

async function preencher(page, nome, relacao) {
  await page.type('input[placeholder="Nome (ex: João)"]', nome)
  await new Promise(res => setTimeout(res, 200))
  await clicar(page, relacao)
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  })

  // ══ 1. O BUG DE ANTES: cadastrar e fechar sem "Salvar" ══
  let page = await novaPagina(browser, { rows: { people: [], favorites: [], usage_events: [] } })
  await abrirCadastro(page)
  await preencher(page, 'Maria', 'Filha')
  await clicar(page, 'Cadastrar Maria')

  const confirmou = (await page.$eval('body', b => b.innerText)).includes('cadastrado')
  confirmou ? ok('confirma na tela que cadastrou') : nok('confirma na tela que cadastrou')
  await page.screenshot({ path: `${OUT}/cad-01-confirmado.png` })

  // fecha tocando FORA do modal — o gesto natural de "terminei"
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="position: fixed"]')
    if (overlay) overlay.click()
  })
  await new Promise(res => setTimeout(res, 600))

  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('voz_pessoas') || '[]'))
  guardado.length === 1 && guardado[0].nome === 'Maria'
    ? ok('CADASTRO SOBREVIVE A FECHAR SEM SALVAR', 'era aqui que se perdia tudo')
    : nok('CADASTRO SOBREVIVE A FECHAR SEM SALVAR', JSON.stringify(guardado))

  const naArvore = await (async () => {
    try { await clicar(page, 'Família'); return (await labels(page)).some(b => b.toUpperCase().includes('MARIA')) }
    catch { return false }
  })()
  naArvore ? ok('o botão já está na árvore') : nok('o botão já está na árvore')

  // ══ 2. Um botão só: não existe mais "Adicionar" separado ══
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /voltar/i.test(x.innerText)); b && b.click() })
  await new Promise(res => setTimeout(res, 300))
  await abrirCadastro(page)
  const botoesCad = await labels(page)
  const temAdicionarSolto = botoesCad.some(b => b.trim() === 'Adicionar')
  const temCancelarSalvar = botoesCad.some(b => b.trim() === 'Cancelar') && botoesCad.some(b => b.trim() === 'Salvar')
  !temAdicionarSolto && !temCancelarSalvar
    ? ok('sumiu o par ambíguo Adicionar/Cancelar/Salvar', 'só "Cadastrar" e "Fechar"')
    : nok('sumiu o par ambíguo', botoesCad.filter(b => /adicionar|cancelar|salvar|fechar/i.test(b)).join(' | '))

  botoesCad.some(b => /fechar/i.test(b))
    ? ok('a aba de família tem só "Fechar"')
    : nok('a aba de família tem só "Fechar"', botoesCad.join(' | '))

  // ══ 3. Preview mostra onde o botão vai aparecer ══
  await preencher(page, 'Pedro', 'Neto')
  // O CSS deixa os titulos em maiusculas — comparar sem caixa.
  const tela = await page.$eval('body', b => b.innerText)
  const telaUp = tela.toUpperCase()
  telaUp.includes('COMO VAI FICAR NO APP DELE') && telaUp.includes('FAMÍLIA ›')
    ? ok('preview mostra ONDE o botão vai aparecer')
    : nok('preview mostra ONDE o botão vai aparecer', tela.slice(-300))
  tela.includes('Quero falar com o Pedro.')
    ? ok('preview ainda mostra a frase falada (confere o artigo)')
    : nok('preview ainda mostra a frase falada')
  await page.screenshot({ path: `${OUT}/cad-02-preview.png` })

  // menos ruído: a grade de 24 emojis não fica mais à mostra
  // Contar s\u00f3 os rostos do cadastro \u2014 n\u00e3o os \u00edcones da interface (abas, header).
  const ROSTOS = ['\ud83d\udc68', '\ud83d\udc69', '\ud83e\uddd1', '\ud83d\udc74', '\ud83d\udc75', '\ud83d\udc66', '\ud83d\udc67', '\ud83e\uddd4', '\ud83d\udc68\u200d\ud83e\uddb3', '\ud83d\udc69\u200d\ud83e\uddb3', '\ud83d\udc68\u200d\ud83e\uddb0', '\ud83d\udc69\u200d\ud83e\uddb0']
  const contarRostos = (pg) => pg.evaluate(
    (lista) => [...document.querySelectorAll('button')].filter(b => lista.includes(b.innerText.trim())).length,
    ROSTOS)
  const rostosVisiveis = await contarRostos(page)
  rostosVisiveis <= 6
    ? ok('grade de emojis não polui mais a tela', `${rostosVisiveis} visíveis`)
    : nok('grade de emojis não polui mais a tela', `${rostosVisiveis} visíveis`)

  await clicar(page, 'trocar a figura')
  const depoisDeTrocar = await contarRostos(page)
  depoisDeTrocar > rostosVisiveis
    ? ok('"trocar a figura" abre os rostos sob demanda', `${depoisDeTrocar} opções`)
    : nok('"trocar a figura" abre os rostos sob demanda')

  await clicar(page, 'Cadastrar Pedro')
  await new Promise(res => setTimeout(res, 500))

  // ══ 4. Atalho dentro da própria tela Família ══
  await clicar(page, 'Fechar')
  await new Promise(res => setTimeout(res, 500))
  await clicar(page, 'Família')
  const naFamilia = await labels(page)
  naFamilia.some(b => b.includes('Cadastrar') && b.includes('pessoa'))
    ? ok('ATALHO "Cadastrar pessoa" dentro da tela Família')
    : nok('ATALHO "Cadastrar pessoa" dentro da tela Família', naFamilia.join(' | '))
  await page.screenshot({ path: `${OUT}/cad-03-atalho.png` })

  await clicar(page, 'Cadastrar pessoa')
  await new Promise(res => setTimeout(res, 600))
  ;(await page.$eval('body', b => b.innerText)).includes('Cadastrar alguém')
    ? ok('o atalho abre direto o cadastro')
    : nok('o atalho abre direto o cadastro')

  // ══ 4b. EDITAR uma pessoa já cadastrada ══
  await clicar(page, 'Fechar')
  await new Promise(res => setTimeout(res, 400))
  await abrirCadastro(page)

  // entra em edição pelo lápis da primeira pessoa (Maria)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '✏️')
    b && b.click()
  })
  await new Promise(res => setTimeout(res, 500))

  const emEdicao = await page.evaluate(() => ({
    titulo: document.body.textContent.includes('Editando'),
    nome: document.querySelector('input[placeholder="Nome (ex: João)"]')?.value,
    botao: [...document.querySelectorAll('button')].some(b => /^Salvar /.test(b.textContent.trim())),
    cancelar: document.body.textContent.includes('cancelar a edição'),
  }))
  emEdicao.titulo && emEdicao.nome === 'Maria'
    ? ok('EDITAR abre com os dados da pessoa', `campo já vem "${emEdicao.nome}"`)
    : nok('EDITAR abre com os dados da pessoa', JSON.stringify(emEdicao))
  emEdicao.botao && emEdicao.cancelar
    ? ok('em edição o botão vira "Salvar" e há como cancelar')
    : nok('em edição o botão vira "Salvar" e há como cancelar', JSON.stringify(emEdicao))
  await page.screenshot({ path: `${OUT}/cad-06-editando.png` })

  // corrige o nome
  await page.evaluate(() => {
    const i = document.querySelector('input[placeholder="Nome (ex: João)"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(i, '')
    i.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.type('input[placeholder="Nome (ex: João)"]', 'Mariana')
  await new Promise(res => setTimeout(res, 300))
  await clicar(page, 'Salvar Mariana')
  await new Promise(res => setTimeout(res, 900))

  const depoisDeEditar = await page.evaluate(() => JSON.parse(localStorage.getItem('voz_pessoas') || '[]'))
  const editada = depoisDeEditar.find(p => p.nome === 'Mariana')
  editada && !depoisDeEditar.some(p => p.nome === 'Maria') && depoisDeEditar.length === 2
    ? ok('EDIÇÃO SALVA e não duplica a pessoa', JSON.stringify(depoisDeEditar.map(p => p.nome)))
    : nok('EDIÇÃO SALVA e não duplica a pessoa', JSON.stringify(depoisDeEditar))

  editada && editada.relacao === 'filha'
    ? ok('a relação é preservada ao editar só o nome')
    : nok('a relação é preservada ao editar só o nome', JSON.stringify(editada))

  const saiuDaEdicao = !(await page.$eval('body', b => b.textContent)).includes('Editando')
  saiuDaEdicao ? ok('sai do modo de edição ao salvar') : nok('sai do modo de edição ao salvar')

  await clicar(page, 'Fechar')
  await new Promise(res => setTimeout(res, 400))
  await clicar(page, 'Família')
  const arvoreEditada = await labels(page)
  arvoreEditada.some(b => b.toUpperCase().includes('MARIANA')) && !arvoreEditada.some(b => b.toUpperCase().includes('👩 MARIA\n'))
    ? ok('o botão na árvore passa a ter o nome novo')
    : nok('o botão na árvore passa a ter o nome novo', arvoreEditada.join(' | '))

  // cancelar edição não altera nada
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /voltar/i.test(x.textContent)); b && b.click() })
  await new Promise(res => setTimeout(res, 300))
  await abrirCadastro(page)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '✏️')
    b && b.click()
  })
  await new Promise(res => setTimeout(res, 400))
  await page.type('input[placeholder="Nome (ex: João)"]', 'XYZ')
  await clicar(page, 'cancelar a edição')
  await new Promise(res => setTimeout(res, 500))
  const aposCancelar = await page.evaluate(() => JSON.parse(localStorage.getItem('voz_pessoas') || '[]'))
  !aposCancelar.some(p => p.nome.includes('XYZ'))
    ? ok('cancelar a edição não altera nada')
    : nok('cancelar a edição não altera nada', JSON.stringify(aposCancelar))

  // ══ 5. Remover grava na hora ══
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '✕')
    b && b.click()
  })
  await new Promise(res => setTimeout(res, 600))
  const aposRemover = await page.evaluate(() => JSON.parse(localStorage.getItem('voz_pessoas') || '[]'))
  aposRemover.length === 1
    ? ok('remover também grava na hora', `sobrou ${aposRemover[0].nome}`)
    : nok('remover também grava na hora', JSON.stringify(aposRemover))

  // ══ 6. NÍVEL BÁSICO — o que o Vicente usa ══
  const basico = await novaPagina(browser, {
    nivel: 'basico',
    rows: { people: [{ nome: 'João', emoji: '👨', relacao: 'filho', mostrar_casa: false, sort_order: 0 }], favorites: [], usage_events: [] },
  })
  const gradeBasica = await labels(basico)
  const semHeader = gradeBasica.filter(b => !/🎙️|⚙️|🚪|📊|🔊/.test(b) && b.length > 1)
  semHeader.some(b => b.toUpperCase().includes('FAMÍLIA'))
    ? ok('BÁSICO mostra a categoria Família', semHeader.map(b => b.split('\n')[1] || b).join(' '))
    : nok('BÁSICO mostra a categoria Família', semHeader.join(' | '))

  const ordem = semHeader.map(b => b.replace(/\s+/g, ' ').trim())
  const primeiros = ordem.slice(0, 7).join(' ').toUpperCase()
  primeiros.includes('SEDE') && primeiros.includes('AJUDA') && ordem[ordem.length - 1].toUpperCase().includes('FAMÍLIA')
    ? ok('Família entra no fim, sem mover os outros botões')
    : nok('Família entra no fim, sem mover os outros botões', ordem.join(' | '))
  await basico.screenshot({ path: `${OUT}/cad-04-basico.png` })

  await clicar(basico, 'Família')
  ;(await labels(basico)).some(b => b.toUpperCase().includes('JOÃO'))
    ? ok('no básico, a Família tem a pessoa cadastrada')
    : nok('no básico, a Família tem a pessoa cadastrada')

  // básico sem ninguém cadastrado continua igual ao de sempre
  const basicoVazio = await novaPagina(browser, { nivel: 'basico', rows: { people: [], favorites: [], usage_events: [] } })
  const gradeVazia = (await labels(basicoVazio)).filter(b => !/🎙️|⚙️|🚪|📊|🔊/.test(b) && b.length > 1)
  !gradeVazia.some(b => b.toUpperCase().includes('FAMÍLIA'))
    ? ok('sem cadastro, o básico não ganha botão nenhum', `${gradeVazia.length} botões, como antes`)
    : nok('sem cadastro, o básico não ganha botão nenhum', gradeVazia.join(' | '))

  // ══ 7. NÍVEL AVANÇADO ══
  const avancado = await novaPagina(browser, {
    nivel: 'avancado',
    rows: { people: [{ nome: 'Ana', emoji: '👩', relacao: 'neta', mostrar_casa: false, sort_order: 0 }], favorites: [], usage_events: [] },
  })
  // textContent em vez de innerText: esta aba está em segundo plano (o teste
  // abriu outras antes), e o Chrome não calcula layout de aba escondida — o
  // innerText volta truncado.
  await avancado.waitForFunction(
    () => document.body.textContent.toUpperCase().includes('FAMÍLIA'),
    { timeout: 10000 },
  ).catch(() => {})
  const telaAvancada = await avancado.$eval('body', b => b.textContent)
  telaAvancada.includes('Família') && telaAvancada.toUpperCase().includes('ANA')
    ? ok('AVANÇADO tem seção Família com as pessoas')
    : nok('AVANÇADO tem seção Família com as pessoas', telaAvancada.slice(0, 250))
  await avancado.screenshot({ path: `${OUT}/cad-05-avancado.png` })

  // ══ Custo e erros ══
  const custo = []
  for (const p of [page, basico, basicoVazio, avancado]) custo.push(...await p.evaluate(() => window.__chamadasDeVoz || []))
  custo.length === 0 ? ok('nenhuma chamada paga de voz') : nok('nenhuma chamada paga de voz', custo.join(', '))

  const erros = []
  for (const p of [page, basico, basicoVazio, avancado]) erros.push(...p._erros)
  const relevantes = erros.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource') && !e.includes('bloqueado pelo teste'))
  relevantes.length === 0 ? ok('nenhum erro de JavaScript') : nok('nenhum erro de JavaScript', relevantes.slice(0, 3).join(' || '))

  await browser.close()
  console.log('')
  for (const [s, n, d] of r) console.log(`  ${s}  ${n}${d ? '  — ' + d : ''}`)
  const f = r.filter(x => x[0] === 'FALHA').length
  console.log(`\n${r.length - f}/${r.length} verificações passaram`)
  process.exit(f ? 1 : 0)
})().catch(async e => {
  console.error('ERRO NO TESTE:', e.message)
  if (paginaAtual) {
    try {
      await paginaAtual.screenshot({ path: `${OUT}/cad-erro.png` })
      const bs = await paginaAtual.$$eval('button', bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()))
      console.error('botoes na tela no momento do erro:', JSON.stringify(bs))
    } catch {}
  }
  console.log('')
  for (const [st, n, d] of r) console.log(`  ${st}  ${n}${d ? '  - ' + d : ''}`)
  process.exit(2)
})
