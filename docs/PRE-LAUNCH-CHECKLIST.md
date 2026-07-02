# PlotKare Pre-Launch Checklist
# Complete every item before accepting real customers

## Environment (Vercel)
[ ] NEXT_PUBLIC_SITE_URL = https://plotkare.in
[ ] NEXT_PUBLIC_SUPABASE_URL set
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
[ ] SUPABASE_SERVICE_ROLE_KEY set (server only, no NEXT_PUBLIC_)
[ ] RESEND_API_KEY set and valid
[ ] RESEND_FROM_EMAIL = hello@plotkare.in
[ ] UPSTASH_REDIS_REST_URL set
[ ] UPSTASH_REDIS_REST_TOKEN set
[ ] NEXT_PUBLIC_SENTRY_DSN set
[ ] CRON_SECRET set

## Supabase
[ ] Leaked password protection: ENABLED
[ ] Minimum password: 12 characters with complexity
[ ] Google provider: ENABLED with Client ID and Secret
[ ] SMTP: smtp.resend.com:465 with Resend API key
[ ] Redirect URLs: plotkare.in/auth/callback** added
[ ] RLS enabled on ALL tables in public schema
[ ] Supabase Security Advisor: no Critical items

## DNS (Route 53 -> Vercel)
[ ] A record: plotkare.in -> Vercel IP
[ ] CNAME: www.plotkare.in -> cname.vercel-dns.com
[ ] TXT: SPF record for Resend
[ ] TXT: DKIM record from Resend
[ ] TXT: DMARC record
[ ] SSL active on plotkare.in in Vercel

## Google OAuth
[ ] Client ID and Secret in Supabase
[ ] plotkare.in in authorized JavaScript origins
[ ] Supabase callback in authorized redirect URIs

## Functionality Tests
[ ] Homepage loads at https://plotkare.in
[ ] /api/health returns { "status": "ok" }
[ ] New user can sign up and receive confirmation email
[ ] Password reset email arrives and link works
[ ] Google login works on signup page
[ ] Admin can login and reach /admin
[ ] Agent can login and reach /agent
[ ] Archive listing -> disappears from public pages
[ ] Contact form submits and sends notification to SUPPORT_EMAIL
[ ] Sentry receives a test error

## Data
[ ] All demo/test accounts deleted from Supabase Auth
[ ] All test listings removed or in draft
[ ] At least one real or seeded listing visible on homepage
[ ] No placeholder text visible on any public page
[ ] No XXXXXXXXXX phone numbers on any page
[ ] Canonical URLs show https://plotkare.in (not localhost)

## Security
[ ] Rate limit test: 6 rapid logins -> 429 on 6th
[ ] IDOR test: Owner B cannot read Owner A's data
[ ] Admin route: unauthenticated -> redirects to login
[ ] Dashboard route: unauthenticated -> redirects to login
[ ] Security headers present on production pages

## Monitoring
[ ] Sentry initialized and receiving errors
[ ] UptimeRobot or similar pinging /api/health every 5 minutes
[ ] Vercel logs not exposing secrets or signed URLs
[ ] Vercel Speed Insights enabled
