import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getGroupById } from '../../../../../api/groupsApi.ts'
import { replaceGroupMembers } from '../../../../../api/userGroupsApi.ts'
import { getUsers, getUsersByIds } from '../../../../../api/usersApi.ts'
import { StudentSelector } from '../../../../../components/User/StudentSelector.tsx'
import { GroupMutationError } from '../../../../../types/groupTypes.ts'
import type { SelectableStudent } from '../../../../../types/userTypes.ts'

const PAGE_SIZE = 20

export const Route = createFileRoute('/admin/users/groups/$groupId/members')({ component: RouteComponent })

function RouteComponent() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [initialized, setInitialized] = useState(false)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)

  const { data: group, isLoading: isGroupLoading, isError: isGroupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroupById(groupId),
  })
  const { data: studentData = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['group-students', page, searchQuery],
    queryFn: () => getUsers({ role_id: 3, skip: page * PAGE_SIZE, limit: PAGE_SIZE, search: searchQuery || undefined }),
  })

  useEffect(() => {
    if (group && !initialized) {
      setSelectedIds(new Set(group.members.map((member) => member.user_id)))
      setInitialized(true)
    }
  }, [group, initialized])

  const selectedIdsKey = useMemo(() => Array.from(selectedIds).sort((left, right) => left - right).join(','), [selectedIds])
  const { data: selectedStudents = [] } = useQuery({
    queryKey: ['users-by-ids', selectedIdsKey],
    queryFn: () => getUsersByIds(Array.from(selectedIds)),
    enabled: selectedIds.size > 0,
    placeholderData: (previous) => previous,
  })

  const saveMutation = useMutation({
    mutationFn: () => replaceGroupMembers(groupId, Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate({ to: '/admin/users/groups/$groupId', params: { groupId } })
    },
  })

  const toggleStudent = (id: number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSearch = () => {
    setSearchQuery(search)
    setPage(0)
  }

  if (isGroupLoading) return <div className="p-4">Loading...</div>
  if (isGroupError || !group) return <div className="p-4 text-red-600">Unable to load this group.</div>

  const mutationError = saveMutation.error as GroupMutationError | null
  const errorMessage = mutationError
    ? `${mutationError.message}${mutationError.usernames?.length ? ` Affected student usernames: ${mutationError.usernames.join(', ')}.` : ''}`
    : undefined

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold">Edit Members</h1><p className="text-gray-500 mt-1">Group: {group.group_name}</p></div>
        <button onClick={() => navigate({ to: '/admin/users/groups/$groupId', params: { groupId } })} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium">Back</button>
      </div>
      <StudentSelector
        students={studentData as SelectableStudent[]}
        selectedStudents={selectedStudents as SelectableStudent[]}
        selectedIds={selectedIds}
        isLoading={isStudentsLoading}
        page={page}
        hasMore={studentData.length === PAGE_SIZE}
        search={search}
        selectedTitle="Selected members"
        actionLabel="Add"
        undoLabel="Remove"
        selectedEmptyLabel="No members selected."
        onSearchChange={setSearch}
        onSearch={handleSearch}
        onPageChange={setPage}
        onToggle={toggleStudent}
        footer={
          <div className="flex gap-3 mt-6">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-300">{saveMutation.isPending ? 'Saving...' : 'Save Members'}</button>
            <button onClick={() => navigate({ to: '/admin/users/groups/$groupId', params: { groupId } })} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium">Cancel</button>
            {errorMessage && <span className="self-center text-sm text-red-600">{errorMessage}</span>}
          </div>
        }
      />
    </div>
  )
}