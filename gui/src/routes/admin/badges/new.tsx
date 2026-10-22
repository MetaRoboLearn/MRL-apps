// routes/admin/badges/new.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { BadgeForm } from '../../../components/Badge/BadgeForm'
import {createBadge} from "../../../api/badgeApi.ts";

export const Route = createFileRoute('/admin/badges/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()

  const mutation = useMutation({
    mutationFn: createBadge,
    onSuccess: () => {
      navigate({ to: '/admin/badges' })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = async (data: FormData) => {
    setError(undefined)
    await mutation.mutateAsync(data)
  }

  return (
    <div className="p-4 max-w-2xl w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Badge</h1>
      <BadgeForm
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
      />
    </div>
  )
}