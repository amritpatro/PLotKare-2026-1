'use client'

import { useState } from 'react'
import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { OnboardingCard } from '@/components/auth/OnboardingCard'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { SelectionCard } from '@/components/auth/SelectionCard'
import { StepProgress } from '@/components/auth/StepProgress'
import {
  BUDGET_PRESETS_LAKHS,
  BUYING_PURPOSE_OPTIONS,
  BUYER_LOCATIONS,
  BUYER_PROPERTY_TYPES,
  PLOT_BUYER_STEP_NAMES,
  PURCHASE_TIMELINE_OPTIONS,
  SIZE_PRESETS_SQ_YARDS,
} from '@/lib/onboarding/config'
import { useOnboarding } from '@/lib/onboarding/hooks'

const SLUG = 'plot-buyer'

export default function PlotBuyerOnboardingPage() {
  const {
    currentStep,
    loading,
    submitting,
    error,
    formData,
    updateField,
    submitStep,
    goToPreviousStep,
    totalSteps,
    welcomeBack,
    setWelcomeBack,
    showStatus,
  } = useOnboarding(SLUG)

  const [loanPreference, setLoanPreference] = useState<'no' | 'maybe'>(
    formData.loan_interested ? 'maybe' : 'no',
  )
  const locations = (formData.preferred_locations as string[]) ?? []
  const propertyTypes = (formData.preferred_property_types as string[]) ?? []
  const minBudget = Number(formData.investment_budget_lakhs) || 10
  const maxBudget = Number(formData.investment_budget_max_lakhs) || minBudget

  const toggleLocation = (id: string) => {
    const next = locations.includes(id) ? locations.filter((x) => x !== id) : [...locations, id]
    updateField({ preferred_locations: next })
  }

  const togglePropertyType = (id: string) => {
    const next = propertyTypes.includes(id) ? propertyTypes.filter((x) => x !== id) : [...propertyTypes, id]
    updateField({ preferred_property_types: next })
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      contact_phone: formData.contact_phone,
      investment_budget_lakhs: minBudget,
      investment_budget_max_lakhs: maxBudget,
      preferred_locations: locations,
      preferred_plot_size_min: formData.preferred_plot_size_min,
      preferred_plot_size_max: formData.preferred_plot_size_max,
      preferred_property_types: propertyTypes,
      buying_purpose: formData.buying_purpose || 'investment',
      purchase_timeline: formData.purchase_timeline || 'exploring',
    })
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      kyc_aadhaar_last_4: String(formData.kyc_aadhaar_last_4 ?? ''),
      agree_kyc_rules: Boolean(formData.agree_kyc_rules),
    })
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      bank_account_holder: '',
      bank_account_number: '',
      bank_ifsc: '',
      account_type: formData.account_type || 'savings',
      kyc_verify_consent: Boolean(formData.kyc_verify_consent),
    })
  }

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      loan_interested: false,
      loan_amount_needed: undefined,
      employer_name: undefined,
      monthly_income: undefined,
      employment_type: loanPreference,
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10 text-[#1a1a1a]">
        <p className="mx-auto max-w-2xl text-sm text-[#5f5f5f]">Loading your buyer setup...</p>
      </main>
    )
  }

  if (showStatus) {
    return (
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
        <div className="mx-auto max-w-2xl">
        <OnboardingStatusPage
          variant="plot_buyer"
          welcomeBack={welcomeBack}
          onDismissWelcome={() => setWelcomeBack(false)}
        />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F6F3] pb-16">
      <StepProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={PLOT_BUYER_STEP_NAMES[currentStep - 1] ?? 'Setup'}
      />

      {currentStep === 1 ? (
        <form onSubmit={handleStep1}>
          <OnboardingCard
            stepNumber={1}
            totalSteps={totalSteps}
            title="What are you looking for?"
            description="Your property preferences help us show the right verified plots and listings."
            nextLoading={submitting}
            error={error}
          >
          <PremiumInput
            id="buyer-contact-phone"
            label="Phone / WhatsApp"
            value={String(formData.contact_phone ?? '')}
            onChange={(value) => updateField({ contact_phone: value })}
            autoComplete="tel"
            placeholder="+91 98765 43210"
            required
          />

          <div className="space-y-3">
            <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Budget range (Lakhs)</span>
            <p className="text-2xl font-semibold text-[#8B1538]">
              ₹{minBudget}L – ₹{maxBudget}L
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <PremiumInput
                id="buyer-min-budget"
                label="Minimum"
                type="number"
                value={String(minBudget)}
                onChange={(value) => updateField({ investment_budget_lakhs: Number(value) || 10 })}
              />
              <PremiumInput
                id="buyer-max-budget"
                label="Maximum"
                type="number"
                value={String(maxBudget)}
                onChange={(value) => updateField({ investment_budget_max_lakhs: Number(value) || minBudget })}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGET_PRESETS_LAKHS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateField({ investment_budget_lakhs: n, investment_budget_max_lakhs: n * 2 })}
                  className="rounded-full border border-[#1a1a1a]/10 px-3 py-1 text-xs text-[#5f5f5f] transition-colors hover:border-[#8B1538]/50 hover:text-[#8B1538]"
                >
                  {n}L
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Buying purpose *</label>
              <select
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.buying_purpose ?? '')}
                onChange={(e) => updateField({ buying_purpose: e.target.value })}
                required
              >
                <option value="">Select purpose</option>
                {BUYING_PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Timeline *</label>
              <select
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.purchase_timeline ?? '')}
                onChange={(e) => updateField({ purchase_timeline: e.target.value })}
                required
              >
                <option value="">Select timeline</option>
                {PURCHASE_TIMELINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Preferred locations *</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {BUYER_LOCATIONS.map((loc) => (
                <label
                  key={loc.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all ${
                    locations.includes(loc.id)
                      ? 'border-[#8B1538] bg-[#8B1538]/10 text-[#1a1a1a]'
                      : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f]'
                  }`}
                >
                  <input type="checkbox" checked={locations.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
                  {loc.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Min plot size</label>
              <select
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.preferred_plot_size_min ?? '')}
                onChange={(e) => updateField({ preferred_plot_size_min: Number(e.target.value) || undefined })}
              >
                <option value="">Any</option>
                {SIZE_PRESETS_SQ_YARDS.map((n) => (
                  <option key={n} value={n}>
                    {n} sq. yards
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Max plot size</label>
              <select
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.preferred_plot_size_max ?? '')}
                onChange={(e) => updateField({ preferred_plot_size_max: Number(e.target.value) || undefined })}
              >
                <option value="">Any</option>
                {SIZE_PRESETS_SQ_YARDS.map((n) => (
                  <option key={n} value={n}>
                    {n} sq. yards
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Property types *</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {BUYER_PROPERTY_TYPES.map((pt) => (
                <label
                  key={pt.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all ${
                    propertyTypes.includes(pt.id)
                      ? 'border-[#8B1538] bg-[#8B1538]/10 text-[#1a1a1a]'
                      : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f]'
                  }`}
                >
                  <input type="checkbox" checked={propertyTypes.includes(pt.id)} onChange={() => togglePropertyType(pt.id)} />
                  {pt.label}
                </label>
              ))}
            </div>
          </div>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 2 ? (
        <form onSubmit={handleStep2}>
          <OnboardingCard
            stepNumber={2}
            totalSteps={totalSteps}
            title="KYC comes later."
            description="We keep buyer onboarding simple. Identity checks happen only when you request seller contact, document access, or booking support."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            error={error}
          >
          <div className="rounded-2xl border border-[#8B1538]/20 bg-[#8B1538]/10 p-5 text-sm leading-6 text-[#5f5f5f]">
            No Aadhaar upload, bank details, or sensitive identity documents are collected in this onboarding step.
          </div>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 3 ? (
        <form onSubmit={handleStep3}>
          <OnboardingCard
            stepNumber={3}
            totalSteps={totalSteps}
            title="Payment details are not needed now."
            description="For this launch flow, buyer bank details are not collected during onboarding."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            error={error}
          >
          <div className="rounded-2xl border border-[#1a1a1a]/10 bg-white p-5 text-sm leading-6 text-[#5f5f5f]">
            Continue to set your finance preference. Any verified transaction or booking workflow can request necessary details later.
          </div>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 4 ? (
        <form onSubmit={handleStep4}>
          <OnboardingCard
            stepNumber={4}
            totalSteps={totalSteps}
            title="Finance and next steps."
            description="Loan assistance is coming soon. Tell us whether to keep finance guidance visible in your dashboard."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            nextLabel="Complete onboarding"
            error={error}
          >
          <div className="grid gap-3">
            <SelectionCard
              id="buyer-loan-no"
              label="No - I am self-funding"
              description="Show me properties ready for direct purchase conversations."
              selected={loanPreference === 'no'}
              onSelect={() => setLoanPreference('no')}
            />
            <SelectionCard
              id="buyer-loan-maybe"
              label="Maybe - I will decide later"
              description="Keep finance guidance available in the dashboard without collecting income details now."
              selected={loanPreference === 'maybe'}
              onSelect={() => setLoanPreference('maybe')}
            />
            <SelectionCard
              id="buyer-loan-soon"
              label="Loan guidance"
              description="Coming soon after launch verification."
              selected={false}
              onSelect={() => undefined}
              badge="Coming soon"
              disabled
            />
          </div>
          </OnboardingCard>
        </form>
      ) : null}
    </main>
  )
}
