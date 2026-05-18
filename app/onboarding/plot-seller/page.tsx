'use client'

import { useState } from 'react'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepProgress } from '@/components/onboarding/StepProgress'
import { PLOT_SELLER_STEP_NAMES } from '@/lib/onboarding/config'
import { inputClass, labelClass, selectClass } from '@/lib/onboarding/form-classes'
import { useOnboarding } from '@/lib/onboarding/hooks'

const SLUG = 'plot-seller'

export default function PlotSellerOnboardingPage() {
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

  const [serviceNeeds, setServiceNeeds] = useState('')
  const commissionModel = (formData.commission_model as string) || 'commission_percent'

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      company_name: formData.company_name,
      address: formData.address,
      gst_number: String(formData.gst_number ?? '').toUpperCase(),
      pan_number: String(formData.pan_number ?? '').toUpperCase(),
    })
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({})
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      commission_model: commissionModel,
      commission_rate: commissionModel === 'commission_percent' ? formData.commission_rate : undefined,
      listing_fee_amount: commissionModel === 'listing_fee' ? formData.listing_fee_amount : undefined,
    })
  }

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      bank_account_holder: formData.bank_account_holder,
      bank_account_number: formData.bank_account_number,
      bank_ifsc: String(formData.bank_ifsc ?? '').toUpperCase(),
      account_type: formData.account_type || 'savings',
    })
  }

  if (loading) {
    return (
      <OnboardingShell eyebrow="Plot seller" title="Seller onboarding" description="Loading your progress...">
        <p className="font-sans text-sm text-white/50">Loading...</p>
      </OnboardingShell>
    )
  }

  if (showStatus) {
    return (
      <OnboardingShell eyebrow="Plot seller" title="You're all set" description="Your profile is ready.">
        <OnboardingStatusPage
          variant="plot_seller"
          welcomeBack={welcomeBack}
          onDismissWelcome={() => setWelcomeBack(false)}
        />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      eyebrow="Plot seller onboarding"
      title="Quick setup"
      description="No heavy GST/PAN/document process right now. Keep it simple and continue."
    >
      <StepProgress currentStep={currentStep} totalSteps={totalSteps} stepNames={PLOT_SELLER_STEP_NAMES} />

      {currentStep === 1 ? (
        <StepContainer title="Business basics" onSubmit={handleStep1} isLoading={submitting} error={error}>
          <label className="block">
            <span className={labelClass}>Business / company name</span>
            <input
              className={inputClass}
              value={String(formData.company_name ?? '')}
              onChange={(e) => updateField({ company_name: e.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className={labelClass}>Address</span>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              value={String(formData.address ?? '')}
              onChange={(e) => updateField({ address: e.target.value })}
              required
            />
          </label>

          <p className="rounded-lg border border-[#D4AF94]/20 bg-[#D4AF94]/10 px-4 py-3 font-sans text-sm text-white/70">
            GST/PAN and legal docs can be added later during listing registration.
          </p>
        </StepContainer>
      ) : null}

      {currentStep === 2 ? (
        <StepContainer
          title="What support do you need?"
          subtitle="Tell us how PlotKare can help your sales journey."
          onSubmit={handleStep2}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
        >
          <label className="block">
            <span className={labelClass}>Service needs</span>
            <textarea
              className={`${inputClass} min-h-[120px]`}
              value={serviceNeeds}
              onChange={(e) => setServiceNeeds(e.target.value)}
              placeholder="Example: lead generation, faster listing approvals, local marketing, paperwork guidance"
            />
          </label>
        </StepContainer>
      ) : null}

      {currentStep === 3 ? (
        <StepContainer
          title="Listing model"
          onSubmit={handleStep3}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
        >
          <label className="block">
            <span className={labelClass}>Preferred model</span>
            <select
              className={selectClass}
              value={commissionModel}
              onChange={(e) => updateField({ commission_model: e.target.value })}
            >
              <option value="commission_percent">Percentage per sale</option>
              <option value="listing_fee">Flat listing fee</option>
            </select>
          </label>

          {commissionModel === 'commission_percent' ? (
            <label className="block">
              <span className={labelClass}>Expected commission (%) (optional)</span>
              <input
                type="number"
                min={1}
                max={10}
                className={inputClass}
                value={String(formData.commission_rate ?? '')}
                onChange={(e) => updateField({ commission_rate: Number(e.target.value) })}
              />
            </label>
          ) : (
            <label className="block">
              <span className={labelClass}>Expected listing fee (optional)</span>
              <input
                type="number"
                min={100}
                className={inputClass}
                value={String(formData.listing_fee_amount ?? '')}
                onChange={(e) => updateField({ listing_fee_amount: Number(e.target.value) })}
              />
            </label>
          )}
        </StepContainer>
      ) : null}

      {currentStep === 4 ? (
        <StepContainer
          title="Payout setup (optional)"
          subtitle="You can also add this later while publishing listings."
          onSubmit={handleStep4}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
          submitButtonText="Complete onboarding"
        >
          <label className="block">
            <span className={labelClass}>Account holder name (optional)</span>
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
    </OnboardingShell>
  )
}
