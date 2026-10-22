// api/badgesApi.ts
import { Badge } from '../types/badgeTypes'

export const getBadges = async (params?: { search?: string }): Promise<Badge[]> => {
  const queryParams = new URLSearchParams()

  if (params?.search) queryParams.set('search', params.search)

  const response = await fetch(`/api/badges/?${queryParams}`, {
    credentials: 'include',
  })
  return response.json()
}

export const getBadgeById = async (badgeId: string): Promise<Badge> => {
  const response = await fetch(`/api/badges/${badgeId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Badge not found')
    }
    throw new Error('Failed to fetch badge')
  }

  return response.json()
}

export const createBadge = async (data: FormData): Promise<Badge> => {
  const response = await fetch('/api/badges', {
    credentials: 'include',
    method: 'POST',
    body: data,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create badge')
  }

  return response.json()
}

export const updateBadge = async (badgeId: string, data: FormData): Promise<Badge> => {
  const response = await fetch(`/api/badges/${badgeId}`, {
    credentials: 'include',
    method: 'PATCH',
    body: data,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update badge')
  }

  return response.json()
}

export const deleteBadge = async (badgeId: string) => {
  const response = await fetch(`/api/badges/${badgeId}`, {
    credentials: 'include',
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete badge')
  }

  return response.json()
}