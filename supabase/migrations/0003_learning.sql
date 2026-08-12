-- Learning recommendation engine: feedback log + per-user learned model.

create table if not exists outfit_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  item_ids uuid[] not null,
  occasion text not null,
  weather text not null,
  action text not null check (action in ('wear', 'like', 'dislike', 'shuffle')),
  -- Sub-score vector at decision time, so learning replays exactly what was shown:
  -- {"colorHarmony":n,"formalityCoherence":n,"novelty":n,"neglectBonus":n,"taste":n}
  features jsonb not null,
  created_at timestamptz default now()
);

create table if not exists user_model (
  user_id uuid primary key references auth.users(id),
  -- {"version":1,"w":[colorHarmony,formality,novelty,neglect,taste],"b":0}
  weights jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists outfit_feedback_user_created_idx
  on outfit_feedback (user_id, created_at desc);

alter table outfit_feedback enable row level security;
alter table user_model enable row level security;

create policy "Users manage their own feedback" on outfit_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own model" on user_model
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
