// routes/admin/activities/$activityId/tasks/$activityTaskId/edit.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getActivityTaskById, updateActivityTask } from '../../../../../../api/activitiesApi.ts'
import { getTypes } from '../../../../../../api/typesApi.ts'
import { ActivityTaskForm } from '../../../../../../components/Activity/ActivityTaskForm.tsx'

const activityTaskQueryOptions = (activityTaskId: string) =>
  queryOptions({
    queryKey: ['activity-task', activityTaskId],
    queryFn: () => getActivityTaskById(activityTaskId),
  })

const typesQueryOptions = queryOptions({
  queryKey: ['types'],
  queryFn: getTypes,
})

export const Route = createFileRoute('/admin/activities/$activityId/tasks/$activityTaskId/edit')({
  loader: ({ context, params }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(activityTaskQueryOptions(params.activityTaskId)),
      context.queryClient.ensureQueryData(typesQueryOptions),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { activityId, activityTaskId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: activityTask } = useSuspenseQuery(activityTaskQueryOptions(activityTaskId))
  const { data: types } = useSuspenseQuery(typesQueryOptions)
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: updateActivityTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-tasks', activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-task', activityTaskId] })
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
      id: activityTaskId,
      task_id: data.task_id,
      type_id: data.type_id,
      preview: data.preview || undefined,
      instructions: data.instructions || undefined,
      is_logged: data.is_logged,
      allows_robot: data.allows_robot,
      difficulty: data.difficulty,
    })
  }

  return (
    <div className="p-4 w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Activity Task</h1>
      <ActivityTaskForm
        initialData={{
          task_id: activityTask.task_id,
          task_title: activityTask.task_title,
          type_id: activityTask.type_id,
          preview: activityTask.preview || '',
          instructions: activityTask.instructions || '',
          is_logged: activityTask.is_logged,
          allows_robot: activityTask.allows_robot,
          difficulty: activityTask.difficulty ?? null,
        }}
        types={types}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
        cancelTo={`/admin/activities/${activityId}`}
      />
    </div>
  )
}