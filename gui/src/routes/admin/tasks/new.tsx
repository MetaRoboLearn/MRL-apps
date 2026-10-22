import {createFileRoute} from '@tanstack/react-router'
import TaskProviders from "../../../providers/wrappers/TaskProviders.tsx";
import {Task} from "../../../types/tasksTypes.ts";
import TaskScreen from "../../../components/Task/TaskScreen.tsx";

export const Route = createFileRoute('/admin/tasks/new')({
  component: RouteComponent,
})

const DEFAULT_TASK: Task = {
  id: null,
  title: 'Novi zadatak',
  description: null,
  size_x: 5,
  size_z: 5,
  start: null,
  rotation: 0.0,
  finish: null,
  barriers: null,
  stickers: null,
  code: null,
  blocks: null,
  active: true,
  floor_color: null,
  model_path: null,
}

function RouteComponent() {
  return (
    <TaskProviders task={DEFAULT_TASK} code={''} blocks={''} mode={'create'}>
      <TaskScreen />
    </TaskProviders>
  )
}
