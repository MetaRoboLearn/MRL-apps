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
}