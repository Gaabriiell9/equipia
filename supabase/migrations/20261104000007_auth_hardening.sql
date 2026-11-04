-- Statut d'un compte par e-mail, pour la fonction Edge admin-auth uniquement (service_role).
-- Permet de purger les comptes non confirmés avant d'émettre un lien (protection contre le
-- pré-détournement de compte : un tiers ne peut pas imposer son mot de passe à un e-mail qui n'est pas le sien).
create or replace function public.auth_user_status(p_email text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'confirmed', u.email_confirmed_at is not null)
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;

revoke all on function public.auth_user_status(text) from public, anon, authenticated;
grant execute on function public.auth_user_status(text) to service_role;
