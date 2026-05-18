'use client'

import { useState } from 'react'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepProgress } from '@/components/onboarding/StepProgress'
import {
  BUDGET_PRESETS_LAKHS,
  BUYER_LOCATIONS,
  BUYER_PROPERTY_TYPES,
  PLOT_BUYER_STEP_NAMES,
  SIZE_PRESETS_SQ_YARDS,
} from '@/lib/onboarding/config'
import { inputClass, labelClass, selectClass } from '@/lib/onboarding/form-classes'
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

  const [loanInterested, setLoanInterested] = useState(Boolean(formData.loan_interested))
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
      investment_budget_lakhs: minBudget,
      investment_budget_max_lakhs: maxBudget,
      preferred_locations: locations,
      preferred_plot_size_min: formData.preferred_plot_size_min,
      preferred_plot_size_max: formData.preferred_plot_size_max,
      preferred_property_types: propertyTypes,
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
      bank_account_holder: formData.bank_account_holder,
      bank_account_number: formData.bank_account_number,
      bank_ifsc: String(formData.bank_ifsc ?? '').toUpperCase(),
      account_type: formData.account_type || 'savings',
      kyc_verify_consent: Boolean(formData.kyc_verify_consent),
    })
  }

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      loan_interested: loanInterested,
      loan_amount_needed: loanInterested ? formData.loan_amount_needed : undefined,
      employer_name: loanInterested ? formData.employer_name : undefined,
      monthly_income: loanInterested ? formData.monthly_income : undefined,
      employment_type: loanInterested ? formData.employment_type : undefined,
    })
  }

  if (loading) {
    return (
      <OnboardingShell eyebrow="Plot buyer" title="Buyer onboarding" description="Loading your progress...">
        <p className="font-sans text-sm text-white/50">Loading...</p>
      </OnboardingShell>
    )
  }

  if (showStatus) {
    return (
      <OnboardingShell eyebrow="Plot buyer" title="You're all set" description="Your profile is ready.">
        <OnboardingStatusPage
          variant="plot_buyer"
          welcomeBack={welcomeBack}
          onDismissWelcome={() => setWelcomeBack(false)}
        />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      eyebrow="Plot buyer onboarding"
      title="Quick setup"
      description="Keep onboarding simple now. Documents and detailed KYC can be done later when booking a plot."
    >
      <StepProgress currentStep={currentStep} totalSteps={totalSteps} stepNames={PLOT_BUYER_STEP_NAMES} />

      {currentStep === 1 ? (
        <StepContainer title="Preference profile" onSubmit={handleStep1} isLoading={submitting} error={error}>
          <div>
            <span className={labelClass}>Budget range (₹ Lakhs)</span>
            <p className="mt-2 font-serif text-2xl text-[#D4AF94]">
              ₹{minBudget}L – ₹{maxBudget}L
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="font-sans text-xs text-white/50">Minimum</span>
                <input
                  type="number"
                  min={10}
                  className={inputClass}
                  value={minBudget}
                  onChange={(e) => updateField({ investment_budget_lakhs: Number(e.target.value) })}
                />
              </label>
              <label>
                <span className="font-sans text-xs text-white/50">Maximum</span>
                <input
                  type="number"
                  min={minBudget}
                  className={inputClass}
                  value={maxBudget}
                  onChange={(e) => updateField({ investment_budget_max_lakhs: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGET_PRESETS_LAKHS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateField({ investment_budget_lakhs: n, investment_budget_max_lakhs: n * 2 })}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/50 hover:border-[#D4AF94]/40"
                >
                  {n}L
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Preferred locations</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {BUYER_LOCATIONS.map((loc) => (
                <label
                  key={loc.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-sans text-sm ${
                    locations.includes(loc.id)
                      ? 'border-[#C0392B]/50 bg-[#C0392B]/10 text-white'
                      : 'border-white/10 text-white/70'
                  }`}
                >
                  <input type="checkbox" checked={locations.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
                  {loc.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Min plot size (optional)</span>
              <select
                className={selectClass}
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
            </label>
            <label>
              <span className={labelClass}>Max plot size (optional)</span>
              <select
                className={selectClass}
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
            </label>
          </div>

          <div>
            <span className={labelClass}>Property types (optional)</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {BUYER_PROPERTY_TYPES.map((pt) => (
                <label
                  key={pt.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-sans text-sm ${
                    propertyTypes.includes(pt.id)
                      ? 'border-[#D4AF94]/50 bg-[#D4AF94]/10'
                      : 'border-white/10 text-white/70'
                  }`}
                >
                  <input type="checkbox" checked={propertyTypes.includes(pt.id)} onChange={() => togglePropertyType(pt.id)} />
                  {pt.label}
                </label>
              ))}
            </div>
          </div>
        </StepContainer>
      ) : null}

      {currentStep === 2 ? (
        <StepContainer
          title="Identity step"
          subtitle="Optional for now. You can submit full KYC later during booking."
          onSubmit={handleStep2}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
        >
          <label className="block">
            <span className={labelClass}>Aadhaar last 4 digits (optional)</span>
            <input
              className={inputClass}
              maxLength={4}
              inputMode="numeric"
              value={String(formData.kyc_aadhaar_last_4 ?? '')}
              onChange={(e) => updateField({ kyc_aadhaar_last_4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="1234"
            />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 p-4">
            <input
              type="checkbox"
              checked={Boolean(formData.agree_kyc_rules)}
              onChange={(e) => updateField({ agree_kyc_rules: e.target.checked })}
            />
            <span className="font-sans text-sm text-white/65">I agree to provide complete KYC details later when required.</span>
          </label>
        </StepContainer>
      ) : null}

      {currentStep === 3 ? (
        <StepContainer
          title="Payout setup (optional)"
          subtitle="You can add bank details later."
          onSubmit={handleStep3}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
        >
          <label className="block">
            <span className={labelClass}>Account holder (optional)</span>
            <input
              className={inputClass}
              value={String(formData.bank_account_holder ?? '')}
              onChange={(e) => updateField({ bank_account_holder: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Account number (optional)</span>
            <input
              className={inputClass}
              value={String(formData.bank_account_number ?? '')}
              onChange={(e) => updateField({ bank_account_number: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelClass}>IFSC (optional)</span>
            <input
              className={inputClass}
              value={String(formData.bank_ifsc ?? '')}
              onChange={(e) => updateField({ bank_ifsc: e.target.value.toUpperCase() })}
            />
          </label>
        </StepContainer>
      ) : null}

      {currentStep === 4 ? (
        <StepContainer
          title="Assistance preferences"
          onSubmit={handleStep4}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
          submitButtonText="Complete onboarding"
        >
          <label className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <span className="font-sans text-sm text-white/80">Interested in loan assistance?</span>
            <input type="checkbox" checked={loanInterested} onChange={(e) => setLoanInterested(e.target.checked)} />
          </label>

          {loanInterested ? (
            <>
              <label className="block">
                <span className={labelClass}>Loan amount needed (optional)</span>
                <input
                  type="number"
                  className={inputClass}
                  value={String(formData.loan_amount_needed ?? '')}
                  onChange={(e) => updateField({ loan_amount_needed: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Employer name (optional)</span>
                <input
                  className={inputClass}
                  value={String(formData.employer_name ?? '')}
                  onChange={(e) => updateField({ employer_name: e.target.value })}
                />
              </label>
            </>
          ) : (
            <p className="rounded-lg border border-[#D4AF94]/20 bg-[#D4AF94]/10 px-4 py-3 font-sans text-sm text-white/70">
              Self-funded buyers can finish onboarding now.
            </p>
          )}
        </StepContainer>
      ) : null}
    </OnboardingShell>
  )
}
