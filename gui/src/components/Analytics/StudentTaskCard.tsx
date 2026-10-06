import { useEffect, useState } from 'react'
import { formatDuration, formatLocalDateTime } from '../../utils.ts'
import { CodeAnalysisViewer } from './CodeAnalysisViewer.tsx'
import { TaskCard } from '../../types/analyticsTypes.ts'

type StudentTaskCardProps = {
  card: TaskCard
  onAssign: (card: TaskCard, comment: string) => void
  onUpdate: (card: TaskCard, comment: string) => void
  onUnassign: (card: TaskCard) => void
  onSuggest: (
    card: TaskCard,
    setComment: (comment: string) => void,
    setNotice: (notice: { kind: 'fallback' | 'error'; message: string } | null) => void,
  ) => void
  isMutating: boolean
  isSuggesting: boolean
  isSuggestionPending: boolean
}

const statusLabel = (status: string) => ({
  Success_sim: 'Uspjeh u simulatoru',
  Success_robot: 'Uspjeh s robotom',
  Success_both: 'Uspjeh simulatorom i robotom',
  Success: 'Uspješno',
  Fail: 'Neuspješno',
  Abandoned: 'Prekinuto',
}[status] || status.replace(/_/g, ' '))

const statusClasses = (status: string) => {
  if (status === 'Success_sim' || status === 'Success') return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (status === 'Success_robot') return 'bg-blue-100 text-blue-800 ring-blue-200'
  if (status === 'Success_both') return 'bg-teal-100 text-teal-800 ring-teal-200'
  if (status === 'Fail') return 'bg-red-100 text-red-800 ring-red-200'
  if (status === 'Abandoned') return 'bg-amber-100 text-amber-800 ring-amber-200'
  return 'bg-gray-100 text-gray-700 ring-gray-200'
}

export function StudentTaskCard({ card, onAssign, onUpdate, onUnassign, onSuggest, isMutating, isSuggesting, isSuggestionPending }: StudentTaskCardProps) {
  const [comment, setComment] = useState(card.badge?.comment || '')
  const [codeExpanded, setCodeExpanded] = useState(false)
  const [suggestionNotice, setSuggestionNotice] = useState<{ kind: 'fallback' | 'error'; message: string } | null>(null)
  const isAssigned = Boolean(card.badge)
  const completionPercent = typeof card.task_analysis?.weighted_completion === 'number'
    ? Math.min(100, Math.max(0, Math.round(card.task_analysis.weighted_completion * 100)))
    : null
  const completionTone = completionPercent === null
    ? null
    : completionPercent < 40
      ? { bar: 'bg-red-500', text: 'text-red-700', label: 'Niska pokrivenost' }
      : completionPercent < 80
        ? { bar: 'bg-amber-500', text: 'text-amber-700', label: 'Srednja pokrivenost' }
        : { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'Visoka pokrivenost' }

  useEffect(() => {
    setComment(card.badge?.comment || '')
  }, [card.badge?.comment, card.badge?.user_badge_id])

  return (
    <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{card.activity_title || 'Activity'}</p>
          <h2 className="text-xl font-semibold text-gray-900">{card.title || `Task #${card.task_id}`}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ring-1 ${statusClasses(card.status)}`}>{statusLabel(card.status)}</span>
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div><dt className="text-gray-500">Utrošeno vrijeme</dt><dd className="font-medium">{formatDuration(card.time_spent_seconds)}</dd></div>
        <div><dt className="text-gray-500">Broj pokretanja</dt><dd className="font-medium">{card.attempt_count}</dd></div>
        <div><dt className="text-gray-500">Razina strukture</dt><dd className="font-medium">{card.task_difficulty ?? '—'}</dd></div>
        <div><dt className="text-gray-500">Attempted</dt><dd className="font-medium">{card.attempt_date ? formatLocalDateTime(card.attempt_date) : '—'}</dd></div>
        {completionPercent !== null && (
          <div className="md:col-span-2">
            <dt id={`task-completion-label-${card.activity_task_id}`} className="text-gray-500">Postotak pokrivenih očekivanih elemenata</dt>
            <dd className="mt-1 flex items-center gap-3">
              <div
                role="progressbar"
                aria-labelledby={`task-completion-label-${card.activity_task_id}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercent}
                aria-valuetext={`${completionTone?.label}: ${completionPercent}%`}
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200"
              >
                <div
                  aria-hidden="true"
                  className={`h-full rounded-full transition-[width] duration-300 ${completionTone?.bar}`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className={`min-w-10 text-right font-semibold tabular-nums ${completionTone?.text}`}>{completionPercent}%</span>
            </dd>
          </div>
        )}
      </dl>

      <details className="mb-5 border-y border-gray-200 py-5">
        <summary className="cursor-pointer font-semibold text-gray-800">Learning trajectory</summary>
        <div className="pt-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <img src={card.trajectory_png} alt={`Learning trajectory for ${card.title || 'task'}`} className="mx-auto block h-auto w-full object-contain" />
          </div>
        </div>
      </details>

      <div className="mb-5 rounded-md bg-gray-50 p-4 text-sm">
        <h3 className="mb-2 font-semibold text-gray-800">Broj linija</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>Min: {card.code_complexity.min}</span>
          <span>Average: {card.code_complexity.average}</span>
          <span>Max: {card.code_complexity.max}</span>
        </div>
      </div>

      <details className="mb-5 border-b border-gray-200 pb-5" onToggle={(event) => setCodeExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold text-gray-800">Predani kod</summary>
        <div className="pt-3">
          <CodeAnalysisViewer code={card.final_code || ''} taskAnalysis={card.task_analysis} template={card.code_template} expanded visible={codeExpanded} />
        </div>
      </details>

      <section className="border-t border-gray-200 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-800">Badge</h3>
          {card.badge_definition ? <span className="text-sm text-gray-500">{card.badge_definition.title}</span> : <span className="text-sm text-gray-500">No badge linked to this task</span>}
        </div>
        {card.badge_definition && (
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Teacher comment" rows={3} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2 md:w-64">
              <button type="button" disabled={isMutating || isSuggestionPending} aria-busy={isSuggesting} onClick={() => {
                setSuggestionNotice(null)
                onSuggest(card, setComment, setSuggestionNotice)
              }} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                {isSuggesting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/40 border-t-gray-700" aria-hidden="true" />}
                {isSuggesting ? 'Generiranje prijedloga...' : 'Predloži komentar'}
              </button>
              {isAssigned ? (
                <>
                  <button type="button" disabled={isMutating} onClick={() => onUpdate(card, comment)} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Update</button>
                  <button type="button" disabled={isMutating} onClick={() => onUnassign(card)} className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Unassign</button>
                </>
              ) : (
                <button type="button" disabled={isMutating} onClick={() => onAssign(card, comment)} className="rounded-md bg-turquoise-500 px-3 py-2 text-sm font-medium text-white hover:bg-turquoise-600 disabled:opacity-50">Assign</button>
              )}
            </div>
          </div>
        )}
        {suggestionNotice && (
          <p
            role={suggestionNotice.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mt-3 text-sm ${suggestionNotice.kind === 'error' ? 'text-red-700' : 'text-amber-800'}`}
          >
            {suggestionNotice.message}
          </p>
        )}
      </section>
    </article>
  )
}