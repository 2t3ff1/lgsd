-- =============================================================================
-- Migration 010: Neue Features (Profil-Personalisierung, Workspace-Chat,
-- Reaktionen, Nudges, Streak-Meilensteine, Wochen-Commitments, Web Push,
-- erweiterte Wiederholungsregeln) + 24h-Kulanzfrist vor Strafpunkten.
--
-- Alle Policies nutzen direkte EXISTS-Subqueries gegen workspace_members
-- (kein is_workspace_member()-Aufruf), um die RLS-Rekursion aus den
-- vorherigen Migrationen zu vermeiden.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. PROFIL-PERSONALISIERUNG
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_color text,
  add column if not exists background_color text,
  add column if not exists background_image_url text,
  add column if not exists card_color text,
  add column if not exists commitment_reminder_day integer check (commitment_reminder_day between 0 and 6),
  add column if not exists commitment_reminder_time time;

-- Storage-Bucket fuer eigene Profilbilder
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatare: Lesen fuer alle"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "Avatare: eigene Datei hochladen"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatare: eigene Datei ersetzen"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatare: eigene Datei loeschen"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------------------------
-- 2. ERWEITERTE WIEDERHOLUNGSREGELN
-- -------------------------------------------------------------------------
alter table public.todos
  add column if not exists recurrence_interval integer check (recurrence_interval > 0),
  add column if not exists recurrence_days integer[];

-- -------------------------------------------------------------------------
-- 3. LIVE-CHAT + PRESENCE
-- -------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_workspace_created_idx
  on public.chat_messages (workspace_id, created_at);

create table if not exists public.user_presence (
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

alter table public.chat_messages enable row level security;
alter table public.user_presence enable row level security;

drop policy if exists "Chat: Workspace-Mitglieder koennen lesen" on public.chat_messages;
create policy "Chat: Workspace-Mitglieder koennen lesen"
  on public.chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Chat: Workspace-Mitglieder koennen schreiben" on public.chat_messages;
create policy "Chat: Workspace-Mitglieder koennen schreiben"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Presence: Workspace-Mitglieder koennen lesen" on public.user_presence;
create policy "Presence: Workspace-Mitglieder koennen lesen"
  on public.user_presence for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Presence: eigenen Status schreiben" on public.user_presence;
create policy "Presence: eigenen Status schreiben"
  on public.user_presence for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Presence: eigenen Status aktualisieren" on public.user_presence;
create policy "Presence: eigenen Status aktualisieren"
  on public.user_presence for update to authenticated
  using (user_id = auth.uid());

-- Praktische Upsert-Funktion fuer den Presence-Heartbeat
create or replace function public.touch_presence(_workspace_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.user_presence (user_id, workspace_id, last_seen)
  values (auth.uid(), _workspace_id, now())
  on conflict (user_id, workspace_id) do update set last_seen = now();
$$;

-- -------------------------------------------------------------------------
-- 4. EMOJI-REAKTIONEN AUF AUFGABEN
-- -------------------------------------------------------------------------
create table if not exists public.todo_reactions (
  id uuid primary key default uuid_generate_v4(),
  todo_id uuid not null references public.todos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (todo_id, user_id, emoji)
);

create index if not exists todo_reactions_todo_idx on public.todo_reactions (todo_id);

alter table public.todo_reactions enable row level security;

drop policy if exists "Reaktionen: Workspace-Mitglieder koennen lesen" on public.todo_reactions;
create policy "Reaktionen: Workspace-Mitglieder koennen lesen"
  on public.todo_reactions for select to authenticated
  using (
    exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = todo_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Reaktionen: Workspace-Mitglieder koennen reagieren" on public.todo_reactions;
create policy "Reaktionen: Workspace-Mitglieder koennen reagieren"
  on public.todo_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = todo_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Reaktionen: eigene Reaktion entfernen" on public.todo_reactions;
create policy "Reaktionen: eigene Reaktion entfernen"
  on public.todo_reactions for delete to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 5. NUDGES ("Stupsen")
-- -------------------------------------------------------------------------
create table if not exists public.nudges (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

create index if not exists nudges_to_user_idx on public.nudges (to_user_id, created_at);

alter table public.nudges enable row level security;

drop policy if exists "Nudges: Beteiligte koennen lesen" on public.nudges;
create policy "Nudges: Beteiligte koennen lesen"
  on public.nudges for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "Nudges: Workspace-Mitglieder koennen stupsen" on public.nudges;
create policy "Nudges: Workspace-Mitglieder koennen stupsen"
  on public.nudges for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.workspace_members wm2
      where wm2.workspace_id = workspace_id and wm2.user_id = to_user_id
    )
    -- maximal ein Stups pro Empfaenger und Tag
    and not exists (
      select 1 from public.nudges n
      where n.from_user_id = auth.uid()
        and n.to_user_id = to_user_id
        and n.workspace_id = workspace_id
        and n.created_at >= date_trunc('day', now())
    )
  );

drop policy if exists "Nudges: Empfaenger kann als gesehen markieren" on public.nudges;
create policy "Nudges: Empfaenger kann als gesehen markieren"
  on public.nudges for update to authenticated
  using (to_user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 6. WOECHENTLICHES COMMITMENT
-- -------------------------------------------------------------------------
create table if not exists public.weekly_commitments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  content text not null,
  week_start date not null, -- Montag der jeweiligen Woche
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id, week_start)
);

alter table public.weekly_commitments enable row level security;

drop policy if exists "Commitments: Workspace-Mitglieder koennen lesen" on public.weekly_commitments;
create policy "Commitments: Workspace-Mitglieder koennen lesen"
  on public.weekly_commitments for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Commitments: eigenes Commitment erstellen" on public.weekly_commitments;
create policy "Commitments: eigenes Commitment erstellen"
  on public.weekly_commitments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Commitments: eigenes Commitment bearbeiten" on public.weekly_commitments;
create policy "Commitments: eigenes Commitment bearbeiten"
  on public.weekly_commitments for update to authenticated
  using (user_id = auth.uid());

-- Strafe fuer fehlendes Wochen-Commitment (wird vom Freitags-Cronjob aufgerufen)
create or replace function public.penalize_missing_commitments(_week_start date)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _member record;
begin
  for _member in
    select distinct wm.user_id, wm.workspace_id
    from public.workspace_members wm
  loop
    if not exists (
      select 1 from public.weekly_commitments wc
      where wc.user_id = _member.user_id
        and wc.workspace_id = _member.workspace_id
        and wc.week_start = _week_start
    ) then
      perform public.award_points(_member.user_id, _member.workspace_id, null, -20, 'commitment_missed');
    end if;
  end loop;
end;
$$;

-- Freitags 23:59 (Server-Zeit) ausfuehren: Strafe fuer die laufende Woche
select cron.schedule(
  'lgsd-weekly-commitment-check',
  '59 23 * * 5',
  $$select public.penalize_missing_commitments(
      (current_date - (extract(isodow from current_date)::int - 1))::date
    );$$
);

-- -------------------------------------------------------------------------
-- 7. WEB PUSH
-- -------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Push-Subscriptions: eigene lesen" on public.push_subscriptions;
create policy "Push-Subscriptions: eigene lesen"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Push-Subscriptions: eigene erstellen" on public.push_subscriptions;
create policy "Push-Subscriptions: eigene erstellen"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Push-Subscriptions: eigene loeschen" on public.push_subscriptions;
create policy "Push-Subscriptions: eigene loeschen"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 8. 24H-KULANZFRIST VOR STRAFPUNKTEN
-- Aufgaben, die heute faellig waren, koennen bis Ende des naechsten Tages
-- noch bestaetigt werden, bevor der Mitternachts-Job Minuspunkte vergibt.
-- -------------------------------------------------------------------------
create or replace function public.run_daily_maintenance()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo record;
  _next_date date;
begin
  -- 1. Offene Verschiebungsantraege, die bis Mitternacht nicht entschieden wurden,
  --    automatisch verschieben (ohne Punktabzug) und amber markieren.
  for _todo in
    select * from public.todos
    where shift_request_status = 'pending'
      and date < current_date
  loop
    update public.todos
    set date = coalesce(_todo.shift_request_date, _todo.date + interval '1 day'),
        shift_count = _todo.shift_count + 1,
        shift_request_status = 'none',
        shift_request_date = null,
        shift_request_reason = null,
        shift_auto_approved = true
    where id = _todo.id;
  end loop;

  -- 2. Strafpunkte fuer offene/ueberfaellige Todos vergeben — erst nach 24h Kulanzfrist
  for _todo in
    select * from public.todos
    where date < current_date - interval '1 day'
      and status in ('open', 'rejected')
      and penalized = false
  loop
    update public.todos set status = 'missed', penalized = true where id = _todo.id;
    perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, -5, 'penalty_missed');

    -- Streak zuruecksetzen, wenn der verpasste Tag direkt nach dem letzten aktiven Tag lag
    update public.streaks
    set current_streak = 0
    where user_id = _todo.user_id
      and workspace_id = _todo.workspace_id
      and (last_active_date is null or last_active_date < _todo.date);
  end loop;

  -- 3. Naechste Instanz wiederkehrender Todos erzeugen
  for _todo in
    select * from public.todos
    where is_recurring = true
      and date = current_date - interval '1 day'
  loop
    _next_date := case
      when _todo.recurrence_interval is not null then _todo.date + (_todo.recurrence_interval || ' day')::interval
      when _todo.recurrence_type = 'daily' then _todo.date + interval '1 day'
      when _todo.recurrence_type = 'weekly' then _todo.date + interval '7 day'
      when _todo.recurrence_type = 'monthly' then _todo.date + interval '1 month'
      else null
    end;

    -- Wochentags-Filter: falls recurrence_days gesetzt ist, naechsten passenden Tag suchen
    if _todo.recurrence_days is not null and array_length(_todo.recurrence_days, 1) > 0 then
      _next_date := _todo.date + interval '1 day';
      while not (extract(dow from _next_date)::int = any(_todo.recurrence_days)) loop
        _next_date := _next_date + interval '1 day';
      end loop;
    end if;

    if _next_date is not null then
      insert into public.todos (
        user_id, workspace_id, title, date, is_recurring, recurrence_type,
        recurrence_parent_id, recurrence_interval, recurrence_days
      )
      values (
        _todo.user_id,
        _todo.workspace_id,
        _todo.title,
        _next_date,
        true,
        _todo.recurrence_type,
        coalesce(_todo.recurrence_parent_id, _todo.id),
        _todo.recurrence_interval,
        _todo.recurrence_days
      );
    end if;
  end loop;
end;
$$;

-- -------------------------------------------------------------------------
-- 9. REALTIME fuer neue Tabellen
-- -------------------------------------------------------------------------
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.user_presence;
alter publication supabase_realtime add table public.todo_reactions;
alter publication supabase_realtime add table public.nudges;
alter publication supabase_realtime add table public.weekly_commitments;
