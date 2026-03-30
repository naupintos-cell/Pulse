-- ============================================================
-- CARITOFIT PRO — Esquema SQL para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PERFILES (profesora y alumnos)
-- Se crea automáticamente cuando el usuario se registra en Auth
-- ─────────────────────────────────────────
create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  rol         text not null check (rol in ('admin', 'alumno')) default 'alumno',
  nombre      text not null,
  apellido    text not null,
  dni         text unique not null,
  email       text,
  telefono    text,
  edad        int,
  sexo        text,
  objetivo    text,         -- campo libre, el alumno escribe lo que quiere
  nivel       text check (nivel in ('Principiante', 'Intermedio', 'Avanzado')),
  restricciones text,
  aprobado    boolean default false, -- la profe aprueba el alumno nuevo
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- PLANES DE ENTRENAMIENTO
-- ─────────────────────────────────────────
create table public.planes (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  objetivo    text not null,
  admin_id    uuid references public.perfiles(id),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- ASIGNACIONES (plan → alumno)
-- Un alumno puede tener un solo plan activo
-- ─────────────────────────────────────────
create table public.asignaciones (
  id          uuid primary key default uuid_generate_v4(),
  alumno_id   uuid references public.perfiles(id) on delete cascade,
  plan_id     uuid references public.planes(id) on delete cascade,
  activo      boolean default true,
  created_at  timestamptz default now(),
  unique (alumno_id)  -- un alumno, un plan activo
);

-- ─────────────────────────────────────────
-- SEMANAS
-- ─────────────────────────────────────────
create table public.semanas (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid references public.planes(id) on delete cascade,
  numero      int not null,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- DÍAS DE ENTRENAMIENTO
-- ─────────────────────────────────────────
create table public.dias (
  id          uuid primary key default uuid_generate_v4(),
  semana_id   uuid references public.semanas(id) on delete cascade,
  dia         text not null,   -- Lunes, Martes...
  tipo        text,            -- "Pecho + Tríceps", "Cardio + Core"...
  orden       int default 0,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- EJERCICIOS
-- ─────────────────────────────────────────
create table public.ejercicios (
  id            uuid primary key default uuid_generate_v4(),
  dia_id        uuid references public.dias(id) on delete cascade,
  nombre        text not null,
  series        int default 3,
  repeticiones  text default '12',
  carga         text,          -- "20 kg", "PC", libre
  descanso      text,          -- "60 seg"
  observaciones text,
  orden         int default 0,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- CHECKINS (alumno marca ejercicio como hecho)
-- ─────────────────────────────────────────
create table public.checkins (
  id            uuid primary key default uuid_generate_v4(),
  alumno_id     uuid references public.perfiles(id) on delete cascade,
  ejercicio_id  uuid references public.ejercicios(id) on delete cascade,
  fecha         date default current_date,
  created_at    timestamptz default now(),
  unique (alumno_id, ejercicio_id, fecha)
);

-- ─────────────────────────────────────────
-- REGISTROS DE PESO
-- ─────────────────────────────────────────
create table public.pesos (
  id          uuid primary key default uuid_generate_v4(),
  alumno_id   uuid references public.perfiles(id) on delete cascade,
  valor       numeric(5,1) not null,
  fecha       date default current_date,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — seguridad de datos
-- Cada usuario solo ve sus propios datos
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table public.perfiles      enable row level security;
alter table public.planes        enable row level security;
alter table public.asignaciones  enable row level security;
alter table public.semanas       enable row level security;
alter table public.dias          enable row level security;
alter table public.ejercicios    enable row level security;
alter table public.checkins      enable row level security;
alter table public.pesos         enable row level security;

-- ── PERFILES ──
-- El admin ve todos los perfiles
create policy "admin_ve_todo" on public.perfiles
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
-- El alumno ve solo su perfil
create policy "alumno_ve_su_perfil" on public.perfiles
  for select using (id = auth.uid());
-- El alumno puede editar su propio perfil
create policy "alumno_edita_su_perfil" on public.perfiles
  for update using (id = auth.uid());

-- ── PLANES ──
-- Admin hace todo
create policy "admin_planes" on public.planes
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
-- Alumnos ven planes que tienen asignados
create policy "alumno_ve_su_plan" on public.planes
  for select using (
    exists (select 1 from public.asignaciones a where a.alumno_id = auth.uid() and a.plan_id = planes.id)
  );

-- ── ASIGNACIONES ──
create policy "admin_asignaciones" on public.asignaciones
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_ve_su_asignacion" on public.asignaciones
  for select using (alumno_id = auth.uid());

-- ── SEMANAS / DIAS / EJERCICIOS ──
create policy "admin_semanas" on public.semanas
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_ve_semanas" on public.semanas
  for select using (
    exists (
      select 1 from public.asignaciones a
      where a.alumno_id = auth.uid() and a.plan_id = semanas.plan_id
    )
  );

create policy "admin_dias" on public.dias
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_ve_dias" on public.dias
  for select using (
    exists (
      select 1 from public.semanas s
      join public.asignaciones a on a.plan_id = s.plan_id
      where s.id = dias.semana_id and a.alumno_id = auth.uid()
    )
  );

create policy "admin_ejercicios" on public.ejercicios
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_ve_ejercicios" on public.ejercicios
  for select using (
    exists (
      select 1 from public.dias d
      join public.semanas s on s.id = d.semana_id
      join public.asignaciones a on a.plan_id = s.plan_id
      where d.id = ejercicios.dia_id and a.alumno_id = auth.uid()
    )
  );

-- ── CHECKINS ──
create policy "admin_ve_checkins" on public.checkins
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_gestiona_checkins" on public.checkins
  for all using (alumno_id = auth.uid());

-- ── PESOS ──
create policy "admin_ve_pesos" on public.pesos
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );
create policy "alumno_gestiona_pesos" on public.pesos
  for all using (alumno_id = auth.uid());

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- Se ejecuta sola cuando alguien crea una cuenta en Auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, apellido, dni, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', new.id::text),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'alumno')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que llama a la función
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ADMIN INICIAL (correr DESPUÉS de crear la cuenta de la profe)
-- Reemplazá 'TU_EMAIL_ACÁ' por el email con el que se registró Carla
-- ============================================================
-- update public.perfiles set rol = 'admin', aprobado = true
-- where email = 'TU_EMAIL_ACÁ';
