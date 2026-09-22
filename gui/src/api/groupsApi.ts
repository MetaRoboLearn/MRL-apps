import {
  CreateGroupRequest,
  GroupDetails,
  GroupMutationError,
  GroupSummary,
  UpdateGroupRequest,
} from '../types/groupTypes.ts'

const createApiError = async (response: Response, fallback: string): Promise<GroupMutationError> => {
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
  return error
}

const requestJson = async <T>(input: RequestInfo, init: RequestInit | undefined, fallback: string): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (!response.ok) {
    throw await createApiError(response, fallback)
  }

  return response.json()
}

export const getGroups = (): Promise<GroupSummary[]> =>
  requestJson('/api/groups/', undefined, 'Failed to fetch groups')

export const getGroupById = (groupId: string): Promise<GroupDetails> =>
  requestJson(`/api/groups/${groupId}`, undefined, 'Failed to fetch group')

export const createGroup = (data: CreateGroupRequest) =>
  requestJson<{ success: true; group_id: number }>(
    '/api/groups/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    'Failed to create group',
  )

export const updateGroup = (groupId: string, data: UpdateGroupRequest): Promise<GroupSummary> =>
  requestJson(`/api/groups/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, 'Failed to update group')

export const deleteGroup = (groupId: string) =>
  requestJson<{ success: true }>(`/api/groups/${groupId}`, { method: 'DELETE' }, 'Failed to delete group')