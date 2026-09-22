import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { getGroups } from '../../../../api/groupsApi.ts'
import { getUsers } from '../../../../api/usersApi.ts'
import { GroupSummary } from '../../../../types/groupTypes.ts'
import { User } from '../../../../types/userTypes.ts'
import { useAuth } from '../../../../hooks/useAuth.ts'

const groupsSearchSchema = z.object({
  search: z.string().optional().default(''),
  skip: z.number().optional().default(0),
  limit: z.number().optional().default(25),
  order_by_group_name: z.boolean().optional().default(true),
  created_by: z.number().optional(),
})

type GroupsSearch = z.infer<typeof groupsSearchSchema>

const groupsQueryOptions = queryOptions({
  queryKey: ['groups'],
  queryFn: getGroups,
})

const creatorQueryOptions = queryOptions({
  queryKey: ['group-creators'],
  queryFn: () => getUsers({ limit: 1000 }),
})

export const Route = createFileRoute('/admin/users/groups/')({
  validateSearch: groupsSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(groupsQueryOptions),
  component: RouteComponent,
})

const columnHelper = createColumnHelper<GroupSummary>()

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { data: groups = [] } = useSuspenseQuery(groupsQueryOptions)
  const { data: creators = [] } = useQuery({
    ...creatorQueryOptions,
    enabled: isAdmin,
  })
  const [searchInput, setSearchInput] = useState(search.search)

  const creatorById = useMemo(
    () => new Map((creators as User[]).map((creator) => [creator.id, creator])),
    [creators],
  )

  const visibleGroups = useMemo(() => {
    const normalizedSearch = search.search.trim().toLowerCase()
    const filtered = groups
      .filter((group) => !normalizedSearch || group.group_name.toLowerCase().includes(normalizedSearch))
      .filter((group) => search.created_by === undefined || group.created_by === search.created_by)
      .sort((left, right) => {
        if (search.order_by_group_name) {
          return left.group_name.localeCompare(right.group_name)
        }
        return left.group_id - right.group_id
      })

    return filtered.slice(search.skip, search.skip + search.limit)
  }, [groups, search])

  const totalFilteredGroups = groups.filter((group) => {
    const normalizedSearch = search.search.trim().toLowerCase()
    return (
      (!normalizedSearch || group.group_name.toLowerCase().includes(normalizedSearch)) &&
      (search.created_by === undefined || group.created_by === search.created_by)
    )
  }).length

  const columns = useMemo(() => [
    columnHelper.accessor('group_id', { header: 'ID', cell: (info) => info.getValue() }),
    columnHelper.accessor('group_name', { header: 'Group name', cell: (info) => info.getValue() }),
    columnHelper.accessor('created_at', { header: 'Created at', cell: (info) => new Date(info.getValue()).toLocaleString() }),
    ...(isAdmin ? [columnHelper.display({
      id: 'created_by',
      header: 'Created by',
      cell: ({ row }) => {
        const creator = creatorById.get(row.original.created_by ?? -1)
        return creator ? `${creator.first_name} ${creator.last_name}` : row.original.created_by ? `User #${row.original.created_by}` : '—'
      },
    })] : []),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => navigate({ to: '/admin/users/groups/$groupId', params: { groupId: row.original.group_id.toString() } })}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
        >
          View group
        </button>
      ),
    }),
  ], [creatorById, isAdmin, navigate])

  const table = useReactTable({ data: visibleGroups, columns, getCoreRowModel: getCoreRowModel() })

  const updateSearch = (updates: Partial<GroupsSearch>) => {
    navigate({ search: (previous) => ({ ...previous, ...updates }) })
  }

  const handleSearch = () => updateSearch({ search: searchInput || undefined, skip: 0 })

  const creatorOptions = (creators as User[]).filter((creator) =>
    groups.some((group) => group.created_by === creator.id),
  )

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Groups</h1>
        <button
          onClick={() => navigate({ to: '/admin/users/groups/new' })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
        >
          + Add Group
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="flex gap-2">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                placeholder="Search groups..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button onClick={handleSearch} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium">Search</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Results per page</label>
            <select
              value={search.limit}
              onChange={(event) => updateSearch({ limit: Number(event.target.value), skip: 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {[10, 25, 50, 100].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={search.order_by_group_name}
                onChange={(event) => updateSearch({ order_by_group_name: event.target.checked, skip: 0 })}
              />
              Order by Group name
            </label>
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1">Created by</label>
              <select
                value={search.created_by ?? ''}
                onChange={(event) => updateSearch({ created_by: event.target.value ? Number(event.target.value) : undefined, skip: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All creators</option>
                {creatorOptions.map((creator) => <option key={creator.id} value={creator.id}>{creator.first_name} {creator.last_name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={() => { setSearchInput(''); navigate({ search: {} }) }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => <th key={header.id} className="border border-gray-300 px-4 py-2 text-left font-semibold">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="border border-gray-300 px-4 py-8 text-center text-gray-500">No groups found.</td></tr>
            ) : table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => <td key={cell.id} className="border border-gray-300 px-4 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Showing {totalFilteredGroups === 0 ? 0 : search.skip + 1} - {Math.min(search.skip + search.limit, totalFilteredGroups)} of {totalFilteredGroups}</div>
        <div className="flex gap-2">
          <button onClick={() => updateSearch({ skip: Math.max(0, search.skip - search.limit) })} disabled={search.skip === 0} className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed">Previous</button>
          <button onClick={() => updateSearch({ skip: search.skip + search.limit })} disabled={search.skip + search.limit >= totalFilteredGroups} className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>
    </div>
  )
}