// components/Badge/BadgeForm.tsx
import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '../../types/badgeTypes'

interface BadgeFormProps {
  badge?: Badge
  onSubmit: (data: FormData) => Promise<void>
  isLoading: boolean
  error?: string
}

export function BadgeForm({ badge, onSubmit, isLoading, error }: BadgeFormProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(badge?.title || '')
  const [description, setDescription] = useState(badge?.description || '')
  const [value, setValue] = useState(badge?.value?.toString() || '')
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

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('image', file)
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Value *</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Image {badge ? '' : '*'}
        </label>
        <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          {previewUrl ? (
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Badge preview"
                className="h-28 w-28 object-contain rounded-md"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">Change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
              </svg>
              <span className="text-sm font-medium">Click to upload</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, SVG, WEBP</span>
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
          {isLoading ? 'Saving...' : badge ? 'Update Badge' : 'Create Badge'}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/badges' })}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}