import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createGroup } from '../../../../api/groupsApi.ts'
import { GroupForm } from '../../../../components/Forms/GroupForm.tsx'

export const Route = createFileRoute('/admin/users/groups/new')({ component: RouteComponent })

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>()
  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate({ to: '/admin/users/groups/$groupId', params: { groupId: result.group_id.toString() } })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Group</h1>
      <GroupForm submitLabel="Create Group" isLoading={mutation.isPending} error={error} onSubmit={async (groupName) => { await mutation.mutateAsync({ group_name: groupName }) }} />
    </div>
  )
}