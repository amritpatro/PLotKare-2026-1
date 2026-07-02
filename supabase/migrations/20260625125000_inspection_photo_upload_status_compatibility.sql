-- Align inspection photo upload status constraints with the field-agent API.
-- The current API writes `pending` while requesting an upload URL and `complete`
-- after direct/finalized uploads. Some live databases still have an older
-- restrictive check, so replace it idempotently with the launch contract.

alter table public.inspection_photos
  drop constraint if exists inspection_photos_upload_status_check;

alter table public.inspection_photos
  add constraint inspection_photos_upload_status_check
  check (upload_status in ('prepared', 'pending', 'uploading', 'finalized', 'complete', 'failed')) not valid;

alter table public.inspection_photos
  validate constraint inspection_photos_upload_status_check;
