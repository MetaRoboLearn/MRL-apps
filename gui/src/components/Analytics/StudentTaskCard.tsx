import { useState } from 'react'
import { formatLocalDateTime } from '../../utils.ts'
import { CodeAnalysisViewer } from './CodeAnalysisViewer.tsx'
import { TaskCard } from '../../types/analyticsTypes.ts'

type StudentTaskCardProps = {
  card: TaskCard
  onAssign: (card: TaskCard, comment: string) => void
  onUpdate: (card: TaskCard, comment: string) => void
  onUnassign: (card: TaskCard) => void
  onSuggest: (card: TaskCard, setComment: (comment: string) => void) => void
  isMutating: boolean
  isSuggesting: boolean
  isSuggestionPending: boolean
}

const statusLabel = (status: string) => status.replace(/_/g, ' ')

const statusClasses = (status: string) => {
  if (status.startsWith('Success')) return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (status === 'Fail') return 'bg-red-100 text-red-800 ring-red-200'
  if (status === 'Abandoned') return 'bg-amber-100 text-amber-800 ring-amber-200'
  return 'bg-gray-100 text-gray-700 ring-gray-200'
}

export function StudentTaskCard({ card, onAssign, onUpdate, onUnassign, onSuggest, isMutating, isSuggesting, isSuggestionPending }: StudentTaskCardProps) {
  const [comment, setComment] = useState(card.badge?.comment || '')
  const isAssigned = Boolean(card.badge)

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
        <div><dt className="text-gray-500">Time spent</dt><dd className="font-medium">{card.time_spent_seconds}s</dd></div>
        <div><dt className="text-gray-500">Attempts</dt><dd className="font-medium">{card.attempt_count}</dd></div>
        <div><dt className="text-gray-500">Difficulty</dt><dd className="font-medium">{card.task_difficulty ?? '—'}</dd></div>
        <div><dt className="text-gray-500">Attempted</dt><dd className="font-medium">{card.attempt_date ? formatLocalDateTime(card.attempt_date) : '—'}</dd></div>
      </dl>

      <div className="mb-5 border-y border-gray-200 py-5">
        <h3 className="mb-3 font-semibold text-gray-800">Learning trajectory</h3>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <img src={card.trajectory_png} alt={`Learning trajectory for ${card.title || 'task'}`} className="mx-auto block h-auto w-full object-contain" />
        </div>
      </div>

      <div className="mb-5 rounded-md bg-gray-50 p-4 text-sm">
        <h3 className="mb-2 font-semibold text-gray-800">Code complexity</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>Min: {card.code_complexity.min}</span>
          <span>Average: {card.code_complexity.average}</span>
          <span>Max: {card.code_complexity.max}</span>
        </div>
      </div>

      <div className="mb-5 border-b border-gray-200 pb-5">
        <h3 className="mb-3 font-semibold text-gray-800">Submitted code</h3>
        <CodeAnalysisViewer code={card.final_code || ''} analysis={card.code_analysis} template={card.code_template} />
      </div>

      <section className="border-t border-gray-200 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-800">Badge</h3>
          {card.badge_definition ? <span className="text-sm text-gray-500">{card.badge_definition.title}</span> : <span className="text-sm text-gray-500">No badge linked to this task</span>}
        </div>
        {card.badge_definition && (
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Teacher comment" rows={3} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2 md:w-64">
              <button type="button" disabled={isMutating || isSuggestionPending} aria-busy={isSuggesting} onClick={() => onSuggest(card, setComment)} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                {isSuggesting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/40 border-t-gray-700" aria-hidden="true" />}
                {isSuggesting ? 'Generating comment...' : 'Suggest comment'}
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
        {card.badge?.comment && <p className="mt-3 text-sm italic text-gray-600">Current comment: “{card.badge.comment}”</p>}
      </section>
    </article>
  )
}