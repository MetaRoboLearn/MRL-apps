import { formatLocalDateTime } from '../../utils.ts'
import { Submission } from '../../types/analyticsTypes.ts'
import { CodeAnalysisViewer } from './CodeAnalysisViewer.tsx'
import { SubmissionStatusBadge } from './SubmissionStatusBadge.tsx'

type SubmissionModalProps = {
  submission: Submission
  onClose: () => void
}

export function SubmissionModal({ submission, onClose }: SubmissionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="submission-modal-title">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-md bg-white p-4 shadow-2xl sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">{submission.activity_title || 'Aktivnost'}</p>
            <h2 id="submission-modal-title" className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
              {submission.task_name || `Zadatak #${submission.task_id}`}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-600">
            Zatvori
          </button>
        </div>
        <dl className="mb-6 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="mt-1"><SubmissionStatusBadge status={submission.status} /></dd>
          </div>
          <div>
            <dt className="text-gray-500">Trajanje</dt>
            <dd className="mt-1 font-semibold text-gray-900">{submission.duration_seconds} s</dd>
          </div>
          <div>
            <dt className="text-gray-500">Broj pokretanja</dt>
            <dd className="mt-1 font-semibold text-gray-900">{submission.attempt_count}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Datum pokretanja</dt>
            <dd className="mt-1 font-semibold text-gray-900">{submission.attempt_date ? formatLocalDateTime(submission.attempt_date) : '—'}</dd>
          </div>
        </dl>
        <CodeAnalysisViewer code={submission.final_code || ''} taskAnalysis={submission.task_analysis} expanded showElementStatusTooltip={false} />
        {submission.badge?.comment && (
          <div className="mt-6 rounded-md bg-sunglow-100 p-4">
            <h3 className="font-semibold text-gray-800">Komentar nastavnika</h3>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{submission.badge.comment}</p>
          </div>
        )}
      </div>
    </div>
  )
}