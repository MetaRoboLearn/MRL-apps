import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActivityTaskById,
  getActivityTaskStudents,
  setActivityTaskStudents
} from "../../../../../../api/activitiesApi.ts"
import { getUsersByIds } from "../../../../../../api/usersApi.ts"
import {  StudentSelector } from "../../../../../../components/User/StudentSelector.tsx"
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
  const actionLabel = mode === 'exclude' ? 'Exclude' : 'Add'
  const undoLabel = mode === 'exclude' ? 'Include' : 'Remove'

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Student Selection</h1>
          {task && (
            <p className="text-gray-500 mt-1">
              Task: {task.task_title} (ID: {task.task_id})
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
          Back
        </button>
      </div>

      {/* Mode dropdown */}
      <div className="mb-4 max-w-xs">
        <label className="block text-sm font-medium mb-1">Selection mode</label>
        <select
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as StudentMode)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All students</option>
          <option value="include">Add specific students</option>
          <option value="exclude">Exclude specific students</option>
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
          selectedTitle={mode === 'exclude' ? 'Excluded Students' : 'Added Students'}
          actionLabel={actionLabel}
          undoLabel={undoLabel}
          selectedEmptyLabel={`No students ${mode === 'exclude' ? 'excluded' : 'added'} yet.`}
          actionClassName={mode === 'exclude' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : undefined}
          selectedClassName={mode === 'exclude' ? 'bg-orange-50' : undefined}
          onSearchChange={setSearch}
          onSearch={handleSearch}
          onPageChange={setPage}
          onToggle={toggleStudent}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <div className="flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-md py-8">
            All students will be included in this task.
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => navigate({
            to: '/admin/activities/$activityId',
            params: { activityId },
          })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Cancel
        </button>
        {saveMutation.isSuccess && (
          <span className="self-center text-sm text-green-600">Saved!</span>
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