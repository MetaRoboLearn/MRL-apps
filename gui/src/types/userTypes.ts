export type Role = {
  id: number;
  name: string;
}

export type CurrentUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

export type User = {
  id: number
  username: string
  first_name: string
  last_name: string
  role_id: number
  role_name: string
  active: boolean
  created_at: string
  updated_at: string
  created_by: number | null
  updated_by: number | null
  last_login: string | null
}

export type UserBasic = {
  username: string;
  first_name: string;
  last_name: string;
};

export type CreateUserRequest = {
  username: string
  password_hash: string
  first_name: string
  last_name: string
  role_id: number
}

export type UpdateUserRequest = {
  username: string
  password_hash?: string
  first_name: string
  last_name: string
  role_id: number
}