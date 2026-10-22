import {Task} from "./tasksTypes.ts";

export type UserStartedTask = {
  id: number;
  started_at: string;
  started_by: number;
  current_value: string;
  activity_task: {
    act_task_id: number;
    task_type: string;
    preview: string | null;
    instructions: string | null;
    is_logged: boolean;
    allows_robot: boolean;
  };
  task: Task;
}