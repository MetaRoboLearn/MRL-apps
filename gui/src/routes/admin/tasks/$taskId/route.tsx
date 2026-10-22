import {createFileRoute, Outlet, useMatches} from '@tanstack/react-router'
import TaskProviders from "../../../../providers/wrappers/TaskProviders.tsx";
import {queryOptions, useSuspenseQuery} from "@tanstack/react-query";
import {getTaskById} from "../../../../api/tasksApi.ts";

const taskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId)
  })

export const Route = createFileRoute('/admin/tasks/$taskId')({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(taskQueryOptions(params.taskId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { taskId } = Route.useParams();
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskId));
  const matches = useMatches();
  const leafMatch = matches[matches.length - 1];
  const mode = leafMatch.staticData.mode ?? 'solve';

  return (
    <TaskProviders task={task} code={task.code} blocks={task.blocks} mode={mode}>
      <Outlet />
    </TaskProviders>
  );
}
