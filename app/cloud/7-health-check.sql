-- Life Dashboard: daily health check, run by the database itself (no AI, no usage).
-- Replaces the "Health check" Claude scheduled task. Writes meta/agent-health every day and, only when
-- something is wrong, a proposals record health-YYYY-MM-DD with one high-priority to-do per problem.
-- The remind function sends one push notification when agent-health has ok = false.

create or replace function public.ld_health() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  em text; nowms numeric := floor(extract(epoch from clock_timestamp())*1000);
  today date := (now() at time zone 'Asia/Kolkata')::date;
  probs jsonb := '[]'::jsonb; names text[] := '{}'; det text[] := '{}';
  r record; last_run timestamptz; last_status text; bad_http int; v numeric; lim numeric; age_h numeric;
begin
  select u.email into em from auth.users u join public.records x on x.user_id=u.id and x.col='config' and x.id='main' limit 1;
  if em is null then return jsonb_build_object('ok',false,'error','no user'); end if;

  -- (a) reminders: the 5-minute job ran recently, succeeded, and the function answered 200
  select d.start_time, d.status into last_run, last_status from cron.job_run_details d join cron.job j on j.jobid=d.jobid
    where j.jobname='ld-remind' order by d.start_time desc limit 1;
  select count(*) into bad_http from (select status_code from net._http_response order by created desc limit 3) h where h.status_code is distinct from 200;
  if last_run is null or last_run < now()-interval '15 minutes' or last_status<>'succeeded' or bad_http>0 then
    names := names||'reminders';
    probs := probs||jsonb_build_object('kind','todo','pri','high','q','q1','title','Reminders are not running',
      'why','The 5-minute reminder job '||coalesce('last ran '||to_char(last_run at time zone 'Asia/Kolkata','DD Mon HH24:MI')||' ('||last_status||')','has never run')||'; '||bad_http||' of the last 3 calls failed. Re-run the reminder SQL from setup.html.');
  end if;
  det := det||('reminders: '||coalesce(last_status,'none')||', bad http '||bad_http);

  -- (b) backup within 30 hours
  select (flat->>'at')::numeric into v from public.records where col='meta' and id='backup' and not (flat ? '$del');
  age_h := case when v is null then null else (nowms-v)/3600000 end;
  if age_h is null or age_h>30 then
    names := names||'backup';
    probs := probs||jsonb_build_object('kind','todo','pri','high','q','q1','title',
      case when age_h is null then 'Daily backup has never run' else 'Daily backup has not run for '||ceil(age_h/24)||' day(s)' end,
      'why','The Google Drive backup script should run every morning about 4:30. Open script.google.com and run the backup once to see the error.');
  end if;
  det := det||('backup: '||coalesce(round(age_h)::text||' h ago','never'));

  -- (c) Wispr logger: newest record whose id starts with a date, within 36 hours
  select max(updated_at) into last_run from public.records where col='proposals' and id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' and not (flat ? '$del');
  if last_run is null or last_run < now()-interval '36 hours' then
    names := names||'wispr';
    probs := probs||jsonb_build_object('kind','todo','pri','high','q','q1','title','Wispr logger has not reported for over a day',
      'why','No Wispr logger file reached the app since '||coalesce(to_char(last_run at time zone 'Asia/Kolkata','DD Mon HH24:MI'),'ever')||'. Check the task on claude.ai (Scheduled) and the Drive inbox script.');
  end if;
  det := det||('wispr: '||coalesce(to_char(last_run at time zone 'Asia/Kolkata','DD Mon HH24:MI'),'never'));

  -- (d) other agents: too old, or reported ok = false
  for r in select id, (flat->>'at')::numeric as at, flat->>'ok' as ok, flat->>'summary' as summary from public.records
           where col='meta' and id like 'agent-%' and id<>'agent-health' and not (flat ? '$del') loop
    lim := case r.id when 'agent-paper' then 36 when 'agent-outlook' then 36 when 'agent-scribe' then 36
                     when 'agent-sunday' then 240 when 'agent-cfa' then 240 when 'agent-monthend' then 840 when 'agent-journal' then 840 else null end;
    continue when lim is null or (r.id='agent-scribe' and today < date '2027-02-01');
    age_h := (nowms-r.at)/3600000;
    if age_h>lim or r.ok='false' then
      names := names||replace(r.id,'agent-','');
      probs := probs||jsonb_build_object('kind','todo','pri','high','q','q1',
        'title',initcap(replace(replace(r.id,'agent-',''),'monthend','month-end'))||case when r.ok='false' then ' reported a problem' else ' has not run for '||ceil(age_h/24)||' day(s)' end,
        'why',left(coalesce(r.summary,'No summary.'),220));
    end if;
    det := det||(r.id||': '||round(age_h)||' h, ok '||coalesce(r.ok,'?'));
  end loop;

  if jsonb_array_length(probs)>0 then
    perform public.service_put(em,'proposals','health-'||today::text,
      jsonb_build_object('date',today::text,'items',probs,'at',nowms));
  end if;
  perform public.service_put(em,'meta','agent-health', jsonb_build_object('at',nowms,
    'ok', jsonb_array_length(probs)=0,
    'summary', case when jsonb_array_length(probs)=0 then 'All checks fine' else jsonb_array_length(probs)||' problem(s): '||array_to_string(names,', ') end,
    'detail', left(array_to_string(det,'; '),600)));
  return jsonb_build_object('ok', jsonb_array_length(probs)=0, 'problems', probs);
end $$;

revoke all on function public.ld_health() from public, anon, authenticated;

-- every day at 7:07 AM India time (01:37 UTC)
select cron.schedule('ld-health', '37 1 * * *', $$select public.ld_health()$$);
