-- Execute no SQL Editor do Supabase. Acesso direto do navegador é bloqueado.
create table if not exists guild_settings (
 guild_id text primary key,
 name text not null default '',
 roles jsonb not null default '{}'::jsonb,
 shift_roles jsonb not null default '{}'::jsonb,
 shift_hours jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists guild_members (
 guild_id text not null,
 user_id text not null,
 display_name text not null,
 avatar_url text,
 role_ids jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 primary key (guild_id,user_id)
);
create table if not exists shift_cards (
 guild_id text not null,
 card_id text not null,
 user_id text not null,
 shift text not null check (shift in ('Manhã','Tarde','Noite','Madrugada')),
 origin_shift text,
 kind text not null check (kind in ('Normal','Extra')),
 status text not null check (status in ('Ativo','Validado','Cancelado')),
 started_at timestamptz not null,
 ended_at timestamptz,
 duration_minutes integer not null default 0 check (duration_minutes >= 0),
 cancellation_reason text,
 updated_at timestamptz not null default now(),
 primary key (guild_id,card_id)
);
create index if not exists idx_shift_cards_guild_start on shift_cards(guild_id,started_at desc);
alter table guild_settings enable row level security;
alter table guild_members enable row level security;
alter table shift_cards enable row level security;
-- Nenhuma política pública: só backend confiável com service_role acessa.

-- Atualização 5.3: execute todo este script novamente no SQL Editor.
alter table guild_settings add column if not exists time_off jsonb not null default '{"weekly":{"all":[0]},"dates":[]}'::jsonb;
alter table guild_settings add column if not exists point_mode text not null default 'team';
create table if not exists attendance_days (
 guild_id text not null, day date not null, user_id text not null, shift text not null,
 status text not null check (status in ('cumpriu','incompleta','falta','folga','justificada','pendente')),
 minutes integer not null default 0 check(minutes >= 0),
 updated_at timestamptz not null default now(),
 primary key(guild_id,day,user_id,shift)
);
create table if not exists absence_justifications (
 guild_id text not null,id text not null,user_id text not null,shift text not null,
 day date not null,reason text not null,status text not null check(status in ('pending','approved','rejected')),
 created_at timestamptz not null,decided_at timestamptz,reviewer_id text,
 primary key(guild_id,id)
);
create table if not exists attendance_warnings (
 guild_id text not null,id text not null,user_id text not null,shift text not null,
 day date not null,level integer not null check(level between 1 and 3),
 status text not null check(status in ('active','revoked')),
 reason text not null,created_at timestamptz not null,revoked_at timestamptz,revoked_by text,
 primary key(guild_id,id)
);
create index if not exists idx_attendance_guild_day on attendance_days(guild_id,day desc);
create index if not exists idx_warning_guild_day on attendance_warnings(guild_id,day desc);
alter table attendance_days enable row level security;
alter table absence_justifications enable row level security;
alter table attendance_warnings enable row level security;
