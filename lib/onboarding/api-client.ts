import type {
  OnboardingProgressResponse,
  OnboardingResumeResponse,
  OnboardingSubmitResponse,
} from '@/lib/onboarding/types'

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string; details?: unknown } }

async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !('ok' in json) || !json.ok) {
    const message =
      'error' in json && json.error?.message ? json.error.message : 'Request failed. Please try again.'
    const err = new Error(message) as Error & { details?: unknown; status?: number }
    if ('error' in json && json.error?.details) err.details = json.error.details
    err.status = response.status
    throw err
  }
  return json.data
}

export async function submitOnboardingStep(
  customerSlug: string,
  step: number,
  data: FormData | Record<string, unknown>,
): Promise<OnboardingSubmitResponse> {
  const formData = new FormData()
  formData.append('step', String(step))

  if (data instanceof FormData) {
    data.forEach((value, key) => {
      if (key === 'step' || key === 'data') return
      formData.append(key, value)
    })
    const existingData = data.get('data')
    if (typeof existingData === 'string') formData.append('data', existingData)
    else formData.append('data', JSON.stringify({}))
  } else {
    formData.append('data', JSON.stringify(data))
  }

  const response = await fetch(`/api/v1/onboarding/${customerSlug}`, {
    method: 'POST',
    body: formData,
  })

  return parseApiResponse<OnboardingSubmitResponse>(response)
}

export async function getOnboardingProgress(
  customerSlug: string,
): Promise<OnboardingProgressResponse> {
  const response = await fetch(`/api/v1/onboarding/${customerSlug}/progress`)
  return parseApiResponse<OnboardingProgressResponse>(response)
}

export async function resumeOnboarding(customerSlug: string): Promise<OnboardingResumeResponse> {
  const response = await fetch(`/api/v1/onboarding/${customerSlug}/resume`)
  return parseApiResponse<OnboardingResumeResponse>(response)
}
