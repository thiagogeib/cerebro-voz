# Arquitetura — cerebro-voz

**Data:** 2026-05-11
**Status:** Aprovado — referência para implementação
**Versão do app base:** React 18 + Vite 5, deploy GitHub Pages

---

## 1. Stack escolhida

### Frontend (sem alteração de runtime)
- **React 18 + Vite 5** — mantido, sem migração
- **React Router v6** — adicionado para roteamento client-side (login / app / admin)
- **@supabase/supabase-js** — cliente oficial, substitui chamadas diretas à Anthropic API

### Backend (novo)
- **Supabase** — plataforma unificada que entrega:
  - Auth (email/senha + Google OAuth) com JWTs gerenciados
  - PostgreSQL (banco relacional com RLS)
  - Edge Functions (Deno, deploy junto ao projeto Supabase) para proxy da chave Anthropic
  - Realtime (não usado na fase inicial, disponível para evolução)

### Deploy
- **Frontend:** GitHub Pages — mantido, sem custo
- **Backend:** Supabase Cloud — plano Free (500 MB DB, 500 K Edge Function calls/mês, 50 K MAU auth) é suficiente para uso familiar

### Justificativa da escolha do Supabase

O projeto tem três requisitos simultâneos: auth, banco e proxy de API. As alternativas avaliadas foram:

| Alternativa | Auth | DB | Proxy API | Custo | Complexidade |
|---|---|---|---|---|---|
| **Supabase** | nativo | nativo | Edge Functions | Free tier adequado | Baixa |
| Firebase + Cloud Functions | nativo | Firestore (NoSQL) | Cloud Functions | Free tier mais restrito | Média |
| Auth0 + Railway + Neon | separados | separado | separado | $15+/mês | Alta |
| Clerk + Vercel (migrar de GH Pages) | nativo | precisa externo | Vercel Functions | $20+/mês | Alta + migração |

Supabase elimina coordenação entre três serviços distintos. O cliente JavaScript é um único pacote. RLS (Row Level Security) resolve autorização no nível do banco sem camada extra.

---

## 2. Schema do banco (PostgreSQL via Supabase)

### Tabela: `profiles`
Extensão da tabela `auth.users` do Supabase. Criada automaticamente por trigger ao primeiro login.

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'user',  -- 'user' | 'admin'
  nivel       text not null default 'basico', -- 'basico' | 'intermediario' | 'avancado'
  context_text text,                          -- texto de contexto pessoal (migrado do localStorage)
  selected_voice text,                        -- voice ID do ElevenLabs
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz
);

-- RLS: usuário vê só o próprio perfil; admin vê todos
alter table public.profiles enable row level security;
```

### Tabela: `phrases`
Catálogo de frases (os nós da TREE atual). Preparado para customização por usuário no futuro.

```sql
create table public.phrases (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id) on delete cascade,
  -- owner_id null = frase global (seed inicial)
  emoji       text not null,
  label       text not null,
  phrase_text text not null,
  category    text,           -- 'basico' | 'intermediario' | 'favorita'
  parent_id   uuid references public.phrases(id),
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);

alter table public.phrases enable row level security;
```

### Tabela: `usage_events`
Registro de cada frase falada. Núcleo do painel admin.

```sql
create table public.usage_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  phrase_id     uuid references public.phrases(id),
  phrase_text   text not null,        -- texto real falado (pode ser personalizado por IA)
  phrase_label  text,                 -- label do botão (ex: "Água")
  emoji         text,
  nivel         text,                 -- nível ativo no momento
  source        text,                 -- 'button' | 'favorita' | 'historico' | 'fragmento'
  was_ai_enhanced boolean default false,
  session_id    uuid,                 -- agrupa eventos da mesma sessão
  device_info   jsonb,               -- user_agent, platform, screen size
  created_at    timestamptz not null default now()
);

alter table public.usage_events enable row level security;
```

### Tabela: `sessions`
Rastreia acessos ao app (quando, por qual dispositivo).

```sql
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  device_info   jsonb,   -- { userAgent, platform, screenW, screenH, mobile: bool }
  ip_country    text,    -- preenchido pela Edge Function via headers
  phrase_count  int default 0
);

alter table public.sessions enable row level security;
```

### Tabela: `favorites`
Frases favoritas por usuário (migra do localStorage `voz_favoritas`).

```sql
create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  label       text not null,
  phrase_text text not null,
  sort_order  int default 0,
  created_at  timestamptz not null default now(),
  unique(user_id, phrase_text)
);

alter table public.favorites enable row level security;
```

### Policies RLS relevantes

```sql
-- profiles: usuário lê/edita só o próprio
create policy "user reads own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "user updates own profile"
  on public.profiles for update using (auth.uid() = id);

-- usage_events: usuário insere os próprios; admin lê todos
create policy "user inserts own events"
  on public.usage_events for insert with check (auth.uid() = user_id);

create policy "admin reads all events"
  on public.usage_events for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

create policy "user reads own events"
  on public.usage_events for select using (auth.uid() = user_id);
```

---

## 3. Estrutura de arquivos

O que existe hoje em `src/` permanece. O que é adicionado está marcado com `[novo]`.

```
cerebro-voz/
├── .github/
│   └── workflows/
│       └── deploy.yml                  [alterado — ver seção 7]
│
├── supabase/                           [novo — projeto Supabase local]
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   └── functions/
│       └── anthropic-proxy/
│           └── index.ts                [Edge Function — ver seção 6]
│
├── src/
│   ├── main.jsx                        [alterado — adiciona Router + AuthProvider]
│   ├── App.jsx                         [alterado — remove fetch Anthropic direto]
│   ├── data.js                         [inalterado]
│   ├── useTTS.js                       [inalterado]
│   │
│   ├── lib/                            [novo]
│   │   ├── supabase.js                 # createClient com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│   │   └── analytics.js               # funções trackEvent(), startSession(), endSession()
│   │
│   ├── hooks/                          [novo]
│   │   ├── useAuth.js                  # lê session do Supabase, expõe user/loading/signOut
│   │   └── useProfile.js              # carrega/salva profile do usuário autenticado
│   │
│   ├── pages/                          [novo]
│   │   ├── LoginPage.jsx               # email/senha + botão Google OAuth
│   │   ├── AppPage.jsx                 # App.jsx atual (renomeado, sem lógica nova)
│   │   └── admin/
│   │       ├── AdminLayout.jsx         # sidebar + proteção de rota (role=admin)
│   │       ├── UsersPage.jsx           # lista de contas
│   │       ├── PhrasesPage.jsx         # frases mais usadas
│   │       ├── HistoryPage.jsx         # histórico por usuário
│   │       └── SessionsPage.jsx        # acessos (quando, dispositivo)
│   │
│   └── components/                     [novo]
│       └── ProtectedRoute.jsx          # redireciona para /login se não autenticado
│
├── index.html                          [inalterado]
├── vite.config.js                      [alterado — adiciona VITE_SUPABASE_* às vars]
├── package.json                        [alterado — adiciona dependências]
└── .env.example                        [alterado — adiciona vars Supabase]
```

### Dependências novas

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react-router-dom": "^6.x"
  }
}
```

---

## 4. Fluxo de autenticação

```
Usuário acessa qualquer rota
         │
         ▼
   useAuth() verifica
   supabase.auth.getSession()
         │
    ┌────┴────┐
    │ sem     │ com
    │ sessão  │ sessão
    ▼         ▼
 /login    role == 'admin'?
              │
         ┌────┴────┐
         │ não     │ sim
         ▼         ▼
      /app      /admin
```

### LoginPage — comportamento

1. Formulário email + senha chama `supabase.auth.signInWithPassword()`
2. Botão "Entrar com Google" chama `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Supabase redireciona de volta para `VITE_SITE_URL/cerebro-voz/` após OAuth
4. `main.jsx` detecta callback OAuth via `supabase.auth.onAuthStateChange`
5. Primeiro login: trigger no banco cria linha em `profiles` com `role = 'user'`
6. Admin é definido manualmente via Supabase Dashboard (UPDATE profiles SET role='admin')

### ProtectedRoute — implementação

```
<Route path="/app" element={
  <ProtectedRoute>
    <AppPage />
  </ProtectedRoute>
} />

<Route path="/admin/*" element={
  <ProtectedRoute requireRole="admin">
    <AdminLayout />
  </ProtectedRoute>
} />
```

`ProtectedRoute` lê `useAuth()`. Se `loading=true`, exibe spinner. Se sem sessão, redireciona para `/login`. Se `requireRole` definido e role não bate, redireciona para `/app`.

### Variáveis de ambiente de auth

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # chave pública, segura no browser
VITE_SITE_URL=https://[user].github.io  # para redirect OAuth
```

A `ANON_KEY` do Supabase é pública por design — o RLS no banco garante que um usuário só acessa os próprios dados.

---

## 5. Fluxo de analytics

### Captura de eventos

Cada vez que `falarFrase()` é chamado no `App.jsx`, além do TTS, uma chamada assíncrona (fire-and-forget) registra o evento:

```
falarFrase(node, fraseBase)
  ├── chama proxy Anthropic (se contexto ativo)
  ├── chama speakElevenLabs()
  ├── atualiza estado local (lastSpoken, historico)
  └── analytics.trackEvent({          [NOVO — não bloqueia UI]
        phrase_text,
        phrase_label,
        emoji,
        nivel,
        source,
        was_ai_enhanced,
        session_id
      })
```

### lib/analytics.js — contratos das funções

```typescript
// Inicia sessão ao montar App, salva session_id em memória (não localStorage)
startSession(userId: string, deviceInfo: object): Promise<string>  // retorna session_id

// Fire-and-forget — não lança exceção se falhar
trackEvent(event: {
  user_id: string,
  phrase_text: string,
  phrase_label?: string,
  emoji?: string,
  nivel: string,
  source: 'button' | 'favorita' | 'historico' | 'fragmento',
  was_ai_enhanced: boolean,
  session_id: string,
  device_info: object
}): void

// Chamado no unload da página (visibilitychange + beforeunload)
endSession(sessionId: string, phraseCount: number): Promise<void>
```

### Painel admin — queries SQL base

**Frases mais usadas (últimos 30 dias):**
```sql
select phrase_label, emoji, count(*) as total
from usage_events
where created_at > now() - interval '30 days'
group by phrase_label, emoji
order by total desc
limit 20;
```

**Histórico por usuário:**
```sql
select ue.created_at, ue.phrase_text, ue.source, ue.was_ai_enhanced,
       p.full_name, p.email
from usage_events ue
join profiles p on p.id = ue.user_id
where ue.user_id = :userId
order by ue.created_at desc
limit 100;
```

**Acessos (sessões):**
```sql
select s.started_at, s.ended_at, s.phrase_count,
       s.device_info->>'platform' as platform,
       p.email
from sessions s
join profiles p on p.id = s.user_id
order by s.started_at desc
limit 50;
```

---

## 6. Proteção da chave Anthropic — Edge Function proxy

### Problema atual

`App.jsx` linha 213 faz fetch direto para `https://api.anthropic.com/v1/messages` com o header `anthropic-dangerous-direct-browser-access: true` e a chave exposta no bundle JS. Qualquer pessoa com DevTools vê e usa a chave.

### Solução: Edge Function `anthropic-proxy`

A chave Anthropic sai do browser e vai para `supabase/functions/anthropic-proxy/index.ts`. Roda em Deno no edge do Supabase. Nunca chega ao cliente.

**Contrato da Edge Function:**

```
POST /functions/v1/anthropic-proxy
Authorization: Bearer <supabase_jwt>   (obrigatório — rejeita se sem sessão)
Content-Type: application/json

Request:
{
  "context": "string",   // texto de contexto do usuário
  "base_phrase": "string" // frase base a personalizar
}

Response 200:
{
  "phrase": "string"     // frase personalizada
}

Response 401: sem JWT válido
Response 429: rate limit (10 req/min por usuário)
Response 500: erro interno (retornar frase original no cliente)
```

**Implementação da Edge Function (`supabase/functions/anthropic-proxy/index.ts`):**

```typescript
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY");  // secret no Supabase, nunca no browser
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req) => {
  // 1. Valida JWT do usuário
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Lê body
  const { context, base_phrase } = await req.json();

  // 3. Chama Anthropic (chave nunca sai daqui)
  const prompt = `AAC para pessoa com afasia. Contexto pessoal: ${context}\nFrase base: "${base_phrase}"\nReescreva de forma pessoal e natural (máx 20 palavras, 1ª pessoa). Só a frase, sem aspas.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  const phrase = data?.content?.[0]?.text?.trim() ?? base_phrase;

  return new Response(JSON.stringify({ phrase }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

**No App.jsx — trecho substituído:**

```javascript
// ANTES (remover):
const res = await fetch("https://api.anthropic.com/v1/messages", {
  headers: { "anthropic-dangerous-direct-browser-access": "true" },
  ...
});

// DEPOIS:
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${SUPABASE_URL}/functions/v1/anthropic-proxy`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ context, base_phrase: frase })
});
const data = await res.json();
if (data.phrase) frase = data.phrase;
```

**Secrets da Edge Function (configurados no Supabase Dashboard ou CLI):**

```bash
supabase secrets set ANTHROPIC_KEY=sk-ant-...
```

A `VITE_ANTHROPIC_KEY` e o header `anthropic-dangerous-direct-browser-access` são **completamente removidos** do projeto.

---

## 7. Deploy — o que muda

### GitHub Actions (`.github/workflows/deploy.yml`)

Mudanças no step de build:

```yaml
# Remover:
VITE_ANTHROPIC_KEY: ${{ secrets.VITE_ANTHROPIC_KEY }}

# Adicionar:
VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
VITE_SITE_URL: https://${{ github.repository_owner }}.github.io
```

O workflow de deploy do frontend (GitHub Pages) não muda em estrutura — continua buildando e subindo `dist/`.

### Deploy das Edge Functions (separado, manual ou CI)

```bash
# Local (uma vez)
supabase login
supabase link --project-ref <project-id>
supabase functions deploy anthropic-proxy
supabase secrets set ANTHROPIC_KEY=sk-ant-...
```

Para CI, adicionar job separado no `deploy.yml`:

```yaml
deploy-edge-functions:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: supabase/setup-cli@v1
    - run: supabase functions deploy anthropic-proxy
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

### Secrets necessários no GitHub

| Secret | Onde usar |
|--------|-----------|
| `VITE_SUPABASE_URL` | build do frontend |
| `VITE_SUPABASE_ANON_KEY` | build do frontend |
| `VITE_ELEVEN_KEY` | build do frontend (mantido) |
| `SUPABASE_ACCESS_TOKEN` | deploy edge functions |
| `SUPABASE_PROJECT_ID` | deploy edge functions |
| `ANTHROPIC_KEY` | secret da Edge Function (via Supabase CLI, não GitHub) |

### Configuração do OAuth Google (pré-requisito)

1. Google Cloud Console: criar projeto, ativar Google Identity, criar OAuth Client ID
2. Authorized redirect URIs: `https://<project>.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Auth > Providers > Google: colar Client ID e Client Secret
4. Supabase Dashboard > Auth > URL Configuration:
   - Site URL: `https://[user].github.io/cerebro-voz`
   - Redirect URLs: `https://[user].github.io/cerebro-voz/*`

---

## 8. Plano de implementação em fases

### Fase 1 — Segurança crítica (1-2 dias, independente)
**Objetivo:** remover a chave Anthropic do browser. Pode ir a produção sem auth.

- [ ] Criar projeto no Supabase (Dashboard, 5 min)
- [ ] Criar Edge Function `anthropic-proxy` em `supabase/functions/`
- [ ] Rodar `supabase secrets set ANTHROPIC_KEY=...`
- [ ] Rodar `supabase functions deploy anthropic-proxy`
- [ ] Substituir fetch direto no `App.jsx` pela chamada ao proxy
- [ ] Remover `VITE_ANTHROPIC_KEY` do `deploy.yml` e do `.env.example`
- [ ] Deploy e validar que a personalização de frases continua funcionando

Nesta fase, o proxy aceita requests sem JWT (desabilitar verificação temporariamente). A chave já está segura.

### Fase 2 — Auth básico (2-3 dias, depende de Fase 1)
**Objetivo:** login funcional, dados migrados do localStorage para Supabase.

- [ ] Criar schema SQL (migrations 001 e 002)
- [ ] Adicionar `@supabase/supabase-js` e `react-router-dom` ao `package.json`
- [ ] Criar `src/lib/supabase.js`
- [ ] Criar `src/hooks/useAuth.js`
- [ ] Criar `src/pages/LoginPage.jsx` (email/senha + Google)
- [ ] Criar `src/components/ProtectedRoute.jsx`
- [ ] Refatorar `main.jsx` para adicionar `<BrowserRouter>` e rotas
- [ ] Mover `App.jsx` para `src/pages/AppPage.jsx`
- [ ] Criar `src/hooks/useProfile.js` — carrega nivel, context, selectedVoice do Supabase em vez do localStorage
- [ ] Habilitar verificação JWT no proxy (Fase 1 estava sem)
- [ ] Configurar Google OAuth (Google Cloud Console + Supabase Dashboard)
- [ ] Adicionar secrets no GitHub Actions

### Fase 3 — Analytics (2-3 dias, pode ser paralela à Fase 2)
**Objetivo:** capturar eventos de uso sem afetar UX.

- [ ] Criar migration para tabelas `usage_events` e `sessions`
- [ ] Criar `src/lib/analytics.js` com `startSession`, `trackEvent`, `endSession`
- [ ] Integrar chamadas de analytics no `falarFrase()` do `AppPage.jsx`
- [ ] Integrar `startSession` no mount do `AppPage`
- [ ] Integrar `endSession` no `visibilitychange` / `beforeunload`
- [ ] Migrar `voz_favoritas` do localStorage para tabela `favorites` no primeiro login

### Fase 4 — Painel admin (3-5 dias, depende de Fases 2 e 3)
**Objetivo:** painel funcional para visualizar tudo.

- [ ] Criar `src/pages/admin/AdminLayout.jsx` com sidebar e verificação de role
- [ ] `UsersPage.jsx` — lista profiles com email, nivel, last_seen_at
- [ ] `PhrasesPage.jsx` — top frases dos últimos 7/30/90 dias com gráfico simples
- [ ] `HistoryPage.jsx` — histórico por usuário com filtro de data
- [ ] `SessionsPage.jsx` — acessos com device_info
- [ ] Criar primeiro admin via SQL (`UPDATE profiles SET role='admin' WHERE email='...'`)

---

## ADR-001: Supabase como backend unificado

**Data:** 2026-05-11
**Status:** Aceito

**Contexto:** O app precisava de três coisas simultaneamente — auth com Google OAuth, banco de dados para analytics e perfis, e um proxy server-side para a chave Anthropic. O projeto não tem backend e está deployado como static site no GitHub Pages.

**Decisão:** Usar Supabase como backend unificado. Um único serviço entrega Auth, PostgreSQL com RLS, e Edge Functions (Deno) para o proxy. O frontend continua como SPA estática no GitHub Pages.

**Alternativas consideradas:**
- Firebase + Cloud Functions: NoSQL inadequado para queries de analytics relacionais; Cloud Functions em Node tem cold start mais alto.
- Clerk + Vercel: exigiria migrar de GitHub Pages para Vercel, aumentando custo e complexidade de deploy.
- Cloudflare Workers separado: resolveria só o proxy, não o auth nem o banco.

**Consequências:**
- Positivo: um dashboard, um SDK, uma conta de billing.
- Positivo: RLS elimina a necessidade de uma camada de autorização customizada.
- Negativo: dependência de um terceiro para auth. Se Supabase tiver downtime, o login falha. Mitigação: para uso familiar em casa (não 24/7 crítico), aceitável.
- Negativo: Edge Functions em Deno têm cold start de ~200ms. Para o caso de uso (personalização de frase via IA, que já é assíncrono), imperceptível.

---

## ADR-002: Manter GitHub Pages para o frontend

**Data:** 2026-05-11
**Status:** Aceito

**Contexto:** Migrar para Vercel ou Netlify daria Server-Side Rendering e simplificaria alguns fluxos de OAuth redirect, mas introduziria custo mensal e mudança de plataforma.

**Decisão:** Manter GitHub Pages. O OAuth redirect do Supabase funciona com SPAs — o Supabase redireciona para a URL do site e o cliente JS processa o token no hash da URL.

**Consequências:**
- O `vite.config.js` mantém `base: '/cerebro-voz/'`.
- React Router deve usar `HashRouter` em vez de `BrowserRouter` para compatibilidade com GitHub Pages (sem servidor para tratar deep links).
- Redirect URLs do OAuth precisam incluir `/#/` para funcionar com hash routing.

---

## ADR-003: Analytics fire-and-forget, sem bloquear UI

**Data:** 2026-05-11
**Status:** Aceito

**Contexto:** O paciente com afasia depende de resposta imediata ao toque. Qualquer latência perceptível na frase falada é inaceitável.

**Decisão:** `trackEvent()` nunca usa `await` no caminho crítico. É chamado com `void analytics.trackEvent(...)`. Erros de analytics são silenciados com try/catch interno. A UX de TTS nunca espera o analytics terminar.

**Consequências:**
- Eventos podem ser perdidos se o usuário fechar o browser exatamente durante o fetch. Taxa de perda estimada: irrelevante para o caso de uso.
- Não há retry automático. Se a Supabase estiver fora, o evento se perde.

---

## Mapa de dependências entre módulos

```
LoginPage
  └── useAuth (lib/supabase)

ProtectedRoute
  └── useAuth

AppPage
  ├── useAuth (para session.access_token no proxy)
  ├── useProfile (nivel, context, selectedVoice, favorites)
  ├── useTTS [inalterado]
  └── lib/analytics (trackEvent, startSession, endSession)

lib/analytics
  └── lib/supabase (insert em usage_events, sessions)

Admin/*
  └── useAuth (verifica role=admin)
  └── lib/supabase (queries diretas via supabase-js)

supabase/functions/anthropic-proxy
  └── ANTHROPIC_KEY (secret Supabase, nunca no cliente)
  └── verifica JWT via supabase.auth.getUser()
```

---

## Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| OAuth Google redirect não funciona com HashRouter | Média | Alto | Testar em staging antes; usar `window.location.hash` para capturar token |
| Usuário sem internet não consegue logar | Alta | Médio | Implementar fallback offline — se já logado, usar sessão em cache do Supabase (o SDK já persiste sessão no localStorage) |
| Cold start da Edge Function atrasa personalização | Baixa | Baixo | Personalização já é async; fallback é a frase original |
| localStorage antigo conflita com dados do Supabase | Alta | Médio | Na Fase 2, fazer migração única no primeiro login: ler localStorage, escrever no Supabase, limpar chaves antigas |
| Rate limit ElevenLabs em uso intenso | Baixa | Médio | Já existe fallback para SpeechSynthesis; manter comportamento atual |
