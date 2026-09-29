export type Role = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: Role;
  department?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AuthSession {
  user: Omit<User, 'password'> | null;
  token: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  department?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}
