import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActivityTaskById,
  getActivityTaskStudents,
  setActivityTaskStudents
} from "../../../../../../api/activitiesApi.ts"
import { getUsersByIds } from "../../../../../../api/usersApi.ts"
import { GroupBatchSelector } from "../../../../../../components/User/GroupBatchSelector.tsx"
import { StudentSelector } from "../../../../../../components/User/StudentSelector.tsx"
import type { SelectableStudent } from "../../../../../../types/userTypes.ts"


export const Route = createFileRoute(
  '/admin/activities/$activityId/tasks/$activityTaskId/students',
)({
  component: RouteComponent,
})

type StudentMode = 'all' | 'include' | 'exclude'

const PAGE_SIZE = 20

function RouteComponent() {
  const { activityId, activityTaskId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<StudentMode>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [isDirty, setIsDirty] = useState(false)

  const { data: task } = useQuery({
    queryKey: ['activity-task', activityTaskId],
    queryFn: () => getActivityTaskById(activityTaskId),
  })

  // Left panel: paginated list of all students
  const { data: studentData, isLoading } = useQuery({
    queryKey: ['activity-task-students', activityTaskId, page, searchQuery],
    queryFn: () =>
      getActivityTaskStudents(activityTaskId, {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
      }),
  })

  // Right panel: fetch selected students by IDs
  const selectedIdsKey = useMemo(
    () => Array.from(selectedIds).sort((a, b) => a - b).join(','),
    [selectedIds]
  )

  const { data: selectedStudents = [] } = useQuery({
    queryKey: ['users-by-ids', selectedIdsKey],
    queryFn: () => getUsersByIds(Array.from(selectedIds)),
    enabled: selectedIds.size > 0,
    placeholderData: (prev) => prev,
  })

  // Synchronize from the server whenever the form has no unsaved local changes.
  useEffect(() => {
    if (studentData && !isDirty) {
      setMode(studentData.student_mode)
      setSelectedIds(new Set(studentData.selected_ids))
    }
  }, [studentData, isDirty])

  const saveMutation = useMutation({
    mutationFn: () =>
      setActivityTaskStudents(activityTaskId, {
        student_mode: mode,
        user_ids: Array.from(selectedIds),
      }),
    onSuccess: (savedState) => {
      setMode(savedState.student_mode)
      setSelectedIds(new Set(savedState.user_ids))
      setIsDirty(false)
      queryClient.setQueryData(
        ['activity-task-students', activityTaskId, page, searchQuery],
        (currentData: typeof studentData) => currentData ? {
          ...currentData,
          student_mode: savedState.student_mode,
          selected_ids: savedState.user_ids,
        } : currentData,
      )
      queryClient.invalidateQueries({ queryKey: ['activity-task-students', activityTaskId] })
      queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] })
    },
  })

  const toggleStudent = (id: number) => {
    setIsDirty(true)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const includeStudents = (studentIds: number[]) => {
    if (studentIds.length === 0) return
    setIsDirty(true)
    setSelectedIds((previous) => new Set([...previous, ...studentIds]))
  }

  const handleModeChange = (newMode: StudentMode) => {
    setIsDirty(true)
    setMode(newMode)
    setSelectedIds(new Set())
  }

  const handleSearch = () => {
    setSearchQuery(search)
    setPage(0)
  }

  const isSpecificMode = mode === 'include' || mode === 'exclude'
  const actionLabel = mode === 'exclude' ? 'Isključi' : 'Dodaj'
  const undoLabel = mode === 'exclude' ? 'Uključi' : 'Ukloni'

  return (
    <div className="readable-content p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Odabir učenika</h1>
          {task && (
            <p className="text-gray-500 mt-1">
              Zadatak: {task.task_title} (ID: {task.task_id})
            </p>
          )}
        </div>
        <button
          onClick={() =>
            navigate({
              to: '/admin/activities/$activityId',
              params: { activityId },
            })
          }
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Natrag
        </button>
      </div>

      {/* Mode dropdown */}
      <div className="mb-4 max-w-xs">
        <label className="mb-1 block font-medium">Način odabira</label>
        <select
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as StudentMode)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">Svi učenici</option>
          <option value="include">Dodaj određene učenike</option>
          <option value="exclude">Isključi određene učenike</option>
        </select>
      </div>

      {isSpecificMode ? (
        <StudentSelector
          students={(studentData?.students || []) as SelectableStudent[]}
          selectedStudents={selectedStudents as SelectableStudent[]}
          selectedIds={selectedIds}
          isLoading={isLoading}
          page={page}
          hasMore={(studentData?.students || []).length === PAGE_SIZE}
          search={search}
          selectedTitle={mode === 'exclude' ? 'Isključeni učenici' : 'Dodani učenici'}
          actionLabel={actionLabel}
          undoLabel={undoLabel}
          selectedEmptyLabel={mode === 'exclude' ? 'Još nema isključenih učenika.' : 'Još nema dodanih učenika.'}
          actionClassName={mode === 'exclude' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : undefined}
          selectedClassName={mode === 'exclude' ? 'bg-orange-50' : undefined}
          batchSelector={(
            <GroupBatchSelector selectedIds={selectedIds} onIncludeStudents={includeStudents} />
          )}
          onSearchChange={setSearch}
          onSearch={handleSearch}
          onPageChange={setPage}
          onToggle={toggleStudent}
        />
      ) : (
        <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-center rounded-md border border-dashed border-gray-200 py-8 text-gray-400">
            Svi učenici bit će uključeni u ovaj zadatak.
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Spremanje...' : 'Spremi'}
        </button>
        <button
          onClick={() => navigate({
            to: '/admin/activities/$activityId',
            params: { activityId },
          })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Odustani
        </button>
        {saveMutation.isSuccess && (
          <span className="self-center text-green-600">Spremljeno!</span>
        )}
        {saveMutation.isError && (
          <span className="self-center text-sm text-red-600">
            {saveMutation.error.message}
          </span>
        )}
      </div>

    </div>
  )
}