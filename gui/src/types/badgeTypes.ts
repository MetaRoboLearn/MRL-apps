export interface Badge {
  id: number
  title: string
  description: string | null
  value: number
  image_url: string
  created_at: string
  updated_at: string | null
  created_by: number | null
  updated_by: number | null
  relevant_activity_task_id: number
}

export type BadgeTaskOption = {
  activity_id: number
  activity_title: string
  activity_created_by: number | null
  activity_task_id: number
  task_title: string | null
}