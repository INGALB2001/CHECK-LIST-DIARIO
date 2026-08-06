-- MAF HUB · Base inicial del módulo de fabricación
-- Ejecutar en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','supervisor','designer','operator');
create type public.project_status as enum ('planning','active','paused','completed','cancelled');
create type public.part_status as enum ('pending','ready','in_progress','review','completed','blocked');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'operator',
  employee_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null unique,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  client text,
  description text,
  status public.project_status not null default 'planning',
  due_date date,
  drive_folder_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assemblies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.assemblies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assembly_id uuid references public.assemblies(id) on delete set null,
  part_number text not null,
  name text not null,
  description text,
  material text,
  raw_material text,
  quantity_required integer not null default 1 check(quantity_required > 0),
  quantity_completed integer not null default 0 check(quantity_completed >= 0),
  status public.part_status not null default 'pending',
  priority integer not null default 3 check(priority between 1 and 5),
  due_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, part_number)
);

create table if not exists public.manufacturing_operations (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  sequence integer not null default 1,
  process text not null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status public.part_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  estimated_minutes integer,
  actual_minutes integer,
  notes text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(part_id, sequence)
);

create table if not exists public.part_drawings (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  drive_file_id text,
  file_name text not null,
  revision text not null default 'R00',
  web_view_link text,
  modified_time timestamptz,
  is_current boolean not null default true,
  release_status text not null default 'draft' check(release_status in ('draft','released','obsolete')),
  released_by uuid references public.profiles(id),
  released_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(part_id, revision)
);

create unique index if not exists one_current_drawing_per_part
on public.part_drawings(part_id) where is_current = true;

create table if not exists public.part_notes (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  operation_id uuid references public.manufacturing_operations(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text,
  body text not null,
  note_type text not null default 'comment' check(note_type in ('comment','problem','change','approval')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete cascade,
  part_id uuid references public.parts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Personal inicial
insert into public.employees(name,specialties) values
('Jaime',array['Soldadura','Armado']),
('Xavier',array['Soldadura','Armado']),
('Omar',array['Torno CNC','Centro de maquinados']),
('David',array['Fresadora convencional','Torno convencional']),
('Marcos',array['Fresadora convencional','Torno convencional']),
('Mario',array['Diseño','Corte láser','Impresión 3D']),
('Jesús',array['Eléctrico','Detallado','Pintura','Piezas especiales','Neumática']),
('Gabriel',array['Eléctrico','Detallado','Pintura','Piezas especiales','Neumática'])
on conflict(name) do update set specialties=excluded.specialties,active=true;

-- Activar RLS
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.assemblies enable row level security;
alter table public.parts enable row level security;
alter table public.manufacturing_operations enable row level security;
alter table public.part_drawings enable row level security;
alter table public.part_notes enable row level security;
alter table public.activity_log enable row level security;

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid();
$$;

-- Lectura para usuarios autenticados
create policy "authenticated read employees" on public.employees for select to authenticated using (true);
create policy "authenticated read projects" on public.projects for select to authenticated using (true);
create policy "authenticated read assemblies" on public.assemblies for select to authenticated using (true);
create policy "authenticated read parts" on public.parts for select to authenticated using (true);
create policy "authenticated read operations" on public.manufacturing_operations for select to authenticated using (true);
create policy "authenticated read drawings" on public.part_drawings for select to authenticated using (true);
create policy "authenticated read notes" on public.part_notes for select to authenticated using (true);

-- Administradores/supervisores gestionan estructura
create policy "management projects" on public.projects for all to authenticated using (public.current_role() in ('admin','supervisor')) with check (public.current_role() in ('admin','supervisor'));
create policy "management assemblies" on public.assemblies for all to authenticated using (public.current_role() in ('admin','supervisor','designer')) with check (public.current_role() in ('admin','supervisor','designer'));
create policy "management parts" on public.parts for all to authenticated using (public.current_role() in ('admin','supervisor','designer')) with check (public.current_role() in ('admin','supervisor','designer'));
create policy "management drawings" on public.part_drawings for all to authenticated using (public.current_role() in ('admin','supervisor','designer')) with check (public.current_role() in ('admin','supervisor','designer'));

-- Operadores actualizan operaciones asignadas; supervisores actualizan cualquiera
create policy "update assigned operations" on public.manufacturing_operations for update to authenticated
using (
  public.current_role() in ('admin','supervisor') or
  assigned_employee_id=(select id from public.employees where profile_id=auth.uid())
)
with check (
  public.current_role() in ('admin','supervisor') or
  assigned_employee_id=(select id from public.employees where profile_id=auth.uid())
);
create policy "management operations" on public.manufacturing_operations for insert to authenticated with check (public.current_role() in ('admin','supervisor','designer'));
create policy "delete operations" on public.manufacturing_operations for delete to authenticated using (public.current_role() in ('admin','supervisor'));

-- Todos pueden agregar notas identificadas con su usuario
create policy "insert own notes" on public.part_notes for insert to authenticated with check (author_id=auth.uid());

-- El perfil propio es visible; administración ve todos
create policy "read profiles" on public.profiles for select to authenticated using (id=auth.uid() or public.current_role() in ('admin','supervisor'));
create policy "update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
