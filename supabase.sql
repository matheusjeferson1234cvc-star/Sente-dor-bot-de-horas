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
