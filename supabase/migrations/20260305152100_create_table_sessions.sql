create table public.table_sessions (
  id uuid not null default extensions.uuid_generate_v4 (),
  table_id uuid null,
  user_id uuid not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  constraint table_sessions_pkey primary key (id),
  constraint table_sessions_table_id_fkey foreign KEY (table_id) references tables (id) on delete CASCADE
) TABLESPACE pg_default;
