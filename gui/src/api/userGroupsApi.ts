import { GroupMember } from '../types/groupTypes.ts'
import { GroupMutationError } from '../types/groupTypes.ts'

const requestJson = async <T>(input: RequestInfo, init: RequestInit | undefined, fallback: string): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (!response.ok) {
    let message = fallback
    let usernames: string[] | undefined
    try {
      const payload = await response.json()
      message = payload.error || fallback
      usernames = Array.isArray(payload.usernames) ? payload.usernames : undefined
    } catch {
      // Keep the fallback when the server does not return JSON.
    }
    const error = new Error(message) as GroupMutationError
    error.status = response.status
    error.usernames = usernames
    throw error
  }

  return response.json()
}

export const getGroupMembers = (groupId: string): Promise<GroupMember[]> =>
  requestJson(`/api/user-groups/${groupId}`, undefined, 'Failed to fetch group members')

export const replaceGroupMembers = (groupId: string, userIds: number[]) =>
  requestJson<{ success: true; user_ids: number[] }>(
    `/api/user-groups/${groupId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: userIds }),
    },
    'Failed to update group members',
  )