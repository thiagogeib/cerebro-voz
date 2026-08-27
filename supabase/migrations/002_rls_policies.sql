-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies do cerebro-voz
-- Depende de: 001_initial_schema.sql
-- ============================================================


-- ------------------------------------------------------------
-- HELPER: verifica se o usuário autenticado é admin
--
-- Precisa ser uma função SECURITY DEFINER, e não um `exists (select ... from
-- profiles)` escrito direto na policy: uma policy de `profiles` que consulta
-- `profiles` faz o Postgres reavaliar a própria policy, e ele aborta com
-- "infinite recursion detected in policy for relation profiles".
--
-- SECURITY DEFINER faz a consulta rodar fora do RLS, quebrando o ciclo.
-- O `search_path` fixo evita que alguém redirecione a função para outro
-- schema.
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

-- usuário lê o próprio perfil
create policy "profiles: user reads own"
  on public.profiles
  for select
  using (id = auth.uid());

-- admin lê todos os perfis
create policy "profiles: admin reads all"
  on public.profiles
  for select
  using (public.is_admin());

-- usuário edita somente o próprio perfil
create policy "profiles: user updates own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());


-- ------------------------------------------------------------
-- favorites
-- ------------------------------------------------------------

create policy "favorites: user reads own"
  on public.favorites
  for select
  using (user_id = auth.uid());

create policy "favorites: user inserts own"
  on public.favorites
  for insert
  with check (user_id = auth.uid());

create policy "favorites: user updates own"
  on public.favorites
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "favorites: user deletes own"
  on public.favorites
  for delete
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- usage_events
-- ------------------------------------------------------------

-- usuário insere somente eventos próprios
create policy "usage_events: user inserts own"
  on public.usage_events
  for insert
  with check (user_id = auth.uid());

-- usuário lê os próprios eventos
create policy "usage_events: user reads own"
  on public.usage_events
  for select
  using (user_id = auth.uid());

-- admin lê todos os eventos
create policy "usage_events: admin reads all"
  on public.usage_events
  for select
  using (public.is_admin());

-- admin apaga eventos (usado pelo botão de excluir do ranking de frases)
create policy "usage_events: admin deletes all"
  on public.usage_events
  for delete
  using (public.is_admin());


-- ------------------------------------------------------------
-- sessions
-- ------------------------------------------------------------

-- usuário insere somente as próprias sessões
create policy "sessions: user inserts own"
  on public.sessions
  for insert
  with check (user_id = auth.uid());

-- usuário atualiza somente as próprias sessões (ex: ended_at, phrase_count)
create policy "sessions: user updates own"
  on public.sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- admin lê todas as sessões
create policy "sessions: admin reads all"
  on public.sessions
  for select
  using (public.is_admin());

-- usuário lê as próprias sessões
create policy "sessions: user reads own"
  on public.sessions
  for select
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- NOTA — divergência entre este arquivo e o banco de produção
--
-- O banco em produção foi ajustado à mão ao longo do tempo, e por um período
-- este arquivo ficou para trás. Conferido em 27/08/2026:
--
--   · `profiles` usa `is_admin()` (foi o ajuste feito à mão para escapar da
--     recursão infinita descrita acima);
--   · `sessions` e `usage_events` ainda usam o `exists (select ... from
--     profiles)` escrito direto na policy. Ali funciona — a recursão só
--     acontece quando a policy de `profiles` consulta `profiles` — mas aqui
--     todas passaram a usar `is_admin()`, que é equivalente e evita
--     reavaliar as policies de `profiles` a cada linha;
--   · alguns nomes de policy diferem (ex.: "admin reads all events" no banco
--     contra "usage_events: admin reads all" aqui). Sem efeito prático.
--
-- O que importa: aplicar 001 + 002 + 003 num banco novo produz um app
-- funcional, o que não era verdade antes desta correção.
-- ------------------------------------------------------------
