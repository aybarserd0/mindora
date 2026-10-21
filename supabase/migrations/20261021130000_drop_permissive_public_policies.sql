-- Remove policies that granted the `public` role (which includes anon and
-- authenticated) unrestricted access, and lock down a SECURITY DEFINER RPC.
--
-- All server code uses the service role, which bypasses RLS, so these
-- policies only ever widened access for browser-side (anon key) clients.

begin;

-- 1. expert_verifications: `public` had ALL using (true) / with check (true),
--    letting anyone with the anon key read, insert, update or delete
--    verification records (e.g. self-approve). No policy remains, so only
--    the service role can access the table.
drop policy if exists "expert_verifications_admin_all" on public.expert_verifications;

-- 2. conversation_reads: same ALL true policy on `public`, despite its name.
--    The service role does not need a policy to manage this table.
drop policy if exists "service role can manage conversation reads" on public.conversation_reads;

-- 3. refresh_expert_rating_stats: SECURITY DEFINER and callable via
--    /rest/v1/rpc. EXECUTE is granted to PUBLIC by default, so revoking only
--    from anon/authenticated would not be enough. The reviews trigger
--    (handle_review_rating_stats, also SECURITY DEFINER, owned by postgres)
--    keeps calling it as the owner; service_role keeps its explicit grant.
revoke execute on function public.refresh_expert_rating_stats(uuid) from public, anon, authenticated;
grant execute on function public.refresh_expert_rating_stats(uuid) to service_role;

commit;

-- Verification (run after applying):
-- select tablename, policyname from pg_policies
--   where schemaname = 'public' and tablename in ('expert_verifications', 'conversation_reads');
--   -> expect 0 rows
-- select has_function_privilege('anon', 'public.refresh_expert_rating_stats(uuid)', 'execute'),
--        has_function_privilege('authenticated', 'public.refresh_expert_rating_stats(uuid)', 'execute'),
--        has_function_privilege('service_role', 'public.refresh_expert_rating_stats(uuid)', 'execute');
--   -> expect false, false, true
