export type Role = 'admin' | 'user';

export type UserType =
  | 'principal_investigator'
  | 'study_coordinator'
  | 'monitor'
  | 'ethics_committee'
  | 'pharmacovigilance'
  | 'administration'
  | 'regulator_read_only';

export type PermissionKey =
  | 'manage_users'
  | 'manage_system_settings'
  | 'create_trials'
  | 'edit_protocols'
  | 'view_all_trials'
  | 'enroll_patients'
  | 'enter_ecrf'
  | 'approve_ecrf'
  | 'sign_crf'
  | 'sdv_verification'
  | 'create_queries'
  | 'submit_monitoring_reports'
  | 'review_protocols'
  | 'approve_ethics'
  | 'manage_safety_reports'
  | 'report_sae'
  | 'safety_triage'
  | 'view_audit_logs'
  | 'export_reports'
  | 'view_regulatory_tmf';

export interface UserTypeConfig {
  id: UserType;
  label: string;
  role: Role;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: Role;
  userType: UserType;
  permissions: PermissionKey[];
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
  userType?: UserType;
  permissions?: PermissionKey[];
  department?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export type CentreType =
  | 'Government Hospital'
  | 'Private Medical Center'
  | 'Academic Research Institute'
  | 'Dedicated Clinical Research Unit'
  | 'Ayurvedic Specialty Hospital';

export interface Centre {
  id: string;
  centreCode: string;
  centreName: string;
  centreType: CentreType | string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  email: string;
  accreditation: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateCentreData {
  centreCode?: string;
  centreName: string;
  centreType: CentreType | string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  email: string;
  accreditation: string;
  status?: 'active' | 'inactive';
}

export type ProposalStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Active';

export interface TrialProposal {
  id: string;
  trialId: string;
  trialTitle: string;
  studyType: string;
  studyPhase: string;
  studyObjective: string;
  studyDesign: string;
  targetDisease: string;
  sampleSize: string;
  duration: string;
  treatmentDuration: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  primaryOutcome: string;
  secondaryOutcome: string;
  selectedCentreIds: string[];
  proposalStatus: ProposalStatus;
  proposedBy?: string;
  createdAt: string;
}

export interface CreateTrialProposalData {
  trialId: string;
  trialTitle: string;
  studyType: string;
  studyPhase: string;
  studyObjective: string;
  studyDesign: string;
  targetDisease: string;
  sampleSize: string;
  duration: string;
  treatmentDuration: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  primaryOutcome: string;
  secondaryOutcome: string;
  selectedCentreIds: string[];
  proposalStatus?: ProposalStatus;
  proposedBy?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  qualification: string;
}

export interface TrialTeam {
  id: string;
  teamId: string;
  teamName: string;
  centreId: string;
  centreName?: string;
  principalInvestigator: string;
  teamLead: string;
  teamMembers: TeamMember[];
  memberCount: number;
  contactNumber: string;
  email: string;
  assignedTrialId: string;
  assignedTrialCode?: string;
  assignedTrialTitle?: string;
  numberOfPatients: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface CreateTrialTeamData {
  teamId: string;
  teamName: string;
  centreId: string;
  principalInvestigator: string;
  teamLead: string;
  teamMembers: TeamMember[];
  contactNumber: string;
  email: string;
  assignedTrialId: string;
  numberOfPatients: number;
  status?: 'Active' | 'Inactive';
}










