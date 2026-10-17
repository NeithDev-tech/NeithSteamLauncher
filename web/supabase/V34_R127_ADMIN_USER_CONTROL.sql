-- Applied remotely 2026-10-10. Source copy for reproducibility.
create or replace function public.neith_admin_set_user_role(p_user_id uuid,p_role text,p_reason text default '') returns jsonb language plpgsql security definer set search_path=public,auth as $function$
declare v_actor_role text; v_target_role text; v_email text;
begin
  v_actor_role:=public.neith_assert_admin(array['owner']::text[],true);
  if p_user_id is null then raise exception 'TARGET_REQUIRED'; end if;
  if p_user_id=auth.uid() then raise exception 'CANNOT_CHANGE_OWN_ROLE'; end if;
  if p_role not in ('user','support','admin') then raise exception 'INVALID_ROLE'; end if;
  select email into v_email from auth.users where id=p_user_id; if v_email is null then raise exception 'USER_NOT_FOUND'; end if;
  select role into v_target_role from public.neith_admin_users where user_id=p_user_id and active=true;
  if v_target_role='owner' then raise exception 'OWNER_ROLE_IMMUTABLE'; end if;
  if p_role='user' then update public.neith_admin_users set active=false,disabled_at=now(),note=left(coalesce(p_reason,''),500) where user_id=p_user_id and role<>'owner';
  else insert into public.neith_admin_users(user_id,role,active,created_by,disabled_at,note) values(p_user_id,p_role,true,auth.uid(),null,left(coalesce(p_reason,''),500)) on conflict(user_id) do update set role=excluded.role,active=true,disabled_at=null,note=excluded.note; end if;
  perform public.neith_admin_audit_write('admin_role_changed',p_user_id,jsonb_build_object('old_role',coalesce(v_target_role,'user'),'new_role',p_role,'reason',left(coalesce(p_reason,''),500),'email',v_email,'actor_role',v_actor_role));
  return jsonb_build_object('ok',true,'user_id',p_user_id,'role',p_role);
end;$function$;
revoke all on function public.neith_admin_set_user_role(uuid,text,text) from public; grant execute on function public.neith_admin_set_user_role(uuid,text,text) to authenticated;

create or replace function public.neith_admin_force_free(p_user_id uuid,p_reason text default '') returns jsonb language plpgsql security definer set search_path=public,auth as $function$
declare v_role text; v_m public.neith_memberships%rowtype; v_email text;
begin
  v_role:=public.neith_assert_admin(array['owner']::text[],true);
  if p_user_id is null then raise exception 'TARGET_REQUIRED'; end if;
  select email into v_email from auth.users where id=p_user_id; if v_email is null then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.neith_memberships(user_id,plan,source) values(p_user_id,'free','admin_bootstrap') on conflict(user_id) do nothing;
  select * into v_m from public.neith_memberships where user_id=p_user_id for update;
  update public.neith_memberships set plan='free',premium_permanent=false,premium_until=null,auto_renew=false,cancel_at_period_end=false,next_renewal_at=null,next_renewal_amount_cents=null,subscription_status='inactive',allowed_devices=1,source='admin',updated_at=now() where user_id=p_user_id;
  insert into public.neith_admin_premium_adjustments(target_user_id,actor_user_id,delta_seconds,permanent_set,old_plan,old_premium_until,new_plan,new_premium_until,reason) values(p_user_id,auth.uid(),null,false,v_m.plan,v_m.premium_until,'free',null,left(coalesce(p_reason,''),500));
  perform public.neith_admin_audit_write('premium_force_free',p_user_id,jsonb_build_object('old_plan',v_m.plan,'old_until',v_m.premium_until,'old_permanent',v_m.premium_permanent,'reason',left(coalesce(p_reason,''),500),'email',v_email,'actor_role',v_role));
  return jsonb_build_object('ok',true,'plan','free','premium_until',null,'premium_permanent',false);
end;$function$;
revoke all on function public.neith_admin_force_free(uuid,text) from public; grant execute on function public.neith_admin_force_free(uuid,text) to authenticated;
notify pgrst,'reload schema';


create or replace function public.neith_admin_generate_key(p_duration text,p_note text default '') returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $function$
declare v_role text; v_raw text; v_hash text; v_unit text; v_amount integer; v_perm boolean:=false; v_days integer; v_id uuid; v_value text:=lower(trim(coalesce(p_duration,'')));
begin
  v_role:=public.neith_assert_admin(array['owner','admin']::text[],true);
  if v_value='permanent' then v_perm:=true;v_days:=36500;v_unit:=null;v_amount:=null;
  elsif v_value ~ '^[1-9][0-9]{0,2}d$' then v_amount:=left(v_value,length(v_value)-1)::integer;if v_amount>365 then raise exception 'INVALID_KEY_DURATION';end if;v_unit:='day';v_days:=v_amount;
  elsif v_value ~ '^[1-9][0-9]{0,2}m$' then v_amount:=left(v_value,length(v_value)-1)::integer;if v_amount>120 then raise exception 'INVALID_KEY_DURATION';end if;v_unit:='month';v_days:=v_amount*30;
  elsif v_value ~ '^[1-9][0-9]{0,2}y$' then v_amount:=left(v_value,length(v_value)-1)::integer;if v_amount>20 then raise exception 'INVALID_KEY_DURATION';end if;v_unit:='year';v_days:=v_amount*365;
  else raise exception 'INVALID_KEY_DURATION'; end if;
  v_raw:='NEITH-'||upper(substr(encode(gen_random_bytes(20),'hex'),1,5))||'-'||upper(substr(encode(gen_random_bytes(20),'hex'),1,5))||'-'||upper(substr(encode(gen_random_bytes(20),'hex'),1,5))||'-'||upper(substr(encode(gen_random_bytes(20),'hex'),1,5));
  v_hash:=encode(digest(v_raw,'sha256'),'hex');
  insert into public.neith_license_keys(key_hash,kind,duration_days,created_by,grant_unit,grant_amount,grants_permanent,note) values(v_hash,'admin',v_days,auth.uid(),v_unit,v_amount,v_perm,left(coalesce(p_note,''),500)) returning id into v_id;
  perform public.neith_admin_audit_write('key_generate',null,jsonb_build_object('key_id',v_id,'duration',p_duration,'note',left(coalesce(p_note,''),500),'role',v_role));
  return jsonb_build_object('ok',true,'key_id',v_id,'key',v_raw,'duration',p_duration);
end;$function$;
revoke all on function public.neith_admin_generate_key(text,text) from public;grant execute on function public.neith_admin_generate_key(text,text) to authenticated;
notify pgrst,'reload schema';
