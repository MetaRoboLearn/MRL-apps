import { useMemo, useState } from 'react'

export type MultiSelectOption = {
  id: number
  label: string
}

type SearchableMultiSelectProps = {
  label: string
  options: MultiSelectOption[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  disabled?: boolean
  loading?: boolean
}

export function SearchableMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  disabled = false,
  loading = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = new Set(selectedIds)
  const visibleOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [options, search])

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(Array.from(next))
  }

  const selectAll = () => onChange(options.map((option) => option.id))

  return (
    <div className="relative min-w-64">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <span className="truncate">
          {loading ? 'Loading...' : selectedIds.length === 0 ? `Select ${label.toLowerCase()}` : `${selectedIds.length} selected`}
        </span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white p-2 shadow-lg">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <div className="mb-2 flex gap-2 text-xs">
            <button type="button" onClick={selectAll} className="text-blue-600 hover:underline">
              Select all
            </button>
            <button type="button" onClick={() => onChange([])} className="text-gray-600 hover:underline">
              Clear
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-gray-500">No options found.</p>
            ) : (
              visibleOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(option.id)}
                    onChange={() => toggle(option.id)}
                    className="mt-0.5"
                  />
                  <span>{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}