import {createFileRoute, useNavigate} from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import {UserForm} from "../../../components/User/UserForm.tsx";
import {createUser} from "../../../api/usersApi.ts";
import {CreateUserRequest} from "../../../types/userTypes.ts";
import {getRoles} from "../../../api/usersApi.ts";

const rolesQueryOptions = queryOptions({
  queryKey: ['roles'],
  queryFn: getRoles,
})

export const Route = createFileRoute('/admin/users/new')({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(rolesQueryOptions)
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: roles } = useSuspenseQuery(rolesQueryOptions)
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      navigate({ to: '/admin/users' })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: CreateUserRequest) => {
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
      <h1 className="text-2xl font-bold mb-6">Add New User</h1>
      <UserForm
        roles={roles}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
      />
    </div>
  )
}