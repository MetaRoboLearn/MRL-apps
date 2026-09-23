export interface UserBadgeEntry {
  id: number
  badge_id: number
  title: string
  description: string | null
  value: number
  image_url: string
  comment: string | null
  created_at: string
  created_by: number | null
  activity_id?: number
  activity_title?: string
  relevant_activity_task_id?: number
  assigned?: boolean
  catalog_state?: 'assigned' | 'unassigned'
  unassigned_message?: string | null
}

export interface BadgeCatalogEntry extends Omit<UserBadgeEntry, 'id' | 'created_at'> {
  id: number | null
  created_at: string | null
}