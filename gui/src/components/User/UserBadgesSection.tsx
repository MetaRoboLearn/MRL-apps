import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserBadges, assignBadge, removeBadge } from '../../api/userBadgeApi.ts'
import { getBadges } from '../../api/badgeApi.ts'
import { Badge } from '../../types/badgeTypes'
import { formatLocalDateTime } from '../../utils'
import {UserBadgeEntry} from "../../types/userBadgeTypes.ts";

interface UserBadgesSectionProps {
  userId: string
}

export function UserBadgesSection({ userId }: UserBadgesSectionProps) {
  const queryClient = useQueryClient()
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('')
  const [comment, setComment] = useState('')

  const { data: userBadges = [], isLoading: loadingUserBadges } = useQuery({
    queryKey: ['userBadges', userId],
    queryFn: () => getUserBadges(userId),
  })

  const { data: allBadges = [] } = useQuery({
    queryKey: ['badges', {}],
    queryFn: () => getBadges(),
  })

  const assignMutation = useMutation({
    mutationFn: assignBadge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges', userId] })
      setSelectedBadgeId('')
      setComment('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeBadge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges', userId] })
    },
  })

  const handleAssign = () => {
    if (!selectedBadgeId) return
    assignMutation.mutate({
      user_id: parseInt(userId),
      badge_id: parseInt(selectedBadgeId),
      comment: comment || undefined,
    })
  }

  const handleRemove = (userBadgeId: number) => {
    if (window.confirm('Remove this badge from the user?')) {
      removeMutation.mutate(userBadgeId)
    }
  }

  if (loadingUserBadges) {
    return <div className="text-gray-500">Loading badges...</div>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Badges</h3>
      </div>

      <div className="p-6">
        {/* Assigned badges */}
        {userBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {userBadges.map((ub: UserBadgeEntry) => (
              <div
                key={ub.id}
                className="relative group border border-gray-200 rounded-lg p-4 flex flex-col items-center text-center"
              >
                <button
                  onClick={() => handleRemove(ub.id)}
                  disabled={removeMutation.isPending}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                  title="Remove badge"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img
                  src={ub.image_url}
                  alt={ub.title}
                  className="h-16 w-16 object-contain mb-3"
                />
                <p className="font-medium text-sm">{ub.title}</p>
                <p className="text-xs text-gray-500">+{ub.value} pts</p>
                {ub.comment && (
                  <p className="text-xs text-gray-400 mt-2 italic">"{ub.comment}"</p>
                )}
                <p className="text-xs text-gray-300 mt-1">
                  {formatLocalDateTime(ub.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">No badges assigned yet.</p>
        )}

        {/* Assign new badge */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium mb-3">Assign a badge</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedBadgeId}
              onChange={(e) => setSelectedBadgeId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a badge...</option>
              {allBadges.map((b: Badge) => (
                <option key={b.id} value={b.id}>
                  {b.title} (+{b.value} pts)
                </option>
              ))}
            </select>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment (optional)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleAssign}
              disabled={!selectedBadgeId || assignMutation.isPending}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
          {assignMutation.isError && (
            <p className="text-red-500 text-sm mt-2">{assignMutation.error.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}