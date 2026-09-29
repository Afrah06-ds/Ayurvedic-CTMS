import { User, CreateUserData } from './types';

const STORAGE_USERS_KEY = 'ctms_cached_users';
const STORAGE_SESSION_KEY = 'ctms_cached_session';

export const INITIAL_ADMIN: User = {
  id: 'usr_admin_001',
  email: 'admin@ctms.com',
  password: 'admin@123',
  fullName: 'CTMS System Admin',
  role: 'admin',
  department: 'Clinical Operations & Administration',
  phone: '+1 (555) 019-2834',
  status: 'active',
  createdAt: new Date().toISOString(),
};

// In-memory fallback
let memoryUsers: User[] = [INITIAL_ADMIN];
let memorySession: Omit<User, 'password'> | null = null;

export const getCachedUsers = (): User[] => {
  if (typeof window === 'undefined') {
    return memoryUsers;
  }
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([INITIAL_ADMIN]));
      return [INITIAL_ADMIN];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([INITIAL_ADMIN]));
      return [INITIAL_ADMIN];
    }
    // Ensure admin@ctms.com always exists
    const hasAdmin = parsed.some((u: User) => u.email.toLowerCase() === 'admin@ctms.com');
    if (!hasAdmin) {
      parsed.unshift(INITIAL_ADMIN);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.warn('Storage read error, using memory fallback', err);
    return memoryUsers;
  }
};

export const saveCachedUsers = (users: User[]): void => {
  memoryUsers = users;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('Failed to save to localStorage', err);
    }
  }
};

export const addUserToCache = (data: CreateUserData): User => {
  const users = getCachedUsers();
  const existing = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase().trim());
  if (existing) {
    throw new Error(`User with email "${data.email}" already exists.`);
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: data.email.trim().toLowerCase(),
    password: data.password,
    fullName: data.fullName.trim(),
    role: data.role || 'user',
    department: data.department?.trim() || 'General',
    phone: data.phone?.trim() || '',
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [newUser, ...users];
  saveCachedUsers(updatedUsers);
  return newUser;
};

export const deleteUserFromCache = (userId: string): void => {
  const users = getCachedUsers();
  const target = users.find((u) => u.id === userId);
  if (target?.email.toLowerCase() === 'admin@ctms.com') {
    throw new Error('Primary administrator account cannot be deleted.');
  }
  const updated = users.filter((u) => u.id !== userId);
  saveCachedUsers(updated);
};

export const toggleUserStatusInCache = (userId: string): User => {
  const users = getCachedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.email.toLowerCase() === 'admin@ctms.com') {
    throw new Error('Primary administrator status cannot be modified.');
  }
  user.status = user.status === 'active' ? 'inactive' : 'active';
  saveCachedUsers([...users]);
  return user;
};

export const getCachedSession = (): Omit<User, 'password'> | null => {
  if (typeof window === 'undefined') {
    return memorySession;
  }
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return memorySession;
  }
};

export const saveCachedSession = (user: Omit<User, 'password'> | null): void => {
  memorySession = user;
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }
};
