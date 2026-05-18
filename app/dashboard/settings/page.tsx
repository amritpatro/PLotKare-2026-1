'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { Profile } from '@/lib/supabase/types'

const NOTIFICATION_KEYS = [
  { key: 'email_updates', label: 'Monthly Inspection Reports' },
  { key: 'inspection_alerts', label: 'Encroachment Alerts' },
  { key: 'monthly_reports', label: 'Value Updates' },
  { key: 'billing_notifications', label: 'Payment Reminders' },
  { key: 'marketing_emails', label: 'Marketing Emails' },
]

function getPlanLabel(plan: string | null | undefined) {
  if (!plan) return 'Consultation Required'
  if (plan === 'basic') return 'Basic Plan'
  if (plan === 'premium') return 'Premium Plan'
  return 'Standard Plan'
}

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [securityEmail, setSecurityEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showForgotMsg, setShowForgotMsg] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<{ lastSignIn: string; expiresAt: string } | null>(null)
  const [savingAccount, setSavingAccount] = useState(false)
  const [securitySaving, setSecuritySaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [billingPlan, setBillingPlan] = useState<string | null>(null)
  const [billingStatus, setBillingStatus] = useState('Consultation Required')
  const [pendingConsultation, setPendingConsultation] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({})

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      setLoading(true)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        toast.error('Unable to load account. Please sign in again.')
        setLoading(false)
        return
      }

      setAuthEmail(userData.user.email ?? '')
      setSecurityEmail(userData.user.email ?? '')
      setSessionInfo({
        lastSignIn: userData.user.last_sign_in_at ?? userData.user.created_at ?? '',
        expiresAt: userData.user.expire_at ? new Date(userData.user.expire_at * 1000).toISOString() : '',
      })

      const { data: profileData, error: profileError } = await supabase
        .from<Profile>('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      if (profileError || !profileData) {
        toast.error('Unable to load profile details.')
        setLoading(false)
        return
      }

      const notificationPrefs = profileData.notification_preferences ?? {}
      setNotificationPreferences(notificationPrefs)
      setProfile(profileData)

      if (profileData.avatar_path) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profileData.avatar_path)
        setAvatarUrl(urlData.publicUrl)
      }

      const [{ data: subscriptions }, { data: consultations }] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan,status')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('consultation_requests')
          .select('status')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      if (mounted) {
        const activeSubscription = subscriptions?.[0]
        setBillingPlan(activeSubscription?.plan ?? null)
        setBillingStatus(activeSubscription ? activeSubscription.status ?? 'Active' : 'Consultation Required')
        setPendingConsultation(consultations?.[0]?.status === 'pending')
      }

      setLoading(false)
    }

    void loadProfile()
    return () => {
      mounted = false
    }
  }, [supabase])

  const strength = useMemo(() => {
    if (!newPassword) return 0

    let score = Math.min(newPassword.length * 10, 40)
    if (/[A-Z]/.test(newPassword)) score += 15
    if (/[0-9]/.test(newPassword)) score += 15
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 15

    return Math.min(100, score)
  }, [newPassword])

  const handleProfileChange = (field: keyof Pick<Profile, 'full_name' | 'phone' | 'city'>, value: string) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  const patchProfile = async (updates: Record<string, unknown>) => {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) {
      throw new Error(result?.error?.message || 'Unable to save profile changes.')
    }
    return result.data.profile as Profile
  }

  const handleSaveAccount = async () => {
    if (!profile) return
    setSavingAccount(true)
    try {
      const updated = await patchProfile({
        fullName: profile.full_name,
        phone: profile.phone,
        city: profile.city,
      })
      setProfile(updated)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSavingAccount(false)
    }
  }

  const handleNotificationToggle = async (key: string) => {
    const next = { ...notificationPreferences, [key]: !notificationPreferences[key] }
    setNotificationPreferences(next)
    try {
      await patchProfile({ notificationPreferences: next })
      toast.success('Notification settings saved')
    } catch (error) {
      setNotificationPreferences(notificationPreferences)
      toast.error(error instanceof Error ? error.message : 'Unable to update notification settings')
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarUploading(true)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const objectPath = `${profile.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(objectPath, file, { upsert: true })

    if (uploadError) {
      toast.error('Avatar upload failed. Check storage permissions.')
      setAvatarUploading(false)
      return
    }

    try {
      const updatedProfile = await patchProfile({ avatarPath: objectPath })
      setProfile(updatedProfile)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(objectPath)
      setAvatarUrl(urlData.publicUrl)
      setAvatarPreview(null)
      toast.success('Profile photo updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save avatar path')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await handleAvatarUpload(file)
  }

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_path) return
    setAvatarUploading(true)
    try {
      await supabase.storage.from('avatars').remove([profile.avatar_path])
      const updatedProfile = await patchProfile({ avatarPath: null })
      setProfile(updatedProfile)
      setAvatarUrl(null)
      setAvatarPreview(null)
      toast.success('Profile photo removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSecuritySave = async () => {
    if (!profile) return
    if (!currentPassword) {
      toast.error('Please enter your current password.')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setSecuritySaving(true)
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword,
      })
      if (verifyError) {
        throw new Error(verifyError.message)
      }

      const updates: Record<string, string> = {}
      if (securityEmail && securityEmail !== authEmail) updates.email = securityEmail
      if (newPassword) updates.password = newPassword
      if (Object.keys(updates).length > 0) {
        const { error: updateError, data } = await supabase.auth.updateUser(updates)
        if (updateError) throw new Error(updateError.message)
        if (data.user?.email) {
          setAuthEmail(data.user.email)
          setSecurityEmail(data.user.email)
        }
      }
      toast.success('Security settings updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update security settings')
    } finally {
      setSecuritySaving(false)
    }
  }

  const handleLogoutOthers = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Logged out of other devices successfully')
  }

  const accountFullName = profile?.full_name ?? ''
  const accountPhone = profile?.phone ?? ''
  const accountCity = profile?.city ?? ''
  const emailValue = authEmail || 'No email available'
  const avatarSource = avatarPreview || avatarUrl

  const notificationStates = NOTIFICATION_KEYS.map((item) => ({
    ...item,
    checked: Boolean(notificationPreferences[item.key] ?? false),
  }))

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Settings" />
        <div className="px-8 pb-12 pt-24">
          <div className="mx-auto max-w-3xl">
            <Tabs defaultValue="account" className="w-full gap-6">
              <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <TabsTrigger
                  value="account"
                  className="rounded-lg px-4 py-2 font-sans text-sm text-[#6B7280] data-[state=active]:bg-[#FFF1F2] data-[state=active]:text-[#C0392B]"
                >
                  Account
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="rounded-lg px-4 py-2 font-sans text-sm text-[#6B7280] data-[state=active]:bg-[#FFF1F2] data-[state=active]:text-[#C0392B]"
                >
                  Security
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="rounded-lg px-4 py-2 font-sans text-sm text-[#6B7280] data-[state=active]:bg-[#FFF1F2] data-[state=active]:text-[#C0392B]"
                >
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="rounded-lg px-4 py-2 font-sans text-sm text-[#6B7280] data-[state=active]:bg-[#FFF1F2] data-[state=active]:text-[#C0392B]"
                >
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="account"
                className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Account</h2>
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {avatarSource ? (
                        <AvatarImage src={avatarSource} alt="Profile photo" />
                      ) : (
                        <AvatarFallback className="font-mono text-xl text-white">PK</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarUploading}
                        className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB] disabled:opacity-60"
                      >
                        {avatarUploading ? 'Uploading…' : 'Change photo'}
                      </button>
                      {profile?.avatar_path ? (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={avatarUploading}
                          className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB] disabled:opacity-60"
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Full Name</span>
                      <input
                        value={accountFullName}
                        onChange={(e) => handleProfileChange('full_name', e.target.value)}
                        placeholder="Your full name"
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 font-sans text-[#1F2937] outline-none focus:border-[#C0392B]"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Email</span>
                      <input
                        value={emailValue}
                        readOnly
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 font-sans text-[#1F2937]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Phone</span>
                      <input
                        value={accountPhone}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="Optional phone number"
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 font-sans text-[#1F2937] outline-none focus:border-[#C0392B]"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">City</span>
                      <input
                        value={accountCity}
                        onChange={(e) => handleProfileChange('city', e.target.value)}
                        placeholder="Optional city"
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 font-sans text-[#1F2937] outline-none focus:border-[#C0392B]"
                      />
                    </label>
                  </div>

                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarInput} />

                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    disabled={savingAccount || loading}
                    className="rounded-lg bg-[#C0392B] px-6 py-3 font-sans text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingAccount ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </TabsContent>

              <TabsContent
                value="security"
                className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Security</h2>
                <div className="mt-6 space-y-4">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Email</span>
                      <input
                        value={securityEmail}
                        onChange={(e) => setSecurityEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-sans text-[#1F2937] outline-none focus:border-[#C0392B]"
                      />
                    </label>
                    <div className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Session info</p>
                      <p className="font-sans text-sm text-[#1F2937]">Last login: {sessionInfo?.lastSignIn || 'Unknown'}</p>
                      <p className="font-sans text-sm text-[#6B7280]">Current session expires at: {sessionInfo?.expiresAt || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Current Password</span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">New Password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-xs text-[#6B7280]">Confirm New Password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
                      />
                    </label>
                    <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Logout options</p>
                      <button
                        type="button"
                        onClick={handleLogoutOthers}
                        className="mt-2 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB]"
                      >
                        Logout all other devices
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Password strength</p>
                    <Progress value={strength} className="mt-2 h-2 bg-[#F3F4F6]" />
                  </div>

                  <button
                    type="button"
                    onClick={handleSecuritySave}
                    disabled={securitySaving || loading}
                    className="rounded-lg bg-[#C0392B] px-6 py-3 font-sans text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {securitySaving ? 'Updating…' : 'Update security'}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowForgotMsg(true)}
                      className="font-sans text-sm text-[#C0392B] underline-offset-4 hover:underline"
                    >
                      Forgot Password
                    </button>
                    {showForgotMsg && (
                      <p className="mt-2 font-sans text-sm text-[#6B7280]">
                        A reset link will be sent to your email.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="notifications"
                className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Notifications</h2>
                <div className="mt-6 space-y-4">
                  {notificationStates.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <div>
                        <p className="font-sans text-sm font-semibold text-[#1F2937]">{item.label}</p>
                        <p className="mt-1 text-sm text-[#6B7280]">Receive updates and alerts for {item.label.toLowerCase()}.</p>
                      </div>
                      <Switch
                        checked={item.checked}
                        onCheckedChange={() => handleNotificationToggle(item.key)}
                        className="data-[state=checked]:bg-[#16A34A] data-[state=unchecked]:bg-[#E5E7EB]"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="billing"
                className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <h2 className="font-serif text-xl font-bold text-[#1F2937]">Billing</h2>
                <div className="mt-6 space-y-6 font-sans text-sm text-[#6B7280]">
                  <div>
                    <p className="font-mono text-xs text-[#9CA3AF]">Current plan</p>
                    <p className="mt-1 text-lg font-semibold text-[#1F2937]">{getPlanLabel(billingPlan)}</p>
                    <p className="mt-1 font-mono text-[#F59E0B]">{billingStatus ?? 'Consultation pending'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/dashboard/payments'
                    }}
                    className="rounded-lg bg-[#C0392B] px-6 py-3 font-sans text-sm font-semibold text-white hover:opacity-95"
                  >
                    Request Consultation
                  </button>
                  <div className="border-t border-[#E5E7EB] pt-6">
                    <p className="font-mono text-xs text-[#9CA3AF]">Service approval</p>
                    <p className="mt-2 text-[#1F2937]">Advisor confirmation required before activation.</p>
                    {pendingConsultation ? (
                      <p className="mt-2 text-sm text-[#16A34A]">Pending consultation request detected.</p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB]"
                    >
                      Talk to PlotKare
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Preparing receipts download…')}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB]"
                  >
                    Download consultation records
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
