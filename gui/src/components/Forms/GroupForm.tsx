import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

type GroupFormProps = {
  initialName?: string
  submitLabel: string
  isLoading: boolean
  error?: string
  onSubmit: (groupName: string) => Promise<void>
}

export function GroupForm({ initialName = '', submitLabel, isLoading, error, onSubmit }: GroupFormProps) {
  const navigate = useNavigate()
  const [groupName, setGroupName] = useState(initialName)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    setGroupName(initialName)
  }, [initialName])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = groupName.trim()
    if (!trimmedName) {
      setValidationError('Group name is required')
      return
    }
    setValidationError('')
    await onSubmit(trimmedName)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
      {(error || validationError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error || validationError}
        </div>
      )}
      <label htmlFor="group_name" className="block text-sm font-medium mb-1">
        Group name *
      </label>
      <input
        id="group_name"
        name="group_name"
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        autoFocus
      />
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/users/groups' })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}