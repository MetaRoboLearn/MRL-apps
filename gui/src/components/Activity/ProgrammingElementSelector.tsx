import { FaArrowDown, FaArrowUp } from 'react-icons/fa'
import { ProgrammingElementOption } from '../../types/activityTypes.ts'

type ProgrammingElementSelectorProps = {
  elements: ProgrammingElementOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ProgrammingElementSelector({ elements, selectedIds, onChange }: ProgrammingElementSelectorProps) {
  const selectedSet = new Set(selectedIds)
  const available = elements.filter((element) => !selectedSet.has(element.id))
  const selected = selectedIds.flatMap((id) => {
    const element = elements.find((item) => item.id === id)
    return element ? [element] : []
  })

  const addElement = (id: string) => onChange([...selectedIds, id])
  const removeElement = (id: string) => onChange(selectedIds.filter((selectedId) => selectedId !== id))
  const moveElement = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= selectedIds.length) return
    const reordered = [...selectedIds]
    ;[reordered[index], reordered[destination]] = [reordered[destination], reordered[index]]
    onChange(reordered)
  }

  return (
    <section aria-labelledby="programming-elements-title" className="space-y-3">
      <div>
        <h3 id="programming-elements-title" className="text-base font-semibold">Očekivani programski elementi</h3>
        <p className="text-sm text-gray-600">Redoslijed određuje važnost elementa.</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:w-1/2">
          <h4 className="mb-4 text-lg font-semibold">Dostupni elementi</h4>
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-100">
            {available.map((element) => (
              <li key={element.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span className="min-w-0 py-1">
                  <span className="block font-medium">{element.name}</span>
                  {element.description && <span className="mt-1 block text-sm text-gray-600">{element.description}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => addElement(element.id)}
                  aria-label={`Dodaj element: ${element.name}`}
                  title="Dodaj element"
                  className="ml-3 shrink-0 rounded-md bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                >
                  Dodaj
                </button>
              </li>
            ))}
            {available.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">Svi elementi su odabrani.</li>}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:w-1/2">
          <h4 className="mb-1 text-lg font-semibold">Odabrani elementi</h4>
          <p className="mb-4 text-xs text-gray-500">{selected.length} odabranih</p>
          <ol className="border border-gray-200 rounded-md divide-y divide-gray-100">
            {selected.map((element, index) => (
              <li key={element.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span aria-label={`Položaj ${index + 1}`} className="w-6 shrink-0 text-xs font-semibold text-gray-500">{index + 1}.</span>
                <span className="min-w-0 flex-1 py-1">
                  <span className="block font-medium">{element.name}</span>
                  {element.description && <span className="mt-1 block text-sm text-gray-600">{element.description}</span>}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => moveElement(index, -1)}
                    disabled={index === 0}
                    aria-label={`Pomakni gore: ${element.name}`}
                    title="Pomakni gore"
                    className="rounded-md bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaArrowUp aria-hidden="true" size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveElement(index, 1)}
                    disabled={index === selected.length - 1}
                    aria-label={`Pomakni dolje: ${element.name}`}
                    title="Pomakni dolje"
                    className="rounded-md bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaArrowDown aria-hidden="true" size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeElement(element.id)}
                    aria-label={`Ukloni element: ${element.name}`}
                    title="Ukloni element"
                    className="rounded-md bg-red-100 p-2 text-red-700 hover:bg-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                  >
                    Ukloni
                  </button>
                </span>
              </li>
            ))}
            {selected.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">Nema odabranih elemenata.</li>}
          </ol>
        </div>
      </div>
    </section>
  )
}