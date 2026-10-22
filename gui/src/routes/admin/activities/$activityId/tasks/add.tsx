// routes/admin/activities/$activityId/tasks/add.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getActivityTasks, createActivityTask } from '../../../../../api/activitiesApi.ts'
import { getTypes } from '../../../../../api/typesApi.ts'
import { ActivityTaskForm } from '../../../../../components/Activity/ActivityTaskForm.tsx'

const typesQueryOptions = queryOptions({
  queryKey: ['types'],
  queryFn: getTypes,
})

const activityTasksQueryOptions = (activityId: string) =>
  queryOptions({
    queryKey: ['activity-tasks', activityId],
    queryFn: () => getActivityTasks(activityId),
  })

export const Route = createFileRoute('/admin/activities/$activityId/tasks/add')({
  loader: ({ context, params }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(typesQueryOptions),
      context.queryClient.ensureQueryData(activityTasksQueryOptions(params.activityId)),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: types } = useSuspenseQuery(typesQueryOptions)
  const { data: existingTasks } = useSuspenseQuery(activityTasksQueryOptions(activityId))
  const [error, setError] = useState<string>()

  const nextOrder = existingTasks.length > 0
    ? Math.max(...existingTasks.map((t: { order: number }) => t.order)) + 1
    : 1

  const mutation = useMutation({
    mutationFn: createActivityTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] })
      navigate({ to: '/admin/activities/$activityId', params: { activityId } })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: { task_id: number | null; type_id: number; preview: string; instructions: string; is_logged: boolean; allows_robot: boolean; difficulty: number | null }) => {
    setError(undefined)
    if (!data.task_id) return

    await mutation.mutateAsync({
      activity_id: Number(activityId),
      task_id: data.task_id,
      type_id: data.type_id,
      order: nextOrder,
      preview: data.preview || undefined,
      instructions: data.instructions || undefined,
      is_logged: data.is_logged,
      allows_robot: data.allows_robot,
      difficulty: data.difficulty,
    })
  }

  return (
    <div className="p-4 w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Task to Activity</h1>
      <ActivityTaskForm
        types={types}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
        cancelTo={`/admin/activities/${activityId}`}
      />
    </div>
  )
}