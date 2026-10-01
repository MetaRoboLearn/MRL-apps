import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getSubmissions } from '../api/analyticsApi.ts'
import { getMyBadges } from '../api/userBadgeApi.ts'
import { SubmissionModal } from '../components/Analytics/SubmissionModal.tsx'
import { SubmissionCard } from '../components/Analytics/SubmissionCard.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { BadgeCatalogEntry } from '../types/userBadgeTypes.ts'
import { Submission, SubmissionStatus } from '../types/analyticsTypes.ts'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

type SubmissionFilter = 'all' | 'success' | 'fail' | 'in_progress'
type BadgeFilter = 'all' | 'assigned' | 'unassigned'

function BadgeCatalog({ filter, setFilter, onClose }: { filter: BadgeFilter; setFilter: (filter: BadgeFilter) => void; onClose: () => void }) {
  const { data: badges = [], isLoading, error } = useQuery({
    queryKey: ['myBadges', filter],
    queryFn: () => getMyBadges(filter),
  })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto max-w-4xl rounded-md bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Badge catalog</h2>
          <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Close</button>
        </div>
        <div className="mb-5 flex gap-2">
          {(['all', 'assigned', 'unassigned'] as BadgeFilter[]).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-md px-3 py-2 text-sm font-medium ${filter === value ? 'bg-turquoise-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        {isLoading ? <p>Loading badges...</p> : error ? <p className="text-red-600">{error.message}</p> : badges.length === 0 ? <p className="text-gray-500">No badges found.</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {badges.map((badge: BadgeCatalogEntry) => (
              <article key={badge.badge_id} className={`flex gap-4 rounded-md border p-4 ${badge.assigned ? 'border-sunglow-300 bg-sunglow-50' : 'border-gray-200 bg-gray-100 opacity-70'}`}>
                <img src={badge.image_url} alt={badge.title} className="h-20 w-20 shrink-0 object-contain" />
                <div>
                  <h3 className="font-bold text-gray-900">{badge.title}</h3>
                  {badge.assigned && <p className="mt-1 text-sm text-gray-600">{badge.description || 'No description.'}</p>}
                  {!badge.assigned && <p className="mt-2 text-sm italic text-gray-500">{badge.unassigned_message || 'Complete the linked task to earn this badge.'}</p>}
                  {badge.comment && <p className="mt-2 text-sm italic text-gray-700">{badge.comment}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfilePage() {
  const { user } = useAuth()
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showBadges, setShowBadges] = useState(false)
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all')
  const submissionsQuery = useQuery({
    queryKey: ['submissions'],
    queryFn: getSubmissions,
    enabled: user?.role === 'student',
  })
  const assignedBadgesQuery = useQuery({
    queryKey: ['myBadges', 'assigned'],
    queryFn: () => getMyBadges('assigned'),
    enabled: user?.role === 'student',
  })

  const submissions = useMemo(() => {
    const values = submissionsQuery.data || []
    if (submissionFilter === 'all') return values
    const statusByFilter: Record<Exclude<SubmissionFilter, 'all'>, SubmissionStatus> = {
      success: 'Success',
      fail: 'Fail',
      in_progress: 'in_progress',
    }
    return values.filter((submission) => submission.status === statusByFilter[submissionFilter])
  }, [submissionFilter, submissionsQuery.data])
  const totalPoints = (assignedBadgesQuery.data || []).reduce((sum, badge) => sum + badge.value, 0)

  if (!user) return null

  return (
    <main className="min-h-full overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-md border border-white-smoke-500 bg-white p-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-3 border-turquoise-400 bg-turquoise-200 text-3xl font-bold text-turquoise-600">{user.first_name[0]}{user.last_name[0]}</div>
            <div>
              <h1 className="text-3xl font-bold text-dark-neutrals-500">{user.first_name} {user.last_name}</h1>
              <p className="mt-1 text-lg text-dark-neutrals-300">@{user.username}</p>
            </div>
            {user.role === 'student' && <div className="ml-auto flex items-center gap-4"><div className="text-right"><p className="text-sm font-bold uppercase text-dark-neutrals-300">Total stars</p><p className="text-3xl font-bold text-sunglow-500">{totalPoints}</p></div><button type="button" onClick={() => setShowBadges(true)} className="rounded-md bg-turquoise-500 px-4 py-2 font-semibold text-white hover:bg-turquoise-600">View badges</button></div>}
          </div>
        </header>

        {user.role === 'student' && <section className="rounded-md border border-white-smoke-500 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-dark-neutrals-500">Moje aktivnosti</h2>
            <div className="flex flex-wrap gap-2">
              {([['all', 'Sve'], ['success', 'Uspješne'], ['fail', 'Neuspješne'], ['in_progress', 'U tijeku']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setSubmissionFilter(value)} className={`rounded-md px-3 py-2 text-sm font-medium ${submissionFilter === value ? 'bg-turquoise-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{label}</button>)}
            </div>
          </div>
          {submissionsQuery.isLoading ? (
            <p>Učitavanje predaja...</p>
          ) : submissionsQuery.error ? (
            <p className="text-red-600">Predaje nije moguće učitati.</p>
          ) : submissions.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Nema predaja za odabrani filtar.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.activity_task_id}
                  submission={submission}
                  onView={setSelectedSubmission}
                />
              ))}
            </div>
          )}
        </section>}
      </div>
      {selectedSubmission && <SubmissionModal submission={selectedSubmission} onClose={() => setSelectedSubmission(null)} />}
      {showBadges && <BadgeCatalog filter={badgeFilter} setFilter={setBadgeFilter} onClose={() => setShowBadges(false)} />}
    </main>
  )
}

