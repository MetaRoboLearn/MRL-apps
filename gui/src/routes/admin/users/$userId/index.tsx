// /admin/users/$userId/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserById, deleteUser } from "../../../../api/usersApi.ts"
import { formatLocalDateTime } from "../../../../utils.ts"
import { UserBadgesSection } from '../../../../components/User/UserBadgesSection'

const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
  })

export const Route = createFileRoute('/admin/users/$userId/')({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(userQueryOptions(params.userId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate({ to: '/admin/users' })
    },
    onError: (error: Error) => {
      alert(`Failed to delete user: ${error.message}`)
    },
  })

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Details</h1>
        <button
          onClick={() => navigate({ to: '/admin/users' })}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Back to Users
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: User Info + Actions */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {user.first_name} {user.last_name}
                  </h2>
                  <p className="text-gray-600">@{user.username}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                  <p className="text-base">{user.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                  <p className="text-base">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                  <p className="text-base">{user.first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                  <p className="text-base">{user.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <p className="text-base">Role {user.role_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Login</label>
                  <p className="text-base">{user.last_login ? formatLocalDateTime(user.last_login) : 'Never'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                  <p className="text-base">{formatLocalDateTime(user.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
                  <p className="text-base">{formatLocalDateTime(user.updated_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created By</label>
                  <p className="text-base">{user.created_by ? `User #${user.created_by}` : 'System'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Updated By</label>
                  <p className="text-base">{user.updated_by ? `User #${user.updated_by}` : 'System'}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate({ to: '/admin/users/$userId/edit', params: { userId } })}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
                >
                  Edit User
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Badges */}
        <div className="lg:w-1/2">
          <UserBadgesSection userId={userId} />
        </div>
      </div>
    </div>
  )
}