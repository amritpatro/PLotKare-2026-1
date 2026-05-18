'use client'

import { useState } from 'react'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { StepContainer } from '@/components/onboarding/StepContainer'
import { StepProgress } from '@/components/onboarding/StepProgress'
import {
  AMENITY_OPTIONS,
  LAND_OWNER_STEP_NAMES,
  PROPERTY_TYPES,
  UNIVERSAL_AMENITIES,
  VISAKHAPATNAM_CORRIDORS,
} from '@/lib/onboarding/config'
import { inputClass, labelClass, selectClass } from '@/lib/onboarding/form-classes'
import { useOnboarding } from '@/lib/onboarding/hooks'

const SLUG = 'land-owner'
const FACINGS = ['N', 'S', 'E', 'W'] as const

export default function LandOwnerOnboardingPage() {
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

  const [agreeTerms, setAgreeTerms] = useState(Boolean(formData.agree_to_terms))

  const propertyType = (formData.property_type as string) || 'agriculture'
  const amenities = [...(AMENITY_OPTIONS[propertyType] ?? []), ...UNIVERSAL_AMENITIES]
  const interested = (formData.interested_in as string[]) ?? []

  const toggleInterest = (id: string) => {
    const next = interested.includes(id) ? interested.filter((x) => x !== id) : [...interested, id]
    updateField({ interested_in: next })
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      property_location: formData.property_location,
      property_size_sqyards: Number(formData.property_size_sqyards) || 100,
      property_facing: formData.property_facing || 'N',
      is_corner_plot: Boolean(formData.is_corner_plot),
    })
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      property_type: formData.property_type || 'agriculture',
      interested_in: interested,
    })
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      agree_to_terms: agreeTerms,
      documents_skipped: true,
    })
  }

  if (loading) {
    return (
      <OnboardingShell eyebrow="Land owner" title="Tell us about your land" description="Loading your progress...">
        <p className="font-sans text-sm text-white/50">Loading...</p>
      </OnboardingShell>
    )
  }

  if (showStatus) {
    return (
      <OnboardingShell eyebrow="Land owner" title="You're all set" description="Your profile is ready.">
        <OnboardingStatusPage
          variant="land_owner"
          welcomeBack={welcomeBack}
          onDismissWelcome={() => setWelcomeBack(false)}
        />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      eyebrow="Land owner onboarding"
      title="Quick setup"
      description="Keep it simple now. You can add detailed documents later while registering plots."
    >
      <StepProgress currentStep={currentStep} totalSteps={totalSteps} stepNames={LAND_OWNER_STEP_NAMES} />

      {currentStep === 1 ? (
        <StepContainer
          title="Basic property details"
          subtitle="General details are enough to start."
          onSubmit={handleStep1}
          isLoading={submitting}
          error={error}
        >
          <label className="block">
            <span className={labelClass}>Location / corridor</span>
            <select
              className={selectClass}
              value={String(formData.property_location ?? '')}
              onChange={(e) => updateField({ property_location: e.target.value })}
              required
            >
              <option value="">Select location</option>
              {VISAKHAPATNAM_CORRIDORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Approximate plot size (sq. yards)</span>
            <input
              type="number"
              min={100}
              className={inputClass}
              value={String(formData.property_size_sqyards ?? '')}
              onChange={(e) => updateField({ property_size_sqyards: Number(e.target.value) })}
              required
            />
          </label>

          <div>
            <span className={labelClass}>Facing</span>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {FACINGS.map((facing) => (
                <button
                  key={facing}
                  type="button"
                  onClick={() => updateField({ property_facing: facing })}
                  className={`rounded-md border py-3 font-mono text-sm ${
                    formData.property_facing === facing
                      ? 'border-[#D4AF94] bg-[#D4AF94]/10 text-[#D4AF94]'
                      : 'border-white/10 text-white/60 hover:border-white/20'
                  }`}
                >
                  {facing}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 font-sans text-sm text-white/70">
            <input
              type="checkbox"
              checked={Boolean(formData.is_corner_plot)}
              onChange={(e) => updateField({ is_corner_plot: e.target.checked })}
            />
            Corner plot
          </label>
        </StepContainer>
      ) : null}

      {currentStep === 2 ? (
        <StepContainer
          title="Services you want"
          subtitle="Select what you need from PlotKare"
          onSubmit={handleStep2}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
        >
          <div>
            <span className={labelClass}>Land category</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => updateField({ property_type: pt.value })}
                  className={`rounded-md border px-4 py-3 text-left font-sans text-sm ${
                    propertyType === pt.value
                      ? 'border-[#C0392B] bg-[#C0392B]/10 text-white'
                      : 'border-white/10 text-white/70 hover:border-white/20'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Interested services</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-sans text-sm ${
                    interested.includes(amenity.id)
                      ? 'border-[#D4AF94]/50 bg-[#D4AF94]/10'
                      : 'border-white/10 text-white/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={interested.includes(amenity.id)}
                    onChange={() => toggleInterest(amenity.id)}
                  />
                  {amenity.label}
                </label>
              ))}
            </div>
          </div>
        </StepContainer>
      ) : null}

      {currentStep === 3 ? (
        <StepContainer
          title="Finish"
          subtitle="You can submit documents later during plot registration."
          onSubmit={handleStep3}
          isLoading={submitting}
          error={error}
          onBack={goToPreviousStep}
          submitButtonText="Complete onboarding"
        >
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              className="mt-1"
            />
            <span className="font-sans text-sm text-white/70">
              I confirm these details are correct. I understand documents can be uploaded later when adding a plot.
            </span>
          </label>
        </StepContainer>
      ) : null}
    </OnboardingShell>
  )
}
