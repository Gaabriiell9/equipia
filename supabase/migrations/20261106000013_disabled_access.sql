-- Espaces dont l'utilisateur connecté a été retiré (pour lui afficher une page explicative)
create or replace function public.my_removed_orgs()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('org_name', o.name) order by o.name), '[]'::jsonb)
  from public.members m join public.organizations o on o.id = m.org_id
  where m.user_id = (select auth.uid()) and m.status = 'disabled'
$$;

revoke all on function public.my_removed_orgs() from public, anon;
grant execute on function public.my_removed_orgs() to authenticated, service_role;
