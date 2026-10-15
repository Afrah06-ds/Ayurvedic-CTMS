import { User, CreateUserData, TrialDeadline, AdminAuditLog } from './types';
import { getDefaultPermissions, getUserTypeConfig } from './permissions';

const STORAGE_USERS_KEY = 'ctms_cached_users_v3';
const STORAGE_SESSION_KEY = 'ctms_cached_session_v3';
const STORAGE_DEADLINES_KEY = 'ctms_cached_deadlines_v1';
const STORAGE_AUDIT_KEY = 'ctms_cached_admin_audit_v1';

export const INITIAL_SEED_USERS: User[] = [
  // 1. Super Admin: User management, role permissions, all studies, system settings and audit logs
  {
    id: 'usr_super_admin_001',
    email: 'admin@ctms.com',
    password: 'admin@123',
    fullName: 'Dr. Rajesh Sharma (Super Admin)',
    role: 'admin',
    userType: 'super_admin',
    permissions: getDefaultPermissions('super_admin'),
    department: 'AIIA IT & Clinical Systems Directorate',
    phone: '+91 98100 12345',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 2. Principal Investigator (PI): Study management, patient records, visits, drug assignment, safety reports and approvals
  {
    id: 'usr_pi_002',
    email: 'pi@ctms.com',
    password: 'pi@123',
    fullName: 'Prof. Dr. Sarah Jenkins (Lead PI)',
    role: 'user',
    userType: 'principal_investigator',
    permissions: getDefaultPermissions('principal_investigator'),
    department: 'Ayurvedic Clinical Research & Kayachikitsa',
    phone: '+91 98200 23456',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 3. Study Coordinator: Patient screening, enrolment, consent, visits and observations
  {
    id: 'usr_coord_003',
    email: 'coord@ctms.com',
    password: 'coord@123',
    fullName: 'Michael Vance (Lead Study Coordinator)',
    role: 'user',
    userType: 'study_coordinator',
    permissions: getDefaultPermissions('study_coordinator'),
    department: 'Clinical Trial Site Management Unit',
    phone: '+91 98300 34567',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 4. Clinical Monitor (CRA): Site monitoring, protocol deviations, data queries and monitoring reports
  {
    id: 'usr_cra_004',
    email: 'cra@ctms.com',
    password: 'cra@123',
    fullName: 'Elena Rostova (Lead Clinical Monitor / CRA)',
    role: 'user',
    userType: 'clinical_monitor',
    permissions: getDefaultPermissions('clinical_monitor'),
    department: 'Clinical Quality Assurance & Site Monitoring',
    phone: '+91 98400 45678',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 5. Ethics Committee (IEC): Ethics application review, protocol approval, renewals and safety report review
  {
    id: 'usr_iec_005',
    email: 'iec@ctms.com',
    password: 'iec@123',
    fullName: 'Dr. K. S. Murthy (IEC Chairperson)',
    role: 'user',
    userType: 'ethics_committee',
    permissions: getDefaultPermissions('ethics_committee'),
    department: 'Institutional Ethics Committee (IEC Secretariat)',
    phone: '+91 98500 56789',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 6. Pharmacovigilance Team: ADR/AE/SAE reports, MedDRA/WHODrug coding, safety analysis and reporting deadlines
  {
    id: 'usr_pv_006',
    email: 'pv@ctms.com',
    password: 'pv@123',
    fullName: 'Dr. Anita Patel (National PV Lead)',
    role: 'user',
    userType: 'pharmacovigilance',
    permissions: getDefaultPermissions('pharmacovigilance'),
    department: 'National Pharmacovigilance Centre for AYUSH',
    phone: '+91 98600 67890',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 7. Data Manager: Data validation, data quality checks, query management and data export
  {
    id: 'usr_dm_007',
    email: 'dm@ctms.com',
    password: 'dm@123',
    fullName: 'David Thorne (Senior Data Manager)',
    role: 'user',
    userType: 'data_manager',
    permissions: getDefaultPermissions('data_manager'),
    department: 'Clinical Data Management & Biostatistics',
    phone: '+91 98700 78901',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 8. DSMB Member: Safety trends, interim analysis and risk reports
  {
    id: 'usr_dsmb_008',
    email: 'dsmb@ctms.com',
    password: 'dsmb@123',
    fullName: 'Prof. Arvind Nambiar (DSMB Chair)',
    role: 'user',
    userType: 'dsmb_member',
    permissions: getDefaultPermissions('dsmb_member'),
    department: 'Data and Safety Monitoring Board (DSMB)',
    phone: '+91 98800 89012',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 9. Admin / Leadership: Overall dashboard, KPIs, study progress, delays and reports
  {
    id: 'usr_leadership_009',
    email: 'leadership@ctms.com',
    password: 'leadership@123',
    fullName: 'Dr. Meera Chandran (Dean / Leadership)',
    role: 'admin',
    userType: 'admin_leadership',
    permissions: getDefaultPermissions('admin_leadership'),
    department: 'Executive Leadership & Research Council',
    phone: '+91 98900 90123',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // 10. Regulator / Auditor: Read-only access to authorised study records, regulatory documents and audit trails
  {
    id: 'usr_auditor_010',
    email: 'auditor@ctms.com',
    password: 'auditor@123',
    fullName: 'Inspector James Sterling (CDSCO Auditor)',
    role: 'user',
    userType: 'regulator_auditor',
    permissions: getDefaultPermissions('regulator_auditor'),
    department: 'Central Drugs Standard Control Organization (CDSCO)',
    phone: '+91 98000 01234',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001', 'ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // Legacy aliases for backward compatibility with previous sessions
  {
    id: 'usr_monitor_legacy',
    email: 'monitor@ctms.com',
    password: 'monitor@123',
    fullName: 'Elena Rostova (CRA Monitor)',
    role: 'user',
    userType: 'clinical_monitor',
    permissions: getDefaultPermissions('clinical_monitor'),
    department: 'Clinical Quality Assurance & Monitoring',
    phone: '+91 98400 45678',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_002'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_ethics_legacy',
    email: 'ethics@ctms.com',
    password: 'ethics@123',
    fullName: 'Dr. K. S. Murthy (Ethics Member)',
    role: 'user',
    userType: 'ethics_committee',
    permissions: getDefaultPermissions('ethics_committee'),
    department: 'Institutional Ethics Committee',
    phone: '+91 98500 56789',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
    assignedCentreIds: ['ctr_seed_001'],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_regulator_legacy',
    email: 'regulator@ctms.com',
    password: 'regulator@123',
    fullName: 'Inspector James Sterling (Auditor)',
    role: 'user',
    userType: 'regulator_auditor',
    permissions: getDefaultPermissions('regulator_auditor'),
    department: 'Health Authority Regulatory Inspection',
    phone: '+91 98000 01234',
    assignedTrialIds: ['prop_sample_001', 'CT-001'],
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

export const updateUserInCache = (userId: string, data: Partial<User>): User => {
  const users = getCachedUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    throw new Error('User not found.');
  }
  const existing = users[index];
  const updatedUser: User = {
    ...existing,
    ...data,
    permissions: Array.isArray(data.permissions) ? data.permissions : existing.permissions,
    assignedTrialIds: Array.isArray(data.assignedTrialIds) ? data.assignedTrialIds : existing.assignedTrialIds,
    assignedCentreIds: Array.isArray(data.assignedCentreIds) ? data.assignedCentreIds : existing.assignedCentreIds,
  };
  users[index] = updatedUser;
  saveCachedUsers([...users]);

  // If current session matches this user, update session as well
  const currentSession = getCachedSession();
  if (currentSession && currentSession.id === userId) {
    const { password: _, ...safeUser } = updatedUser;
    saveCachedSession(safeUser);
  }

  return updatedUser;
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
      const userType = parsed.userType || (parsed.role === 'admin' ? 'super_admin' : 'study_coordinator');
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

// ==========================================
// APPROVAL & CERTIFICATE DEADLINES STORAGE
// ==========================================

export const INITIAL_SEED_DEADLINES: TrialDeadline[] = [
  {
    id: 'dead_001',
    title: 'Institutional Ethics Committee (IEC) Annual Renewal',
    category: 'ethics_approval',
    trialId: 'CT-001',
    centreId: 'ctr_seed_001',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), // 14 days
    assignedToUserId: 'usr_iec_005',
    assignedToName: 'Dr. K. S. Murthy',
    assignedToRole: 'ethics_committee',
    priority: 'high',
    status: 'pending',
    reminderDaysBefore: [14, 7, 3, 1],
    escalationUserId: 'usr_super_admin_001',
    escalationUserName: 'Dr. Rajesh Sharma (Super Admin)',
    notes: 'Submit annual ethics renewal dossier and safety oversight summary before expiration.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dead_002',
    title: 'Treatment Completion Certificate Sign-off (Batch 1)',
    category: 'treatment_certificate',
    trialId: 'CT-001',
    centreId: 'ctr_seed_001',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), // 5 days
    assignedToUserId: 'usr_pi_002',
    assignedToName: 'Prof. Dr. Sarah Jenkins (Lead PI)',
    assignedToRole: 'principal_investigator',
    priority: 'high',
    status: 'pending',
    reminderDaysBefore: [7, 3, 1],
    escalationUserId: 'usr_super_admin_001',
    escalationUserName: 'Dr. Rajesh Sharma (Super Admin)',
    notes: 'Verify 12-week treatment visit records and approve completion certificates for eligible participants.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dead_003',
    title: 'CDSCO / DCGI Periodic Safety Update Report (PSUR)',
    category: 'safety_expedited_submission',
    trialId: 'CT-001',
    centreId: 'ctr_seed_001',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), // 2 days (urgent)
    assignedToUserId: 'usr_pv_006',
    assignedToName: 'Dr. Anita Patel (National PV Lead)',
    assignedToRole: 'pharmacovigilance',
    priority: 'critical',
    status: 'in_progress',
    reminderDaysBefore: [5, 3, 1],
    escalationUserId: 'usr_super_admin_001',
    escalationUserName: 'Dr. Rajesh Sharma (Super Admin)',
    notes: 'Submit expedited safety analysis and MedDRA coded adverse reactions report to regulatory authority.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dead_004',
    title: 'Protocol Amendment v2.1 Formal PI Sign-off',
    category: 'protocol_approval',
    trialId: 'CT-001',
    centreId: 'ctr_seed_002',
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), // Overdue by 1 day
    assignedToUserId: 'usr_pi_002',
    assignedToName: 'Prof. Dr. Sarah Jenkins (Lead PI)',
    assignedToRole: 'principal_investigator',
    priority: 'critical',
    status: 'overdue',
    reminderDaysBefore: [3, 1],
    escalationUserId: 'usr_super_admin_001',
    escalationUserName: 'Dr. Rajesh Sharma (Super Admin)',
    notes: 'Overdue protocol approval amendment required for continued recruitment at AIIA - Chennai Centre.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let memoryDeadlines: TrialDeadline[] = INITIAL_SEED_DEADLINES;

export const getCachedDeadlines = (): TrialDeadline[] => {
  if (typeof window === 'undefined') return memoryDeadlines;
  try {
    const raw = localStorage.getItem(STORAGE_DEADLINES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_DEADLINES_KEY, JSON.stringify(INITIAL_SEED_DEADLINES));
      return INITIAL_SEED_DEADLINES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_DEADLINES_KEY, JSON.stringify(INITIAL_SEED_DEADLINES));
      return INITIAL_SEED_DEADLINES;
    }
    return parsed;
  } catch {
    return memoryDeadlines;
  }
};

export const saveCachedDeadlines = (deadlines: TrialDeadline[]): void => {
  memoryDeadlines = deadlines;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_DEADLINES_KEY, JSON.stringify(deadlines));
  }
};

export const addDeadline = (
  data: Omit<TrialDeadline, 'id' | 'createdAt' | 'updatedAt'>
): TrialDeadline => {
  const current = getCachedDeadlines();
  const newDeadline: TrialDeadline = {
    ...data,
    id: `dead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [newDeadline, ...current];
  saveCachedDeadlines(updated);
  return newDeadline;
};

export const updateDeadlineStatus = (
  id: string,
  status: TrialDeadline['status']
): TrialDeadline => {
  const current = getCachedDeadlines();
  const index = current.findIndex((d) => d.id === id);
  if (index === -1) throw new Error('Deadline not found.');
  current[index].status = status;
  current[index].updatedAt = new Date().toISOString();
  saveCachedDeadlines([...current]);
  return current[index];
};

export const deleteDeadline = (id: string): void => {
  const current = getCachedDeadlines();
  const updated = current.filter((d) => d.id !== id);
  saveCachedDeadlines(updated);
};

// ==========================================
// ADMIN AUDIT LOGS STORAGE
// ==========================================

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'audit_init_001',
    action: 'Enterprise RBAC Initialization',
    category: 'Security',
    details: 'Configured 10 AIIA CTMS User Access Modules with 21 CFR Part 11 role-based and study-based access controls.',
    performedBy: 'System Bootstrap',
    performedByEmail: 'admin@ctms.com',
    performedByRole: 'super_admin',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'audit_init_002',
    action: 'Study Access Assigned',
    category: 'Study Assignment',
    details: 'Assigned Trial "CT-001" and Centres "ctr_seed_001", "ctr_seed_002" to Prof. Dr. Sarah Jenkins (Lead PI).',
    performedBy: 'Dr. Rajesh Sharma',
    performedByEmail: 'admin@ctms.com',
    performedByRole: 'super_admin',
    targetId: 'usr_pi_002',
    targetName: 'Prof. Dr. Sarah Jenkins',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'audit_init_003',
    action: 'Deadline Assigned with Escalation',
    category: 'Deadlines',
    details: 'Assigned "IEC Annual Renewal" deadline to Dr. K. S. Murthy with 14-day reminder and Super Admin escalation rule.',
    performedBy: 'Dr. Rajesh Sharma',
    performedByEmail: 'admin@ctms.com',
    performedByRole: 'super_admin',
    targetId: 'dead_001',
    targetName: 'IEC Annual Renewal',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

let memoryAuditLogs: AdminAuditLog[] = INITIAL_AUDIT_LOGS;

export const getCachedAdminAuditLogs = (): AdminAuditLog[] => {
  if (typeof window === 'undefined') return memoryAuditLogs;
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return parsed;
  } catch {
    return memoryAuditLogs;
  }
};

export const addAdminAuditLog = (
  log: Omit<AdminAuditLog, 'id' | 'timestamp'>
): AdminAuditLog => {
  const current = getCachedAdminAuditLogs();
  const newLog: AdminAuditLog = {
    ...log,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...current];
  memoryAuditLogs = updated;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(updated));
  }
  return newLog;
};
