import { formatLocalDateTime } from '../../utils.ts'
import { Submission } from '../../types/analyticsTypes.ts'

type SubmissionCardProps = {
  submission: Submission
  onView: (submission: Submission) => void
}

const statusLabel = (status: string) => status.replace(/_/g, ' ')

const statusClasses = (status: string) => {
  if (status === 'Success') return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (status === 'Fail') return 'bg-red-100 text-red-800 ring-red-200'
  return 'bg-gray-100 text-gray-700 ring-gray-200'
}

const MAX_TASK_NAME_LENGTH = 80

export function SubmissionCard({ submission, onView }: SubmissionCardProps) {
  const taskName = submission.task_name || `Task #${submission.task_id}`
  const displayedTaskName = taskName.length > MAX_TASK_NAME_LENGTH
    ? `${taskName.slice(0, MAX_TASK_NAME_LENGTH - 3).trimEnd()}...`
    : taskName

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {submission.badge && (
          <img
            src={submission.badge.image_url}
            alt={`${submission.badge.title} badge`}
            className="h-16 w-16 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{submission.activity_title || 'Activity'}</p>
          <h3 className="max-w-full truncate font-semibold text-gray-900" title={taskName}>{displayedTaskName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className={`rounded-full px-2.5 py-1 font-medium capitalize ring-1 ${statusClasses(submission.status)}`}>
              {statusLabel(submission.status)}
            </span>
            {submission.attempt_count >= 0 && <span>Attempt count: {submission.attempt_count}</span>}
            {submission.attempt_date && <span>Date of attempt: {formatLocalDateTime(submission.attempt_date)}</span>}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => onView(submission)} className="shrink-0 rounded-md bg-turquoise-500 px-3 py-2 text-sm font-medium text-white hover:bg-turquoise-600">
        View submission
      </button>
    </article>
  )
}