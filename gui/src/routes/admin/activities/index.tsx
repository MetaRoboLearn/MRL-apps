import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { getActivitiesOverview } from '../../../api/activitiesApi.ts'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getExpandedRowModel,
} from '@tanstack/react-table'
import { useState, KeyboardEvent } from 'react'
import {Activity, ActivityTaskBasic} from '../../../types/activityTypes.ts'
import {formatLocalDateTime} from "../../../utils.ts";

function ActionCell({ activityId }: { activityId: number }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigate({ to: '/admin/activities/$activityId', params: { activityId: activityId.toString() } })
      }}
      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
    >
      Pregledaj
    </button>
  )
}

const activitySearchSchema = z.object({
  skip: z.number().optional().default(0),
  limit: z.number().optional().default(50),
  active_only: z.boolean().optional(),
  search: z.string().optional(),
  order_by_time_from: z.boolean().optional().default(true),
})

type ActivitySearch = z.infer<typeof activitySearchSchema>

const activitiesQueryOptions = (params: ActivitySearch) =>
  queryOptions({
    queryKey: ['activities', params],
    queryFn: () => getActivitiesOverview(params),
  })

export const Route = createFileRoute('/admin/activities/')({
  validateSearch: activitySearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    return context.queryClient.ensureQueryData(activitiesQueryOptions(deps))
  },
    component: RouteComponent,
  })

  const activityColumnHelper = createColumnHelper<Activity>()

  const activityColumns = [
    activityColumnHelper.accessor('id', {
      header: 'ID',
      cell: (info) => info.getValue(),
    }),
    activityColumnHelper.accessor('title', {
      header: 'Naslov',
      cell: (info) => info.getValue(),
    }),
    activityColumnHelper.accessor('description', {
      header: 'Opis',
      cell: (info) => info.getValue() || '—',
    }),
    activityColumnHelper.accessor('time_from', {
      header: 'Vrijeme početka',
      cell: (info) => {
        const val = info.getValue()
        return val ? formatLocalDateTime(val) : '—'
      },
    }),
    activityColumnHelper.accessor('time_to', {
      header: 'Vrijeme završetka',
      cell: (info) => {
        const val = info.getValue()
        return val ? formatLocalDateTime(val) : '—'
      },
    }),
    activityColumnHelper.accessor('active', {
      header: 'Aktivna',
      cell: (info) => (
        <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
          {info.getValue() ? 'Da' : 'Ne'}
        </span>
      ),
    }),
    activityColumnHelper.accessor('creator', {
      header: 'Stvorio',
      cell: (info) => {
        const creator = info.getValue()
        if (!creator) return '—'
        return (
          <div>
            <div>
              {creator.first_name} {creator.last_name}
            </div>
            <div className="text-sm text-gray-500">@{creator.username}</div>
          </div>
        )
      },
    }),
    activityColumnHelper.accessor('created_at', {
      header: 'Stvoreno',
      cell: (info) => formatLocalDateTime(info.getValue()),
    }),
    activityColumnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionCell activityId={row.original.id} />,
    }),
  ]

  const taskColumnHelper = createColumnHelper<ActivityTaskBasic>()

  const taskColumns = [
    taskColumnHelper.accessor('order', {
      header: 'Redoslijed',
      cell: (info) => info.getValue(),
    }),
    taskColumnHelper.accessor('task_id', {
      header: 'ID zadatka',
      cell: (info) => info.getValue(),
    }),
    taskColumnHelper.accessor('task_title', {
      header: 'Naslov zadatka',
      cell: (info) => info.getValue() || '—',
    }),
    taskColumnHelper.accessor('preview', {
      header: 'Sažetak',
      cell: (info) => info.getValue() || '—',
    }),
    taskColumnHelper.accessor('task_type', {
      header: 'Vrsta',
      cell: (info) => info.getValue() || '—',
    }),
    taskColumnHelper.accessor('allows_robot', {
      header: 'Robot',
      cell: (info) => (
        <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
          {info.getValue() ? 'Da' : 'Ne'}
        </span>
      ),
    }),
    taskColumnHelper.accessor('is_logged', {
      header: 'Bilježi se (logging)',
      cell: (info) => (
        <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
          {info.getValue() ? 'Da' : 'Ne'}
        </span>
      ),
    }),
  ]

  function TaskSubTable({ tasks }: { tasks: ActivityTaskBasic[] }) {
    const table = useReactTable({
      data: tasks,
      columns: taskColumns,
      getCoreRowModel: getCoreRowModel(),
    })

    if (tasks.length === 0) {
      return (
        <tr>
          <td colSpan={activityColumns.length} className="px-4 py-2">
            <div className="ml-8 text-gray-500 italic">Nema dodijeljenih zadataka.</div>
          </td>
        </tr>
      )
    }

    return (
      <tr>
        <td colSpan={activityColumns.length} className="p-0">
          <div className="ml-8 mr-4 my-2 border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead className="bg-blue-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border border-gray-200 px-3 py-1.5 text-left text-sm font-semibold text-gray-700"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border border-gray-200 px-3 py-1.5 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    )
  }

  function RouteComponent() {
    const navigate = useNavigate({ from: Route.fullPath })
    const search = Route.useSearch()
    const { status, data, error } = useSuspenseQuery(activitiesQueryOptions(search))

    const [searchInput, setSearchInput] = useState(search.search || '')
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

    const table = useReactTable({
      data: data || [],
      columns: activityColumns,
      getCoreRowModel: getCoreRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
    })

    const toggleRow = (id: number) => {
      setExpandedRows((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const updateSearch = (updates: Partial<ActivitySearch>) => {
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      })
    }

    const handleSearch = () => {
      updateSearch({ search: searchInput || undefined, skip: 0 })
    }

    const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch()
    }

    if (status === 'error') {
      return <div className="p-6 text-red-700" role="alert">Pogreška: {error.message}</div>
    }

    return (
      <div className="readable-content p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Aktivnosti</h1>
          <button
            onClick={() => navigate({ to: '/admin/activities/new' })}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-2"
          >
            <span>+</span>
            Dodaj aktivnost
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="mb-1 block font-medium">Pretraživanje</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Pretraži aktivnosti..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
                >
                  Pretraži
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium">Status</label>
              <select
                value={search.active_only === undefined ? '' : search.active_only.toString()}
                onChange={(e) =>
                  updateSearch({
                    active_only: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sve aktivnosti</option>
                <option value="true">Samo aktivne</option>
                <option value="false">Samo neaktivne</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium">Rezultata po stranici</label>
              <select
                value={search.limit}
                onChange={(e) => updateSearch({ limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={search.order_by_time_from}
                  onChange={(e) => updateSearch({ order_by_time_from: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="font-medium">Poredaj po vremenu</span>
              </label>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchInput('')
                  navigate({ search: {} })
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
              >
                Poništi filtere
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border border-gray-300 px-4 py-2 text-left font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const activity = row.original
                const isExpanded = expandedRows.has(activity.id)
                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => toggleRow(activity.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border border-gray-300 px-4 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <TaskSubTable
                        key={`tasks-${activity.id}`}
                        tasks={activity.activity_tasks}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Prikazano {search.skip + 1} -{' '}
            {Math.min(search.skip + search.limit, (data?.length || 0) + search.skip)} rezultata
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateSearch({ skip: Math.max(0, search.skip - search.limit) })}
              disabled={search.skip === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Prethodna
            </button>
            <button
              onClick={() => updateSearch({ skip: search.skip + search.limit })}
              disabled={(data?.length || 0) < search.limit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Sljedeća
            </button>
          </div>
        </div>
      </div>
    )
  }