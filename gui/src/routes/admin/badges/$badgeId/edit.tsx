import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BadgeForm } from '../../../../components/Badge/BadgeForm'
import {deleteBadge, getBadgeById, updateBadge} from "../../../../api/badgeApi.ts";

const badgeQueryOptions = (badgeId: string) =>
  queryOptions({
    queryKey: ['badge', badgeId],
    queryFn: () => getBadgeById(badgeId),
  })

export const Route = createFileRoute('/admin/badges/$badgeId/edit')({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(badgeQueryOptions(params.badgeId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { badgeId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: badge } = useSuspenseQuery(badgeQueryOptions(badgeId))
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateBadge(badgeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge', badgeId] })
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      navigate({ to: '/admin/badges' })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBadge(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      navigate({ to: '/admin/badges' })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: FormData) => {
    setError(undefined)
    await mutation.mutateAsync(data)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this badge?')) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="p-4 max-w-2xl w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Badge</h1>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium disabled:bg-gray-300"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Badge'}
        </button>
      </div>
      <BadgeForm
        badge={badge}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
      />
    </div>
  )
}