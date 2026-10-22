import {UserBasic} from "./userTypes.ts";

export interface ActivityTask {
  activity_task_id: number;
  task_id: number;
  task_title: string | null;
  preview: string | null;
  instructions: string | null;
  order: number;
  task_type: string | null;
  is_logged: boolean;
  allows_robot: boolean;
  student_mode: string;
  creator: UserBasic | null;
  updater: UserBasic | null;
}

export type ActivityTaskBasic = {
  activity_task_id: number;
  task_id: number;
  task_title: string | null;
  preview: string | null;
  instructions: string | null;
  order: number;
  task_type: string | null;
  is_logged: boolean;
  allows_robot: boolean;
}

export type Activity = {
  id: number;
  title: string;
  description: string | null;
  time_from: string | null;
  time_to: string | null;
  active: boolean;
  activity_tasks: ActivityTaskBasic[];
  created_at: string;
  updated_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  creator: UserBasic;
}

export type CreateActivityRequest = {
  title: string;
  description?: string;
  time_from: string;
  time_to: string;
};

// landing page
type TaskType = "blockly" | "python";

type AvailableActivityTask = {
  preview: string | null;
  instructions: string | null;
  activity_task_id: number;
  allows_robot: boolean;
  is_logged: boolean;
  order: number;
  task_description: string;
  task_id: number;
  task_title: string;
  task_type: TaskType;
  started: boolean;
  user_started_task_id: number | null;
  is_finished: true | null
  difficulty: number | null;
}

export type AvailableActivity = {
  activity_tasks: AvailableActivityTask[];
  description: string;
  id: number;
  time_from: string;
  time_to: string;
  title: string;
}