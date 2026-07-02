#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const results = []

const REQUIRED_FILES = [
  '.env.production.example',
  'docs/AWS-ROUTE53-DNS-CHECKLIST.md',
  'docs/PRE-LAUNCH-CHECKLIST.md',
  'scripts/delete-demo-accounts.sql',
  'scripts/seed-production.sql',
  'scripts/production-smoke-test.mjs',
  'scripts/smoke-test.ps1',
]

const SCAN_DIRS = ['app', 'components', 'lib', 'public']
const SCAN_FILES = ['next.config.mjs', 'middleware.ts']
const ALLOWED_LOCALHOST_FILES = new Set([
  'lib/site-config.ts',
  'lib/supabase/auth-redirect.ts',
])

const forbiddenPatterns = [
  {
    name: 'old temporary production URL',
    pattern: /webpage-rho-dusky\.vercel\.app/i,
    allow: () => false,
  },
  {
    name: 'raw placeholder phone number',
    pattern: /XXXXXXXXXX/i,
    allow: () => false,
  },
  {
    name: 'localhost fallback in runtime source',
    pattern: /localhost|127\.0\.0\.1/i,
    allow: (relativePath) => ALLOWED_LOCALHOST_FILES.has(relativePath),
  },
]

const requiredHeaderSnippets = [
  'Strict-Transport-Security',
  'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options',
  'SAMEORIGIN',
  'X-Content-Type-Options',
  'nosniff',
  'Referrer-Policy',
  'strict-origin-when-cross-origin',
  'Permissions-Policy',
  'camera=(self), geolocation=(self), microphone=()',
  'X-XSS-Protection',
  '1; mode=block',
  'https://*.supabase.co',
  'wss://*.supabase.co',
]

function pass(name, detail) {
  results.push({ status: 'PASS', name, detail })
}

function warn(name, detail) {
  results.push({ status: 'WARN', name, detail })
}

function fail(name, detail) {
  results.push({ status: 'FAIL', name, detail })
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir)
  if (!existsSync(absoluteDir)) return []

  const entries = []
  for (const name of readdirSync(absoluteDir)) {
    const relativePath = path.join(relativeDir, name).replaceAll('\\', '/')
    const absolutePath = path.join(root, relativePath)
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(name)) continue
      entries.push(...walk(relativePath))
    } else if (/\.(js|jsx|ts|tsx|mjs|css|json|html|xml|txt)$/.test(name)) {
      entries.push(relativePath)
    }
  }
  return entries
}

function checkRequiredFiles() {
  for (const relativePath of REQUIRED_FILES) {
    if (existsSync(path.join(root, relativePath))) pass(`file:${relativePath}`, 'present')
    else fail(`file:${relativePath}`, 'missing')
  }
}

function checkForbiddenRuntimeStrings() {
  const files = [...SCAN_DIRS.flatMap(walk), ...SCAN_FILES.filter((file) => existsSync(path.join(root, file)))]

  for (const relativePath of files) {
    const source = read(relativePath)
    for (const item of forbiddenPatterns) {
      if (item.pattern.test(source) && !item.allow(relativePath)) {
        fail(`runtime string:${item.name}`, `found in ${relativePath}`)
      }
    }
  }

  pass('runtime string scan', `${files.length} runtime/public files scanned`)
}

function checkSecurityHeaderConfig() {
  const configPath = 'next.config.mjs'
  if (!existsSync(path.join(root, configPath))) {
    fail('security headers', 'next.config.mjs missing')
    return
  }

  const source = read(configPath)
  for (const snippet of requiredHeaderSnippets) {
    if (!source.includes(snippet)) fail('security headers', `Missing ${snippet}`)
  }

  pass('security headers', 'required header snippets present in next.config.mjs')
}

function checkEnvExample() {
  const envPath = '.env.production.example'
  if (!existsSync(path.join(root, envPath))) return
  const envExample = read(envPath)
  const requiredNames = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'SUPPORT_EMAIL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'CRON_SECRET',
  ]

  for (const name of requiredNames) {
    if (!envExample.includes(name)) fail('env example', `${name} missing`)
  }

  if (/=sk_|=re_[A-Za-z0-9]{20,}|=eyJ/i.test(envExample)) {
    fail('env example', 'looks like a real secret may be present')
  } else {
    pass('env example', 'required production names documented without obvious secrets')
  }
}

function checkLaunchDocs() {
  const checklistPath = 'docs/PRE-LAUNCH-CHECKLIST.md'
  if (!existsSync(path.join(root, checklistPath))) return
  const checklist = read(checklistPath)
  const requiredText = [
    'pnpm run prelaunch:static',
    'pnpm run smoke:production',
    'full apartment rental module',
    'delete-demo-accounts.sql',
  ]

  for (const text of requiredText) {
    if (!checklist.includes(text)) warn('pre-launch checklist', `Missing helpful reminder: ${text}`)
  }
}

function printResults() {
  console.log('\nPlotKare prelaunch static check\n')
  for (const result of results) {
    console.log(`${result.status.padEnd(4)} ${result.name} - ${result.detail}`)
  }

  const failed = results.filter((result) => result.status === 'FAIL').length
  const warned = results.filter((result) => result.status === 'WARN').length
  console.log(`\nSummary: ${failed} failed, ${warned} warnings, ${results.length} checks total.`)
  return failed
}

checkRequiredFiles()
checkForbiddenRuntimeStrings()
checkSecurityHeaderConfig()
checkEnvExample()
checkLaunchDocs()

process.exit(printResults() > 0 ? 1 : 0)
