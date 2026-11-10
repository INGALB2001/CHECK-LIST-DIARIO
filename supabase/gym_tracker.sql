-- Ejecutar en Supabase SQL Editor. Nunca colocar service_role en GitHub.
create table if not exists public.gym_access (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.gym_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 workout_date date not null default current_date,
 exercises jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 finished_at timestamptz
);
create index if not exists gym_sessions_user_date_idx on public.gym_sessions(user_id,workout_date desc);
create table if not exists public.gym_metrics (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 measured_on date not null default current_date,
 weight_kg numeric(6,2),waist_cm numeric(6,2),chest_cm numeric(6,2),
 arm_cm numeric(6,2),hip_cm numeric(6,2),thigh_cm numeric(6,2),
 unique(user_id,measured_on)
);
alter table public.gym_access enable row level security;
alter table public.gym_sessions enable row level security;
alter table public.gym_metrics enable row level security;
revoke all on public.gym_access,public.gym_sessions,public.gym_metrics from anon;
grant select on public.gym_access to authenticated;
grant select,insert,update,delete on public.gym_sessions,public.gym_metrics to authenticated;
drop policy if exists gym_access_self on public.gym_access;
create policy gym_access_self on public.gym_access for select to authenticated using(user_id=auth.uid());
drop policy if exists gym_sessions_private on public.gym_sessions;
create policy gym_sessions_private on public.gym_sessions for all to authenticated
 using(user_id=auth.uid() and exists(select 1 from public.gym_access a where a.user_id=auth.uid()))
 with check(user_id=auth.uid() and exists(select 1 from public.gym_access a where a.user_id=auth.uid()));
drop policy if exists gym_metrics_private on public.gym_metrics;
create policy gym_metrics_private on public.gym_metrics for all to authenticated
 using(user_id=auth.uid() and exists(select 1 from public.gym_access a where a.user_id=auth.uid()))
 with check(user_id=auth.uid() and exists(select 1 from public.gym_access a where a.user_id=auth.uid()));
-- Solo desde SQL Editor (administrador): asignar acceso al correo confirmado.
insert into public.gym_access(user_id)
select id from auth.users where lower(email)=lower('albertolopezmalvaez@gmail.com')
on conflict(user_id) do nothing;
-- Verificar que devuelva 1 fila:
select a.user_id,u.email from public.gym_access a join auth.users u on u.id=a.user_id;
