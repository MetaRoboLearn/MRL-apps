export type AnalyticsFilters = {
  groupIds: number[]
  activityIds: number[]
}

export type SummaryMetric = {
  metric_name: string
  value: number | string
}

export type GroupAnalyticsResponse = {
  summary_table: SummaryMetric[]
  task_summary_table: TaskSummaryRow[]
  heatmap_png: string
  boxplot_png: string
  student_ids: number[]
}

export type TaskSummaryRow = {
  activity_task_id: number
  task_label: string
  task_difficulty: number | null
  success_rate: number
  average_duration_seconds: number | null
  median_duration_seconds: number | null
  average_failures: number | null
  average_edits_to_success: number | null
  average_final_solution_complexity: number | null
  min_task_complexity: number | null
  max_task_complexity: number | null
  attempting_students: number
  successful_students: number
}

export type StudentIdentity = {
  id: number
  first_name: string
  last_name: string
  username: string
}

export type StudentGlobalStats = {
  tasks_attempted: number
  tasks_completed: number
  total_time_seconds: number
}

export type CodeElementRange = {
  type: string
  line?: string | number
  lineno?: number
  end_line?: string | number
  end_lineno?: number
  col_offset?: number
  end_col_offset?: number
}

export type CodeAnalysis = {
  elements?: CodeElementRange[]
  code_elements?: CodeElementRange[]
  counts?: Record<string, number>
  stats?: Record<string, boolean | number>
  error?: string
} | null

export type BadgeDefinition = {
  badge_id: number
  title: string
  description: string | null
  value: number
  image_url: string
  relevant_activity_task_id: number
}

export type BadgeAssignment = {
  assigned: true
  user_badge_id: number
  badge_id: number
  title: string
  description: string | null
  image_url: string
  comment: string | null
  created_at: string
  created_by: number | null
}

export type TaskCard = {
  activity_task_id: number
  task_id: number
  activity_title?: string | null
  title: string | null
  status: string
  time_spent_seconds: number
  attempt_date: string | null
  attempt_count: number
  task_difficulty: number | null
  code_complexity: {
    min: number
    average: number
    max: number
  }
  final_code: string | null
  code_template?: string | null
  code_analysis: CodeAnalysis
  trajectory_png: string
  badge_definition: BadgeDefinition | null
  badge: BadgeAssignment | null
}

export type StudentPortfolioResponse = {
  student_id: number
  student?: StudentIdentity
  global_stats?: StudentGlobalStats
  task_cards: TaskCard[]
}

export type Submission = {
  activity_task_id: number
  task_id: number
  activity_title?: string | null
  task_name: string | null
  status: string
  attempt_date: string | null
  attempt_count: number
  duration_seconds: number
  final_code: string | null
  code_analysis: CodeAnalysis
  badge: BadgeAssignment | null
}