// components/Badge/BadgeForm.tsx
import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Badge, BadgeTaskOption } from '../../types/badgeTypes'

interface BadgeFormProps {
  badge?: Badge
  onSubmit: (data: FormData) => Promise<void>
  isLoading: boolean
  error?: string
  taskOptions: BadgeTaskOption[]
  taskOptionsLoading?: boolean
}

export function BadgeForm({
  badge,
  onSubmit,
  isLoading,
  error,
  taskOptions,
  taskOptionsLoading = false,
}: BadgeFormProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(badge?.title || '')
  const [description, setDescription] = useState(badge?.description || '')
  const [value, setValue] = useState(badge?.value?.toString() || '')
  const [activityTaskId, setActivityTaskId] = useState(badge?.relevant_activity_task_id?.toString() || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(badge?.image_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('value', value)
    if (activityTaskId) {
      formData.append('activity_task_id', activityTaskId)
    }

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('image', file)
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="readable-content space-y-5">
      {error && (
        <div className="rounded-md bg-red-100 p-3 text-red-700" role="alert" aria-live="assertive">{error}</div>
      )}

      <div>
        <label htmlFor="badge-title" className="mb-1 block font-medium">Naslov *</label>
        <input
          id="badge-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label htmlFor="badge-description" className="mb-1 block font-medium">Opis</label>
        <textarea
          id="badge-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label htmlFor="badge-value" className="mb-1 block font-medium">Vrijednost *</label>
        <input
          id="badge-value"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label htmlFor="badge-activity-task" className="mb-1 block font-medium">Povezani zadatak *</label>
        <select
          id="badge-activity-task"
          value={activityTaskId}
          onChange={(e) => setActivityTaskId(e.target.value)}
          required={!badge}
          disabled={Boolean(badge) || taskOptionsLoading || isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">
            {taskOptionsLoading ? 'Učitavanje zadataka...' : 'Odaberi zadatak'}
          </option>
          {badge && !taskOptions.some((task) => task.activity_task_id === badge.relevant_activity_task_id) && (
            <option value={badge.relevant_activity_task_id}>
              Povezani zadatak aktivnosti #{badge.relevant_activity_task_id}
            </option>
          )}
          {taskOptions.map((task) => (
            <option key={task.activity_task_id} value={task.activity_task_id}>
              {task.activity_title} - {task.task_title || `Zadatak #${task.activity_task_id}`}
            </option>
          ))}
        </select>
        {!taskOptionsLoading && taskOptions.length === 0 && (
          <p className="mt-1 text-gray-500">Nema dostupnih zadataka aktivnosti.</p>
        )}
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Slika {badge ? '' : '*'}
        </label>
        <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          {previewUrl ? (
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Pretpregled značke"
                className="h-28 w-28 object-contain rounded-md"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white font-medium">Promijeni</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
              </svg>
              <span className="font-medium">Kliknite za učitavanje</span>
              <span className="mt-1 text-sm text-gray-400">PNG, JPG, GIF, SVG, WEBP</span>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            required={!badge}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Spremanje...' : badge ? 'Ažuriraj značku' : 'Stvori značku'}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/badges' })}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium disabled:cursor-not-allowed"
        >
          Odustani
        </button>
      </div>
    </form>
  )
}