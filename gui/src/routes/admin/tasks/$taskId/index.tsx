import { createFileRoute } from '@tanstack/react-router'
import TaskScreen from "../../../../components/Task/TaskScreen.tsx";

export const Route = createFileRoute('/admin/tasks/$taskId/')({
  staticData: { mode: 'solve' as const },
  component: () => <TaskScreen />,
})