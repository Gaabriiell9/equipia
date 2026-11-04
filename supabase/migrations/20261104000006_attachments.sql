-- Ajout ou remplacement du justificatif d'une absence (par le salarié, sa ligne managériale ou les RH)
create or replace function public.set_request_attachment(p_request uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.leave_requests; v_actor public.members;
begin
  select * into r from public.leave_requests where id = p_request;
  if r.id is null then perform app.err('Demande introuvable.'); end if;
  v_actor := app.require_member(r.org_id);
  if not app.can_see_private_as(v_actor.id, r.member_id) then perform app.err('Accès refusé.', '42501'); end if;
  if p_path is not null and p_path not like (r.org_id::text || '/' || r.member_id::text || '/%') then
    perform app.err('Justificatif invalide.');
  end if;
  update public.leave_requests set attachment_path = p_path, updated_at = now() where id = p_request;
  perform app.audit(r.org_id, v_actor.id, 'leave_request.attachment_set', 'leave_request', r.id, jsonb_build_object('removed', p_path is null));
end $$;

revoke all on function public.set_request_attachment(uuid, text) from public, anon;
grant execute on function public.set_request_attachment(uuid, text) to authenticated, service_role;
