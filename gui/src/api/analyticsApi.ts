import {
  AnalyticsFilters,
  GroupAnalyticsResponse,
  StudentPortfolioResponse,
  Submission,
} from '../types/analyticsTypes.ts'

const buildFilters = ({ groupIds, activityIds }: AnalyticsFilters) => {
  const params = new URLSearchParams()
  params.set('group_ids', groupIds.join(','))
  params.set('activity_ids', activityIds.join(','))
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
    throw new Error(await readError(response, 'Failed to fetch group analytics'))
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
    throw new Error(await readError(response, 'Failed to fetch student portfolio'))
  }

  return response.json()
}

export const getSubmissions = async (): Promise<Submission[]> => {
  const response = await fetch('/api/submissions/', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to fetch submissions'))
  }

  return response.json()
}

export const requestLlmFeedback = async (code: string, analysis?: unknown): Promise<string> => {
  const response = await fetch('/api/analytics/llm_feedback', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, analysis }),
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to generate feedback'))
  }

  return response.text()
}