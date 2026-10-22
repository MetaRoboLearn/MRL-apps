import {UserBadgeEntry} from "../types/userBadgeTypes.ts";

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
}) => {
  const response = await fetch('/api/user-badges', {
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

export const getMyBadges = async (): Promise<UserBadgeEntry[]> => {
  const response = await fetch('/api/user-badges/my', {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch badges')
  return response.json()
}