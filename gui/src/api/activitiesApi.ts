import {AvailableActivity, CreateActivityRequest} from "../types/activityTypes.ts";

export const getActivityById = async (activityId: string) => {
  const response = await fetch(`/api/activities/${activityId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch activity');
  }

  return response.json();
};

export const getActivitiesOverview = async (params: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  search?: string;
  order_by_time_from?: boolean;
}) => {
  const queryParams = new URLSearchParams();

  if (params.skip) queryParams.set('skip', params.skip.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.active_only !== undefined) queryParams.set('active_only', params.active_only.toString());
  if (params.search) queryParams.set('search', params.search);
  if (params.order_by_time_from !== undefined) queryParams.set('order_by_time_from', params.order_by_time_from.toString());

  const response = await fetch(`/api/activities/overview?${queryParams}`, {
    credentials: 'include',
  });
  return response.json();
};

export const createActivity = async (data: CreateActivityRequest) => {
  const response = await fetch('/api/activities/', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create activity');
  }

  return response.json();
};

export const updateActivity = async ({ id, ...data }: CreateActivityRequest & { id: string }) => {
  const response = await fetch(`/api/activities/${id}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update activity');
  }

  return response.json();
};

export const deleteActivity = async (activityId: string) => {
  const response = await fetch(`/api/activities/${activityId}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete activity');
  }

  return response.json();
};

export const getActivityTasks = async (activityId: string) => {
  const response = await fetch(`/api/activity-tasks/?activity_id=${activityId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch activity tasks');
  }

  return response.json();
};

export const getActivityTaskById = async (activityTaskId: string) => {
  const response = await fetch(`/api/activity-tasks/${activityTaskId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch activity task');
  }

  return response.json();
};

export const createActivityTask = async (data: {
  activity_id: number;
  task_id: number;
  type_id: number;
  order: number;
  preview?: string;
  instructions?: string;
  is_logged: boolean;
  allows_robot: boolean;
  difficulty?: number | null;
}) => {
  const response = await fetch('/api/activity-tasks/', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create activity task');
  }

  return response.json();
};

export const updateActivityTask = async ({ id, ...data }: {
  id: string;
  task_id?: number;
  type_id?: number;
  preview?: string;
  instructions?: string;
  is_logged?: boolean;
  allows_robot?: boolean;
  difficulty?: number | null;
}) => {
  const response = await fetch(`/api/activity-tasks/${id}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update activity task');
  }

  return response.json();
};

export const moveActivityTaskUp = async (activityTaskId: number, activityId: string) => {
  const response = await fetch(`/api/activity-tasks/${activityTaskId}/move-up?activity_id=${activityId}`, {
    credentials: 'include',
    method: 'PATCH',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to move task');
  }

  return response.json();
};

export const moveActivityTaskDown = async (activityTaskId: number, activityId: string) => {
  const response = await fetch(`/api/activity-tasks/${activityTaskId}/move-down?activity_id=${activityId}`, {
    credentials: 'include',
    method: 'PATCH',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to move task');
  }

  return response.json();
};

export const deleteActivityTask = async (activityTaskId: number) => {
  const response = await fetch(`/api/activity-tasks/${activityTaskId}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete activity task');
  }

  return response.json();
};

export const getAvailableActivities = async (): Promise<AvailableActivity[]> => {
  const response = await fetch("/api/activities/available", {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status}`);
  }

  return response.json();
};

export const getActivityTaskStudents = async (
  activityTaskId: string,
  params: { skip?: number; limit?: number; search?: string } = {},
) => {
  const queryParams = new URLSearchParams();
  if (params.skip) queryParams.set('skip', params.skip.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.search) queryParams.set('search', params.search);

  const response = await fetch(
    `/api/activity-tasks/${activityTaskId}/students?${queryParams}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch students');
  }

  return response.json();
};

export const setActivityTaskStudents = async (
  activityTaskId: string,
  data: { student_mode: string; user_ids: number[] },
) => {
  const response = await fetch(
    `/api/activity-tasks/${activityTaskId}/students`,
    {
      credentials: 'include',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update students');
  }

  return response.json();
};