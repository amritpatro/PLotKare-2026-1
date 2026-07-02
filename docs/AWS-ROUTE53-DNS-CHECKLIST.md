# AWS Route 53 DNS Checklist
# Complete this after buying plotkare.in in Route 53 tomorrow

## Step 1: Get Vercel DNS targets
Go to Vercel -> Project -> Settings -> Domains -> Add Domain
Type: plotkare.in
Vercel will show you either:
  - An A record IP (76.76.21.21)
  - Or a CNAME target (cname.vercel-dns.com)
Copy whichever one it shows.

## Step 2: Create DNS records in Route 53
In Route 53 -> Hosted Zones -> plotkare.in -> Create Record:

Record 1 (root domain):
  Name: plotkare.in
  Type: A
  Value: 76.76.21.21 (Vercel IP)
  TTL: 300

Record 2 (www subdomain):
  Name: www.plotkare.in
  Type: CNAME
  Value: cname.vercel-dns.com
  TTL: 300

## Step 3: Add domain in Vercel
Vercel -> Project -> Settings -> Domains
Add: plotkare.in
Add: www.plotkare.in
Vercel automatically provisions SSL (takes 2-5 minutes)

## Step 4: Add Resend DNS records (for email)
In Route 53, add these records from your Resend dashboard:

SPF record:
  Name: plotkare.in
  Type: TXT
  Value: v=spf1 include:amazonses.com ~all

DKIM record:
  Name: resend._domainkey.plotkare.in
  Type: TXT
  Value: [copy from Resend dashboard]

DMARC record:
  Name: _dmarc.plotkare.in
  Type: TXT
  Value: v=DMARC1; p=quarantine; rua=mailto:hello@plotkare.in

## Step 5: Update Supabase redirect URLs
Supabase -> Authentication -> URL Configuration -> Redirect URLs
Add these (one per line):
  https://plotkare.in/auth/callback**
  https://www.plotkare.in/auth/callback**
  https://plotkare.in/auth/update-password
  https://www.plotkare.in/auth/update-password

## Step 6: Update Google OAuth
Google Cloud Console -> Credentials -> OAuth Client
Add to Authorized JavaScript Origins:
  https://plotkare.in
  https://www.plotkare.in
Add to Authorized Redirect URIs:
  https://neegwuhzphjmrmgrfycs.supabase.co/auth/v1/callback

## Step 7: Update Vercel environment variable
NEXT_PUBLIC_SITE_URL = https://plotkare.in
Redeploy after updating.

## Step 8: Verify DNS propagation
Run: dig plotkare.in A
Expected: shows 76.76.21.21 or Vercel IP
Or use: https://dnschecker.org

## Verification Checklist
[ ] plotkare.in loads over HTTPS (green padlock)
[ ] www.plotkare.in redirects to plotkare.in
[ ] Vercel shows SSL certificate as active
[ ] Password reset email arrives from hello@plotkare.in
[ ] Google login works
[ ] /api/health returns 200
