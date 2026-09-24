import { formatLocalDateTime } from '../../utils.ts'
import { Submission } from '../../types/analyticsTypes.ts'

type SubmissionCardProps = {
  submission: Submission
  onView: (submission: Submission) => void
}

const statusLabel = (status: string) => status.replace(/_/g, ' ')

const statusClasses = (status: string) => {
  if (status.startsWith('Success')) return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (status === 'Fail') return 'bg-red-100 text-red-800 ring-red-200'
  if (status === 'Abandoned') return 'bg-amber-100 text-amber-800 ring-amber-200'
  return 'bg-gray-100 text-gray-700 ring-gray-200'
}

export function SubmissionCard({ submission, onView }: SubmissionCardProps) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
      <div>
        <p className="text-sm text-gray-500">{submission.activity_title || 'Activity'}</p>
        <h3 className="font-semibold text-gray-900">{submission.task_name || `Task #${submission.task_id}`}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className={`rounded-full px-2.5 py-1 font-medium capitalize ring-1 ${statusClasses(submission.status)}`}>
            {statusLabel(submission.status)}
          </span>
          {submission.attempt_count && <span>Attempt count: {submission.attempt_count}</span>}
          {submission.attempt_date && <span>Date of attempt: {formatLocalDateTime(submission.attempt_date)}</span>}
        </div>
      </div>
      <button type="button" onClick={() => onView(submission)} className="rounded-md border border-turquoise-500 px-3 py-2 text-sm font-medium text-turquoise-700 hover:bg-turquoise-50">
        View submission
      </button>
    </article>
  )
}