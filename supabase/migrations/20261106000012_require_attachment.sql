-- Justificatif obligatoire : un salarié ne peut pas envoyer (ni vider ensuite) une demande
-- dont le type exige un justificatif. Les managers et RH qui saisissent pour un autre en sont dispensés.
create or replace function app.enforce_attachment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_required boolean; v_actor public.members;
begin
  select lt.requires_attachment into v_required from public.leave_types lt where lt.id = new.leave_type_id;
  if not coalesce(v_required, false) or new.attachment_path is not null then return new; end if;
  if tg_op = 'INSERT' then
    -- Seule la saisie par le salarié lui-même est concernée
    if new.created_by is distinct from new.member_id then return new; end if;
    select * into v_actor from public.members where id = new.member_id;
  else
    if old.attachment_path is null then return new; end if;
    select * into v_actor from public.members
    where org_id = new.org_id and user_id = (select auth.uid()) and status <> 'disabled' limit 1;
  end if;
  if v_actor.id is null or v_actor.is_demo or v_actor.role in ('hr', 'admin') then return new; end if;
  perform app.err('Joignez le justificatif demandé pour ce type d''absence (PDF ou photo).');
  return new;
end $$;

drop trigger if exists enforce_attachment on public.leave_requests;
create trigger enforce_attachment before insert or update of attachment_path on public.leave_requests
  for each row execute function app.enforce_attachment();
