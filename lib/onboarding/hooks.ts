'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getOnboardingProgress,
  resumeOnboarding,
  submitOnboardingStep,
} from '@/lib/onboarding/api-client'
import { customerTypeFromSlug, getMaxSteps } from '@/lib/onboarding/types'
import type { CustomerType } from '@/lib/onboarding/types'

function formatOnboardingError(error: unknown) {
  if (!(error instanceof Error)) return 'Failed to save this step.'

  const details = (error as Error & { details?: unknown }).details
  if (details && typeof details === 'object' && 'fieldErrors' in details) {
    const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors
    if (fieldErrors && typeof fieldErrors === 'object') {
      const messages = Object.entries(fieldErrors as Record<string, unknown>)
        .flatMap(([field, value]) => {
          const labels = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
          return labels.length ? labels.map((message) => `${field.replaceAll('_', ' ')}: ${message}`) : []
        })
        .slice(0, 3)
      if (messages.length) return messages.join(' · ')
    }
  }

  return error.message || 'Failed to save this step.'
}

export function useOnboarding(customerSlug: string) {
  const customerType = customerTypeFromSlug(customerSlug)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [savedData, setSavedData] = useState<Record<string, unknown>>({})
  const [onboardingStatus, setOnboardingStatus] = useState<string>('pending')
  const [welcomeBack, setWelcomeBack] = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  const totalSteps = customerType ? getMaxSteps(customerType) : 1

  const loadProgress = useCallback(async () => {
    if (!customerType) return
    setLoading(true)
    setError(null)
    try {
      const [progress, resume] = await Promise.all([
        getOnboardingProgress(customerSlug),
        resumeOnboarding(customerSlug),
      ])
      setOnboardingStatus(progress.onboarding_status)
      setSavedData(progress.saved_data ?? {})
      setFormData(progress.saved_data ?? {})

      if (progress.onboarding_status === 'completed') {
        setShowStatus(true)
        setCurrentStep(totalSteps + 1)
      } else {
        setCurrentStep(progress.current_step || 1)
        setWelcomeBack(resume.welcome_back)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding progress.')
    } finally {
      setLoading(false)
    }
  }, [customerSlug, customerType, totalSteps])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const submitStep = async (stepData: FormData | Record<string, unknown>) => {
    if (!customerType) return false
    setSubmitting(true)
    setError(null)
    try {
      let payload: FormData | Record<string, unknown>
      if (stepData instanceof FormData) {
        const fd = new FormData()
        stepData.forEach((v, k) => fd.append(k, v))
        fd.set('step', String(currentStep))
        fd.set('data', JSON.stringify({ ...savedData, ...formData }))
        payload = fd
      } else {
        payload = { ...savedData, ...formData, ...stepData }
      }

      const result = await submitOnboardingStep(customerSlug, currentStep, payload)
      const merged =
        stepData instanceof FormData
          ? { ...savedData, ...formData }
          : { ...savedData, ...formData, ...(stepData as Record<string, unknown>) }

      setSavedData(merged)
      setFormData(merged)

      if (result.completed) {
        setOnboardingStatus('completed')
        setShowStatus(true)
        setCurrentStep(totalSteps + 1)
      } else if (result.next_step) {
        setCurrentStep(result.next_step)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return true
    } catch (err) {
      setError(formatOnboardingError(err))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1)
      setFormData(savedData)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const updateField = (patch: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  return {
    customerType: customerType as CustomerType | null,
    currentStep,
    setCurrentStep,
    loading,
    submitting,
    error,
    setError,
    formData,
    setFormData,
    savedData,
    updateField,
    submitStep,
    goToPreviousStep,
    totalSteps,
    onboardingStatus,
    welcomeBack,
    setWelcomeBack,
    showStatus,
    reload: loadProgress,
  }
}
