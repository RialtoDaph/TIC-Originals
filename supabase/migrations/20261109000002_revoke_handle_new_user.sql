-- handle_new_user is only meant to run as the auth.users trigger; keep it out of the public RPC API.
-- Triggers still fire: EXECUTE is checked when the trigger is created, not when it runs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
