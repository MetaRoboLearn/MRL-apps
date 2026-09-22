export type GroupMember = {
  user_id: number
  username: string
  first_name: string
  last_name: string
  full_name: string
  role: string | null
}

export type GroupSummary = {
  group_id: number
  group_name: string
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string | null
}

export type GroupDetails = GroupSummary & {
  members: GroupMember[]
}

export type CreateGroupRequest = {
  group_name: string
}

export type UpdateGroupRequest = {
  group_name: string
}

export type GroupMutationError = Error & {
  status?: number
  usernames?: string[]
}