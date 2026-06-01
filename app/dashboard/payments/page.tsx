'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { PlanTier } from '@/lib/plotkare-storage'

const PLAN_LABEL: Record<PlanTier, string> = {
  basic: 'Basic Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
}

const PLAN_AMENITY_BLURB: Record<PlanTier, string[]> = {
  basic: ['Inspection PDF reports', 'Email support', 'Starter amenity review'],
  standard: [
    'Everything in Basic',
    'Legal encroachment monitoring',
    'Priority WhatsApp with field agent',
    'Amenity planning consultation',
  ],
  premium: [
    'Everything in Standard',
    'Drone boundary snapshots',
    'Dedicated relationship manager',
    'Concierge coordination for selected services',
  ],
}

type SubscriptionRow = {
  id: string
  plan: PlanTier | string | null
  status: string | null
  provider_subscription_id?: string | null
  created_at: string
}

type ConsultationRow = {
  id: string
  subject: string
  message: string | null
  status: string | null
  source: string | null
  created_at: string
}

function normalizePlan(plan: string | null | undefined): PlanTier | null {
  if (plan === 'basic' || plan === 'standard' || plan === 'premium') return plan
  return null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(value))
}

export default function PaymentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [plan, setPlan] = useState<PlanTier | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setSubscriptions([])
      setConsultations([])
      setPlan(null)
      setLoading(false)
      return
    }

    const [{ data: subscriptionRows, error: subscriptionError }, { data: consultationRows, error: consultationError }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id,plan,status,provider_subscription_id,created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('consultation_requests')
        .select('id,subject,message,status,source,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (subscriptionError) toast.error(subscriptionError.message)
    if (consultationError) toast.error(consultationError.message)

    const liveSubscriptions = (subscriptionRows ?? []) as SubscriptionRow[]
    setSubscriptions(liveSubscriptions)
    setConsultations((consultationRows ?? []) as ConsultationRow[])
    setPlan(normalizePlan(liveSubscriptions[0]?.plan))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [supabase])

  const displayRows = useMemo(() => {
    const rows: { label: string; detail: string; status: string }[] = [
      {
        label: plan ? PLAN_LABEL[plan] : 'No active plan',
        detail: plan ? 'Service scope loaded from PlotKare billing records' : 'Request a consultation to activate a service plan',
        status: subscriptions[0]?.status || 'Pending',
      },
    ]

    for (const subscription of subscriptions.slice(1, 4)) {
      const tier = normalizePlan(subscription.plan)
      rows.push({
        label: tier ? PLAN_LABEL[tier] : subscription.plan || 'Service plan',
        detail: subscription.provider_subscription_id ? `Provider ref ${subscription.provider_subscription_id}` : 'PlotKare billing record',
        status: subscription.status || 'Recorded',
      })
    }

    return rows
  }, [plan, subscriptions])

  const selectPlan = async (tier: PlanTier) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      toast.error('Please sign in again before requesting a consultation.')
      return
    }

    const { error } = await supabase.from('consultation_requests').insert({
      user_id: user.id,
      role: 'owner',
      source: 'dashboard_payments',
      subject: `${PLAN_LABEL[tier]} consultation request`,
      message: `User requested the ${PLAN_LABEL[tier]} consultation path from the payments dashboard.`,
      status: 'open',
      metadata: { requested_plan: tier },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setUpgradeOpen(false)
    toast.success('Consultation request sent')
    await refresh()
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Payments" />
        <div className="px-8 pb-12 pt-24">
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-[#9CA3AF]">Active Plan</p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-[#1F2937]">{plan ? PLAN_LABEL[plan] : 'No active plan'}</h2>
                  <p className="mt-2 font-mono text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                    {subscriptions[0]?.status || 'Consult for pricing'}
                  </p>
                  <p className="mt-2 max-w-xl font-sans text-sm text-[#6B7280]">
                    Final service scope is loaded from PlotKare billing records after advisor review and plan activation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="rounded-lg bg-[#C0392B] px-5 py-2.5 font-sans text-sm font-semibold text-white hover:opacity-95"
                >
                  Request Consultation
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-serif text-xl font-bold text-[#1F2937]">Consultation Package Status</h3>
              <div className="mt-6 space-y-3 border-b border-[#E5E7EB] pb-4">
                {displayRows.map((row) => (
                  <div
                    key={row.label + row.detail}
                    className="flex flex-wrap items-baseline justify-between gap-2 font-sans text-sm"
                  >
                    <div>
                      <span className="text-[#1F2937]">{row.label}</span>
                      <span className="ml-2 text-[#6B7280]">{row.detail}</span>
                    </div>
                    <span className="font-mono text-[#C0392B]">{row.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-[#9CA3AF]">Advisor Next Step</p>
                  <p
                    className="font-mono text-2xl font-bold uppercase tracking-wide text-[#F59E0B]"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                  >
                    {loading ? 'Loading' : consultations[0]?.status || 'Book Demo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectPlan(plan ?? 'standard')}
                  className="rounded-lg bg-[#C0392B] px-8 py-3 font-sans text-sm font-semibold text-white hover:opacity-95"
                >
                  Talk to PlotKare
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h3 className="font-serif text-xl font-bold text-[#1F2937]">Consultation Records</h3>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[#9CA3AF]">
                      <th className="pb-3 pr-4 font-mono text-xs uppercase">Date</th>
                      <th className="pb-3 pr-4 font-mono text-xs uppercase">Description</th>
                      <th className="pb-3 text-right font-mono text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && consultations.length === 0 ? (
                      <tr className="border-b border-[#F3F4F6] text-[#1F2937]">
                        <td className="py-6 pr-4 text-[#6B7280]" colSpan={3}>
                          No consultation records yet. Request a consultation and it will appear here.
                        </td>
                      </tr>
                    ) : null}
                    {consultations.map((row) => (
                      <tr key={row.id} className="border-b border-[#F3F4F6] text-[#1F2937]">
                        <td className="py-3 pr-4 font-mono text-[#6B7280]">{formatDate(row.created_at)}</td>
                        <td className="py-3 pr-4">{row.subject}</td>
                        <td className="py-3 text-right font-mono text-[#16A34A]">{row.status || 'Recorded'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E5E7EB] bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1F2937]">Choose a consultation path</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {(['basic', 'standard', 'premium'] as const).map((tier) => (
              <div key={tier} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-serif text-lg font-semibold text-[#1F2937]">{PLAN_LABEL[tier]}</h4>
                  <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">
                    Consult for pricing
                  </span>
                </div>
                <ul className="mt-3 list-inside list-disc space-y-1 font-sans text-xs text-[#6B7280]">
                  {PLAN_AMENITY_BLURB[tier].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => selectPlan(tier)}
                  className="mt-4 w-full rounded-lg bg-[#C0392B] py-2.5 font-sans text-sm font-semibold text-white hover:opacity-95"
                >
                  Select Consultation Path
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
