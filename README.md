# 🗣️ cerebro-voz — Vicente

Interface de Comunicação Aumentativa (AAC) para pessoa com Demência Frontotemporal + Afasia Progressiva Primária: a cognição está preservada, a fala é que está comprometida.

Uso familiar, não é produto comercial. Em produção: **vicente.ia.br**

## O que faz

- **Grade de botões com emoji e frase**, organizada em árvore por categoria (sede, fome, dor, remédio, sair, sentimentos, família). A árvore fica em [`src/data/tree.js`](src/data/tree.js), comentada em português para a família editar sem mexer em componente.
- **Botões com o nome da família.** Na aba 👥 da configuração dá para cadastrar as pessoas: o botão "Filho" vira "João" e a frase sai falada com o nome. A relação escolhida (filho, filha, esposa...) é o que define o artigo — "falar com **o** João", "falar com **a** Maria" — e a tela mostra a frase pronta antes de salvar. Nenhum nome fica no código.
- **Três níveis** — básico (2 colunas, só o essencial), intermediário (3 colunas, tudo) e avançado (favoritas, sugestões por horário e escrita livre).
- **Voz real** via ElevenLabs, com a voz do próprio Vicente. Cai na voz do aparelho (Web Speech API) se a ElevenLabs não responder.
- **Escala de dor de 0 a 10**, dentro da categoria Dor.
- **Painel admin** com frases mais usadas, histórico e acessos.

A árvore é rasa de propósito: cada nível de navegação a mais é um toque a mais para alguém com dificuldade motora. Por isso as nove bebidas ficam todas na tela de "Sede", e os sete sentimentos todos na de "Me sinto", sem submenus.

## Funciona sem internet

O app é instalável na tela inicial (PWA) e **abre e fala sem sinal**:

- a tela e os arquivos ficam no cache do service worker ([`public/sw.js`](public/sw.js));
- **cada frase falada é guardada em áudio** no aparelho ([`src/lib/audioCache.js`](src/lib/audioCache.js)) — da segunda vez em diante ela fala na hora, sem internet e sem consumir crédito da ElevenLabs;
- num aparelho onde ele já entrou, a falta de servidor não empurra para a tela de login — seria tirar dele o meio de falar justamente quando nada funciona;
- as estatísticas geradas offline ficam numa fila e sobem sozinhas depois.

O que precisa de internet: login novo, painel admin e gerar uma frase inédita com a voz da ElevenLabs.

## Como rodar localmente

```bash
npm install
cp .env.example .env    # preencha as variáveis do Supabase
npm run dev
```

Sem `VITE_ELEVEN_KEY` no `.env`, a voz cai na do próprio navegador — dá para desenvolver sem gastar crédito.

## Deploy

Push na `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) → GitHub Pages.

Secrets necessários em **Settings → Secrets → Actions**:

| Secret | Para quê |
|---|---|
| `VITE_SUPABASE_URL` | endereço do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave pública (o RLS é quem protege os dados) |
| `VITE_ELEVEN_KEY` | voz — **veja abaixo, a intenção é remover** |

### Tirar a chave da ElevenLabs do navegador

Hoje `VITE_ELEVEN_KEY` é embutida no JavaScript do site. Como o site é público, qualquer pessoa com o DevTools aberto consegue copiá-la e gastar o crédito da conta.

A Edge Function [`supabase/functions/tts-proxy`](supabase/functions/tts-proxy/index.ts) resolve isso. Para migrar:

```bash
supabase functions deploy tts-proxy
supabase secrets set ELEVEN_KEY=sk_...
```

Depois apague o secret `VITE_ELEVEN_KEY` do GitHub Actions e refaça o deploy. O app percebe a ausência da variável e passa a usar o proxy sozinho — não há código a mudar.

## Arquitetura

Ver [ARCHITECTURE.md](ARCHITECTURE.md) — stack, schema do banco, RLS, fluxo de auth e os ADRs.

## Banco

Migrations em [`supabase/migrations/`](supabase/migrations/), aplicadas pelo SQL Editor ou `supabase db push`. A **003** é a mais recente: tabela `people` (nomes da família) e a coluna `usage_events.node_id`.

## Próximas etapas

- [ ] Pré-gerar os áudios da árvore no build (hoje o áudio é guardado conforme ele usa)
- [ ] Frases vindas do banco em vez de fixas no código
- [ ] Suporte a eye tracking
