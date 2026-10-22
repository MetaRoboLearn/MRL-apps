import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {queryOptions, useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query'
import {
  deleteActivity,
  deleteActivityTask,
  getActivityById,
  getActivityTasks,
  moveActivityTaskDown,
  moveActivityTaskUp
} from '../../../../api/activitiesApi.ts'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { ActivityTask } from '../../../../types/activityTypes.ts'
import {formatLocalDateTime} from "../../../../utils.ts";

const activityQueryOptions = (activityId: string) =>
  queryOptions({
    queryKey: ['activity', activityId],
    queryFn: () => getActivityById(activityId),
  })

const activityTasksQueryOptions = (activityId: string) =>
  queryOptions({
    queryKey: ['activity-tasks', activityId],
    queryFn: () => getActivityTasks(activityId),
  })

export const Route = createFileRoute('/admin/activities/$activityId/')({
  loader: ({ context, params }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(activityQueryOptions(params.activityId)),
      context.queryClient.ensureQueryData(activityTasksQueryOptions(params.activityId)),
    ])
  },
  component: RouteComponent,
})

const columnHelper = createColumnHelper<ActivityTask>()

const columns = [
  columnHelper.display({
    id: 'reorder',
    header: 'Order',
    cell: ({ row }) => <ReorderButtons activityTask={row.original} />,
  }),
  columnHelper.accessor('task_id', {
    header: 'Task ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('task_title', {
    header: 'Task Title',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('preview', {
    header: 'Preview',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('task_type', {
    header: 'Type',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('allows_robot', {
    header: 'Robot',
    cell: (info) => (
      <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
        {info.getValue() ? 'Yes' : 'No'}
      </span>
    ),
  }),
  columnHelper.accessor('is_logged', {
    header: 'Logged',
    cell: (info) => (
      <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
        {info.getValue() ? 'Yes' : 'No'}
      </span>
    ),
  }),
  columnHelper.accessor('student_mode', {
    header: 'Student mode',
    cell: (info) => {
        const mode = info.getValue()
        if (mode === 'all') return <span className="text-gray-500">All</span>
        if (mode === 'include') return <span className="text-blue-600">Specific</span>
        return <span className="text-orange-600">Excluded</span>
    },
  }),
  columnHelper.display({
    id: 'students',
    header: '',
    cell: ({ row }) => <StudentsButton activityTaskId={row.original.activity_task_id} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <EditTaskButton activityTaskId={row.original.activity_task_id} />,
  }),
  columnHelper.display({
    id: 'remove',
    header: '',
    cell: ({ row }) => <RemoveButton activityTask={row.original} />,
  }),
    columnHelper.accessor('creator', {
    header: 'Created By',
    cell: (info) => {
      const creator = info.getValue()
      if (!creator) return '—'
      return (
        <div>
          <div>{creator.first_name} {creator.last_name}</div>
          <div className="text-sm text-gray-500">@{creator.username}</div>
        </div>
      )
    },
  }),
]

function EditTaskButton({ activityTaskId }: { activityTaskId: number }) {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <button
      onClick={() =>
        navigate({
          to: '/admin/activities/$activityId/tasks/$activityTaskId/edit',
          params: { activityId, activityTaskId: activityTaskId.toString() },
        })
      }
      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
    >
      Edit
    </button>
  )
}

function StudentsButton({ activityTaskId }: { activityTaskId: number }) {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <button
      onClick={() =>
        navigate({
          to: '/admin/activities/$activityId/tasks/$activityTaskId/students',
          params: { activityId, activityTaskId: activityTaskId.toString() },
        })
      }
      className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-md transition-colors"
    >
      Students
    </button>
  )
}

function ReorderButtons({ activityTask }: { activityTask: ActivityTask }) {
  const { activityId } = Route.useParams()
  const queryClient = useQueryClient()

  const upMutation = useMutation({
    mutationFn: () => moveActivityTaskUp(activityTask.activity_task_id, activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] }),
  })

  const downMutation = useMutation({
    mutationFn: () => moveActivityTaskDown(activityTask.activity_task_id, activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] }),
  })

  const isPending = upMutation.isPending || downMutation.isPending

  return (
    <div className="flex items-center gap-1">
      <span className="w-6 text-center font-medium">{activityTask.order}</span>
      <button
        onClick={() => upMutation.mutate()}
        disabled={isPending}
        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:opacity-50 transition-colors"
      >
        ▲
      </button>
      <button
        onClick={() => downMutation.mutate()}
        disabled={isPending}
        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:opacity-50 transition-colors"
      >
        ▼
      </button>
    </div>
  )
}

function RemoveButton({ activityTask }: { activityTask: ActivityTask }) {
  const { activityId } = Route.useParams()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteActivityTask(activityTask.activity_task_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] }),
  })

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove this task?')) return
    mutation.mutate()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={mutation.isPending}
      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors disabled:opacity-50"
    >
      {mutation.isPending ? '...' : 'Remove'}
    </button>
  )
}

function DeleteActivityButton() {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()
  const { data: tasks } = useSuspenseQuery(activityTasksQueryOptions(activityId))

  const mutation = useMutation({
    mutationFn: () => deleteActivity(activityId),
    onSuccess: () => navigate({ to: '/admin/activities' }),
  })

  const hasTasks = tasks && tasks.length > 0

  return (
    <button
      onClick={() => {
        if (!confirm('Are you sure you want to delete this activity?')) return
        mutation.mutate()
      }}
      disabled={hasTasks || mutation.isPending}
      title={hasTasks ? 'Remove all tasks before deleting' : 'Delete activity'}
      className={`px-4 py-2 text-white text-sm rounded-md transition-colors ${
        hasTasks
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      {mutation.isPending ? 'Deleting...' : 'Delete Activity'}
    </button>
  )
}

function RouteComponent() {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()
  const { data: activity } = useSuspenseQuery(activityQueryOptions(activityId))
  const { data: tasks } = useSuspenseQuery(activityTasksQueryOptions(activityId))

  const table = useReactTable({
    data: tasks || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{activity.title}</h1>
        <button
          onClick={() => navigate({ to: '/admin/activities' })}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Back to Activities
        </button>
      </div>

      {/* Activity Details Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Activity Details</h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigate({ to: '/admin/activities/$activityId/edit', params: { activityId } })}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
              >
                Edit Activity
              </button>
              <DeleteActivityButton />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Description</span>
            <p className="mt-1">{activity.description || '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status</span>
            <p className="mt-1">
              <span className={activity.active ? 'text-green-600' : 'text-red-600'}>
                {activity.active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Created By</span>
            <p className="mt-1">
              {activity.creator
                ? `${activity.creator.first_name} ${activity.creator.last_name} (@${activity.creator.username})`
                : '—'}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Start Time</span>
            <p className="mt-1">{activity.time_from ? formatLocalDateTime(activity.time_from) : '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Created At</span>
            <p className="mt-1">{formatLocalDateTime(activity.created_at)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">End Time</span>
            <p className="mt-1">{activity.time_to ? formatLocalDateTime(activity.time_to) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button
          onClick={() => navigate({to: '/admin/activities/$activityId/tasks/add', params: {activityId}})}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-2"
        >
          <span>+</span>
          Add Task
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border border-gray-300 px-4 py-2 text-left font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No tasks assigned yet. Click "Add Task" to get started.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border border-gray-300 px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}