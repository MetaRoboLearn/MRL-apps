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
}