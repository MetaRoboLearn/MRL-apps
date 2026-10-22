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
import { ProgrammingElementOption } from '../../types/activityTypes.ts'
import { getProgrammingElements } from '../../api/programmingElementsApi.ts'
import { ProgrammingElementSelector } from './ProgrammingElementSelector.tsx'
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
  programming_element_ids: string[];
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
const programmingElementsQueryOptions = queryOptions({
  queryKey: ['programming-elements'],
  queryFn: getProgrammingElements,
})

function TaskPicker({ onSelect }: { onSelect: (task: TaskPreview) => void }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions(query))

  const columns = [
    columnHelper.accessor('id', { header: 'ID', cell: (info) => info.getValue() }),
    columnHelper.accessor('title', { header: 'Naslov', cell: (info) => info.getValue() }),
    columnHelper.display({
      id: 'dimensions',
      header: 'Dimenzije',
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
          Odaberi
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
          placeholder="Pretraži zadatke..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={() => setQuery(search)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
        >
          Pretraži
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
                  Nema pronađenih zadataka.
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
  const { data: programmingElements } = useSuspenseQuery(programmingElementsQueryOptions)
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
    programming_element_ids: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPicker, setShowPicker] = useState(!initialData)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.task_id) newErrors.task_id = 'Odaberite zadatak.'
    if (!formData.type_id) newErrors.type_id = 'Odaberite vrstu.'
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

  const selectedType = types.find((type) => type.id === formData.type_id)
  const isPythonTask = selectedType?.name.toLowerCase() === 'python'

  return (
    <div className="readable-content rounded-lg border border-gray-200 bg-white p-6">
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-100 p-3 text-red-700" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Task Selection */}
        <div>
          <label className="mb-1 block font-medium">Zadatak *</label>
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
                Promijeni
              </button>
            </div>
          ) : (
            <TaskPicker onSelect={handleSelectTask} />
          )}
          {errors.task_id && <p className="mt-1 text-sm text-red-600">{errors.task_id}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block font-medium">Vrsta *</label>
          <select
            value={formData.type_id}
            onChange={(e) => {
              const typeId = Number(e.target.value)
              const nextType = types.find((type) => type.id === typeId)
              setFormData((prev) => ({
                ...prev,
                type_id: typeId,
                programming_element_ids: nextType?.name.toLowerCase() === 'python' ? prev.programming_element_ids : [],
              }))
            }}
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
          <label className="block text-sm font-medium mb-1">Razina strukture</label>
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

        {isPythonTask && (
          <ProgrammingElementSelector
            elements={programmingElements as ProgrammingElementOption[]}
            selectedIds={formData.programming_element_ids}
            onChange={(programming_element_ids) => setFormData((prev) => ({ ...prev, programming_element_ids }))}
          />
        )}

        {/* Preview */}
        <div>
          <label className="mb-1 block font-medium">Sažetak</label>
          <input
            type="text"
            value={formData.preview}
            onChange={(e) => setFormData((prev) => ({ ...prev, preview: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Neobavezni sažetak"
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
            <span className="font-medium">Omogućuje korištenje robota</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_logged}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_logged: e.target.checked }))}
            />
            <span className="font-medium">Bilježi se (logging)</span>
          </label>
        </div>

        {/* Instructions */}
        <div>
          <label className="mb-1 block font-medium">Upute</label>
          <RichTextEditor
            value={formData.instructions}
            onChange={(val) => setFormData((prev) => ({ ...prev, instructions: val }))}
            placeholder=""
          />
          <p className="mt-1 text-sm text-gray-500">
            Podržani su podebljani i ukošeni tekst, podcrtavanje, naslovi i popisi. Prečaci: Ctrl+B, Ctrl+I, Ctrl+U.
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
          {isLoading ? 'Spremanje...' : isEditing ? 'Ažuriraj' : 'Dodaj zadatak'}
        </button>
        <button
          onClick={() => navigate({ to: cancelTo })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Odustani
        </button>
      </div>
    </div>
  )
}