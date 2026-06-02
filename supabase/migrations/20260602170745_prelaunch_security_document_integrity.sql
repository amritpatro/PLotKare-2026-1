alter table public.documents
  add column if not exists upload_status text not null default 'available'
  check (upload_status in ('available', 'missing'));

alter table public.property_documents
  add column if not exists upload_status text not null default 'available'
  check (upload_status in ('available', 'missing'));

update public.documents d
set upload_status = 'missing'
where not exists (
  select 1 from storage.objects o
  where o.bucket_id = d.bucket and o.name = d.object_path
);

update public.property_documents d
set upload_status = 'missing'
where not exists (
  select 1 from storage.objects o
  where o.bucket_id = d.bucket and o.name = d.object_path
);
