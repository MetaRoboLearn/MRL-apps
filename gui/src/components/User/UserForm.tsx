import {useState, useEffect, FormEvent, ChangeEvent} from 'react'
import { useNavigate } from '@tanstack/react-router'
import {CreateUserRequest, Role, UpdateUserRequest, User} from "../../types/userTypes.ts";
import {capitalizeFirstLetter} from "../../utils.ts";

type UserFormData = {
  username: string
  password: string
  first_name: string
  last_name: string
  role_id: number
}

type UserFormPropsCreate = {
  user?: never
  roles: Role[]
  onSubmit: (data: CreateUserRequest) => Promise<void>
  isLoading: boolean
  error?: string
}

type UserFormPropsEdit = {
  user: User
  roles: Role[]
  onSubmit: (data: UpdateUserRequest) => Promise<void>
  isLoading: boolean
  error?: string
}

type UserFormProps = UserFormPropsCreate | UserFormPropsEdit

export function UserForm({ user, roles, onSubmit, isLoading, error }: UserFormProps) {
  const navigate = useNavigate()
  const isEditing = !!user

  const [formData, setFormData] = useState<UserFormData>({
    username: user?.username || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role_id: user?.role_id || roles[roles.length - 1]?.id || 1,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        first_name: user.first_name,
        last_name: user.last_name,
        role_id: user.role_id,
      })
    }
  }, [user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    // Password is required for create, optional for edit
    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Convert form data to API format
    if (isEditing) {
      // For editing, password is optional
      const submitData: UpdateUserRequest = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role_id: formData.role_id,
      }

      // Only include password if it's been entered
      if (formData.password) {
        submitData.password_hash = formData.password
      }

      await (onSubmit as (data: UpdateUserRequest) => Promise<void>)(submitData)
    } else {
      // For creating, password is required (validated above)
      const submitData: CreateUserRequest = {
        username: formData.username,
        password_hash: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role_id: formData.role_id,
      }

      await (onSubmit as (data: CreateUserRequest) => Promise<void>)(submitData)
    }
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username *
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.username ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john.doe"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password {isEditing ? '(leave blank to keep current)' : '*'}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.last_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Doe"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>

        {/* Role ID */}
        <div>
          <label htmlFor="role_id" className="block text-sm font-medium mb-1">
            Role *
          </label>
          <select
            id="role_id"
            name="role_id"
            value={formData.role_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{capitalizeFirstLetter(r.name)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/users' })}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}