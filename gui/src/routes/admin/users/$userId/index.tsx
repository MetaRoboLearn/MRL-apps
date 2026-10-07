// /admin/users/$userId/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserById, deleteUser } from "../../../../api/usersApi.ts"
import { formatLocalDateTime } from "../../../../utils.ts"

const roleLabel = (role: string) => ({
  admin: 'Administrator',
  teacher: 'Nastavnik',
  student: 'Učenik',
}[role.toLowerCase()] || role)

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
      alert(`Brisanje korisnika nije uspjelo: ${error.message}`)
    },
  })

  const handleDelete = () => {
    if (confirm(`Jeste li sigurni da želite obrisati korisnika ${user.first_name} ${user.last_name}?`)) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="readable-content p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Detalji korisnika</h1>
        <button
          onClick={() => navigate({ to: '/admin/users' })}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Nazad na korisnike
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
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
                  {user.active ? 'Aktivan' : 'Neaktivan'}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">ID korisnika</label>
                  <p className="text-base">{user.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Korisničko ime</label>
                  <p className="text-base">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ime</label>
                  <p className="text-base">{user.first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Prezime</label>
                  <p className="text-base">{user.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Uloga</label>
                  <p className="text-base">{roleLabel(user.role_name)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Posljednja prijava</label>
                  <p className="text-base">{user.last_login ? formatLocalDateTime(user.last_login) : 'Nikada'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Kreirano</label>
                  <p className="text-base">{formatLocalDateTime(user.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ažurirano</label>
                  <p className="text-base">{formatLocalDateTime(user.updated_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Kreirao</label>
                  <p className="text-base">{user.created_by ? `Korisnik #${user.created_by}` : 'Sustav'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ažurirao</label>
                  <p className="text-base">{user.updated_by ? `Korisnik #${user.updated_by}` : 'Sustav'}</p>
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
                  Uredi korisnika
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? 'Brisanje...' : 'Obriši korisnika'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}