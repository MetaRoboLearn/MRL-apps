import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAvailableActivities } from '../../api/activitiesApi.ts'
import { getMyBadges } from '../../api/userBadgeApi.ts'
import ButtonSolveContinue from '../Solve/ButtonSolveContinue.tsx'
import ButtonSolveStart from '../Solve/ButtonSolveStart.tsx'
import { AvailableActivity } from '../../types/activityTypes.ts'
import { BadgeCatalogEntry } from '../../types/userBadgeTypes.ts'

type BadgeFilter = 'all' | 'assigned' | 'unassigned'

const filterOptions: { value: BadgeFilter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'assigned', label: 'Dodijeljene' },
  { value: 'unassigned', label: 'Nedodijeljene' },
]

type AvailableTask = AvailableActivity['activity_tasks'][number]

function BadgeTaskAction({
  task,
  isFetching,
  isError,
  onStartError,
}: {
  task: AvailableTask | undefined
  isFetching: boolean
  isError: boolean
  onStartError: () => void
}) {
  const [startFailed, setStartFailed] = useState(false)
  let action = <button type="button" disabled className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-600 disabled:cursor-not-allowed">Provjera dostupnosti...</button>

  if (!isFetching) {
    if (isError) {
      action = (
        <div>
          <button type="button" disabled className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-600 disabled:cursor-not-allowed">Dostupnost nepoznata</button>
          <p className="mt-1 text-sm text-gray-600">Dostupnost aktivnosti trenutačno nije moguće provjeriti.</p>
        </div>
      )
    } else if (!task) {
      action = (
        <div>
          <button type="button" disabled className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-600 disabled:cursor-not-allowed">Nije dostupno</button>
          <p className="mt-1 text-sm text-gray-600">Povezana aktivnost ili zadatak trenutačno nije dostupna.</p>
        </div>
      )
    } else if (task.is_finished) {
      action = (
        <div>
          <button type="button" disabled className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-600 disabled:cursor-not-allowed">Zadatak je dovršen</button>
          <p className="mt-1 text-sm text-gray-600">Već si riješio/la povezani zadatak.</p>
        </div>
      )
    } else {
      action = task.started ? (
        <ButtonSolveContinue activityTaskId={task.activity_task_id} />
      ) : (
        <ButtonSolveStart
          activityTaskId={task.activity_task_id}
          onError={() => {
            setStartFailed(true)
            onStartError()
          }}
        />
      )
    }
  }

  return (
    <div>
      {action}
      {startFailed && <p role="alert" className="mt-1 text-sm text-red-700">Pokretanje zadatka nije uspjelo. Provjeri dostupnost i pokušaj ponovno.</p>}
    </div>
  )
}

export function BadgeCatalog({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<BadgeFilter>('all')
  const { data: badges = [], isLoading, error } = useQuery({
    queryKey: ['myBadges', filter],
    queryFn: () => getMyBadges(filter),
  })
  const {
    data: activities = [],
    isFetching: activitiesFetching,
    isError: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['activities', 'available'],
    queryFn: getAvailableActivities,
    retry: false,
  })
  const availableTasks = activities.flatMap((activity) => activity.activity_tasks)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-catalog-title"
        className="mx-auto max-w-4xl rounded-md bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="badge-catalog-title" className="text-2xl font-bold text-gray-900">Zbirka znački</h2>
          <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Zatvori</button>
        </div>
        <div className="mb-5 flex gap-2">
          {filterOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${filter === value ? 'bg-turquoise-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {isLoading ? <p>Učitavanje znački...</p> : error ? <p className="text-red-600">Značke nije moguće učitati.</p> : badges.length === 0 ? <p className="text-gray-500">Nema znački za prikaz.</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {badges.map((badge: BadgeCatalogEntry) => (
              <article key={badge.badge_id} className={`flex gap-4 rounded-md border p-4 ${badge.assigned ? 'border-sunglow-300 bg-sunglow-50' : 'border-gray-200 bg-gray-100 opacity-70'}`}>
                <img src={badge.image_url} alt={badge.title} className="h-20 w-20 shrink-0 object-contain" />
                <div>
                  <h3 className="font-bold text-gray-900">{badge.title}</h3>
                  {badge.assigned && <p className="mt-1 text-sm text-gray-600">{badge.description || 'Nema opisa.'}</p>}
                  {!badge.assigned && <p className="mt-2 text-sm italic text-gray-500">{badge.activity_title ? `Riješi zadatak iz aktivnosti „${badge.activity_title}” za ovu značku.` : 'Riješi povezani zadatak za ovu značku.'}</p>}
                  {badge.comment && <p className="mt-2 text-sm italic text-gray-700">{badge.comment}</p>}
                  {!badge.assigned && <div className="mt-3"><BadgeTaskAction
                    task={availableTasks.find(({ activity_task_id }) => activity_task_id === badge.relevant_activity_task_id)}
                    isFetching={activitiesFetching}
                    isError={activitiesError}
                    onStartError={() => { void refetchActivities() }}
                  /></div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}