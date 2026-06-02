'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateCommonSettings, updateNotificationSettings, updateRoleSettings } from '@/app/settings/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signOutToLanding } from '@/lib/auth/client-logout'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { EmployeeRole, UserRole } from '@/lib/supabase/types'

type SettingsData = {
  profile: Record<string, unknown> & {
    id: string
    email: string
    full_name: string
    phone?: string | null
    city?: string | null
    role: UserRole
    employee_role?: EmployeeRole | null
    avatar_path?: string | null
    notification_preferences?: Record<string, boolean>
  }
  roleDetails: Record<string, unknown> | null
  operationalRecord: Record<string, unknown> | null
  completion: {
    score: number
    completed: number
    total: number
    missing: { key: string; label: string; section: string; complete: boolean }[]
  }
  dashboardPath: string
  storageBucket: string
  subscription: Record<string, unknown> | null
  consultation: Record<string, unknown> | null
}

type SettingsWorkspaceProps = {
  initialData: SettingsData
  mode: 'standalone' | 'dashboard' | 'admin'
}

const fieldClass =
  'mt-2 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-sans text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]'
const labelClass = 'block font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]'
const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'

const roleLabels: Record<UserRole, string> = {
  user: 'Account',
  plot_seller: 'Plot seller',
  land_owner: 'Land owner',
  customer: 'Customer',
  employee: 'Employee',
  admin: 'Admin',
}

function resolveAvatarUrl(avatarPath: string | null | undefined, bucket: string, supabaseClient: ReturnType<typeof createSupabaseBrowserClient>) {
  if (!avatarPath) return null
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath
  return supabaseClient.storage.from(bucket).getPublicUrl(avatarPath).data.publicUrl
}

const commonNotifications = [
  ['monthlyReports', 'Monthly inspection reports'],
  ['encroachmentAlerts', 'Encroachment alerts'],
  ['valueUpdates', 'Property value updates'],
  ['paymentReminders', 'Payment reminders'],
  ['marketing', 'Product and marketing emails'],
] as const

const roleNotifications: Record<UserRole, readonly (readonly [string, string])[]> = {
  user: [],
  plot_seller: [
    ['sellerLeadAlerts', 'Buyer and lead alerts'],
    ['listingReviewUpdates', 'Listing review updates'],
  ],
  land_owner: [
    ['inspectionAlerts', 'Inspection status updates'],
    ['documentReviewUpdates', 'Document review updates'],
  ],
  customer: [
    ['propertyLinkUpdates', 'Property link updates'],
    ['supportTicketUpdates', 'Support ticket updates'],
  ],
  employee: [
    ['assignmentAlerts', 'New assignment alerts'],
    ['verificationQueueAlerts', 'Verification queue changes'],
  ],
  admin: [
    ['adminEscalations', 'Admin escalations'],
    ['paymentOpsAlerts', 'Payment operations alerts'],
  ],
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberText(value: unknown) {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : ''
}

function bool(value: unknown) {
  return Boolean(value)
}

function csv(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function csvToArray(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function initials(label: string) {
  const parts = label.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PK'
}

function roleSummary(data: SettingsData) {
  const role = data.profile.role
  const details = data.roleDetails ?? {}
  const operational = data.operationalRecord ?? {}

  if (role === 'plot_seller') {
    return {
      title: text(details.company_name) || text(operational.company_name) || 'Seller business profile',
      status: text(operational.verification_status) || text(details.verification_status) || 'Pending',
      body: text(details.address) || 'Business address pending.',
    }
  }

  if (role === 'land_owner') {
    return {
      title: text(details.property_location) || 'Primary property profile',
      status: text(operational.verification_status) || text(details.verification_status) || 'Pending',
      body: details.property_size_sqyards ? `${details.property_size_sqyards} sq. yards recorded` : 'Property size pending.',
    }
  }

  if (role === 'customer') {
    return {
      title: text(operational.full_name) || data.profile.full_name || 'Customer profile',
      status: text(operational.kyc_status) || text(details.kyc_status) || 'Pending',
      body: Array.isArray(details.preferred_locations) && details.preferred_locations.length
        ? `Preferred locations: ${details.preferred_locations.join(', ')}`
        : 'Buying preferences pending.',
    }
  }

  if (role === 'employee') {
    return {
      title: text(operational.employee_role) || text(data.profile.employee_role) || 'Employee workspace',
      status: operational.active === false ? 'Inactive' : 'Active',
      body: 'Operational employee role is controlled by admin assignment.',
    }
  }

  if (role === 'admin') {
    return {
      title: 'Platform administration',
      status: data.profile.verified ? 'Verified' : 'Verification pending',
      body: 'Admin identity and permissions are loaded from the signed-in profile.',
    }
  }

  return {
    title: 'Account settings',
    status: 'Active',
    body: 'Complete your contact profile to unlock the right workspace.',
  }
}

export function SettingsWorkspace({ initialData, mode }: SettingsWorkspaceProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [isPending, startTransition] = useTransition()
  const [profile, setProfile] = useState(initialData.profile)
  const [roleDetails, setRoleDetails] = useState(initialData.roleDetails ?? {})
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    initialData.profile.notification_preferences ?? {},
  )
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [securityEmail, setSecurityEmail] = useState(initialData.profile.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securitySaving, setSecuritySaving] = useState(false)

  const avatarUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview
    return resolveAvatarUrl(profile.avatar_path, initialData.storageBucket, supabase)
  }, [avatarPreview, initialData.storageBucket, profile.avatar_path, supabase])

  const summary = roleSummary({ ...initialData, profile, roleDetails })
  const notificationItems = [...commonNotifications, ...roleNotifications[profile.role]]
  const plan = text(initialData.subscription?.plan) || text(profile.plan) || 'standard'
  const planStatus = text(initialData.subscription?.status) || 'Consultation required'
  const pendingConsultation = initialData.consultation?.status === 'pending'

  const handleLogout = async () => {
    await signOutToLanding(router)
  }

  const saveCommon = () => {
    startTransition(async () => {
      const result = await updateCommonSettings({
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        addressLine: text(profile.address_line),
        postalCode: text(profile.postal_code),
        avatarPath: profile.avatar_path ?? null,
      })
      toast[result.ok ? 'success' : 'error'](result.message)
    })
  }

  const saveNotifications = (next: Record<string, boolean>) => {
    setNotifications(next)
    startTransition(async () => {
      const result = await updateNotificationSettings(next)
      toast[result.ok ? 'success' : 'error'](result.message)
    })
  }

  const saveRole = () => {
    const role = profile.role
    let payload: Record<string, unknown> = {}

    if (role === 'plot_seller') {
      payload = {
        companyName: roleDetails.company_name,
        gstNumber: roleDetails.gst_number,
        panNumber: roleDetails.pan_number,
        address: roleDetails.address,
        commissionModel: roleDetails.commission_model || null,
        commissionRate: roleDetails.commission_rate || null,
        listingFeeAmount: roleDetails.listing_fee_amount || null,
      }
    } else if (role === 'land_owner') {
      payload = {
        propertyLocation: roleDetails.property_location,
        propertySizeSqyards: roleDetails.property_size_sqyards || null,
        propertyFacing: roleDetails.property_facing || null,
        isCornerPlot: Boolean(roleDetails.is_corner_plot),
        propertyType: roleDetails.property_type || null,
        interestedIn: csvToArray(text(roleDetails.interested_in_csv ?? csv(roleDetails.interested_in))),
      }
    } else if (role === 'customer') {
      payload = {
        investmentBudgetLakhs: roleDetails.investment_budget_lakhs || null,
        investmentBudgetMaxLakhs: roleDetails.investment_budget_max_lakhs || null,
        preferredLocations: csvToArray(text(roleDetails.preferred_locations_csv ?? csv(roleDetails.preferred_locations))),
        preferredPropertyTypes: csvToArray(text(roleDetails.preferred_property_types_csv ?? csv(roleDetails.preferred_property_types))),
        preferredPlotSizeMin: roleDetails.preferred_plot_size_min || null,
        preferredPlotSizeMax: roleDetails.preferred_plot_size_max || null,
        panNumber: roleDetails.kyc_pan_number || initialData.operationalRecord?.pan_number || '',
        aadhaarLast4: roleDetails.kyc_aadhaar_last4 || initialData.operationalRecord?.aadhaar_last4 || '',
        loanInterested: Boolean(roleDetails.loan_interested),
      }
    }

    startTransition(async () => {
      const result = await updateRoleSettings(payload)
      toast[result.ok ? 'success' : 'error'](result.message)
    })
  }

  const handleAvatarUpload = async (file: File) => {
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarUploading(true)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
    const objectPath = `${profile.id}/avatar/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(initialData.storageBucket).upload(objectPath, file, { upsert: true })
    const publicUrl = resolveAvatarUrl(objectPath, initialData.storageBucket, supabase)

    if (error) {
      toast.error(error.message)
      setAvatarUploading(false)
      return
    }

    setProfile((current) => ({ ...current, avatar_path: publicUrl ?? objectPath }))
    setAvatarUploading(false)
    startTransition(async () => {
      const result = await updateCommonSettings({
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        addressLine: text(profile.address_line),
        postalCode: text(profile.postal_code),
        avatarPath: publicUrl ?? objectPath,
      })
      toast[result.ok ? 'success' : 'error'](result.message)
      if (result.ok) {
        setAvatarPreview(null)
        router.refresh()
      }
    })
  }

  const handleSecuritySave = async () => {
    if (!currentPassword) {
      toast.error('Enter your current password first.')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }

    setSecuritySaving(true)
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      })
      if (verifyError) throw new Error(verifyError.message)

      const updates: { email?: string; password?: string } = {}
      if (securityEmail && securityEmail !== profile.email) updates.email = securityEmail
      if (newPassword) updates.password = newPassword
      if (Object.keys(updates).length > 0) {
        const { error: updateError, data } = await supabase.auth.updateUser(updates)
        if (updateError) throw new Error(updateError.message)
        if (data.user?.email) setProfile((current) => ({ ...current, email: data.user?.email ?? current.email }))
      }

      toast.success('Security settings updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update security settings.')
    } finally {
      setSecuritySaving(false)
    }
  }

  return (
    <section className={mode === 'standalone' ? 'min-h-screen bg-[#F9FAFB] px-4 py-8 md:px-8' : 'px-0 pb-12'}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:flex-row md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#C9A962]">
              {roleLabels[profile.role]} settings
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-[#1F2937]">Profile and preferences</h1>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-[#6B7280]">
              Manage account, contact, security, notifications, and role details stored on your PlotKare profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={initialData.dashboardPath}
              className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB]"
            >
              Back to dashboard
            </a>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#F3D4D0] bg-[#FFF1F2] px-4 py-2.5 text-sm font-semibold text-[#C0392B] transition hover:bg-[#FCE7E5]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-6">
            <div className={cardClass}>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 bg-[#C0392B]">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile photo" /> : null}
                  <AvatarFallback className="font-mono text-lg font-semibold text-white">
                    {initials(profile.full_name || profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-sans text-base font-semibold text-[#1F2937]">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs uppercase tracking-[0.14em] text-[#9CA3AF]">
                    {roleLabels[profile.role]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading || isPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {avatarUploading ? 'Uploading...' : 'Change photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleAvatarUpload(file)
                }}
              />
            </div>

            <div className={cardClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">Profile completion</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-[#1F2937]">{initialData.completion.score}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[#16A34A]" />
              </div>
              <Progress value={initialData.completion.score} className="mt-4 h-2 bg-[#F3F4F6]" />
              <p className="mt-3 text-sm text-[#6B7280]">
                {initialData.completion.completed} of {initialData.completion.total} profile items complete.
              </p>
              {initialData.completion.missing.length ? (
                <div className="mt-4 space-y-2">
                  {initialData.completion.missing.slice(0, 5).map((item) => (
                    <p key={item.key} className="rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
                      {item.label}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={cardClass}>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">Role summary</p>
              <h2 className="mt-2 font-serif text-xl font-semibold text-[#1F2937]">{summary.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{summary.body}</p>
              <p className="mt-4 inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#C0392B]">
                {summary.status}
              </p>
            </div>
          </aside>

          <Tabs defaultValue="profile" className="min-w-0">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {[
                ['profile', UserRound, 'Profile'],
                ['role', BriefcaseBusiness, 'Role'],
                ['security', LockKeyhole, 'Security'],
                ['notifications', Bell, 'Notifications'],
                ['billing', ShieldCheck, 'Plan'],
              ].map(([value, Icon, label]) => {
                const TabIcon = Icon as typeof UserRound
                return (
                  <TabsTrigger
                    key={value as string}
                    value={value as string}
                    className="min-h-10 flex-none rounded-lg px-3 py-2 text-sm text-[#6B7280] data-[state=active]:bg-[#FFF1F2] data-[state=active]:text-[#C0392B]"
                  >
                    <TabIcon className="h-4 w-4" />
                    {label as string}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="profile" className={`${cardClass} mt-6`}>
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[#C0392B]" />
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Profile and contact</h2>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Full name</span>
                  <input
                    value={profile.full_name ?? ''}
                    onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Email</span>
                  <input value={profile.email} disabled className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Phone</span>
                  <input
                    value={profile.phone ?? ''}
                    onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>City</span>
                  <input
                    value={profile.city ?? ''}
                    onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Address line</span>
                  <input
                    value={text(profile.address_line)}
                    onChange={(event) => setProfile((current) => ({ ...current, address_line: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Postal code</span>
                  <input
                    value={text(profile.postal_code)}
                    onChange={(event) => setProfile((current) => ({ ...current, postal_code: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={saveCommon}
                disabled={isPending}
                className="mt-6 rounded-lg bg-[#C0392B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:opacity-60"
              >
                Save profile
              </button>
            </TabsContent>

            <TabsContent value="role" className={`${cardClass} mt-6`}>
              <div className="flex items-center gap-3">
                <BriefcaseBusiness className="h-5 w-5 text-[#C0392B]" />
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">{roleLabels[profile.role]} details</h2>
              </div>
              <RoleFields
                role={profile.role}
                details={roleDetails}
                operational={initialData.operationalRecord ?? {}}
                setDetails={setRoleDetails}
              />
              <button
                type="button"
                onClick={saveRole}
                disabled={isPending || profile.role === 'employee' || profile.role === 'admin'}
                className="mt-6 rounded-lg bg-[#C0392B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profile.role === 'employee' || profile.role === 'admin' ? 'Managed by role assignment' : 'Save role details'}
              </button>
            </TabsContent>

            <TabsContent value="security" className={`${cardClass} mt-6`}>
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-[#C0392B]" />
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Security</h2>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Account email</span>
                  <input value={securityEmail} onChange={(event) => setSecurityEmail(event.target.value)} className={fieldClass} />
                </label>
                <label>
                  <span className={labelClass}>Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Confirm new password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void handleSecuritySave()}
                disabled={securitySaving}
                className="mt-6 rounded-lg bg-[#C0392B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:opacity-60"
              >
                {securitySaving ? 'Updating...' : 'Update security'}
              </button>
            </TabsContent>

            <TabsContent value="notifications" className={`${cardClass} mt-6`}>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#C0392B]" />
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Notifications</h2>
              </div>
              <div className="mt-6 space-y-3">
                {notificationItems.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{label}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">Send this update to your account email.</p>
                    </div>
                    <Switch
                      checked={Boolean(notifications[key])}
                      onCheckedChange={(checked) => saveNotifications({ ...notifications, [key]: checked })}
                      className="data-[state=checked]:bg-[#16A34A] data-[state=unchecked]:bg-[#E5E7EB]"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="billing" className={`${cardClass} mt-6`}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#C0392B]" />
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Plan and approvals</h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric label="Current plan" value={plan} />
                <Metric label="Plan status" value={planStatus} />
                <Metric label="Consultation" value={pendingConsultation ? 'Pending' : 'Not pending'} />
              </div>
              <p className="mt-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                PlotKare is still consultation-led in this pilot. Plan status is shown here from Supabase, and live checkout will be enabled in a later billing release.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-[#1F2937]">{value.replace(/_/g, ' ')}</p>
    </div>
  )
}

function RoleFields({
  role,
  details,
  operational,
  setDetails,
}: {
  role: UserRole
  details: Record<string, unknown>
  operational: Record<string, unknown>
  setDetails: Dispatch<SetStateAction<Record<string, unknown>>>
}) {
  const set = (key: string, value: unknown) => setDetails((current) => ({ ...current, [key]: value }))

  if (role === 'plot_seller') {
    return (
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Input label="Business / company name" value={text(details.company_name)} onChange={(value) => set('company_name', value)} />
        <Input label="GST number" value={text(details.gst_number)} onChange={(value) => set('gst_number', value.toUpperCase())} />
        <Input label="PAN number" value={text(details.pan_number)} onChange={(value) => set('pan_number', value.toUpperCase())} />
        <Select
          label="Commercial model"
          value={text(details.commission_model)}
          onChange={(value) => set('commission_model', value)}
          options={[
            ['', 'Select model'],
            ['commission_percent', 'Commission percent'],
            ['listing_fee', 'Listing fee'],
          ]}
        />
        <Input label="Commission rate" value={numberText(details.commission_rate)} onChange={(value) => set('commission_rate', value)} />
        <Input label="Listing fee amount" value={numberText(details.listing_fee_amount)} onChange={(value) => set('listing_fee_amount', value)} />
        <label className="md:col-span-2">
          <span className={labelClass}>Business address</span>
          <textarea value={text(details.address)} onChange={(event) => set('address', event.target.value)} className={`${fieldClass} min-h-24`} />
        </label>
      </div>
    )
  }

  if (role === 'land_owner') {
    return (
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Input label="Primary property location" value={text(details.property_location)} onChange={(value) => set('property_location', value)} />
        <Input label="Plot size in sq. yards" value={numberText(details.property_size_sqyards)} onChange={(value) => set('property_size_sqyards', value)} />
        <Select
          label="Facing"
          value={text(details.property_facing)}
          onChange={(value) => set('property_facing', value)}
          options={[
            ['', 'Select facing'],
            ['N', 'North'],
            ['S', 'South'],
            ['E', 'East'],
            ['W', 'West'],
          ]}
        />
        <Select
          label="Land use preference"
          value={text(details.property_type)}
          onChange={(value) => set('property_type', value)}
          options={[
            ['', 'Select preference'],
            ['agriculture', 'Agriculture'],
            ['food_crops', 'Food crops'],
            ['cash_crops', 'Cash crops'],
            ['maintenance', 'Maintenance'],
            ['other', 'Other'],
          ]}
        />
        <Input
          label="Interested services"
          value={text(details.interested_in_csv ?? csv(details.interested_in))}
          onChange={(value) => set('interested_in_csv', value)}
        />
        <label className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <span className="text-sm font-semibold text-[#1F2937]">Corner plot</span>
          <Switch checked={bool(details.is_corner_plot)} onCheckedChange={(checked) => set('is_corner_plot', checked)} />
        </label>
      </div>
    )
  }

  if (role === 'customer') {
    return (
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Input label="Minimum budget in lakhs" value={numberText(details.investment_budget_lakhs)} onChange={(value) => set('investment_budget_lakhs', value)} />
        <Input label="Maximum budget in lakhs" value={numberText(details.investment_budget_max_lakhs)} onChange={(value) => set('investment_budget_max_lakhs', value)} />
        <Input
          label="Preferred locations"
          value={text(details.preferred_locations_csv ?? csv(details.preferred_locations))}
          onChange={(value) => set('preferred_locations_csv', value)}
        />
        <Input
          label="Preferred property types"
          value={text(details.preferred_property_types_csv ?? csv(details.preferred_property_types))}
          onChange={(value) => set('preferred_property_types_csv', value)}
        />
        <Input label="Minimum plot size" value={numberText(details.preferred_plot_size_min)} onChange={(value) => set('preferred_plot_size_min', value)} />
        <Input label="Maximum plot size" value={numberText(details.preferred_plot_size_max)} onChange={(value) => set('preferred_plot_size_max', value)} />
        <Input
          label="PAN number"
          value={text(details.kyc_pan_number) || text(operational.pan_number)}
          onChange={(value) => set('kyc_pan_number', value.toUpperCase())}
        />
        <Input
          label="Aadhaar last 4 only"
          value={text(details.kyc_aadhaar_last4) || text(operational.aadhaar_last4)}
          onChange={(value) => set('kyc_aadhaar_last4', value.replace(/\D/g, '').slice(0, 4))}
        />
        <label className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 md:col-span-2">
          <span className="text-sm font-semibold text-[#1F2937]">Interested in loan assistance</span>
          <Switch checked={bool(details.loan_interested)} onCheckedChange={(checked) => set('loan_interested', checked)} />
        </label>
      </div>
    )
  }

  if (role === 'employee') {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Metric label="Employee role" value={text(operational.employee_role) || 'Pending assignment'} />
        <Metric label="Employee status" value={operational.active === false ? 'Inactive' : 'Active'} />
      </div>
    )
  }

  if (role === 'admin') {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Metric label="Admin role" value="Admin" />
        <Metric label="Profile status" value={operational.verified ? 'Verified' : 'Loaded from profile'} />
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">
      Choose a role to unlock role-specific settings.
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
