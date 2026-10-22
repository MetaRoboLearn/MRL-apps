import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  getActivityTaskById,
  getActivityTaskStudents,
  setActivityTaskStudents
} from "../../../../../../api/activitiesApi.ts"
import { getUsersByIds } from "../../../../../../api/usersApi.ts"

export const Route = createFileRoute(
  '/admin/activities/$activityId/tasks/$activityTaskId/students',
)({
  component: RouteComponent,
})

type StudentMode = 'all' | 'include' | 'exclude'

type Student = {
  id: number
  first_name: string
  last_name: string
  username: string
}

const PAGE_SIZE = 20

function RouteComponent() {
  const { activityId, activityTaskId } = Route.useParams()
  const navigate = useNavigate()

  const [mode, setMode] = useState<StudentMode>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [initialized, setInitialized] = useState(false)

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

  // Initialize mode and selected IDs from first API response
  useEffect(() => {
    if (studentData && !initialized) {
      setMode(studentData.student_mode)
      setSelectedIds(new Set(studentData.selected_ids))
      setInitialized(true)
    }
  }, [studentData, initialized])

  const saveMutation = useMutation({
    mutationFn: () =>
      setActivityTaskStudents(activityTaskId, {
        student_mode: mode,
        user_ids: Array.from(selectedIds),
      }),
  })

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleModeChange = (newMode: StudentMode) => {
    setMode(newMode)
    setSelectedIds(new Set())
  }

  const handleSearch = () => {
    setSearchQuery(search)
    setPage(0)
  }

  const students: Student[] = studentData?.students || []
  const isSpecificMode = mode === 'include' || mode === 'exclude'
  const actionLabel = mode === 'exclude' ? 'Exclude' : 'Add'
  const undoLabel = mode === 'exclude' ? 'Include' : 'Remove'

  // Left side only shows unselected students
  const unselected = students.filter((s) => !selectedIds.has(s.id))
  const hasMore = students.length === PAGE_SIZE

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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: All students */}
          <div className="lg:w-1/2 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">All Students</h3>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search students..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                Search
              </button>
            </div>

            <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
              ) : unselected.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No students found.
                </div>
              ) : (
                unselected.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">
                        {student.first_name} {student.last_name}
                      </span>
                      <span className="text-gray-400 ml-2 text-xs">@{student.username}</span>
                    </div>
                    <button
                      onClick={() => toggleStudent(student.id)}
                      className={`ml-3 flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        mode === 'exclude'
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {actionLabel}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between mt-3 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-gray-500 text-xs">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Right: Selected students */}
          <div className="lg:w-1/2 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-1">
              {mode === 'exclude' ? 'Excluded' : 'Added'} Students
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''}{' '}
              {mode === 'exclude' ? 'excluded' : 'added'}
            </p>

            <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
              {selectedIds.size === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No students {mode === 'exclude' ? 'excluded' : 'added'} yet.
                </div>
              ) : (
                selectedStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                      mode === 'exclude' ? 'bg-orange-50' : 'bg-blue-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-medium">
                        {student.first_name} {student.last_name}
                      </span>
                      <span className="text-gray-400 ml-2 text-xs">@{student.username}</span>
                    </div>
                    <button
                      onClick={() => toggleStudent(student.id)}
                      className="ml-3 flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      {undoLabel}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <div className="flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-md py-8">
            All students will be included in this task.
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() =>
            navigate({
              to: '/admin/activities/$activityId',
              params: { activityId },
            })
          }
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