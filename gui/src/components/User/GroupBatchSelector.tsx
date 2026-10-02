import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGroups } from '../../api/groupsApi.ts'
import { getGroupMembers } from '../../api/userGroupsApi.ts'

type GroupBatchSelectorProps = {
  selectedIds: ReadonlySet<number>
  onIncludeStudents: (studentIds: number[]) => void
}

export function GroupBatchSelector({ selectedIds, onIncludeStudents }: GroupBatchSelectorProps) {
  const [loadingGroupIds, setLoadingGroupIds] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null)
  const { data: groups = [], isLoading, isError } = useQuery({
    queryKey: ['activity-task-assignment-groups'],
    queryFn: getGroups,
  })

  const includeGroup = async (groupId: number, groupName: string) => {
    setFeedback(null)
    setLoadingGroupIds((previous) => new Set(previous).add(groupId))

    try {
      const members = await getGroupMembers(String(groupId))
      const studentIds = members
        .filter((member) => member.role === 'student')
        .map((member) => member.user_id)

      if (studentIds.length === 0) {
        setFeedback({ message: `Grupa ${groupName} nema učenika.`, isError: false })
        return
      }

      const addedCount = studentIds.filter((studentId) => !selectedIds.has(studentId)).length
      onIncludeStudents(studentIds)
      setFeedback({
        message: addedCount === 0
          ? `Svi učenici iz grupe ${groupName} već su u odabiru.`
          : `Dodano učenika iz grupe ${groupName}: ${addedCount}.`,
        isError: false,
      })
    } catch {
      setFeedback({ message: 'Učenike iz grupe nije moguće učitati.', isError: true })
    } finally {
      setLoadingGroupIds((previous) => {
        const next = new Set(previous)
        next.delete(groupId)
        return next
      })
    }
  }

  return (
    <details className="mb-4 rounded-md border border-gray-200">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        Dodavanje iz grupa
      </summary>
      <div className="border-t border-gray-200 p-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Učitavanje grupa...</p>
        ) : isError ? (
          <p className="text-sm text-red-600" role="alert">
            Grupe nije moguće učitati.
          </p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">Nema dostupnih grupa.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map((group) => {
              const isGroupLoading = loadingGroupIds.has(group.group_id)

              return (
                <li key={group.group_id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm">{group.group_name}</span>
                  <button
                    type="button"
                    onClick={() => includeGroup(group.group_id, group.group_name)}
                    disabled={isGroupLoading}
                    aria-label={`Uključi učenike iz grupe ${group.group_name}`}
                    className="shrink-0 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGroupLoading ? 'Učitavanje...' : 'Uključi grupu'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {feedback && (
          <p
            className={`mt-2 text-sm ${feedback.isError ? 'text-red-600' : 'text-gray-600'}`}
            role={feedback.isError ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
      </div>
    </details>
  )
}