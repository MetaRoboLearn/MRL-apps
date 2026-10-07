import { ReactNode } from 'react'
import type { SelectableStudent } from '../../types/userTypes'


type StudentSelectorProps = {
  students: SelectableStudent[]
  selectedStudents: SelectableStudent[]
  selectedIds: Set<number>
  isLoading: boolean
  page: number
  hasMore: boolean
  search: string
  selectedTitle: string
  actionLabel: string
  undoLabel: string
  selectedEmptyLabel: string
  actionClassName?: string
  selectedClassName?: string
  batchSelector?: ReactNode
  onSearchChange: (value: string) => void
  onSearch: () => void
  onPageChange: (page: number) => void
  onToggle: (id: number) => void
  footer?: ReactNode
}

export function StudentSelector({
  students,
  selectedStudents,
  selectedIds,
  isLoading,
  page,
  hasMore,
  search,
  selectedTitle,
  actionLabel,
  undoLabel,
  selectedEmptyLabel,
  actionClassName = 'bg-green-100 text-green-700 hover:bg-green-200',
  selectedClassName = 'bg-blue-50',
  batchSelector,
  onSearchChange,
  onSearch,
  onPageChange,
  onToggle,
  footer,
}: StudentSelectorProps) {
  const unselected = students.filter((student) => !selectedIds.has(student.id))

  return (
    <div className="readable-content space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:w-1/2">
          <h3 className="mb-4 text-lg font-semibold">Svi učenici</h3>

          {batchSelector}

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSearch()}
              placeholder="Pretraži učenike..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={onSearch}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium"
            >
              Pretraži
            </button>
          </div>

          <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-4 py-6 text-center text-gray-400" role="status">Učitavanje...</div>
            ) : unselected.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400">Nema pronađenih učenika.</div>
            ) : (
              unselected.map((student) => (
                <div key={student.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <span className="font-medium">{student.first_name} {student.last_name}</span>
                    <span className="ml-2 text-sm text-gray-500">@{student.username}</span>
                  </div>
                  <button
                    onClick={() => onToggle(student.id)}
                    className={`ml-3 flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md ${actionClassName}`}
                  >
                    {actionLabel}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prethodna
            </button>
            <span className="text-gray-500">Stranica {page + 1}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sljedeća →
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:w-1/2">
          <h3 className="mb-1 text-lg font-semibold">{selectedTitle}</h3>
          <p className="mb-4 text-gray-500">
            {selectedIds.size} {selectedIds.size === 1 ? 'učenik' : 'učenika'}
          </p>

          <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
            {selectedIds.size === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">{selectedEmptyLabel}</div>
            ) : (
              selectedStudents.map((student) => (
                <div key={student.id} className={`flex items-center justify-between px-4 py-3 ${selectedClassName}`}>
                  <div className="min-w-0">
                    <span className="font-medium">{student.first_name} {student.last_name}</span>
                    <span className="ml-2 text-sm text-gray-500">@{student.username}</span>
                  </div>
                  <button
                    onClick={() => onToggle(student.id)}
                    className="ml-3 flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    {undoLabel}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  )
}