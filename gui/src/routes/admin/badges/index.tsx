// routes/admin/badges/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Badge } from '../../../types/badgeTypes'
import {getBadges} from "../../../api/badgeApi.ts";

const badgesSearchSchema = z.object({
  search: z.string().optional(),
})

type BadgesSearch = z.infer<typeof badgesSearchSchema>

const badgesQueryOptions = (params: BadgesSearch) =>
  queryOptions({
    queryKey: ['badges', params],
    queryFn: () => getBadges(params),
  })

export const Route = createFileRoute('/admin/badges/')({
  validateSearch: badgesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    return context.queryClient.ensureQueryData(badgesQueryOptions(deps))
  },
  component: RouteComponent,
})

const columnHelper = createColumnHelper<Badge>()

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('image_url', {
    header: 'Image',
    cell: info => (
      <img
        src={info.getValue()}
        alt=""
        className="h-25 w-25 object-contain"
      />
    ),
  }),
  columnHelper.accessor('title', {
    header: 'Title',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('value', {
    header: 'Value',
    cell: info => info.getValue(),
  }),
]

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { data } = useSuspenseQuery(badgesQueryOptions(search))

  const [searchInput, setSearchInput] = useState(search.search || '')

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const updateSearch = (updates: Partial<BadgesSearch>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  const handleSearch = () => {
    updateSearch({ search: searchInput || undefined })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Badges</h1>
        <button
          onClick={() => navigate({ to: '/admin/badges/new' })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-2"
        >
          <span>+</span>
          Add Badge
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search badges..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
          >
            Search
          </button>
          <button
            onClick={() => {
              setSearchInput('')
              navigate({ search: {} })
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="border border-gray-300 px-4 py-2 text-left font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                onClick={() => navigate({
                  to: '/admin/badges/$badgeId/edit',
                  params: { badgeId: row.original.id.toString() },
                })}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="border border-gray-300 px-4 py-2"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}