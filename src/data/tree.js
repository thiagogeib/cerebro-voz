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
  { id: "sair_pais",     e: "🏡", l: "Casa dos pais", frase: "Quero ir na casa dos meus pais." },
  { id: "sair_farmacia", e: "💊", l: "Farmácia",      frase: "Preciso ir à farmácia." },
  { id: "sair_praca",    e: "🌳", l: "Praça",         frase: "Quero ir na praça tomar um ar." },
  { id: "sair_carro",    e: "🚗", l: "Dar uma volta", frase: "Quero dar uma volta de carro." },
  { id: "sair_comer",    e: "🍴", l: "Comer fora",    frase: "Quero almoçar fora." },

  // ── RESERVA ── é só apagar as duas barras do começo da linha para o botão aparecer:
  // { id: "sair_filho",    e: "👨", l: "Casa do filho",  frase: "Quero ir na casa do meu filho." },
  // { id: "sair_filha",    e: "👩", l: "Casa da filha",  frase: "Quero ir na casa da minha filha." },
  // { id: "sair_medico",   e: "🏥", l: "Médico",         frase: "Preciso ir ao médico." },
  // { id: "sair_barbeiro", e: "✂️", l: "Barbeiro",       frase: "Quero ir ao barbeiro." },
  // { id: "sair_banco",    e: "🏦", l: "Banco",          frase: "Preciso ir ao banco." },
]};

export const TREE = {
  basico: [
    { id: "sede", e: "💧", l: "Sede", filhos: [
      { id: "agua",      e: "💧", l: "Água",    frase: "Estou com sede, quero água por favor." },
      { id: "suco",      e: "🧃", l: "Suco",    frase: "Quero tomar um suco, por favor." },
      { id: "cafe",      e: "☕", l: "Café",    frase: "Quero tomar um café, por favor." },
      { id: "cha",       e: "🍵", l: "Chá",     frase: "Quero tomar um chá, por favor." },
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
    { id: "sentir", e: "💛", l: "Me sinto", filhos: [
      { id: "bem",      e: "😊", l: "Bem",      frase: "Estou me sentindo bem hoje." },
      { id: "mal", e: "😔", l: "Mal", filhos: [
        { id: "cansado",  e: "😴", l: "Cansado",  frase: "Estou me sentindo muito cansado." },
        { id: "triste",   e: "😢", l: "Triste",   frase: "Estou me sentindo triste." },
        { id: "ansioso",  e: "😰", l: "Ansioso",  frase: "Estou me sentindo ansioso e agitado." },
        { id: "confuso",  e: "😕", l: "Confuso",  frase: "Estou me sentindo confuso, pode me ajudar?" },
      ]},
      { id: "feliz",    e: "🥰", l: "Feliz",    frase: "Estou feliz e contente hoje." },
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

export function getCats(nivel) {
  if (nivel === "basico") return TREE.basico;
  return [...TREE.basico, ...TREE.intermediario];
}
