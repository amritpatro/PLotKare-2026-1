-- WARNING: THIS SCRIPT PERMANENTLY DELETES DATA.
-- ONLY RUN ON PRODUCTION IMMEDIATELY BEFORE PUBLIC LAUNCH.
-- VERIFY EACH EMAIL ADDRESS BEFORE RUNNING.
-- THIS CANNOT BE UNDONE.

-- Run this SELECT first to see what will be deleted:
-- SELECT id, email, created_at FROM auth.users
-- WHERE email LIKE '%test%' OR email LIKE '%demo%'
-- OR email IN ('test.owner.a@plotkare.in', 'test.owner.b@plotkare.in',
--              'test.seller@plotkare.in', 'agent@plotkare.in')
-- ORDER BY created_at;

-- Review the output above. If it looks correct, then run below:

-- Step 1: Delete all related data for demo users first
-- (Cascading deletes will handle child records if FK CASCADE is set)

DELETE FROM public.profiles
WHERE email LIKE '%test.owner%'
OR email LIKE '%test.seller%'
OR email LIKE '%test.buyer%'
OR email LIKE '%@test.%'
OR email LIKE 'demo%';

-- Step 2: Delete the auth users
-- (Must be done from Supabase Dashboard -> Authentication -> Users
--  because auth.users requires admin API access, not SQL delete)
-- List of emails to delete from Supabase Auth dashboard:
-- test.owner.a@plotkare.in
-- test.owner.b@plotkare.in
-- test.seller@plotkare.in
-- Any email containing 'test', 'demo', or 'fake'

-- Step 3: Delete test listings
DELETE FROM public.listings
WHERE plot_number ILIKE '%test%'
OR location ILIKE '%test%'
OR status::text = 'draft';

-- Step 4: Delete test support tickets
DELETE FROM public.support_tickets
WHERE subject ILIKE '%test%'
OR subject ILIKE '%idor%'
OR subject ILIKE '%security%';

-- Step 5: Verify cleanup
SELECT 'profiles' as table_name, COUNT(*) as remaining
FROM public.profiles
WHERE email NOT IN ('admin@plotkare.in')
UNION ALL
SELECT 'listings', COUNT(*)
FROM public.listings
WHERE archived_at IS NULL;

-- After running: all remaining users should be zero or real customers.
-- Keep admin@plotkare.in and any real paying customers.
