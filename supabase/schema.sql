-- League of Stocks keeper data (src/league/store.ts, SupabaseStore).
-- Paste into Supabase → SQL Editor → Run. Safe to run again.
-- Only the server's secret key reads and writes these tables: row level
-- security is on with no policies, so the public (anon) key sees nothing.

create table if not exists league_samples (
  escrow   text   not null,             -- LeagueEscrow address, lowercase
  round_id bigint not null,
  phase    text   not null check (phase in ('start', 'end', 'live')),
  at       bigint not null,             -- sample time, ms since epoch
  sample   jsonb  not null,             -- [{ token, value, decimals, trading, at }]
  primary key (escrow, round_id, phase, at)
);

create table if not exists league_inputs (
  escrow     text        not null,
  round_id   bigint      not null,
  inputs     text        not null,      -- the published settlement inputs, exactly as hashed
  created_at timestamptz not null default now(),
  primary key (escrow, round_id)
);

-- Tables made before "live" samples existed (8 Oct): allow the new phase.
alter table league_samples drop constraint if exists league_samples_phase_check;
alter table league_samples add constraint league_samples_phase_check check (phase in ('start', 'end', 'live'));

alter table league_samples enable row level security;
alter table league_inputs enable row level security;
