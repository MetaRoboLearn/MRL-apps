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
    header: 'Redoslijed',
    cell: ({ row }) => <ReorderButtons activityTask={row.original} />,
  }),
  columnHelper.accessor('task_id', {
    header: 'ID zadatka',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('task_title', {
    header: 'Naslov zadatka',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('preview', {
    header: 'Sažetak',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('task_type', {
    header: 'Vrsta',
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('allows_robot', {
    header: 'Robot',
    cell: (info) => (
      <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
        {info.getValue() ? 'Da' : 'Ne'}
      </span>
    ),
  }),
  columnHelper.accessor('is_logged', {
    header: 'Bilježi se (logging)',
    cell: (info) => (
      <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
        {info.getValue() ? 'Da' : 'Ne'}
      </span>
    ),
  }),
  columnHelper.accessor('student_mode', {
    header: 'Način odabira učenika',
    cell: (info) => {
        const mode = info.getValue()
        if (mode === 'all') return <span className="text-gray-500">Svi učenici</span>
        if (mode === 'include') return <span className="text-blue-600">Odabrani učenici</span>
        return <span className="text-orange-600">Isključeni učenici</span>
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
    header: 'Stvorio',
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
      Uredi
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
      Učenici
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
    if (!confirm('Jeste li sigurni da želite ukloniti ovaj zadatak?')) return
    mutation.mutate()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={mutation.isPending}
      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors disabled:opacity-50"
    >
      {mutation.isPending ? '...' : 'Ukloni'}
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
        if (!confirm('Jeste li sigurni da želite obrisati ovu aktivnost?')) return
        mutation.mutate()
      }}
      disabled={hasTasks || mutation.isPending}
      title={hasTasks ? 'Prije brisanja uklonite sve zadatke' : 'Obriši aktivnost'}
      className={`px-4 py-2 text-white text-sm rounded-md transition-colors ${
        hasTasks
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      {mutation.isPending ? 'Brisanje...' : 'Obriši aktivnost'}
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
    <div className="readable-content p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{activity.title}</h1>
        <button
          onClick={() => navigate({ to: '/admin/activities' })}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Natrag na aktivnosti
        </button>
      </div>

      {/* Activity Details Card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Detalji aktivnosti</h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigate({ to: '/admin/activities/$activityId/edit', params: { activityId } })}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
              >
                Uredi aktivnost
              </button>
              <DeleteActivityButton />
            </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-600">Opis</span>
            <p className="mt-1">{activity.description || '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status</span>
            <p className="mt-1">
              <span className={activity.active ? 'text-green-600' : 'text-red-600'}>
                {activity.active ? 'Aktivna' : 'Neaktivna'}
              </span>
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Stvorio</span>
            <p className="mt-1">
              {activity.creator
                ? `${activity.creator.first_name} ${activity.creator.last_name} (@${activity.creator.username})`
                : '—'}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Vrijeme početka</span>
            <p className="mt-1">{activity.time_from ? formatLocalDateTime(activity.time_from) : '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Stvoreno</span>
            <p className="mt-1">{formatLocalDateTime(activity.created_at)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Vrijeme završetka</span>
            <p className="mt-1">{activity.time_to ? formatLocalDateTime(activity.time_to) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Zadaci</h2>
        <button
          onClick={() => navigate({to: '/admin/activities/$activityId/tasks/add', params: {activityId}})}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-2"
        >
          <span>+</span>
          Dodaj zadatak
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
                  Još nema dodijeljenih zadataka. Kliknite „Dodaj zadatak” za početak.
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