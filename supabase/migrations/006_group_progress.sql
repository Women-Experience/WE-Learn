-- ════════════════════════════════════════════════════════════════════════════
-- 006 — Group progress: each Member marks her own Sessions done
-- ════════════════════════════════════════════════════════════════════════════
-- Progress is personal, but shared with the group for encouragement: every
-- Member of a Bubble can see who has finished which Session. Only the
-- completion itself is shared; project links, reflections and ratings stay in
-- session_progress, which remains private.
--
--  A. session_completions: one row per (Session, Member) she has finished.
--  B. Leaving a Bubble removes her completions there.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── A. Completions ─────────────────────────────────────────────────────────

create table public.session_completions (
  session_id   uuid not null references public.sessions (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index idx_session_completions_user on public.session_completions (user_id);

alter table public.session_completions enable row level security;

-- The Bubble's Members (and Admins) see the whole group's progress.
create policy "completions_select_members" on public.session_completions
  for select to authenticated
  using (public.is_bubble_member(public.session_bubble(session_id)) or public.is_admin());

-- A Member marks only herself, only in her own Bubble, only on a live Session.
create policy "completions_insert_own" on public.session_completions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_bubble_member(public.session_bubble(session_id))
    and exists (select 1 from public.sessions s where s.id = session_id and s.deleted_at is null)
  );

-- …and can take it back. Nobody edits anyone else's progress.
create policy "completions_delete_own" on public.session_completions
  for delete to authenticated
  using (user_id = auth.uid());

revoke update on public.session_completions from authenticated, anon;

-- ─── B. Leaving clears her progress in that Bubble ─────────────────────────

create or replace function public.clear_completions_on_leave()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from session_completions c
   using sessions s
   where s.id = c.session_id and s.bubble_id = old.bubble_id and c.user_id = old.user_id;
  return old;
end;
$$;

revoke execute on function public.clear_completions_on_leave() from public, anon, authenticated;

create trigger trg_clear_completions_on_leave
  after delete on public.bubble_members
  for each row execute function public.clear_completions_on_leave();
