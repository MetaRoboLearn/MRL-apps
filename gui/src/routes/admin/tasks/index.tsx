import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod';
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTasksPreview } from "../../../api/tasksApi.ts";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useState, KeyboardEvent } from 'react';
import {TaskPreview} from "../../../types/tasksTypes.ts";
import {formatLocalDateTime} from "../../../utils.ts";


const taskSearchSchema = z.object({
  skip: z.number().optional().default(0),
  limit: z.number().optional().default(50),
  active_only: z.boolean().optional(),
  search: z.string().optional(),
  order_by_title: z.boolean().optional().default(false),
})

type TaskSearch = z.infer<typeof taskSearchSchema>

const tasksQueryOptions = (params: TaskSearch) =>
  queryOptions({
    queryKey: ['tasks', params],
    queryFn: () => getTasksPreview(params)
  })

export const Route = createFileRoute('/admin/tasks/')({
  validateSearch: taskSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    return context.queryClient.ensureQueryData(tasksQueryOptions(deps))
  },
  component: RouteComponent,
})

const columnHelper = createColumnHelper<TaskPreview>()

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('title', {
    header: 'Title',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: info => info.getValue() || '—',
  }),
  columnHelper.display({
    id: 'dimensions',
    header: 'Dimensions',
    cell: ({ row }) => `${row.original.size_x} x ${row.original.size_z}`,
  }),
  columnHelper.accessor('active', {
    header: 'Active',
    cell: info => (
      <span className={info.getValue() ? 'text-green-600' : 'text-red-600'}>
        {info.getValue() ? 'Yes' : 'No'}
      </span>
    ),
  }),
  columnHelper.accessor('creator', {
    header: 'Created By',
    cell: info => {
      const creator = info.getValue();
      if (!creator) return '—';
      return (
        <div>
          <div>{creator.first_name} {creator.last_name}</div>
          <div className="text-sm text-gray-500">@{creator.username}</div>
        </div>
      );
    },
  }),
  columnHelper.accessor('created_at', {
    header: 'Created At',
    cell: (info) => formatLocalDateTime(info.getValue()),
  }),
]

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { status, data, error } = useSuspenseQuery(tasksQueryOptions(search));

  const [searchInput, setSearchInput] = useState(search.search || '');

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const updateSearch = (updates: Partial<TaskSearch>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  const handleSearch = () => {
    updateSearch({ search: searchInput || undefined, skip: 0 });
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (status === "error") {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => navigate({ to: '/admin/tasks/new' })}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-2"
        >
          <span>+</span>
          Add Task
        </button>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search tasks..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {/* Active Only */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={search.active_only === undefined ? '' : search.active_only.toString()}
              onChange={(e) => updateSearch({
                active_only: e.target.value === '' ? undefined : e.target.value === 'true'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Tasks</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium mb-1">Results per page</label>
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

          {/* Order by Title */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={search.order_by_title}
                onChange={(e) => updateSearch({ order_by_title: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Order by title</span>
            </label>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchInput('');
                navigate({ search: {} });
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
            >
              Reset Filters
            </button>
          </div>
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
                onClick={() => navigate({ to: '/admin/tasks/$taskId/edit', params: { taskId: row.original.id.toString() } })}
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

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {search.skip + 1} - {Math.min(search.skip + search.limit, (data?.length || 0) + search.skip)} of results
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateSearch({ skip: Math.max(0, search.skip - search.limit) })}
            disabled={search.skip === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => updateSearch({ skip: search.skip + search.limit })}
            disabled={(data?.length || 0) < search.limit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}