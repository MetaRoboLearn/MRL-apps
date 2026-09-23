import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { getStudentPortfolio, requestLlmFeedback } from '../../../../../api/analyticsApi.ts'
import { assignBadge, removeBadge, updateBadgeComment } from '../../../../../api/userBadgeApi.ts'
import { StudentTaskCard } from '../../../../../components/Analytics/StudentTaskCard.tsx'
import { getUsersByIds } from '../../../../../api/usersApi.ts'
import { AnalyticsFilters, TaskCard } from '../../../../../types/analyticsTypes.ts'

const ids = z.preprocess((value) => {
  const values = Array.isArray(value) ? value : [value]
  const parsed = values.flatMap((item) => {
    if (typeof item === 'number') return [item]
    if (typeof item !== 'string') return []

    const normalized = item.trim()
    if (!normalized) return []

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const jsonValue: unknown = JSON.parse(normalized)
        if (Array.isArray(jsonValue)) return jsonValue.map(Number)
      } catch {
        return []
      }
    }

    return normalized.split(',').map(Number)
  })

  return parsed.filter((item) => Number.isInteger(item) && item > 0)
}, z.array(z.number()))

const studentSearchSchema = z.object({
  group_ids: ids.default([]),
  activity_ids: ids.default([]),
})

export const Route = createFileRoute('/admin/analytics/student/$studentId/')({
  validateSearch: studentSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { studentId } = Route.useParams()
  const search = Route.useSearch()
  const queryClient = useQueryClient()
  const numericStudentId = Number(studentId)
  const filters: AnalyticsFilters = useMemo(() => ({ groupIds: search.group_ids, activityIds: search.activity_ids }), [search.activity_ids, search.group_ids])
  const hasValidFilters = filters.groupIds.length > 0 && filters.activityIds.length > 0
  const portfolioQuery = useQuery({
    queryKey: ['student-portfolio', numericStudentId, filters],
    queryFn: () => getStudentPortfolio(numericStudentId, filters),
    enabled: Number.isInteger(numericStudentId) && hasValidFilters,
  })
  const studentQuery = useQuery({
    queryKey: ['analytics-student', numericStudentId],
    queryFn: () => getUsersByIds([numericStudentId]),
    enabled: Number.isInteger(numericStudentId),
  })
  const mutation = useMutation({
    mutationFn: async ({ action, card, comment }: { action: 'assign' | 'update' | 'remove'; card: TaskCard; comment?: string }) => {
      if (action === 'assign') return assignBadge({ user_id: numericStudentId, badge_id: card.badge_definition!.badge_id, comment: comment || undefined })
      if (action === 'update') return updateBadgeComment(card.badge!.user_badge_id, comment || '')
      return removeBadge(card.badge!.user_badge_id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-portfolio', numericStudentId] }),
  })

  if (portfolioQuery.isLoading) return <main className="p-6">Loading portfolio...</main>
  if (portfolioQuery.error) return <main className="p-6 text-red-600">{portfolioQuery.error.message}</main>
  if (!hasValidFilters) return <main className="p-6 text-red-600">This portfolio link is missing valid group and activity filters. Return to Group analytics and use View Card again.</main>
  if (!portfolioQuery.data) return <main className="p-6">No portfolio data was returned.</main>

  const portfolio = portfolioQuery.data
  const student = portfolio.student || studentQuery.data?.[0]
  const stats = portfolio.global_stats
  const totalTime = stats?.total_time_seconds ?? portfolio.task_cards.reduce((total, card) => total + card.time_spent_seconds, 0)
  const attempted = stats?.tasks_attempted ?? portfolio.task_cards.length
  const completed = stats?.tasks_completed ?? portfolio.task_cards.filter((card) => card.status.startsWith('Success')).length

  return (
    <main className="min-h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-md border border-gray-200 bg-white p-5">
          <h1 className="text-3xl font-bold text-gray-900">{student ? `${student.first_name} ${student.last_name}` : `Student #${portfolio.student_id}`}</h1>
          {student && <p className="mt-1 text-gray-500">@{student.username}</p>}
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><dt className="text-sm text-gray-500">Tasks attempted</dt><dd className="text-2xl font-semibold">{attempted}</dd></div>
            <div><dt className="text-sm text-gray-500">Tasks completed</dt><dd className="text-2xl font-semibold">{completed}</dd></div>
            <div><dt className="text-sm text-gray-500">Total time</dt><dd className="text-2xl font-semibold">{totalTime}s</dd></div>
          </dl>
        </header>
        <div className="space-y-5">
          {portfolio.task_cards.length === 0 ? <section className="rounded-md border border-gray-200 bg-white p-6 text-gray-500">No task results found for this selection.</section> : portfolio.task_cards.map((card) => (
            <StudentTaskCard
              key={card.activity_task_id}
              card={card}
              isMutating={mutation.isPending}
              onAssign={(selectedCard, comment) => mutation.mutate({ action: 'assign', card: selectedCard, comment })}
              onUpdate={(selectedCard, comment) => mutation.mutate({ action: 'update', card: selectedCard, comment })}
              onUnassign={(selectedCard) => mutation.mutate({ action: 'remove', card: selectedCard })}
              onSuggest={async (selectedCard, setComment) => {
                try {
                  const suggestion = await requestLlmFeedback(selectedCard.final_code || '', selectedCard.code_analysis)
                  setComment(suggestion)
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : 'Failed to generate feedback')
                }
              }}
            />
          ))}
        </div>
      </div>
    </main>
  )
}