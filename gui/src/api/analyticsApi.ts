import {
  AnalyticsFilters,
  GroupAnalyticsResponse,
  StudentPortfolioResponse,
  Submission,
} from '../types/analyticsTypes.ts'

export type LlmFeedbackResponse = {
  suggestion: string
  used_fallback: boolean
  fallback_sections: string[]
  fallback_reasons: { section: string; reason: string }[]
}

export class LlmFeedbackError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'LlmFeedbackError'
  }
}

const buildFilters = ({ groupIds, activityIds, includeUnassigned }: AnalyticsFilters) => {
  const params = new URLSearchParams()
  params.set('group_ids', groupIds.join(','))
  params.set('activity_ids', activityIds.join(','))
  params.set('include_unassigned', includeUnassigned.toString())
  return params
}

const readError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json() as { error?: string }
    return payload.error || fallback
  } catch {
    return fallback
  }
}

export const getGroupAnalytics = async (
  filters: AnalyticsFilters,
): Promise<GroupAnalyticsResponse> => {
  const response = await fetch(`/api/analytics/groups?${buildFilters(filters)}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Analitiku grupa nije moguće učitati.'))
  }

  return response.json()
}

export const getStudentPortfolio = async (
  studentId: number,
  filters: AnalyticsFilters,
): Promise<StudentPortfolioResponse> => {
  const response = await fetch(`/api/analytics/student/${studentId}?${buildFilters(filters)}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Portfelj učenika nije moguće učitati.'))
  }

  return response.json()
}

export const getSubmissions = async (): Promise<Submission[]> => {
  const response = await fetch('/api/submissions/', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Predaje nije moguće učitati.'))
  }

  return response.json()
}

export const requestLlmFeedback = async (userStartedTaskId: number): Promise<LlmFeedbackResponse> => {
  const response = await fetch('/api/analytics/llm_feedback', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_started_task_id: userStartedTaskId }),
  })

  if (!response.ok) {
    try {
      const payload = await response.json() as { error?: string; code?: string }
      throw new LlmFeedbackError(
        payload.error || 'Nije moguće generirati povratnu informaciju.',
        payload.code || 'provider',
      )
    } catch (error) {
      if (error instanceof LlmFeedbackError) throw error
      throw new LlmFeedbackError('Nije moguće generirati povratnu informaciju.', 'provider')
    }
  }

  return response.json()
}