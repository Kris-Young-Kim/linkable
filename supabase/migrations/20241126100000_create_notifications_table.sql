-- Create notifications table to support in-app alerts and reminders
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar(50) not null,
  title varchar(200) not null,
  message text,
  link_url text,
  is_read boolean default false,
  created_at timestamptz default now(),
  read_at timestamptz,
  metadata jsonb
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read);

