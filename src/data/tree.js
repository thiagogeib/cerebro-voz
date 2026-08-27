// ─── ÁRVORE DE FRASES — BÁSICO / INTERMEDIÁRIO ─────────────────────────────── v3
//
// Como editar (para quem cuida do Vicente):
//   e     = emoji do botão
//   l     = rótulo curto que aparece embaixo do emoji (fica em MAIÚSCULAS na tela)
//   frase = o que a voz fala ao tocar no botão. Sempre na 1ª pessoa, curta e direta.
//   filhos = se tiver, o botão abre uma nova tela em vez de falar.
//
// Um botão OU tem `frase` OU tem `filhos` — nunca os dois.
// `id` precisa ser único na árvore inteira (é ele que identifica a frase nos relatórios).

// Lugares para onde o Vicente quer sair. Definido aqui separado porque entra
// no nível básico e, por consequência, também aparece no intermediário.
// O emoji 🚶 é o mesmo que o Vicente já usava no antigo "Quero › Sair" — mantido
// de propósito na raiz para ele reconhecer o botão sem precisar reaprender.
const SAIR = { id: "sair", e: "🚶", l: "Sair", filhos: [
  { id: "sair_caminhar", e: "👟", l: "Caminhar",      frase: "Quero sair para caminhar um pouco." },
  { id: "sair_mercado",  e: "🛒", l: "Mercado",       frase: "Quero ir ao mercado." },
  { id: "sair_horti",    e: "🥬", l: "Hortifrúti",    frase: "Quero ir no hortifrúti." },
  { id: "sair_acougue",  e: "🥩", l: "Açougue",       frase: "Quero ir ao açougue." },
  { id: "sair_padaria",  e: "🥖", l: "Padaria",       frase: "Quero ir à padaria." },
  { id: "sair_igreja",   e: "⛪", l: "Igreja",        frase: "Quero ir à igreja." },
  { id: "sair_shopping", e: "🏬", l: "Shopping",      frase: "Quero ir ao shopping." },
  { id: "sair_farmacia", e: "💊", l: "Farmácia",      frase: "Preciso ir à farmácia." },
  { id: "sair_praca",    e: "🌳", l: "Praça",         frase: "Quero ir na praça tomar um ar." },
  { id: "sair_carro",    e: "🚗", l: "Dar uma volta", frase: "Quero dar uma volta de carro." },
  { id: "sair_comer",    e: "🍴", l: "Comer fora",    frase: "Quero almoçar fora." },

  // Os botões "Casa do Fulano" NÃO ficam aqui: eles nascem do cadastro de
  // pessoas, na aba 👥 da configuração do app. Basta marcar "mostrar casa"
  // na pessoa e o botão aparece nesta tela com o nome de verdade.
  //
  // Foi o que substituiu o antigo "Casa dos pais" — a frase estava escrita do
  // ponto de vista de quem anotou o papel, não do Vicente.

  // ── RESERVA ── é só apagar as duas barras do começo da linha para o botão aparecer:
  // { id: "sair_pais",     e: "🏡", l: "Casa dos pais", frase: "Quero ir na casa dos meus pais." },
  // { id: "sair_medico",   e: "🏥", l: "Médico",         frase: "Preciso ir ao médico." },
  // { id: "sair_barbeiro", e: "✂️", l: "Barbeiro",       frase: "Quero ir ao barbeiro." },
  // { id: "sair_banco",    e: "🏦", l: "Banco",          frase: "Preciso ir ao banco." },
]};

export const TREE = {
  basico: [
    // As bebidas ficam TODAS nesta tela, sem submenu de "suco" ou "café".
    // Um submenu economizaria espaço, mas cobraria um toque a mais em toda
    // pedida — inclusive na água e no café puro, que são as do dia a dia.
    { id: "sede", e: "💧", l: "Sede", filhos: [
      { id: "agua",          e: "💧", l: "Água",          frase: "Estou com sede, quero água por favor." },
      { id: "cafe",          e: "☕", l: "Café",           frase: "Quero tomar um café, por favor." },
      // A quantidade de gotas está escrita na frase de propósito, para ela vir
      // falada. ↓ é aqui que se muda se o gosto dele mudar.
      { id: "cafe_adocante", e: "🍯", l: "Café adoçante", frase: "Quero tomar um café com adoçante, cinco gotas, por favor." },
      { id: "cafe_acucar",   e: "🥄", l: "Café açúcar",   frase: "Quero tomar um café com açúcar, por favor." },
      { id: "suco",          e: "🧃", l: "Suco",           frase: "Quero tomar um suco, por favor." },
      { id: "suco_laranja",  e: "🍊", l: "Suco laranja",  frase: "Quero um suco de laranja, por favor." },
      { id: "suco_uva",      e: "🍇", l: "Suco de uva",   frase: "Quero um suco de uva, por favor." },
      { id: "agua_coco",     e: "🥥", l: "Água de coco",  frase: "Quero uma água de coco, por favor." },
      { id: "cha",           e: "🍵", l: "Chá",            frase: "Quero tomar um chá, por favor." },
    ]},
    { id: "fome", e: "🍽️", l: "Fome", filhos: [
      { id: "refeicao",  e: "🍽️", l: "Refeição", frase: "Estou com fome, quero comer alguma coisa." },
      { id: "fruta",     e: "🍎", l: "Fruta",    frase: "Quero comer uma fruta." },
      { id: "pao",       e: "🍞", l: "Pão",      frase: "Quero comer um pão." },
      { id: "sopa",      e: "🥣", l: "Sopa",     frase: "Quero comer uma sopa." },
    ]},
    { id: "dor", e: "😣", l: "Dor", filhos: [
      { id: "dor_cabeca",  e: "🤕", l: "Cabeça",  frase: "Estou com dor de cabeça." },
      { id: "dor_corpo",   e: "💪", l: "Corpo",   frase: "Estou com dor no corpo." },
      { id: "dor_barriga", e: "🤢", l: "Barriga", frase: "Estou com dor de barriga." },
      { id: "dor_forte",   e: "🆘", l: "Forte",   frase: "Estou sentindo uma dor muito forte, preciso de ajuda." },
    ]},
    { id: "banheiro", e: "🚽", l: "Banheiro", frase: "Preciso ir ao banheiro." },
    { id: "remedios", e: "💊", l: "Remédio", filhos: [
      { id: "rem_hora",   e: "⏰", l: "Hora certa",  frase: "Está na hora do meu remédio." },
      { id: "rem_dor",    e: "😣", l: "Para dor",    frase: "Preciso de remédio para dor." },
      { id: "rem_dormir", e: "😴", l: "Para dormir", frase: "Preciso do remédio para dormir." },
    ]},
    SAIR,
    { id: "ajuda", e: "🆘", l: "Ajuda", frase: "Preciso de ajuda agora, por favor." },
  ],
  intermediario: [
    // Todos os sentimentos numa tela só. Antes, dizer "estou cansado" custava
    // três toques (Me sinto › Mal › Cansado) — o "Mal" no meio só atrasava.
    { id: "sentir", e: "💛", l: "Me sinto", filhos: [
      { id: "bem",      e: "😊", l: "Bem",      frase: "Estou me sentindo bem hoje." },
      { id: "feliz",    e: "🥰", l: "Feliz",    frase: "Estou feliz e contente hoje." },
      { id: "cansado",  e: "😴", l: "Cansado",  frase: "Estou me sentindo muito cansado." },
      { id: "triste",   e: "😢", l: "Triste",   frase: "Estou me sentindo triste." },
      { id: "ansioso",  e: "😰", l: "Ansioso",  frase: "Estou me sentindo ansioso e agitado." },
      { id: "confuso",  e: "😕", l: "Confuso",  frase: "Estou me sentindo confuso, pode me ajudar?" },
      { id: "irritado", e: "😡", l: "Irritado", frase: "Estou me sentindo irritado agora." },
    ]},
    { id: "familia", e: "👨‍👩‍👧", l: "Família", filhos: [
      { id: "falar_filho",  e: "👨", l: "Filho",  frase: "Quero falar com meu filho." },
      { id: "falar_filha",  e: "👩", l: "Filha",  frase: "Quero falar com minha filha." },
      { id: "falar_esposa", e: "👵", l: "Esposa", frase: "Quero falar com minha esposa." },
      { id: "amor",         e: "❤️", l: "Amor",   frase: "Eu amo muito vocês." },
      { id: "abraco",       e: "🤗", l: "Abraço", frase: "Quero dar um abraço." },
    ]},
    { id: "quero", e: "▶️", l: "Quero", filhos: [
      { id: "tv",        e: "📺", l: "TV",        frase: "Quero assistir televisão." },
      { id: "musica",    e: "🎵", l: "Música",    frase: "Quero ouvir uma música." },
      { id: "descansar", e: "🛋️", l: "Descansar", frase: "Quero descansar um pouco." },
      { id: "dormir",    e: "🛏️", l: "Dormir",    frase: "Quero ir dormir agora." },
    ]},
    { id: "simnas", e: "👍", l: "Sim / Não", filhos: [
      { id: "sim",      e: "👍", l: "Sim",      frase: "Sim." },
      { id: "nao",      e: "👎", l: "Não",      frase: "Não." },
      { id: "talvez",   e: "🤔", l: "Talvez",   frase: "Talvez, preciso pensar." },
      { id: "repetir",  e: "🔁", l: "Repetir",  frase: "Pode repetir o que disse?" },
      { id: "obrigado", e: "🙏", l: "Obrigado", frase: "Muito obrigado." },
    ]},
  ],
};

// ─── BOTÕES COM NOME DE GENTE ────────────────────────────────────────────────
//
// Nenhum nome de familiar está escrito neste arquivo, de propósito: eles são
// cadastrados dentro do app, na aba 👥 da configuração, e ficam salvos na
// conta do Vicente.
//
// O que a `relacao` faz: além de organizar, é ela que decide o artigo da
// frase. "Quero falar com O João" / "Quero falar com A Maria" — dizer errado
// numa frase que sai na voz dele seria constrangedor.

const ARTIGO = {
  filho: "o",  marido: "o", neto: "o",  irmao: "o", pai: "o",  amigo: "o",
  filha: "a",  esposa: "a", neta: "a",  irma: "a",  mae: "a",  amiga: "a",
};

// "João Pedro" → "joao_pedro" (vira parte do id do botão nos relatórios)
function slug(nome) {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // tira acento
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "pessoa";
}

const artigoDe = (p) => ARTIGO[p.relacao] || "o";

// Dois "João" na lista viram joao e joao_2 — ids repetidos misturariam as
// estatísticas de pessoas diferentes.
function idsUnicos(pessoas) {
  const usados = new Map();
  return pessoas.map(p => {
    const base = slug(p.nome);
    const n = (usados.get(base) || 0) + 1;
    usados.set(base, n);
    return { ...p, chave: n === 1 ? base : `${base}_${n}` };
  });
}

function noFalarCom(p) {
  return {
    id: `falar_${p.chave}`,
    e: p.e || (artigoDe(p) === "a" ? "👩" : "👨"),
    l: p.nome,
    frase: `Quero falar com ${artigoDe(p)} ${p.nome}.`,
  };
}

const contracaoDe = (p) => (artigoDe(p) === "a" ? "da" : "do");

/** "Casa do João" / "Casa da Maria" — usado no botão e na tela de cadastro. */
export function rotuloCasaDe(pessoa) {
  return `Casa ${contracaoDe(pessoa)} ${pessoa.nome || "..."}`;
}

function noCasaDe(p) {
  return {
    id: `sair_casa_${p.chave}`,
    e: "🏡",
    l: rotuloCasaDe(p),
    frase: `Quero ir na casa ${contracaoDe(p)} ${p.nome}.`,
  };
}

// Genéricos que somem quando existe alguém cadastrado naquela relação:
// cadastrou um filho chamado João, o botão "Filho" dá lugar a "João". Se não
// cadastrou nenhuma filha, o botão "Filha" continua lá.
const GENERICO_POR_RELACAO = {
  falar_filho:  "filho",
  falar_filha:  "filha",
  falar_esposa: "esposa",
};

function injetarFamilia(filhos, pessoas) {
  const relacoesCadastradas = new Set(pessoas.map(p => p.relacao));
  const sobrando = filhos.filter(f => {
    const relacao = GENERICO_POR_RELACAO[f.id];
    return !relacao || !relacoesCadastradas.has(relacao);
  });
  return [...pessoas.map(noFalarCom), ...sobrando];
}

function injetarCasas(filhos, pessoas) {
  const casas = pessoas.filter(p => p.casa).map(noCasaDe);
  return casas.length ? [...casas, ...filhos] : filhos;
}

/**
 * Monta a árvore que vai para a tela.
 *
 * Sem ninguém cadastrado, devolve exatamente a árvore escrita acima — o app
 * do Vicente não muda em nada até a família cadastrar a primeira pessoa.
 */
export function getCats(nivel, pessoas = []) {
  const base = nivel === "basico" ? TREE.basico : [...TREE.basico, ...TREE.intermediario];
  if (!pessoas.length) return base;

  const comChave = idsUnicos(pessoas);

  return base.map(cat => {
    if (cat.id === "familia") return { ...cat, filhos: injetarFamilia(cat.filhos, comChave) };
    if (cat.id === "sair")    return { ...cat, filhos: injetarCasas(cat.filhos, comChave) };
    return cat;
  });
}

/** Usada pela tela de cadastro para mostrar a frase antes de salvar. */
export function fraseFalarCom(pessoa) {
  return `Quero falar com ${artigoDe(pessoa)} ${pessoa.nome || "..."}.`;
}

export const RELACOES = [
  { id: "filho",  label: "Filho",  emoji: "👨" },
  { id: "filha",  label: "Filha",  emoji: "👩" },
  { id: "esposa", label: "Esposa", emoji: "👵" },
  { id: "marido", label: "Marido", emoji: "👴" },
  { id: "neto",   label: "Neto",   emoji: "👦" },
  { id: "neta",   label: "Neta",   emoji: "👧" },
  { id: "irmao",  label: "Irmão",  emoji: "👨" },
  { id: "irma",   label: "Irmã",   emoji: "👩" },
  { id: "pai",    label: "Pai",    emoji: "👴" },
  { id: "mae",    label: "Mãe",    emoji: "👵" },
  { id: "amigo",  label: "Amigo",  emoji: "🧑" },
  { id: "amiga",  label: "Amiga",  emoji: "🧑" },
];
