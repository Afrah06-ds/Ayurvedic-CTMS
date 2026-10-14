import { User, CreateUserData } from './types';
import { getDefaultPermissions, getUserTypeConfig } from './permissions';

const STORAGE_USERS_KEY = 'ctms_cached_users_v2';
const STORAGE_SESSION_KEY = 'ctms_cached_session_v2';

export const INITIAL_SEED_USERS: User[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@ctms.com',
    password: 'admin@123',
    fullName: 'CTMS System Admin',
    role: 'admin',
    userType: 'system_administrator',
    permissions: getDefaultPermissions('system_administrator'),
    department: 'Clinical Operations & System Administration',
    phone: '+1 (555) 019-2834',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_pi_002',
    email: 'pi@ctms.com',
    password: 'pi@123',
    fullName: 'Dr. Sarah Jenkins (PI)',
    role: 'user',
    userType: 'principal_investigator',
    permissions: getDefaultPermissions('principal_investigator'),
    department: 'Oncology Research Department',
    phone: '+1 (555) 304-9182',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_coord_003',
    email: 'coord@ctms.com',
    password: 'coord@123',
    fullName: 'Michael Vance (Study Coordinator)',
    role: 'user',
    userType: 'study_coordinator_team_member',
    permissions: getDefaultPermissions('study_coordinator_team_member'),
    department: 'Clinical Trial Site 101',
    phone: '+1 (555) 829-1034',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_monitor_004',
    email: 'monitor@ctms.com',
    password: 'monitor@123',
    fullName: 'Elena Rostova (Co-Investigator / Doctor)',
    role: 'user',
    userType: 'co_investigator_doctor',
    permissions: getDefaultPermissions('co_investigator_doctor'),
    department: 'Clinical Quality Assurance & Monitoring',
    phone: '+1 (555) 492-0193',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_ethics_005',
    email: 'ethics@ctms.com',
    password: 'ethics@123',
    fullName: 'David Thorne (Data Manager)',
    role: 'user',
    userType: 'data_manager',
    permissions: getDefaultPermissions('data_manager'),
    department: 'Data Management & Clinical Operations',
    phone: '+1 (555) 901-2831',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_pv_006',
    email: 'pv@ctms.com',
    password: 'pv@123',
    fullName: 'Dr. Anita Patel (Pharmacovigilance)',
    role: 'user',
    userType: 'pharmacovigilance_safety_officer',
    permissions: getDefaultPermissions('pharmacovigilance_safety_officer'),
    department: 'Drug Safety & Pharmacovigilance Unit',
    phone: '+1 (555) 772-9102',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_regulator_007',
    email: 'regulator@ctms.com',
    password: 'regulator@123',
    fullName: 'Inspector James Sterling (Viewer)',
    role: 'user',
    userType: 'viewer_read_only',
    permissions: getDefaultPermissions('viewer_read_only'),
    department: 'Health Authority Regulatory Inspection',
    phone: '+1 (555) 603-9184',
    assignedTrialIds: ['prop_sample_001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ADMIN = INITIAL_SEED_USERS[0];

// In-memory fallback
let memoryUsers: User[] = INITIAL_SEED_USERS;
let memorySession: Omit<User, 'password'> | null = null;

export const getCachedUsers = (): User[] => {
  if (typeof window === 'undefined') {
    return memoryUsers;
  }
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_SEED_USERS));
      return INITIAL_SEED_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_SEED_USERS));
      return INITIAL_SEED_USERS;
    }
    // Ensure all seed user types exist and have userType & permissions
    const updated = parsed.map((u: any) => {
      const userType = u.userType || (u.role === 'admin' ? 'system_administrator' : 'study_coordinator_team_member');
      const permissions = u.permissions && u.permissions.length > 0 ? u.permissions : getDefaultPermissions(userType);
      return {
        ...u,
        userType,
        permissions,
        assignedTrialIds: Array.isArray(u.assignedTrialIds) ? u.assignedTrialIds : [],
        assignedCentreIds: Array.isArray(u.assignedCentreIds) ? u.assignedCentreIds : [],
      };
    });

    const hasAdmin = updated.some((u: User) => u.email.toLowerCase() === 'admin@ctms.com');
    if (!hasAdmin) {
      updated.unshift(INITIAL_ADMIN);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
    }
    return updated;
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

  const selectedUserType = data.userType || 'study_coordinator_team_member';
  const typeConfig = getUserTypeConfig(selectedUserType);
  const computedRole = selectedUserType === 'system_administrator' || selectedUserType === 'administration' ? 'admin' : (data.role || 'user');
  const computedPermissions = data.permissions && data.permissions.length > 0
    ? data.permissions
    : getDefaultPermissions(selectedUserType);

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: data.email.trim().toLowerCase(),
    password: data.password,
    fullName: data.fullName.trim(),
    role: computedRole,
    userType: selectedUserType,
    permissions: computedPermissions,
    department: data.department?.trim() || typeConfig.label,
    phone: data.phone?.trim() || '',
    assignedTrialIds: Array.isArray(data.assignedTrialIds) ? data.assignedTrialIds : [],
    assignedCentreIds: Array.isArray(data.assignedCentreIds) ? data.assignedCentreIds : [],
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
    const parsed = JSON.parse(raw);
    if (parsed) {
      const userType = parsed.userType || (parsed.role === 'admin' ? 'administration' : 'study_coordinator');
      parsed.userType = userType;
      parsed.permissions = parsed.permissions || getDefaultPermissions(userType);
    }
    return parsed;
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
