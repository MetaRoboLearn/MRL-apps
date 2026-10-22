import { formatLocalDateTime } from '../../utils.ts'
import { Submission } from '../../types/analyticsTypes.ts'
import { SubmissionStatusBadge } from './SubmissionStatusBadge.tsx'

type SubmissionCardProps = {
  submission: Submission
  onView: (submission: Submission) => void
}

const MAX_TASK_NAME_LENGTH = 80

export function SubmissionCard({ submission, onView }: SubmissionCardProps) {
  const taskName = submission.task_name || `Zadatak #${submission.task_id}`
  const displayedTaskName = taskName.length > MAX_TASK_NAME_LENGTH
    ? `${taskName.slice(0, MAX_TASK_NAME_LENGTH - 3).trimEnd()}...`
    : taskName

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {submission.badge && (
          <img
            src={submission.badge.image_url}
            alt={`Značka: ${submission.badge.title}`}
            className="h-16 w-16 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{submission.activity_title || 'Aktivnost'}</p>
          <h3 className="max-w-full truncate font-semibold text-gray-900" title={taskName}>{displayedTaskName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <SubmissionStatusBadge status={submission.status} />
            {submission.attempt_date && <span>Pokrenuto: {formatLocalDateTime(submission.attempt_date)}</span>}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => onView(submission)} className="shrink-0 rounded-md bg-turquoise-500 px-3 py-2 text-sm font-medium text-white hover:bg-turquoise-600">
        Otvori predaju
      </button>
    </article>
  )
}