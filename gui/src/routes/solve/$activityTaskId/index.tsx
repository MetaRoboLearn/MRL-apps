import {createFileRoute} from '@tanstack/react-router'
import {queryOptions, useSuspenseQuery, useMutation} from "@tanstack/react-query";
import {useCallback} from "react";
import TaskProviders from "../../../providers/wrappers/TaskProviders.tsx";
import TaskScreen from "../../../components/Task/TaskScreen.tsx";
import {getUserStartedTask, updateUserStartedTask} from "../../../api/userStartedTaskApi.ts";

const actTaskQueryOptions = (actTaskId: string) =>
  queryOptions({
    queryKey: ['actTask', actTaskId],
    queryFn: () => getUserStartedTask(actTaskId),
    staleTime: 0,
    gcTime: 0,
  })

export const Route = createFileRoute('/solve/$activityTaskId/')({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(actTaskQueryOptions(params.activityTaskId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { activityTaskId } = Route.useParams();
  const { data: info } = useSuspenseQuery(actTaskQueryOptions(activityTaskId));

  const saveMutation = useMutation({
    mutationFn: (currentValue: string) =>
      updateUserStartedTask(info.id, { current_value: currentValue }),
  });

  const handleSave = useCallback((currentValue: string) => {
    saveMutation.mutate(currentValue);
  }, []);

  return (
    <TaskProviders
      ust={info}
      task={info.task}
      code={info.activity_task.task_type === 'python' ? info.current_value : ''}
      blocks={info.activity_task.task_type === 'blockly' ? info.current_value : ''}
      mode={'solve'}
      onCodeSave={handleSave}
    >
      <TaskScreen />
    </TaskProviders>
  );
}