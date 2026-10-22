import { createFileRoute } from '@tanstack/react-router'
import TaskScreen from "../../../../components/Task/TaskScreen.tsx";

export const Route = createFileRoute('/admin/tasks/$taskId/edit')({
  staticData: { mode: 'edit' as const },
  component: () => <TaskScreen />,
})