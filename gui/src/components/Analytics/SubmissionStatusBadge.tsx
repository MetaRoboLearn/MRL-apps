import { SubmissionStatus } from '../../types/analyticsTypes.ts'

type SubmissionStatusBadgeProps = {
  status: SubmissionStatus
}

const statusPresentation: Record<SubmissionStatus, { label: string; className: string }> = {
  Success: { label: 'Uspješno', className: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  Fail: { label: 'Neuspješno', className: 'bg-red-100 text-red-800 ring-red-200' },
  in_progress: { label: 'U tijeku', className: 'bg-sky-100 text-sky-800 ring-sky-200' },
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const presentation = statusPresentation[status]

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ring-1 ${presentation.className}`}>
      {presentation.label}
    </span>
  )
}