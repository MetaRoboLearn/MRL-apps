import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getActivityById, updateActivity } from '../../../../api/activitiesApi.ts'
import { ActivityForm } from '../../../../components/Activity/ActivityForm.tsx'
import { CreateActivityRequest } from '../../../../types/activityTypes.ts'

const activityQueryOptions = (activityId: string) =>
  queryOptions({
    queryKey: ['activity', activityId],
    queryFn: () => getActivityById(activityId),
  })

export const Route = createFileRoute('/admin/activities/$activityId/edit')({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(activityQueryOptions(params.activityId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { activityId } = Route.useParams()
  const navigate = useNavigate()
  const { data: activity } = useSuspenseQuery(activityQueryOptions(activityId))
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: updateActivity,
    onSuccess: () => {
      navigate({ to: '/admin/activities/$activityId', params: { activityId } })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: CreateActivityRequest) => {
    setError(undefined)
    await mutation.mutateAsync({ id: activityId, ...data })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Activity</h1>
      <ActivityForm
        activity={activity}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
        cancelTo={`/admin/activities/${activityId}`}
      />
    </div>
  )
}