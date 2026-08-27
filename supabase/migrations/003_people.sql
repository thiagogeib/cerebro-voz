-- ============================================================
-- 003_people.sql
-- Pessoas da família cadastradas pelo próprio app
-- Depende de: 001_initial_schema.sql, 002_rls_policies.sql
-- ============================================================
--
-- Até aqui os botões de família eram genéricos: "Filho", "Filha", "Esposa".
-- O Vicente sabe o nome de cada um — quem não sabe é o app.
--
-- Estas linhas viram botões com o nome de verdade ("João", "Maria"), tanto
-- em "Família" (falar com) quanto em "Sair" (ir na casa de). A `relacao` não
-- é enfeite: é ela que decide o artigo da frase falada — "falar com O João"
-- ou "falar com A Maria".
--
-- Nenhum nome vive no código: tudo é cadastrado dentro do app, na aba 👥 da
-- configuração.


create table public.people (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  nome         text        not null,
  emoji        text        not null default '👤',
  relacao      text        not null default 'filho',
               -- 'filho' | 'filha' | 'esposa' | 'marido' | 'neto' | 'neta'
               -- | 'irmao' | 'irma' | 'pai' | 'mae' | 'amigo' | 'amiga'
  mostrar_casa boolean     not null default false,  -- gera "Casa do <nome>" em Sair
  sort_order   int         default 0,
  created_at   timestamptz not null default now(),

  unique(user_id, nome, relacao)
);

create index idx_people_user_id on public.people(user_id);

alter table public.people enable row level security;


-- ------------------------------------------------------------
-- POLICIES — mesmo desenho de `favorites`: cada um enxerga só os seus.
--
-- Nota: estas policies consultam apenas a própria tabela (user_id =
-- auth.uid()), então não esbarram no problema de recursão que existe nas
-- policies "admin reads all" de `profiles`.
-- ------------------------------------------------------------

create policy "people: user reads own"
  on public.people
  for select
  using (user_id = auth.uid());

create policy "people: user inserts own"
  on public.people
  for insert
  with check (user_id = auth.uid());

create policy "people: user updates own"
  on public.people
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "people: user deletes own"
  on public.people
  for delete
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- usage_events: passa a registrar QUAL botão foi tocado.
--
-- Até agora só o rótulo era gravado (`phrase_label`), e o painel admin
-- agrupa por ele. Isso significa que renomear um botão parte a série
-- histórica em duas — é exatamente o que vai acontecer quando "Filho" virar
-- "João". Com o `node_id`, dá para acompanhar o mesmo botão daqui em diante,
-- mesmo que o nome mude.
--
-- Coluna aditiva e nula: as linhas antigas continuam válidas e nada no
-- painel precisa mudar agora.
-- ------------------------------------------------------------

alter table public.usage_events add column if not exists node_id text;

create index if not exists idx_usage_events_node_id on public.usage_events(node_id);
