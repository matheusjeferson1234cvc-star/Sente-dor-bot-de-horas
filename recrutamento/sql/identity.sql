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

-- Controle administrativo de abertura/encerramento e responsáveis autorizados.
alter table public.nero_recruitment_rounds
 add column if not exists duration_minutes integer not null default 30 check(duration_minutes between 5 and 180);
alter table public.nero_recruitment_rounds
 add column if not exists config_snapshot jsonb not null default '{}'::jsonb;
alter table public.nero_recruitment_rounds add column if not exists opened_by text;
alter table public.nero_recruitment_rounds add column if not exists closed_by text;
alter table public.nero_recruitment_rounds add column if not exists closed_at timestamptz;
create unique index if not exists idx_nero_recruit_one_open_per_guild
 on public.nero_recruitment_rounds (guild_id) where state='open';
create table if not exists public.nero_recruitment_permissions (
 guild_id text primary key check(guild_id ~ '^[0-9]{15,25}$'),
 recruiter_role_id text check(recruiter_role_id is null or recruiter_role_id ~ '^[0-9]{15,25}$'),
 updated_at timestamptz not null default now(),
 updated_by text not null check(updated_by ~ '^[0-9]{15,25}$')
);
alter table public.nero_recruitment_permissions enable row level security;
revoke all on public.nero_recruitment_permissions from anon, authenticated;

-- Tempo individual, respostas e trilha de revisão mantidos privados.
create table if not exists public.nero_recruitment_attempts (
 guild_id text not null check(guild_id ~ '^[0-9]{15,25}$'),
 round_id uuid not null references public.nero_recruitment_rounds(id) on delete cascade,
 user_id text not null check(user_id ~ '^[0-9]{15,25}$'),
 started_at timestamptz not null default now(),
 deadline_at timestamptz not null,
 submitted_at timestamptz,
 answers jsonb not null default '[]'::jsonb,
 state text not null default 'in_progress'
  check(state in ('in_progress','submitted','expired','under_review','approved','rejected')),
 reviewed_by text,
 reviewed_at timestamptz,
 final_score numeric(5,2) check(final_score between 0 and 100),
 primary key(guild_id,round_id,user_id),
 check(deadline_at >= started_at)
);
create index if not exists idx_nero_recruit_attempts_round on public.nero_recruitment_attempts(guild_id,round_id,state);
alter table public.nero_recruitment_attempts enable row level security;
revoke all on public.nero_recruitment_attempts from anon, authenticated;

-- Revisão humana e publicação em lote (compatível com a migração já aplicada)
alter table public.nero_recruitment_rounds drop constraint if exists nero_recruitment_rounds_state_check;
alter table public.nero_recruitment_rounds add constraint nero_recruitment_rounds_state_check
 check (state in ('closed','open','review','publishing','complete'));
alter table public.nero_recruitment_attempts add column if not exists rp_name text;
alter table public.nero_recruitment_attempts add column if not exists rp_id text;
alter table public.nero_recruitment_permissions add column if not exists approved_role_id text;
alter table public.nero_recruitment_permissions add column if not exists announce_channel_id text;
alter table public.nero_recruitment_permissions add column if not exists nickname_tag text not null default 'PM';
alter table public.nero_recruitment_permissions add column if not exists show_scores boolean not null default false;
create table if not exists public.nero_recruitment_publications(
 guild_id text not null check(guild_id ~ '^[0-9]{15,25}$'),
 round_id uuid not null references public.nero_recruitment_rounds(id) on delete cascade,
 channel_id text,
 message_id text,
 initiated_by text not null check(initiated_by ~ '^[0-9]{15,25}$'),
 started_at timestamptz not null default now(),
 published_at timestamptz,
 state text not null check(state in ('publishing','sent','complete')),
 primary key(guild_id,round_id)
);
alter table public.nero_recruitment_publications enable row level security;
revoke all on public.nero_recruitment_publications from anon, authenticated;
