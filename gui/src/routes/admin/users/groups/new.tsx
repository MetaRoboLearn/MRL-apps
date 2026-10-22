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
    <div className="readable-content mx-auto w-full max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">Dodaj novu grupu</h1>
      <GroupForm submitLabel="Stvori grupu" isLoading={mutation.isPending} error={error} onSubmit={async (groupName) => { await mutation.mutateAsync({ group_name: groupName }) }} />
    </div>
  )
}