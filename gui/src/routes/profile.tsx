// routes/profile.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getMyBadges } from '../api/userBadgeApi.ts'
import { formatLocalDateTime } from '../utils'
import {UserBadgeEntry} from "../types/userBadgeTypes.ts";

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useAuth()

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['myBadges'],
    queryFn: getMyBadges,
    enabled: !!user,
  })

  if (!user) return null

  const totalPoints = badges.reduce((sum, b) => sum + b.value, 0)

  return (
    <div className="relative w-4/5 min-w-200 mx-auto font-display p-10">
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold text-dark-neutrals-500 tracking-wide">Moj profil</h1>
        <div className="mt-3 mx-auto w-24 h-1 bg-sunglow-400 rounded-full" />
      </div>

      <div className="space-y-6">
        {/* User Info Card */}
        <div className="bg-white p-8 border-3 border-white-smoke-500 rounded-md">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-turquoise-200 border-3 border-turquoise-400 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-turquoise-600">
                {user.first_name[0]}{user.last_name[0]}
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-dark-neutrals-500">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-lg text-dark-neutrals-300 mt-1">@{user.username}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm font-bold uppercase tracking-wide text-dark-neutrals-300">Ukupno zvjezdica</div>
              <div className="text-4xl font-bold text-sunglow-500">{totalPoints}</div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white p-8 border-3 border-white-smoke-500 rounded-md">
          <h3 className="text-2xl font-bold text-dark-neutrals-500 mb-6">Moje značke</h3>

          {isLoading ? (
            <div className="text-dark-neutrals-300">Učitavanje...</div>
          ) : badges.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">🏅</div>
              <h4 className="text-xl font-bold text-dark-neutrals-400">Još nemaš značke</h4>
              <p className="mt-2 text-dark-neutrals-300">Nastavi rješavati zadatke i uskoro ćeš dobiti svoju prvu značku!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {badges.map((ub: UserBadgeEntry) => (
                <div
                  key={ub.id}
                  className="bg-sunglow-100 border-2 border-sunglow-300 rounded-lg px-6 py-4 flex items-center gap-6 hover:border-sunglow-500 transition-colors"
                >
                  {/* Badge image */}
                  <img
                    src={ub.image_url}
                    alt={ub.title}
                    className="h-30 w-30 object-contain shrink-0"
                  />

                  {/* Title, stars, date */}
                  <div className="shrink-0">
                    <p className="font-bold text-dark-neutrals-500">{ub.title}</p>
                    <p className="text-sm font-medium text-sunglow-600 mt-1">
                      {ub.value <= 5 ? '⭐'.repeat(ub.value) : `⭐ x${ub.value}`}
                    </p>
                    <p className="text-xs text-dark-neutrals-200 mt-1">
                      {formatLocalDateTime(ub.created_at)}
                    </p>
                  </div>

                  {/* Description, comment */}
                  <div className="flex-1 min-w-0 border-l-2 border-sunglow-300 pl-6">
                    {ub.description && (
                      <p className="text-sm text-dark-neutrals-400">{ub.description}</p>
                    )}
                    {ub.comment && (
                      <p className="text-sm text-dark-neutrals-500 mt-2 italic bg-white rounded px-3 py-2">
                        "{ub.comment}"
                      </p>
                    )}
                    {!ub.description && !ub.comment && (
                      <p className="text-sm text-dark-neutrals-200 italic">Nema opisa</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}