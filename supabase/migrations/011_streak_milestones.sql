-- =============================================================================
-- Migration 011: Streak-Meilensteine -> automatische Chat-Nachricht
-- Bei 7/14/30/60/100 Tagen Streak in Folge wird automatisch eine Nachricht
-- im Workspace-Chat des betroffenen Nutzers gepostet. Das Frontend zeigt
-- dem Nutzer selbst zusaetzlich eine Konfetti-Animation (StreakCelebration).
-- =============================================================================

create or replace function public.bump_streak(_user_id uuid, _workspace_id uuid, _todo_date date)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  _streak record;
  _new_streak integer;
  _bonus integer := 0;
  _milestones integer[] := array[7, 14, 30, 60, 100];
begin
  select * into _streak
  from public.streaks
  where user_id = _user_id and workspace_id = _workspace_id
  for update;

  if _streak is null then
    _new_streak := 1;
    insert into public.streaks (user_id, workspace_id, current_streak, last_active_date)
    values (_user_id, _workspace_id, _new_streak, _todo_date);
  else
    if _streak.last_active_date = _todo_date then
      -- gleicher Tag, Streak bleibt gleich
      _new_streak := _streak.current_streak;
    elsif _streak.last_active_date = _todo_date - interval '1 day' then
      _new_streak := _streak.current_streak + 1;
    elsif _streak.last_active_date < _todo_date then
      -- Luecke -> Streak beginnt neu
      _new_streak := 1;
    else
      -- Bestaetigung fuer einen Tag vor dem letzten aktiven Tag (rueckwirkend) -> Streak unveraendert
      _new_streak := _streak.current_streak;
    end if;

    update public.streaks
    set current_streak = _new_streak,
        last_active_date = greatest(_streak.last_active_date, _todo_date)
    where user_id = _user_id and workspace_id = _workspace_id;
  end if;

  if _new_streak >= 3 then
    _bonus := 2;
  end if;

  if _new_streak = any(_milestones) then
    insert into public.chat_messages (workspace_id, user_id, content)
    values (
      _workspace_id,
      _user_id,
      '🔥 ' || _new_streak || ' Tage in Folge durchgezogen!'
    );
  end if;

  return _bonus;
end;
$$;
