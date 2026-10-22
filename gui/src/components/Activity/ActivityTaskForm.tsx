import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { getTasksPreview } from '../../api/tasksApi.ts'
import { TaskType } from '../../api/typesApi.ts'
import { TaskPreview } from '../../types/tasksTypes.ts'
import {RichTextEditor} from "../UI/RichTextEditor.tsx";

const tasksQueryOptions = (search: string) =>
  queryOptions({
    queryKey: ['tasks-picker', search],
    queryFn: () => getTasksPreview({ search: search || undefined, active_only: true, limit: 10 }),
  })

type ActivityTaskFormData = {
  task_id: number | null;
  task_title: string;
  type_id: number;
  preview: string;
  instructions: string;
  is_logged: boolean;
  allows_robot: boolean;
  difficulty: number | null;
}

type ActivityTaskFormProps = {
  initialData?: ActivityTaskFormData;
  types: TaskType[];
  onSubmit: (data: ActivityTaskFormData) => Promise<void>;
  isLoading: boolean;
  error?: string;
  cancelTo: string;
}

const columnHelper = createColumnHelper<TaskPreview>()

function TaskPicker({ onSelect }: { onSelect: (task: TaskPreview) => void }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions(query))

  const columns = [
    columnHelper.accessor('id', { header: 'ID', cell: (info) => info.getValue() }),
    columnHelper.accessor('title', { header: 'Title', cell: (info) => info.getValue() }),
    columnHelper.display({
      id: 'dimensions',
      header: 'Dimensions',
      cell: ({ row }) => `${row.original.size_x} x ${row.original.size_z}`,
    }),
    columnHelper.display({
      id: 'select',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => onSelect(row.original)}
          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors"
        >
          Select
        </button>
      ),
    }),
  ]

  const table = useReactTable({
    data: tasks || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQuery(search)}
          placeholder="Search tasks..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={() => setQuery(search)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border border-gray-300 px-4 py-2 text-left font-semibold text-sm">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="border border-gray-300 px-4 py-4 text-center text-gray-500 text-sm">
                  No tasks found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border border-gray-300 px-4 py-2 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ActivityTaskForm({ initialData, types, onSubmit, isLoading, error, cancelTo }: ActivityTaskFormProps) {
  const navigate = useNavigate()
  const isEditing = !!initialData

  const [formData, setFormData] = useState<ActivityTaskFormData>(initialData || {
    task_id: null,
    task_title: '',
    type_id: types[0]?.id || 1,
    preview: '',
    instructions: '',
    is_logged: true,
    allows_robot: true,
    difficulty: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPicker, setShowPicker] = useState(!initialData)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.task_id) newErrors.task_id = 'Please select a task'
    if (!formData.type_id) newErrors.type_id = 'Please select a type'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit(formData)
  }

  const handleSelectTask = (task: TaskPreview) => {
    setFormData((prev) => ({ ...prev, task_id: task.id, task_title: task.title }))
    setShowPicker(false)
    if (errors.task_id) {
      setErrors((prev) => { const next = { ...prev }; delete next.task_id; return next })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Task Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Task *</label>
          {formData.task_id && !showPicker ? (
            <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              <span className="flex-1">
                <span className="font-medium">{formData.task_title}</span>
                <span className="text-gray-500 text-sm ml-2">(ID: {formData.task_id})</span>
              </span>
              <button
                onClick={() => setShowPicker(true)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded-md transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <TaskPicker onSelect={handleSelectTask} />
          )}
          {errors.task_id && <p className="mt-1 text-sm text-red-600">{errors.task_id}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            value={formData.type_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, type_id: Number(e.target.value) }))}
            className={`w-full px-3 py-2 border rounded-md ${errors.type_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {errors.type_id && <p className="mt-1 text-sm text-red-600">{errors.type_id}</p>}
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium mb-1">Težina</label>
          <select
            value={formData.difficulty ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">— bez težine —</option>
            <option value="1">★ (1)</option>
            <option value="2">★★ (2)</option>
            <option value="3">★★★ (3)</option>
          </select>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium mb-1">Preview</label>
          <input
            type="text"
            value={formData.preview}
            onChange={(e) => setFormData((prev) => ({ ...prev, preview: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Optional preview"
          />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_robot}
              onChange={(e) => setFormData((prev) => ({ ...prev, allows_robot: e.target.checked }))}
            />
            <span className="text-sm font-medium">Allows robot</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_logged}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_logged: e.target.checked }))}
            />
            <span className="text-sm font-medium">Is logged</span>
          </label>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium mb-1">Instructions</label>
          <RichTextEditor
            value={formData.instructions}
            onChange={(val) => setFormData((prev) => ({ ...prev, instructions: val }))}
            placeholder=""
          />
          <p className="mt-1 text-xs text-gray-400">
            Supports bold, italic, underline, headings, and lists. Shortcuts: Ctrl+B, Ctrl+I, Ctrl+U.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Task'}
        </button>
        <button
          onClick={() => navigate({ to: cancelTo })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}