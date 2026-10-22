import {createFileRoute, useNavigate} from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserForm } from "../../../../components/User/UserForm.tsx";
import {getUserById, updateUser} from "../../../../api/usersApi.ts";
import {UpdateUserRequest} from "../../../../types/userTypes.ts";
import {getRoles} from "../../../../api/usersApi.ts";

const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
  })

const rolesQueryOptions = queryOptions({
  queryKey: ['roles'],
  queryFn: getRoles,
})

export const Route = createFileRoute('/admin/users/$userId/edit')({
  loader: ({ context, params }) => {
    return Promise.all([
      context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
      context.queryClient.ensureQueryData(rolesQueryOptions),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))
  const { data: roles } = useSuspenseQuery(rolesQueryOptions)
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate({ to: '/admin/users/$userId', params: { userId } })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: UpdateUserRequest) => {
    setError(undefined)

    await mutation.mutateAsync({
      username: data.username,
      password_hash: data.password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      role_id: data.role_id,
    })
  }

  return (
    <div className="p-4 max-w-2xl w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
      <UserForm
        user={user}
        roles={roles}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
      />
    </div>
  )
}