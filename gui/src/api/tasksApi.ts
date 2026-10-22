import {CreateTaskRequest} from "../types/tasksTypes.ts";

export const getTasksPreview = async (params: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  search?: string;
  order_by_title?: boolean;
}) => {
  const queryParams = new URLSearchParams();

  if (params.skip) queryParams.set('skip', params.skip.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.active_only !== undefined) queryParams.set('active_only', params.active_only.toString());
  if (params.search) queryParams.set('search', params.search);
  if (params.order_by_title) queryParams.set('order_by_username', params.order_by_title.toString());

  const response = await fetch(`/api/tasks/?${queryParams}`, {
    credentials: 'include',
  });
  return response.json();
}

export const getTaskById = async (taskId: string)=>{
  const response = await fetch(`/api/tasks/${taskId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Task not found')
    }
    throw new Error('Failed to fetch task')
  }

  return response.json()
}

export const createTask = async (data: CreateTaskRequest) => {
  const response = await fetch('/api/tasks', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create task')
  }

  return response.json()
}

export const updateTask = async ({ id, ...data }: CreateTaskRequest & { id: string }) => {
  const response = await fetch(`/api/tasks/${id}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }

  return response.json();
};

export const deleteTask = async (taskId: string) => {
  const response = await fetch(`/api/tasks/${taskId}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task');
  }

  return response.json();
};