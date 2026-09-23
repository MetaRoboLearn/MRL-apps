import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { getGroupAnalytics } from '../../../api/analyticsApi.ts'
import { getOwnedActivitiesOverview } from '../../../api/activitiesApi.ts'
import { getGroups } from '../../../api/groupsApi.ts'
import { getUsersByIds } from '../../../api/usersApi.ts'
import { AnalyticsImageViewer } from '../../../components/Analytics/AnalyticsImageViewer.tsx'
import { MultiSelectOption, SearchableMultiSelect } from '../../../components/Analytics/SearchableMultiSelect.tsx'
import { GroupAnalyticsResponse } from '../../../types/analyticsTypes.ts'

const analyticsSearchSchema = z.object({
  group_ids: z.array(z.number()).optional().default([]),
  activity_ids: z.array(z.number()).optional().default([]),
})

export const Route = createFileRoute('/admin/analytics/')({
  validateSearch: analyticsSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const [groupIds, setGroupIds] = useState(search.group_ids)
  const [activityIds, setActivityIds] = useState(search.activity_ids)
  const [result, setResult] = useState<GroupAnalyticsResponse | null>(null)
  const [appliedFilters, setAppliedFilters] = useState({ groupIds: search.group_ids, activityIds: search.activity_ids })

  const groupsQuery = useQuery({ queryKey: ['analytics-groups'], queryFn: getGroups })
  const activitiesQuery = useQuery({
    queryKey: ['analytics-activities'],
    queryFn: getOwnedActivitiesOverview,
  })
  const studentsQuery = useQuery({
    queryKey: ['analytics-students', result?.student_ids],
    queryFn: () => getUsersByIds(result?.student_ids || []),
    enabled: Boolean(result?.student_ids.length),
  })
  const analyticsMutation = useMutation({
    mutationFn: async () => {
      const filters = { groupIds: [...groupIds], activityIds: [...activityIds] }
      return { analytics: await getGroupAnalytics(filters), filters }
    },
    onSuccess: ({ analytics, filters }) => {
      setResult(analytics)
      setAppliedFilters(filters)
    },
  })

  const groupOptions: MultiSelectOption[] = useMemo(
    () => (groupsQuery.data || []).map((group) => ({ id: group.group_id, label: group.group_name })),
    [groupsQuery.data],
  )
  const activityOptions: MultiSelectOption[] = useMemo(
    () => (activitiesQuery.data || []).map((activity) => ({ id: activity.id, label: activity.title })),
    [activitiesQuery.data],
  )

  const canCreate = groupIds.length > 0 && activityIds.length > 0 && !analyticsMutation.isPending
  const formatMetric = (value: number | null) => value === null ? '—' : Number(value.toFixed(2)).toString()
  const formatDifficulty = (value: number | null) => value === null ? '—' : `${value}`

  return (
    <main className="min-h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Group analytics</h1>

        <section className="mb-6 rounded-md border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <SearchableMultiSelect
              label="Groups"
              options={groupOptions}
              selectedIds={groupIds}
              onChange={setGroupIds}
              loading={groupsQuery.isLoading}
            />
            <SearchableMultiSelect
              label="Activities"
              options={activityOptions}
              selectedIds={activityIds}
              onChange={setActivityIds}
              loading={activitiesQuery.isLoading}
            />
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => analyticsMutation.mutate()}
              className="min-h-10 rounded-md bg-turquoise-500 px-4 py-2 font-semibold text-white hover:bg-turquoise-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {analyticsMutation.isPending ? 'Creating...' : 'Create analytics'}
            </button>
          </div>
          {analyticsMutation.error && <p className="mt-3 text-sm text-red-600">{analyticsMutation.error.message}</p>}
          {groupIds.length === 0 || activityIds.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Select at least one group and activity.</p>
          ) : null}
        </section>

        {result && (
          <div className="space-y-6">
            <section className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xl font-semibold text-gray-800">Summary</h2>
              <table className="min-w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-gray-200"><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Value</th></tr></thead>
                <tbody>{result.summary_table.map((metric) => <tr key={metric.metric_name} className="border-b border-gray-100"><td className="px-3 py-2">{metric.metric_name}</td><td className="px-3 py-2">{metric.value}</td></tr>)}</tbody>
              </table>
            </section>
            <section className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xl font-semibold text-gray-800">Per-task summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2">Task</th>
                      <th className="px-3 py-2">Difficulty</th>
                      <th className="px-3 py-2">Success rate</th>
                      <th className="px-3 py-2">Avg duration</th>
                      <th className="px-3 py-2">Median duration</th>
                      <th className="px-3 py-2">Avg failures</th>
                      <th className="px-3 py-2">Avg edits to success</th>
                      <th className="px-3 py-2">Avg final complexity</th>
                      <th className="px-3 py-2">Min complexity</th>
                      <th className="px-3 py-2">Max complexity</th>
                      <th className="px-3 py-2">Attempting</th>
                      <th className="px-3 py-2">Successful</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.task_summary_table.map((task) => (
                      <tr key={task.activity_task_id} className="border-b border-gray-100 align-top">
                        <td className="max-w-64 whitespace-normal px-3 py-2 font-medium">{task.task_label}</td>
                        <td className="px-3 py-2">{formatDifficulty(task.task_difficulty)}</td>
                        <td className="px-3 py-2">{formatMetric(task.success_rate)}%</td>
                        <td className="px-3 py-2">{formatMetric(task.average_duration_seconds)}s</td>
                        <td className="px-3 py-2">{formatMetric(task.median_duration_seconds)}s</td>
                        <td className="px-3 py-2">{formatMetric(task.average_failures)}</td>
                        <td className="px-3 py-2">{formatMetric(task.average_edits_to_success)}</td>
                        <td className="px-3 py-2">{formatMetric(task.average_final_solution_complexity)}</td>
                        <td className="px-3 py-2">{formatMetric(task.min_task_complexity)}</td>
                        <td className="px-3 py-2">{formatMetric(task.max_task_complexity)}</td>
                        <td className="px-3 py-2">{task.attempting_students}</td>
                        <td className="px-3 py-2">{task.successful_students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsImageViewer title="Performance matrix" src={result.heatmap_png} />
              <AnalyticsImageViewer title="Task duration distribution" src={result.boxplot_png} />
            </div>
            <section className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xl font-semibold text-gray-800">Students</h2>
              {studentsQuery.isLoading ? <p>Loading students...</p> : studentsQuery.error ? <p className="text-red-600">{studentsQuery.error.message}</p> : (
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead><tr className="border-b border-gray-200"><th className="px-3 py-2">First name</th><th className="px-3 py-2">Last name</th><th className="px-3 py-2">Username</th><th className="px-3 py-2" /></tr></thead>
                  <tbody>{(studentsQuery.data || []).map((student) => {
                    const portfolioUrl = `/admin/analytics/student/${student.id}?group_ids=${encodeURIComponent(appliedFilters.groupIds.join(','))}&activity_ids=${encodeURIComponent(appliedFilters.activityIds.join(','))}`
                    return <tr key={student.id} className="border-b border-gray-100"><td className="px-3 py-2">{student.first_name}</td><td className="px-3 py-2">{student.last_name}</td><td className="px-3 py-2">@{student.username}</td><td className="px-3 py-2"><a className="text-blue-600 hover:underline" href={portfolioUrl} target="_blank" rel="noreferrer">View Card</a></td></tr>
                  })}</tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}