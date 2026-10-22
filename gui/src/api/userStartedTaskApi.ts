import {UserStartedTask} from "../types/userStartedTasksTypes.ts";

export const getUserStartedTask = async (activityTaskId: string): Promise<UserStartedTask> => {
  const response = await fetch(`/api/user-started-tasks/activity-task/${activityTaskId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user started task');
  }

  return response.json();
};

export const createUserStartedTask = async (activityTaskId: number) => {
  const response = await fetch('/api/user-started-tasks/', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_task_id: activityTaskId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user started task');
  }

  return response.json();
};

export const updateUserStartedTask = async (ustId: number, data: { current_value: string }) => {
  const response = await fetch(`/api/user-started-tasks/${ustId}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user started task');
  }

  return response.json();
};

export const finishTask = async (ustId: number) => {
  const response = await fetch(`/api/user-started-tasks/${ustId}/finish`, {
    method: "POST",
    credentials: "include",
  });
  return response.json();
};