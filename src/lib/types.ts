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

<<<<<<< Updated upstream
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










=======
export type DrugStatus = 'Active' | 'Inactive' | 'Under Review' | 'Quarantine' | 'Discontinued' | 'Recalled';

export interface DrugComponent {
  id: string;
  name: string;
  strength: string; // e.g. "300 mg"
  botanicalName?: string;
  partUsed?: string;
}

export interface Drug {
  id: string; // e.g. "DRUG001"
  drugName: string; // e.g. "Ashwagandha Extract"
  genericName: string; // e.g. "Withania somnifera Extract"
  drugType: string; // e.g. "Indian System of Medicine (AYUSH)"
  formulationName: string; // e.g. "Ashwagandha Herbal Capsule"
  dosageForm: string; // e.g. "Capsule"
  strength: string; // e.g. "500 mg"
  manufacturer: string; // e.g. "AIIA Research Pharmacy"
  batchNumber: string; // e.g. "ASH2026B01"
  expiryDate: string; // e.g. "30-09-2028"
  routeOfAdministration: string; // e.g. "Oral"
  indication: string; // e.g. "Stress and General Wellness"
  trialPhase: string; // e.g. "Phase II"
  ctriRegistrationNumber: string; // e.g. "CTRI/2026/09/000001"
  cdscoPermissionStatus: string; // e.g. "Not Applicable"
  assignedCentre: string; // e.g. "AIIA – Chennai Centre"
  principalInvestigator: string; // e.g. "Dr. Arjun Kumar"
  availableQuantity: string; // e.g. "500 Capsules"
  frequency: string; // e.g. "Once daily"
  treatmentDuration: string; // e.g. "12 weeks"
  drugStatus: DrugStatus; // e.g. "Active"
  componentCount: number; // e.g. 3
  components: DrugComponent[];
  totalDosage: string; // e.g. "500 mg per capsule"
  storageConditions?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDrugData {
  id?: string;
  drugName: string;
  genericName: string;
  drugType: string;
  formulationName: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  routeOfAdministration: string;
  indication: string;
  trialPhase: string;
  ctriRegistrationNumber: string;
  cdscoPermissionStatus: string;
  assignedCentre: string;
  principalInvestigator: string;
  availableQuantity: string;
  frequency: string;
  treatmentDuration: string;
  drugStatus?: DrugStatus;
  componentCount?: number;
  components: Array<{ name: string; strength: string; botanicalName?: string; partUsed?: string }>;
  totalDosage: string;
  storageConditions?: string;
}

>>>>>>> Stashed changes
