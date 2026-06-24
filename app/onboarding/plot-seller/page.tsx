'use client'

import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { OnboardingCard } from '@/components/auth/OnboardingCard'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { SelectionCard } from '@/components/auth/SelectionCard'
import { StepProgress } from '@/components/auth/StepProgress'
import {
  PLOT_SELLER_STEP_NAMES,
  PROPERTY_KIND_OPTIONS,
  SELLER_TYPE_OPTIONS,
  VISAKHAPATNAM_CORRIDORS,
} from '@/lib/onboarding/config'
import { useOnboarding } from '@/lib/onboarding/hooks'

const SLUG = 'plot-seller'
const propertyKindValues = PROPERTY_KIND_OPTIONS.map((option) => option.value)
const sellerTypeValues = SELLER_TYPE_OPTIONS.map((option) => option.value)

type PropertyKind = (typeof PROPERTY_KIND_OPTIONS)[number]['value']
type SellerType = (typeof SELLER_TYPE_OPTIONS)[number]['value']

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

  const sellerType = sellerTypeValues.includes(formData.seller_type as SellerType)
    ? (formData.seller_type as SellerType)
    : 'owner'
  const listingPropertyKind = propertyKindValues.includes(formData.listing_property_kind as PropertyKind)
    ? (formData.listing_property_kind as PropertyKind)
    : 'plot'
  const commissionModel = (formData.commission_model as string) || 'commission_percent'

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      company_name: formData.company_name,
      contact_phone: formData.contact_phone,
      seller_type: sellerType,
      address: formData.address,
      gst_number: String(formData.gst_number ?? '').toUpperCase(),
      pan_number: String(formData.pan_number ?? '').toUpperCase(),
    })
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      listing_property_kind: listingPropertyKind,
      listing_location: formData.listing_location,
      expected_price_lakhs: formData.expected_price_lakhs,
      listing_notes: formData.listing_notes,
    })
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
      bank_account_holder: '',
      bank_account_number: '',
      bank_ifsc: '',
      account_type: formData.account_type || 'savings',
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10 text-[#1a1a1a]">
        <p className="mx-auto max-w-2xl text-sm text-[#5f5f5f]">Loading your seller setup...</p>
      </main>
    )
  }

  if (showStatus) {
    return (
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <OnboardingStatusPage
            variant="plot_seller"
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
        stepLabel={PLOT_SELLER_STEP_NAMES[currentStep - 1] ?? 'Setup'}
      />

      {currentStep === 1 ? (
        <form onSubmit={handleStep1}>
          <OnboardingCard
            stepNumber={1}
            totalSteps={totalSteps}
            title="Tell us who is selling."
            description="This creates the seller record that admins review before listings go public."
            nextLoading={submitting}
            error={error}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {SELLER_TYPE_OPTIONS.map((option) => (
                <SelectionCard
                  key={option.value}
                  id={`seller-type-${option.value}`}
                  label={option.label}
                  description="Used for seller verification and listing authority checks."
                  selected={sellerType === option.value}
                  onSelect={() => updateField({ seller_type: option.value })}
                />
              ))}
            </div>

            <PremiumInput
              id="seller-company-name"
              label="Business / seller display name"
              value={String(formData.company_name ?? '')}
              onChange={(value) => updateField({ company_name: value })}
              placeholder="Company or seller name"
              required
            />

            <PremiumInput
              id="seller-contact-phone"
              label="Phone / WhatsApp"
              value={String(formData.contact_phone ?? '')}
              onChange={(value) => updateField({ contact_phone: value })}
              autoComplete="tel"
              placeholder="+91 98765 43210"
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Registered / operating address *</label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-base text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#9CA3AF] focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.address ?? '')}
                onChange={(e) => updateField({ address: e.target.value })}
                placeholder="Address used for seller verification"
                required
              />
            </div>

            <p className="rounded-2xl border border-[#8B1538]/20 bg-[#8B1538]/10 px-4 py-3 text-sm leading-6 text-[#5f5f5f]">
              GST, PAN, bank details, and authorization documents are collected later only when a real listing needs review.
            </p>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 2 ? (
        <form onSubmit={handleStep2}>
          <OnboardingCard
            stepNumber={2}
            totalSteps={totalSteps}
            title="What property will you list first?"
            description="This is saved to the seller profile so the dashboard and admin queue have useful context."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            error={error}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {PROPERTY_KIND_OPTIONS.map((option) => (
                <SelectionCard
                  key={option.value}
                  id={`seller-property-kind-${option.value}`}
                  label={option.label}
                  description={option.description}
                  selected={listingPropertyKind === option.value}
                  onSelect={() => updateField({ listing_property_kind: option.value })}
                />
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Listing location *</label>
              <input
                list="seller-corridors"
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#9CA3AF] focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.listing_location ?? '')}
                onChange={(e) => updateField({ listing_location: e.target.value })}
                placeholder="Area, project, village, or landmark"
                required
              />
              <datalist id="seller-corridors">
                {VISAKHAPATNAM_CORRIDORS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <PremiumInput
              id="seller-expected-price"
              label="Expected price in lakhs"
              type="number"
              value={String(formData.expected_price_lakhs ?? '')}
              onChange={(value) => updateField({ expected_price_lakhs: value === '' ? undefined : Number(value) })}
              placeholder="Optional"
              hint="Final listing price can be updated in the dashboard."
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Listing notes</label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-base text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#9CA3AF] focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.listing_notes ?? '')}
                onChange={(e) => updateField({ listing_notes: e.target.value })}
                placeholder="Ownership status, access instructions, buyer profile, or approval notes"
              />
            </div>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 3 ? (
        <form onSubmit={handleStep3}>
          <OnboardingCard
            stepNumber={3}
            totalSteps={totalSteps}
            title="Choose a listing model."
            description="This is a preference only. Final terms can be confirmed with the PlotKare team."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            error={error}
          >
            <div className="grid gap-3">
              <SelectionCard
                id="commission-percent"
                label="Percentage per sale"
                description="Use a commission rate after successful sale closure."
                selected={commissionModel === 'commission_percent'}
                onSelect={() => updateField({ commission_model: 'commission_percent' })}
              />
              <SelectionCard
                id="listing-fee"
                label="Flat listing fee"
                description="Use a fixed listing fee for marketplace publication."
                selected={commissionModel === 'listing_fee'}
                onSelect={() => updateField({ commission_model: 'listing_fee' })}
              />
            </div>

            {commissionModel === 'commission_percent' ? (
              <PremiumInput
                id="seller-commission-rate"
                label="Expected commission (%)"
                type="number"
                value={String(formData.commission_rate ?? '')}
                onChange={(value) => updateField({ commission_rate: value === '' ? undefined : Number(value) })}
                placeholder="3"
                hint="Optional. Allowed range is 1% to 10%."
              />
            ) : (
              <PremiumInput
                id="seller-listing-fee"
                label="Expected listing fee"
                type="number"
                value={String(formData.listing_fee_amount ?? '')}
                onChange={(value) => updateField({ listing_fee_amount: value === '' ? undefined : Number(value) })}
                placeholder="5000"
                hint="Optional. Final terms can be updated later."
              />
            )}
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 4 ? (
        <form onSubmit={handleStep4}>
          <OnboardingCard
            stepNumber={4}
            totalSteps={totalSteps}
            title="Submit seller profile."
            description="For launch safety, payout and full KYC details are collected later from protected dashboard flows."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            nextLabel="Complete onboarding"
            error={error}
          >
            <div className="rounded-2xl border border-[#8B1538]/20 bg-[#8B1538]/10 p-5 text-sm leading-6 text-[#5f5f5f]">
              Your seller profile will be routed to admin review with seller type, contact number, listing property type, location, and price context.
            </div>
          </OnboardingCard>
        </form>
      ) : null}
    </main>
  )
}
