-- Nero Recrutamento: migração para identificação por ID + prova de posse via DM.
-- Não abre inscrições automaticamente e não altera tabelas de bate-ponto.
create table if not exists public.nero_recruitment_rounds (
 id uuid primary key default gen_random_uuid(),
 guild_id text not null check (guild_id ~ '^[0-9]{15,25}$'),
 kind text not null check (kind in ('policia','organizacao')),
 state text not null default 'closed' check (state in ('closed','open','review','complete')),
 opens_at timestamptz not null default now(),
 closes_at timestamptz not null,
 created_at timestamptz not null default now(),
 check (closes_at > opens_at)
);
create index if not exists idx_nero_recruit_rounds_active
 on public.nero_recruitment_rounds(guild_id,state,closes_at desc);
create table if not exists public.nero_recruitment_identity_challenges (
 guild_id text not null check (guild_id ~ '^[0-9]{15,25}$'),
 round_id uuid not null references public.nero_recruitment_rounds(id) on delete cascade,
 user_id text not null check (user_id ~ '^[0-9]{15,25}$'),
 code_hash text not null check(length(code_hash)=64),
 attempts smallint not null default 0 check(attempts between 0 and 5),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null,
 cooldown_until timestamptz not null,
 verified_at timestamptz,
 primary key(guild_id,round_id,user_id)
);
create index if not exists idx_nero_recruit_challenges_expiry
 on public.nero_recruitment_identity_challenges(expires_at);
alter table public.nero_recruitment_rounds enable row level security;
alter table public.nero_recruitment_identity_challenges enable row level security;
revoke all on public.nero_recruitment_rounds from anon, authenticated;
revoke all on public.nero_recruitment_identity_challenges from anon, authenticated;
-- Sem políticas públicas: o backend server-side é a única via de acesso.

-- Resultados visíveis somente após revisão humana E publicação.
-- Escrita permitida apenas pelo backend administrativo autenticado.
create table if not exists public.nero_recruitment_approvals (
 guild_id text not null check(guild_id ~ '^[0-9]{15,25}$'),
 round_id uuid not null references public.nero_recruitment_rounds(id) on delete cascade,
 user_id text not null check(user_id ~ '^[0-9]{15,25}$'),
 display_name text not null check(length(display_name) between 1 and 90),
 score_percent numeric(5,2) check(score_percent between 0 and 100),
 show_score boolean not null default false,
 confirmed_by text not null check(confirmed_by ~ '^[0-9]{15,25}$'),
 confirmed_at timestamptz not null,
 published_at timestamptz,
 primary key(guild_id,round_id,user_id)
);
create index if not exists idx_nero_recruit_published
 on public.nero_recruitment_approvals(guild_id,published_at desc) where published_at is not null;
alter table public.nero_recruitment_approvals enable row level security;
revoke all on public.nero_recruitment_approvals from anon, authenticated;
