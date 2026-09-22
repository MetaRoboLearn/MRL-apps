import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { deleteGroup, getGroupById, updateGroup } from '../../../../../api/groupsApi.ts'
import { GroupMember, GroupMutationError } from '../../../../../types/groupTypes.ts'
import { formatLocalDateTime } from '../../../../../utils.ts'
import { useAuth } from '../../../../../hooks/useAuth.ts'

const groupQueryOptions = (groupId: string) => queryOptions({
  queryKey: ['group', groupId],
  queryFn: () => getGroupById(groupId),
})

export const Route = createFileRoute('/admin/users/groups/$groupId/')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(groupQueryOptions(params.groupId)),
  component: RouteComponent,
})

const columnHelper = createColumnHelper<GroupMember>()

function RouteComponent() {
  const { groupId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: group } = useSuspenseQuery(groupQueryOptions(groupId))
  const [editingName, setEditingName] = useState(false)
  const [groupName, setGroupName] = useState(group.group_name)
  const [error, setError] = useState<string>()

  const updateMutation = useMutation({
    mutationFn: () => updateGroup(groupId, { group_name: groupName.trim() }),
    onSuccess: () => {
      setEditingName(false)
      setError(undefined)
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate({ to: '/admin/users/groups' })
    },
    onError: (mutationError: GroupMutationError) => {
      const affected = mutationError.usernames?.length ? ` Affected student usernames: ${mutationError.usernames.join(', ')}.` : ''
      setError(`${mutationError.message}${affected}`)
    },
  })

  const columns = [
    columnHelper.display({ id: 'group_name', header: 'Group name', cell: () => group.group_name }),
    columnHelper.accessor('username', { header: 'Username', cell: (info) => info.getValue() }),
    columnHelper.accessor('first_name', { header: 'First Name', cell: (info) => info.getValue() }),
    columnHelper.accessor('last_name', { header: 'Last Name', cell: (info) => info.getValue() }),
  ]
  const table = useReactTable({ data: group.members, columns, getCoreRowModel: getCoreRowModel() })

  const handleDelete = () => {
    if (!confirm('Deleting a group removes all users from that group. Continue?')) return
    setError(undefined)
    deleteMutation.mutate()
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{group.group_name}</h1>
        <button onClick={() => navigate({ to: '/admin/users/groups' })} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium">Back to Groups</button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Group Details</h2>
          <div className="flex gap-2">
            <button onClick={() => setEditingName((value) => !value)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md">{editingName ? 'Cancel Edit' : 'Edit Name'}</button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md disabled:bg-gray-300">{deleteMutation.isPending ? 'Deleting...' : 'Delete Group'}</button>
          </div>
        </div>
        {editingName && (
          <div className="flex gap-2 mb-4">
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md" />
            <button onClick={() => updateMutation.mutate()} disabled={!groupName.trim() || updateMutation.isPending} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md disabled:bg-gray-300">{updateMutation.isPending ? 'Saving...' : 'Save Name'}</button>
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-600">Created at</span><p className="mt-1">{formatLocalDateTime(group.created_at)}</p></div>
          <div><span className="font-medium text-gray-600">Updated at</span><p className="mt-1">{group.updated_at ? formatLocalDateTime(group.updated_at) : '—'}</p></div>
          {user?.role === "admin" && <div><span className="font-medium text-gray-600">Created by</span><p className="mt-1">{group.created_by ? `User #${group.created_by}` : '—'}</p></div>}
          <div><span className="font-medium text-gray-600">Members</span><p className="mt-1">{group.members.length}</p></div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Students</h2>
        <button onClick={() => navigate({ to: '/admin/users/groups/$groupId/members', params: { groupId } })} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md font-medium">Edit Members</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id} className="border border-gray-300 px-4 py-2 text-left font-semibold">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.length === 0 ? <tr><td colSpan={columns.length} className="border border-gray-300 px-4 py-8 text-center text-gray-500">No students assigned.</td></tr> : table.getRowModel().rows.map((row) => <tr key={row.id} className="hover:bg-gray-50">{row.getVisibleCells().map((cell) => <td key={cell.id} className="border border-gray-300 px-4 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}