'use client'

import { useMemo, useState } from 'react'
import { OnboardingStatusPage } from '@/components/onboarding/OnboardingStatusPage'
import { CompassPicker, type Facing } from '@/components/auth/CompassPicker'
import { OnboardingCard } from '@/components/auth/OnboardingCard'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { SelectionCard } from '@/components/auth/SelectionCard'
import { StepProgress } from '@/components/auth/StepProgress'
import { UnitInput, type AreaUnit } from '@/components/auth/UnitInput'
import {
  AMENITY_OPTIONS,
  BOUNDARY_STATUS_OPTIONS,
  LAND_OWNER_STEP_NAMES,
  OCCUPANCY_STATUS_OPTIONS,
  OWNER_CONCERN_OPTIONS,
  OWNER_RELATIONSHIP_OPTIONS,
  PROPERTY_KIND_OPTIONS,
  PROPERTY_PURPOSE_OPTIONS,
  PROPERTY_TYPES,
  UNIVERSAL_AMENITIES,
  VISAKHAPATNAM_CORRIDORS,
} from '@/lib/onboarding/config'
import { useOnboarding } from '@/lib/onboarding/hooks'

const SLUG = 'land-owner'
const ownerFacings: Facing[] = ['N', 'E', 'S', 'W']
const propertyKindValues = PROPERTY_KIND_OPTIONS.map((option) => option.value)

type PropertyKind = (typeof PROPERTY_KIND_OPTIONS)[number]['value']

function toSqYards(value: number, unit: AreaUnit) {
  if (unit === 'sq_yards') return value
  if (unit === 'sq_ft') return value / 9
  if (unit === 'sq_m') return value * 1.19599
  if (unit === 'cents') return value * 48.4
  if (unit === 'acres') return value * 4840
  if (unit === 'guntas') return value * 121
  return value * 266.6667
}

function labelForKind(kind: PropertyKind) {
  if (kind === 'apartment') return 'Apartment / society address'
  if (kind === 'house') return 'House / villa address'
  if (kind === 'commercial') return 'Commercial unit address'
  if (kind === 'agricultural_land') return 'Village / mandal / land location'
  return 'Property location / corridor'
}

function areaLabelForKind(kind: PropertyKind) {
  if (kind === 'apartment') return 'Built-up or super built-up area'
  if (kind === 'house') return 'Built-up or land area'
  if (kind === 'commercial') return 'Carpet or built-up area'
  if (kind === 'agricultural_land') return 'Approximate land extent'
  return 'Approximate plot size'
}

function defaultUnitForKind(kind: PropertyKind): AreaUnit {
  if (kind === 'apartment' || kind === 'house' || kind === 'commercial') return 'sq_ft'
  if (kind === 'agricultural_land') return 'acres'
  return 'sq_yards'
}

function getDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

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
  const propertyKind = propertyKindValues.includes(formData.property_kind as PropertyKind)
    ? (formData.property_kind as PropertyKind)
    : 'plot'
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(defaultUnitForKind(propertyKind))
  const propertyType = (formData.property_type as string) || 'maintenance'
  const propertyDetails = getDetails(formData.property_details)
  const amenities = useMemo(() => [...(AMENITY_OPTIONS[propertyType] ?? []), ...UNIVERSAL_AMENITIES], [propertyType])
  const interested = (formData.interested_in as string[]) ?? []
  const concerns = (formData.concern_types as string[]) ?? []

  const updateDetails = (updates: Record<string, unknown>) => {
    updateField({ property_details: { ...propertyDetails, ...updates } })
  }

  const selectPropertyKind = (kind: PropertyKind) => {
    updateField({
      property_kind: kind,
      property_facing: kind === 'plot' || kind === 'agricultural_land' ? formData.property_facing : '',
      is_corner_plot: kind === 'plot' ? Boolean(formData.is_corner_plot) : false,
    })
    setAreaUnit(defaultUnitForKind(kind))
  }

  const toggleInterest = (id: string) => {
    const next = interested.includes(id) ? interested.filter((x) => x !== id) : [...interested, id]
    updateField({ interested_in: next })
  }

  const toggleConcern = (id: string) => {
    const next = concerns.includes(id) ? concerns.filter((x) => x !== id) : [...concerns, id]
    updateField({ concern_types: next })
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    const areaValue = Number(formData.property_size_sqyards) || 100
    const normalizedSqYards = Math.max(100, Math.round(toSqYards(areaValue, areaUnit)))

    await submitStep({
      contact_phone: formData.contact_phone,
      contact_address: formData.contact_address,
      property_kind: propertyKind,
      owner_relationship: formData.owner_relationship || 'owner',
      property_purpose: formData.property_purpose || 'monitor_protect',
      property_location: formData.property_location,
      property_size_sqyards: normalizedSqYards,
      property_facing: formData.property_facing || '',
      is_corner_plot: propertyKind === 'plot' ? Boolean(formData.is_corner_plot) : false,
      boundary_status: formData.boundary_status || undefined,
      occupancy_status: formData.occupancy_status || undefined,
      inspection_contact_name: formData.inspection_contact_name,
      inspection_contact_phone: formData.inspection_contact_phone,
      property_details: {
        ...propertyDetails,
        display_area_value: areaValue,
        display_area_unit: areaUnit,
      },
    })
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStep({
      property_type: formData.property_type || 'maintenance',
      interested_in: interested,
      concern_types: concerns,
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
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10 text-[#1a1a1a]">
        <p className="mx-auto max-w-2xl text-sm text-[#5f5f5f]">Loading your owner setup...</p>
      </main>
    )
  }

  if (showStatus) {
    return (
      <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <OnboardingStatusPage
            variant="land_owner"
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
        stepLabel={LAND_OWNER_STEP_NAMES[currentStep - 1] ?? 'Setup'}
      />

      {currentStep === 1 ? (
        <form onSubmit={handleStep1}>
          <OnboardingCard
            stepNumber={1}
            totalSteps={totalSteps}
            title="What property should PlotKare protect?"
            description="Choose the property type first. We will ask only the details needed for that asset."
            nextLoading={submitting}
            error={error}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {PROPERTY_KIND_OPTIONS.map((option) => (
                <SelectionCard
                  key={option.value}
                  id={`owner-kind-${option.value}`}
                  label={option.label}
                  description={option.description}
                  selected={propertyKind === option.value}
                  onSelect={() => selectPropertyKind(option.value)}
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PremiumInput
                id="owner-contact-phone"
                label="Phone / WhatsApp"
                value={String(formData.contact_phone ?? '')}
                onChange={(value) => updateField({ contact_phone: value })}
                autoComplete="tel"
                placeholder="+91 98765 43210"
                required
              />
              <PremiumInput
                id="owner-contact-address"
                label="Your contact address"
                value={String(formData.contact_address ?? '')}
                onChange={(value) => updateField({ contact_address: value })}
                autoComplete="street-address"
                placeholder="Optional, for operations follow-up"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Authority *</label>
                <select
                  className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                  value={String(formData.owner_relationship ?? '')}
                  onChange={(e) => updateField({ owner_relationship: e.target.value })}
                  required
                >
                  <option value="">Select authority</option>
                  {OWNER_RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Primary goal *</label>
                <select
                  className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                  value={String(formData.property_purpose ?? '')}
                  onChange={(e) => updateField({ property_purpose: e.target.value })}
                  required
                >
                  <option value="">Select goal</option>
                  {PROPERTY_PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">{labelForKind(propertyKind)} *</label>
              <input
                list="owner-corridors"
                className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#9CA3AF] focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                value={String(formData.property_location ?? '')}
                onChange={(e) => updateField({ property_location: e.target.value })}
                placeholder="Area, address, society name, village, or landmark"
                required
              />
              <datalist id="owner-corridors">
                {VISAKHAPATNAM_CORRIDORS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-sm text-[#6B7280]">This becomes the property address shown in the dashboard.</p>
            </div>

            <UnitInput
              label={areaLabelForKind(propertyKind)}
              value={typeof formData.property_size_sqyards === 'number' ? formData.property_size_sqyards : ''}
              unit={areaUnit}
              onValueChange={(value) => updateField({ property_size_sqyards: value === '' ? '' : value })}
              onUnitChange={setAreaUnit}
              required
            />

            {propertyKind === 'apartment' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <PremiumInput
                  id="owner-apartment-unit"
                  label="Flat / unit number"
                  value={String(propertyDetails.unit_number ?? '')}
                  onChange={(value) => updateDetails({ unit_number: value })}
                  placeholder="A-1204"
                  required
                />
                <PremiumInput
                  id="owner-apartment-floor"
                  label="Floor"
                  value={String(propertyDetails.floor_label ?? '')}
                  onChange={(value) => updateDetails({ floor_label: value })}
                  placeholder="12"
                  required
                />
                <PremiumInput
                  id="owner-apartment-bhk"
                  label="BHK / unit type"
                  type="number"
                  value={String(propertyDetails.bhk ?? '')}
                  onChange={(value) => updateDetails({ bhk: value === '' ? undefined : Number(value) })}
                  placeholder="3"
                />
                <PremiumInput
                  id="owner-apartment-tower"
                  label="Tower / block"
                  value={String(propertyDetails.tower_block ?? '')}
                  onChange={(value) => updateDetails({ tower_block: value })}
                  placeholder="Tower A"
                />
              </div>
            ) : null}

            {propertyKind === 'plot' || propertyKind === 'agricultural_land' ? (
              <>
                <PremiumInput
                  id="owner-survey-number"
                  label={propertyKind === 'agricultural_land' ? 'Survey number' : 'Plot / survey number'}
                  value={String(propertyDetails.survey_number ?? '')}
                  onChange={(value) => updateDetails({ survey_number: value })}
                  placeholder="Optional now, required before legal verification"
                />
                <CompassPicker
                  value={(formData.property_facing as Facing | undefined) ?? null}
                  onChange={(facing) => updateField({ property_facing: facing })}
                  allowed={ownerFacings}
                  label="Graphical facing / direction"
                />
                <label className="flex items-center gap-3 rounded-2xl border border-[#1a1a1a]/10 bg-white p-4 text-sm text-[#5f5f5f]">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_corner_plot)}
                    onChange={(e) => updateField({ is_corner_plot: e.target.checked })}
                  />
                  Corner plot
                </label>
              </>
            ) : (
              <CompassPicker
                value={(formData.property_facing as Facing | undefined) ?? null}
                onChange={(facing) => updateField({ property_facing: facing })}
                allowed={ownerFacings}
                label="Facing, if known"
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Boundary / access</label>
                <select
                  className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                  value={String(formData.boundary_status ?? '')}
                  onChange={(e) => updateField({ boundary_status: e.target.value })}
                >
                  <option value="">Select boundary status</option>
                  {BOUNDARY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Occupancy</label>
                <select
                  className="h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
                  value={String(formData.occupancy_status ?? '')}
                  onChange={(e) => updateField({ occupancy_status: e.target.value })}
                >
                  <option value="">Select occupancy</option>
                  {OCCUPANCY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PremiumInput
                id="owner-inspection-contact-name"
                label="Inspection contact"
                value={String(formData.inspection_contact_name ?? '')}
                onChange={(value) => updateField({ inspection_contact_name: value })}
                placeholder="Optional"
              />
              <PremiumInput
                id="owner-inspection-contact-phone"
                label="Inspection contact phone"
                value={String(formData.inspection_contact_phone ?? '')}
                onChange={(value) => updateField({ inspection_contact_phone: value })}
                placeholder="Optional"
              />
            </div>
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 2 ? (
        <form onSubmit={handleStep2}>
          <OnboardingCard
            stepNumber={2}
            totalSteps={totalSteps}
            title="What should PlotKare watch for?"
            description="Choose operational concerns and services. This controls dashboard priorities and inspection notes."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            error={error}
          >
            <div className="space-y-3">
              <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Primary care category *</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => updateField({ property_type: pt.value })}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                      propertyType === pt.value
                        ? 'border-[#8B1538] bg-[#8B1538]/10 text-[#1a1a1a]'
                        : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f] hover:border-[#8B1538]/40'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Main concerns *</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {OWNER_CONCERN_OPTIONS.map((concern) => (
                  <label
                    key={concern.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all ${
                      concerns.includes(concern.id)
                        ? 'border-[#8B1538] bg-[#8B1538]/10 text-[#1a1a1a]'
                        : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={concerns.includes(concern.id)}
                      onChange={() => toggleConcern(concern.id)}
                    />
                    {concern.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">Interested services *</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {amenities.map((amenity) => (
                  <label
                    key={amenity.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all ${
                      interested.includes(amenity.id)
                        ? 'border-[#8B1538] bg-[#8B1538]/10 text-[#1a1a1a]'
                        : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f]'
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
          </OnboardingCard>
        </form>
      ) : null}

      {currentStep === 3 ? (
        <form onSubmit={handleStep3}>
          <OnboardingCard
            stepNumber={3}
            totalSteps={totalSteps}
            title="Finish your owner setup."
            description="Documents stay in the dashboard flow. No Aadhaar or bank details are collected here."
            onBack={goToPreviousStep}
            nextLoading={submitting}
            nextLabel="Complete onboarding"
            error={error}
          >
            <label className="flex items-start gap-3 rounded-2xl border border-[#1a1a1a]/10 bg-white p-4">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
                className="mt-1"
              />
              <span className="font-sans text-sm text-[#5f5f5f]">
                I confirm these details are correct and that I am authorized to request PlotKare operations for this property.
              </span>
            </label>
            <div className="rounded-2xl border border-[#8B1538]/20 bg-[#8B1538]/10 p-4 text-sm leading-6 text-[#5f5f5f]">
              After this, the property appears in your dashboard with its type, address, owner contact, and verification status.
            </div>
          </OnboardingCard>
        </form>
      ) : null}
    </main>
  )
}
