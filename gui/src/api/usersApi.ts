import {CreateUserRequest, UpdateUserRequest, User, Role} from "../types/userTypes.ts";

export const getRoles = async (): Promise<Role[]> => {
  const response = await fetch('/api/users/roles', {
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch roles');
  }

  return response.json();
};

export const getUsers = async (params: {
  skip?: number;
  limit?: number;
  role_id?: number;
  active_only?: boolean;
  search?: string;
  order_by_username?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params.skip) queryParams.set('skip', params.skip.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.role_id) queryParams.set('role_id', params.role_id.toString());
  if (params.active_only !== undefined) queryParams.set('active_only', params.active_only.toString());
  if (params.search) queryParams.set('search', params.search);
  if (params.order_by_username) queryParams.set('order_by_username', params.order_by_username.toString());
  
  const response = await fetch(`/api/users?${queryParams}`, {
    credentials: 'include'
  });
  return response.json();
};

export const getUserById = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found')
    }
    throw new Error('Failed to fetch user')
  }

  return response.json()
}

export const createUser = async (data: CreateUserRequest) => {
  const response = await fetch('/api/users', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create user')
  }

  return response.json()
}

export const updateUser = async (userId: string, data: UpdateUserRequest): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }

  return response.json()
}

export const deleteUser = async (userId: string)=> {
  const response = await fetch(`/api/users/${userId}`, {
    credentials: 'include',
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete user')
  }

  return response.json()
}

export const getUsersByIds = async (ids: number[]): Promise<{
  id: number
  first_name: string
  last_name: string
  username: string
}[]> => {
  if (ids.length === 0) return []
  const response = await fetch('/api/users/by-ids', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}