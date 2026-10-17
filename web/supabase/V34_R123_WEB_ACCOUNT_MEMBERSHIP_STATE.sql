-- Applied remotely on 2026-10-10.
-- Read-only authenticated web membership snapshot. No device creation/binding side effects.
create or replace function public.neith_web_account_state()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_member public.neith_memberships%rowtype;
  v_profile public.neith_profiles%rowtype;
  v_active public.neith_premium_periods%rowtype;
  v_premium boolean := false;
  v_plan text := 'free';
  v_first_premium_at timestamptz;
  v_latest_purchase_at timestamptz;
  v_history jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select * into v_profile from public.neith_profiles where user_id=v_uid;
  select * into v_member from public.neith_memberships where user_id=v_uid;
  if not found then
    return jsonb_build_object('schema',1,'server_time',now(),'membership',jsonb_build_object('plan','free','premium_until',null,'premium_permanent',false,'auto_renew',false,'subscription_status','inactive','billing_provider','none','billing_interval','other','cancel_at_period_end',false,'current_period_start',null,'current_period_end',null,'next_renewal_at',null,'next_renewal_amount_cents',null,'billing_currency','EUR','source','free','updated_at',null,'first_premium_at',null,'latest_purchase_at',null,'cancel_effective_at',null),'periods','[]'::jsonb);
  end if;
  v_premium := coalesce(v_profile.status,'active')='active' and v_member.plan='premium' and (v_member.premium_permanent or (v_member.premium_until is not null and v_member.premium_until>now()));
  v_plan := case when v_premium then 'premium' else 'free' end;
  select * into v_active from public.neith_premium_periods p where p.user_id=v_uid and p.starts_at<=now() and (p.ends_at is null or p.ends_at>now()) order by p.starts_at desc limit 1;
  select min(created_at), max(created_at) into v_first_premium_at, v_latest_purchase_at from public.neith_premium_periods where user_id=v_uid;
  select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_history from (select p.created_at,jsonb_build_object('period_kind',p.period_kind,'starts_at',p.starts_at,'ends_at',p.ends_at,'source',p.source,'provider',p.provider,'amount_cents',p.amount_cents,'currency',p.currency,'created_at',p.created_at) obj from public.neith_premium_periods p where p.user_id=v_uid order by p.created_at desc limit 12) x;
  return jsonb_build_object('schema',1,'server_time',now(),'membership',jsonb_build_object('plan',v_plan,'premium_until',case when v_premium and not v_member.premium_permanent then v_member.premium_until else null end,'premium_permanent',case when v_premium then v_member.premium_permanent else false end,'auto_renew',case when v_premium then v_member.auto_renew else false end,'subscription_status',v_member.subscription_status,'billing_provider',v_member.billing_provider,'billing_interval',v_member.billing_interval,'cancel_at_period_end',v_member.cancel_at_period_end,'current_period_start',v_member.current_period_start,'current_period_end',v_member.current_period_end,'next_renewal_at',v_member.next_renewal_at,'next_renewal_amount_cents',v_member.next_renewal_amount_cents,'billing_currency',v_member.billing_currency,'source',v_member.source,'updated_at',v_member.updated_at,'first_premium_at',v_first_premium_at,'latest_purchase_at',v_latest_purchase_at,'active_period_kind',case when v_active.id is null then null else v_active.period_kind end,'active_period_source',case when v_active.id is null then null else v_active.source end,'active_period_provider',case when v_active.id is null then null else v_active.provider end,'cancel_effective_at',case when v_member.cancel_at_period_end then coalesce(v_member.current_period_end,v_member.premium_until) else null end),'periods',v_history);
end;
$function$;
revoke all on function public.neith_web_account_state() from public;
grant execute on function public.neith_web_account_state() to authenticated;
