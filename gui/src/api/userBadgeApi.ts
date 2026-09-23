import { BadgeAssignment } from '../types/analyticsTypes.ts'
import { BadgeCatalogEntry, UserBadgeEntry } from "../types/userBadgeTypes.ts";

export const getUserBadges = async (userId: string): Promise<UserBadgeEntry[]> => {
  const response = await fetch(`/api/users/${userId}/badges`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch user badges')
  return response.json()
}

export const assignBadge = async (data: {
  user_id: number
  badge_id: number
  comment?: string
}): Promise<BadgeAssignment> => {
  const response = await fetch('/api/user-badges/', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign badge')
  }
  return response.json()
}

export const removeBadge = async (userBadgeId: number) => {
  const response = await fetch(`/api/user-badges/${userBadgeId}`, {
    credentials: 'include',
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove badge')
  }
  return response.json()
}

export const updateBadgeComment = async (userBadgeId: number, comment: string): Promise<BadgeAssignment> => {
  const response = await fetch(`/api/user-badges/${userBadgeId}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update badge comment')
  }
  return response.json()
}

export const getMyBadges = async (
  filter: 'all' | 'assigned' | 'unassigned' = 'all',
): Promise<BadgeCatalogEntry[]> => {
  const response = await fetch(`/api/user-badges/my?filter=${filter}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch badges')
  return response.json()
}