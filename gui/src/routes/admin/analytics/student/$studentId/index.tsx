import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { getStudentPortfolio, LlmFeedbackError, requestLlmFeedback } from '../../../../../api/analyticsApi.ts'
import { assignBadge, removeBadge, updateBadgeComment } from '../../../../../api/userBadgeApi.ts'
import { StudentTaskCard } from '../../../../../components/Analytics/StudentTaskCard.tsx'
import { getUsersByIds } from '../../../../../api/usersApi.ts'
import { AnalyticsFilters, TaskCard } from '../../../../../types/analyticsTypes.ts'
import { formatDuration } from '../../../../../utils.ts'

const feedbackFailureMessages: Record<string, string> = {
  configuration: 'Pružatelj povratnih informacija nije pravilno postavljen.',
  timeout: 'Generiranje je trajalo predugo. Pokušaj ponovno.',
  rate_limit: 'Dosegnuto je ograničenje zahtjeva. Pokušaj ponovno kasnije.',
  authentication: 'Pružatelj povratnih informacija nije prihvatio vjerodajnice.',
  invalid_response: 'Pružatelj je vratio neispravan odgovor.',
  provider: 'Povratnu informaciju trenutačno nije moguće izraditi.',
}

const fallbackReasonMessages: Record<string, string> = {
  timeout: 'Usluga je istekla.',
  rate_limit: 'Dosegnuto je ograničenje zahtjeva.',
  authentication: 'Provjeri konfiguraciju vjerodajnica.',
  invalid_response: 'Odgovor usluge nije prošao provjeru.',
  provider: 'Usluga trenutačno nije dostupna.',
}

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
  include_unassigned: z.preprocess((value) => value === true || value === 'true', z.boolean()).optional().default(false),
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
  const filters: AnalyticsFilters = useMemo(() => ({ groupIds: search.group_ids, activityIds: search.activity_ids, includeUnassigned: search.include_unassigned }), [search.activity_ids, search.group_ids, search.include_unassigned])
  const hasValidFilters = (filters.groupIds.length > 0 || filters.includeUnassigned) && filters.activityIds.length > 0
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
  const suggestionMutation = useMutation({
    mutationFn: ({ card }: { card: TaskCard }) => requestLlmFeedback(card.user_started_task_id),
  })

  if (portfolioQuery.isLoading) return <main className="readable-content p-6" role="status">Učitavanje portfelja...</main>
  if (portfolioQuery.error) return <main className="p-6 text-red-600">{portfolioQuery.error.message}</main>
  if (!hasValidFilters) return <main className="p-6 text-red-600">Veza nema valjane filtere grupa i aktivnosti. Vratite se na analitiku i ponovno otvorite karticu učenika.</main>
  if (!portfolioQuery.data) return <main className="readable-content p-6">Podaci o portfelju nisu dostupni.</main>

  const portfolio = portfolioQuery.data
  const student = portfolio.student || studentQuery.data?.[0]
  const stats = portfolio.global_stats
  const totalTime = stats?.total_time_seconds ?? portfolio.task_cards.reduce((total, card) => total + card.time_spent_seconds, 0)
  const attempted = stats?.tasks_attempted ?? portfolio.task_cards.length
  const completed = stats?.tasks_completed ?? portfolio.task_cards.filter((card) => card.status.startsWith('Success')).length

  return (
    <main className="readable-content min-h-full overflow-y-auto bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-md border border-gray-200 bg-white p-5">
          <h1 className="text-3xl font-bold text-gray-900">{student ? `${student.first_name} ${student.last_name}` : `Učenik #${portfolio.student_id}`}</h1>
          {student && <p className="mt-1 text-gray-500">@{student.username}</p>}
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><dt className="text-sm text-gray-500">Pokušani zadaci</dt><dd className="text-2xl font-semibold">{attempted}</dd></div>
            <div><dt className="text-sm text-gray-500">Dovršeni zadaci</dt><dd className="text-2xl font-semibold">{completed}</dd></div>
            <div><dt className="text-sm text-gray-500">Ukupno vrijeme</dt><dd className="text-2xl font-semibold">{formatDuration(totalTime)}</dd></div>
          </dl>
        </header>
        <div className="space-y-5">
          {portfolio.task_cards.length === 0 ? <section className="rounded-md border border-gray-200 bg-white p-6 text-gray-500">Nema rezultata za odabrane filtere.</section> : portfolio.task_cards.map((card) => (
            <StudentTaskCard
              key={card.user_started_task_id}
              card={card}
              isMutating={mutation.isPending}
              isSuggesting={suggestionMutation.isPending && suggestionMutation.variables?.card.activity_task_id === card.activity_task_id}
              isSuggestionPending={suggestionMutation.isPending}
              onAssign={(selectedCard, comment) => mutation.mutate({ action: 'assign', card: selectedCard, comment })}
              onUpdate={(selectedCard, comment) => mutation.mutate({ action: 'update', card: selectedCard, comment })}
              onUnassign={(selectedCard) => mutation.mutate({ action: 'remove', card: selectedCard })}
              onSuggest={async (selectedCard, setComment, setNotice) => {
                try {
                  const suggestion = await suggestionMutation.mutateAsync({ card: selectedCard })
                  setComment(suggestion.suggestion)
                  if (suggestion.used_fallback) {
                    const reasons = [...new Set(suggestion.fallback_reasons.map(
                      ({ reason }) => fallbackReasonMessages[reason],
                    ).filter(Boolean))]
                    setNotice({
                      kind: 'fallback',
                      message: [
                        'Neki dijelovi prijedloga koriste unaprijed pripremljen tekst.',
                        ...reasons,
                        'Provjeri prijedlog prije spremanja.',
                      ].join(' '),
                    })
                  }
                } catch (error) {
                  const errorCode = error instanceof LlmFeedbackError ? error.code : 'provider'
                  setNotice({
                    kind: 'error',
                    message: feedbackFailureMessages[errorCode] || feedbackFailureMessages.provider,
                  })
                }
              }}
            />
          ))}
        </div>
      </div>
    </main>
  )
}