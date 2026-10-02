import { UserType, PermissionKey, UserTypeConfig, User } from './types';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'Administration' | 'Protocol & Trial' | 'Patient & CRF' | 'Monitoring & Query' | 'Safety & Ethics' | 'Regulatory & Audit';
  description: string;
}

export const ALL_PERMISSIONS_LIST: PermissionDefinition[] = [
  // Administration
  {
    key: 'manage_users',
    label: 'Manage User Accounts',
    category: 'Administration',
    description: 'Create, update, activate/deactivate, and delete user accounts across the CTMS.',
  },
  {
    key: 'manage_system_settings',
    label: 'System Configuration',
    category: 'Administration',
    description: 'Configure site-wide settings, integration keys, and database preferences.',
  },

  // Protocol & Trial
  {
    key: 'create_trials',
    label: 'Create & Launch Trials',
    category: 'Protocol & Trial',
    description: 'Initiate new clinical trials, assign study sites, and define trial phases.',
  },
  {
    key: 'edit_protocols',
    label: 'Edit Trial Protocols',
    category: 'Protocol & Trial',
    description: 'Modify study design, eligibility criteria, and amendment documentation.',
  },
  {
    key: 'view_all_trials',
    label: 'View Trial Directory',
    category: 'Protocol & Trial',
    description: 'Access master list of active and archived clinical trials and study metrics.',
  },

  // Patient & CRF
  {
    key: 'enroll_patients',
    label: 'Subject Recruitment & Enrollment',
    category: 'Patient & CRF',
    description: 'Register new trial subjects, record informed consent, and assign subject IDs.',
  },
  {
    key: 'enter_ecrf',
    label: 'eCRF Data Entry',
    category: 'Patient & CRF',
    description: 'Input clinical trial observation data into electronic Case Report Forms.',
  },
  {
    key: 'approve_ecrf',
    label: 'Approve & Sign eCRF Data',
    category: 'Patient & CRF',
    description: 'Review eCRF entries and provide formal investigator sign-off.',
  },
  {
    key: 'sign_crf',
    label: 'Electronic Signature (21 CFR Part 11)',
    category: 'Patient & CRF',
    description: 'Attach legally binding electronic signature to trial documents and CRFs.',
  },

  // Monitoring & Query
  {
    key: 'sdv_verification',
    label: 'Source Data Verification (SDV)',
    category: 'Monitoring & Query',
    description: 'Verify entered eCRF data against primary medical records and source files.',
  },
  {
    key: 'create_queries',
    label: 'Generate Data Queries',
    category: 'Monitoring & Query',
    description: 'Issue data discrepancy queries to site staff for resolution.',
  },
  {
    key: 'submit_monitoring_reports',
    label: 'Submit CRA Monitoring Reports',
    category: 'Monitoring & Query',
    description: 'File site initiation, routine monitoring, and close-out visit reports.',
  },

  // Safety & Ethics
  {
    key: 'review_protocols',
    label: 'IRB/IEC Protocol Review',
    category: 'Safety & Ethics',
    description: 'Evaluate trial protocols for ethical compliance and subject safety.',
  },
  {
    key: 'approve_ethics',
    label: 'Grant Ethics Approval',
    category: 'Safety & Ethics',
    description: 'Issue official IRB/IEC ethical clearance certification for study sites.',
  },
  {
    key: 'manage_safety_reports',
    label: 'Safety & PV Case Management',
    category: 'Safety & Ethics',
    description: 'Manage adverse event logs, expedited safety reports, and CIOMS forms.',
  },
  {
    key: 'report_sae',
    label: 'Report Serious Adverse Events (SAE)',
    category: 'Safety & Ethics',
    description: 'Submit urgent SAE notifications to pharmacovigilance and sponsor.',
  },
  {
    key: 'safety_triage',
    label: 'Safety Signal Triage',
    category: 'Safety & Ethics',
    description: 'Perform causality assessment and safety signal detection for ongoing trials.',
  },

  // Regulatory & Audit
  {
    key: 'view_audit_logs',
    label: 'View 21 CFR Audit Trail',
    category: 'Regulatory & Audit',
    description: 'Inspect full immutable record of system changes, timestamps, and user actions.',
  },
  {
    key: 'export_reports',
    label: 'Export Analytics & Compliance Reports',
    category: 'Regulatory & Audit',
    description: 'Generate downloadable PDF/CSV reports of trial data and study progress.',
  },
  {
    key: 'view_regulatory_tmf',
    label: 'Inspect Trial Master File (TMF)',
    category: 'Regulatory & Audit',
    description: 'Read-only access to essential trial documents for regulatory inspections.',
  },
];

export const USER_TYPES_CONFIG: Record<UserType, UserTypeConfig> = {
  administration: {
    id: 'administration',
    label: 'Administration',
    role: 'admin',
    description: 'Full administrative rights, user management, site setup, protocol configuration & system settings.',
    color: 'purple',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30',
    permissions: [
      'manage_users',
      'manage_system_settings',
      'create_trials',
      'edit_protocols',
      'view_all_trials',
      'view_audit_logs',
      'export_reports',
      'manage_safety_reports',
      'view_regulatory_tmf',
    ],
  },
  principal_investigator: {
    id: 'principal_investigator',
    label: 'Principal Investigator',
    role: 'user',
    description: 'Protocol management, trial oversight, eCRF sign-off, SAE reporting & 21 CFR Part 11 signatures.',
    color: 'amber',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    permissions: [
      'create_trials',
      'edit_protocols',
      'view_all_trials',
      'approve_ecrf',
      'sign_crf',
      'report_sae',
      'view_audit_logs',
      'export_reports',
    ],
  },
  study_coordinator: {
    id: 'study_coordinator',
    label: 'Study Coordinator',
    role: 'user',
    description: 'Subject recruitment, eCRF data entry, visit scheduling, lab records & site administration.',
    color: 'blue',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
    permissions: [
      'view_all_trials',
      'enroll_patients',
      'enter_ecrf',
      'report_sae',
      'export_reports',
    ],
  },
  monitor: {
    id: 'monitor',
    label: 'Monitor',
    role: 'user',
    description: 'Source Data Verification (SDV), data query issuing, CRA site monitoring visit reports & audit views.',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    permissions: [
      'view_all_trials',
      'sdv_verification',
      'create_queries',
      'submit_monitoring_reports',
      'view_audit_logs',
      'export_reports',
    ],
  },
  ethics_committee: {
    id: 'ethics_committee',
    label: 'Ethics Committee',
    role: 'user',
    description: 'IRB/IEC ethical protocol reviews, safety approval clearance, trial compliance & participant protection.',
    color: 'rose',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    permissions: [
      'view_all_trials',
      'review_protocols',
      'approve_ethics',
      'view_audit_logs',
      'export_reports',
    ],
  },
  pharmacovigilance: {
    id: 'pharmacovigilance',
    label: 'Pharmacovigilance',
    role: 'user',
    description: 'Adverse event (AE/SAE) triage, safety signal detection, safety reporting & medical risk evaluation.',
    color: 'indigo',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/30',
    permissions: [
      'view_all_trials',
      'manage_safety_reports',
      'report_sae',
      'safety_triage',
      'export_reports',
      'view_audit_logs',
    ],
  },
  regulator_read_only: {
    id: 'regulator_read_only',
    label: 'Regulator - Read Only',
    role: 'user',
    description: 'Strictly read-only access to audit logs, Trial Master File (TMF), and regulatory compliance data.',
    color: 'slate',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/40',
    permissions: [
      'view_all_trials',
      'view_audit_logs',
      'view_regulatory_tmf',
      'export_reports',
    ],
  },
};

export const getUserTypeConfig = (type?: UserType): UserTypeConfig => {
  if (!type || !USER_TYPES_CONFIG[type]) {
    return USER_TYPES_CONFIG.administration;
  }
  return USER_TYPES_CONFIG[type];
};

export const getDefaultPermissions = (type?: UserType): PermissionKey[] => {
  const config = getUserTypeConfig(type);
  return [...config.permissions];
};

export const hasPermission = (user: User | null | undefined, permission: PermissionKey): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || user.userType === 'administration') return true;
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }
  // Fallback to default userType permissions
  const defaults = getDefaultPermissions(user.userType);
  return defaults.includes(permission);
};
