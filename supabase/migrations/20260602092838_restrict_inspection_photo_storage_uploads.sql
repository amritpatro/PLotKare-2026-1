-- Inspection photo uploads are issued by authenticated server routes as signed URLs.
-- Remove the broad direct client INSERT grant so storage cannot be bypassed.

drop policy if exists "agent_own_storage_upload" on storage.objects;
