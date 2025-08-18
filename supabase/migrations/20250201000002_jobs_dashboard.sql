-- Create jobs_stats table to store job statistics by sector
create table if not exists jobs_stats (
    id uuid default gen_random_uuid() primary key,
    sector varchar not null,
    total_jobs integer not null default 0,
    percentage decimal(5,2) not null default 0,
    women_jobs integer not null default 0,
    youth_jobs integer not null default 0,
    target_jobs integer not null default 0,
    actual_jobs integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies for jobs_stats
alter table jobs_stats enable row level security;

create policy "Jobs stats are viewable by authenticated users"
    on jobs_stats for select
    to authenticated
    using (true);

create policy "Jobs stats are editable by admins"
    on jobs_stats for insert update delete
    to authenticated
    using (auth.jwt() ->> 'role' = 'super_admin');

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
    returns trigger
    language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create trigger for updating updated_at
create trigger update_jobs_stats_updated_at
    before update
    on jobs_stats
    for each row
    execute function update_updated_at_column();

-- Insert initial sectors
insert into jobs_stats (sector, total_jobs, percentage)
values 
    ('climate_action', 5000, 18),
    ('heritage_tourism', 40000, 40),
    ('digital_economy', 10000, 25),
    ('human_capital', 2000, 5);