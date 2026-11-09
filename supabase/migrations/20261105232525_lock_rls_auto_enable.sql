-- rls_auto_enable() is created by the Supabase platform; keep it out of the public RPC API.
-- Applied to production before this file existed; kept here so local and remote history match.
-- Guarded because a local database may not have the function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
