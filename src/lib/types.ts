export type Role = 'admin' | 'user';

export type UserType =
  // 10 Core User Access Modules (AIIA CTMS)
  | 'super_admin'
  | 'principal_investigator'
  | 'study_coordinator'
  | 'clinical_monitor'
  | 'ethics_committee'
  | 'pharmacovigilance'
  | 'data_manager'
  | 'dsmb_member'
  | 'admin_leadership'
  | 'regulator_auditor'
  // Legacy aliases for backward compatibility
  | 'system_administrator'
  | 'administration'
  | 'study_coordinator_team_member'
  | 'co_investigator_doctor'
  | 'monitor'
  | 'pharmacovigilance_safety_officer'
  | 'viewer_read_only'
  | 'regulator_read_only';

export type PermissionKey =
  // Core Administration & Security
  | 'manage_users'
  | 'manage_system_settings'
  | 'assign_trial_access'
  | 'assign_centre_access'
  | 'view_audit_logs'
  | 'manage_deadlines'
  | 'view_deadlines'
  | 'manage_reminders'
  | 'delete_users'
  // Protocol & Trial
  | 'create_trials'
  | 'edit_protocols'
  | 'delete_trials'
  | 'view_all_trials'
  | 'view_trial_dashboard'
  | 'manage_trial_configuration'
  | 'define_visit_definitions'
  | 'manage_trial_regulatory'
  | 'approve_trial_regulatory'
  // Patient, Consent & Clinical Data
  | 'manage_patient_demographics'
  | 'delete_patients'
  | 'review_patient_registration'
  | 'manage_consent_workflow'
  | 'review_consent_status'
  | 'perform_screening'
  | 'confirm_eligibility'
  | 'approve_enrollment'
  | 'enroll_patients'
  | 'schedule_screening'
  | 'schedule_visits'
  | 'conduct_patient_visits'
  | 'view_patient_visits'
  | 'enter_permitted_clinical_data'
  | 'record_clinical_assessment'
  | 'record_ayurvedic_assessment'
  | 'record_medications'
  | 'record_treatment_response'
  | 'enter_ecrf'
  | 'approve_ecrf'
  | 'sign_crf'
  // Monitoring & Data Quality
  | 'sdv_verification'
  | 'create_queries'
  | 'raise_data_queries'
  | 'submit_monitoring_reports'
  | 'view_trial_data'
  | 'review_patient_records'
  | 'review_lab_data'
  | 'review_data_quality'
  // Ethics & Governance
  | 'review_protocols'
  | 'approve_ethics'
  // Pharmacovigilance & Safety
  | 'identify_adr'
  | 'report_sae'
  | 'safety_triage'
  | 'review_adr_events'
  | 'assess_safety_causality'
  | 'record_safety_actions'
  | 'generate_safety_reports'
  | 'view_safety_reports'
  | 'create_safety_reports'
  | 'edit_safety_reports'
  | 'review_safety_reports'
  | 'assess_safety_reports'
  | 'manage_safety_reports'
  | 'manage_safety_followups'
  | 'close_safety_reports'
  // Analytics, DSMB, Certificates & Regulatory
  | 'view_dsmb_reports'
  | 'view_leadership_dashboard'
  | 'approve_treatment_certificates'
  | 'export_reports'
  | 'export_safety_csv'
  | 'export_trial_data'
  | 'view_regulatory_tmf'
  | 'read_only_view';

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
  assignedTrialIds?: string[];
  assignedCentreIds?: string[];
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
  assignedTrialIds?: string[];
  assignedCentreIds?: string[];
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
  regulatory?: TrialRegulatoryRecord;
  safetyReporting?: TrialSafetyReportingConfig;
  proposedBy?: string;
  createdAt: string;
}

export interface TrialSafetyReportingConfig {
  reportingDeadlineHours?: number;
  reportingAuthority?: string;
  reportingCriteria?: string;
  configuredBy: string;
  configuredAt: string;
}

export type SafetyReportStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Follow-up Required'
  | 'Escalated'
  | 'Reporting Pending'
  | 'Reported'
  | 'Closed';

export type SafetyKnowledgeValue = string;

export interface SafetyDocument {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface SafetyFollowUp {
  id: string;
  followUpDate: string;
  newSymptomsFindings: string;
  newLaboratoryResults: string;
  updatedOutcome: string;
  additionalActionTaken: string;
  notes: string;
  recordedBy: string;
  documents: SafetyDocument[];
  recordedAt: string;
}

export interface SafetyAuditEntry {
  id: string;
  reportId: string;
  action: string;
  changedAt: string;
  changedBy: string;
  userRole: string;
  previousValues: string;
  newValues: string;
}

export interface SafetyNotification {
  id: string;
  reportId: string;
  recipientId: string;
  recipientName: string;
  role: string;
  createdAt: string;
  deliveryStatus: 'In-app notification recorded' | 'Delivery unavailable';
}

export interface SafetyEscalation {
  id: string;
  reportId: string;
  reason: string;
  escalatedAt: string;
  escalatedBy: string;
  recipients: string[];
  reportingDeadline?: string;
}

export interface SafetyDataQuery {
  id: string;
  raisedAt: string;
  raisedBy: string;
  raisedByRole: string;
  query: string;
  status: 'Open' | 'Responded' | 'Resolved';
  response: string;
  resolvedAt: string;
}

export interface SafetyReport {
  id: string;
  reportId: string;
  patientId: string;
  trialId: string;
  centre: string;
  enrollmentNumber: string;
  visitId: string;
  visitNumber: string;
  reportedBy: string;
  reportedByUserId: string;
  reportedByRole: string;
  reportedAt: string;
  eventTerm: string;
  description: string;
  onsetDateTime: string;
  endDateTime: string;
  symptomsFindings: string;
  eventTreatment: string;
  relevantLaboratoryFindings: string;
  medicalHistory: string;
  concomitantMedicines: string;
  eventStatus: 'Ongoing' | 'Resolved' | 'Unknown';
  suspectedMedicineId: string;
  suspectedMedicineName: string;
  formulation: string;
  batchNumber: string;
  dose: string;
  frequency: string;
  route: string;
  treatmentStartDate: string;
  lastDoseDate: string;
  indication: string;
  otherSuspectedMedicines: string;
  medicineActionTaken: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  seriousness: 'Serious' | 'Non-serious' | 'Unknown';
  seriousnessCriteria: string[];
  seriousnessOther: string;
  causality: string;
  causalityMethod: string;
  expectedness: 'Expected' | 'Unexpected' | 'Unknown' | 'Not Applicable';
  clinicalAssessment: string;
  actionTaken: string;
  patientOutcome: string;
  followUpRequired: boolean;
  assessedBy: string;
  assessedByUserId: string;
  assessmentDate: string;
  reviewerRemarks: string;
  reviewStatus: SafetyReportStatus;
  initialMedicalReview: string;
  piDecision: string;
  reportingAssessment: string;
  reportingStatus: 'Not Assessed' | 'Not Reportable' | 'Reporting Pending' | 'Reported';
  reportingAuthority: string;
  reportingCriteria: string;
  reportingDeadline: string;
  reportedAtAuthority: string;
  followUps: SafetyFollowUp[];
  documents: SafetyDocument[];
  consentDetails?: SafetyConsentDetails;
  notifications: SafetyNotification[];
  escalationHistory: SafetyEscalation[];
  dataQueries: SafetyDataQuery[];
  auditHistory: SafetyAuditEntry[];
  closureReason: string;
  closedAt: string;
  closedBy: string;
  reopenedReason: string;
  createdAt: string;
  updatedAt: string;
}

export type RegulatoryApprovalStatus =
  | 'Not Started'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Returned for Correction'
  | 'Rejected';

export type CTRIStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Under Review'
  | 'Registered'
  | 'Returned for Correction';

export interface RegulatoryDocument {
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  dataUrl?: string;
}

export interface TrialRegulatoryRecord {
  protocol: {
    number: string;
    version: string;
    title: string;
    versionDate: string;
    principalInvestigator: string;
    approvalStatus: RegulatoryApprovalStatus;
    approvalDocument?: RegulatoryDocument;
  };
  ethics: {
    name: string;
    registrationDetails: string;
    referenceNumber: string;
    submissionDate: string;
    approvalStatus: RegulatoryApprovalStatus;
    approvalDate: string;
    validUntil: string;
    approvedProtocolVersion: string;
    approvedConsentVersion: string;
    approvalDocument?: RegulatoryDocument;
    remarks: string;
  };
  ctri: {
    referenceNumber: string;
    registrationNumber: string;
    submissionDate: string;
    registrationDate: string;
    status: CTRIStatus;
    registrationRecord?: RegulatoryDocument;
  };
  cdsco: {
    requirement: 'Yes' | 'No' | 'To Be Determined';
    applicabilityReason: string;
    authority: string;
    applicationNumber: string;
    submissionDate: string;
    approvalDate: string;
    status: RegulatoryApprovalStatus;
    approvalDocument?: RegulatoryDocument;
    reviewer: string;
    reviewDate: string;
  };
  siteReadiness: {
    activationStatus: 'Not Ready' | 'In Progress' | 'Ready';
    principalInvestigator: string;
    investigators: string[];
    qualificationsVerified: boolean;
    approvedProtocolVersion: string;
    approvedConsentVersion: string;
    medicineAvailable: boolean;
    safetyReportingReady: boolean;
    readinessChecklist: string;
    reviewerRemarks: string;
  };
  validationRules: {
    requireProtocolApproval: boolean;
    requireIECapproval: boolean;
    requireCTRIRegistration: boolean;
    requireCDSCOAssessment: boolean;
    requireSiteReadiness: boolean;
    requireProspectiveCTRIRegistration: boolean;
    requireCompletedTreatmentForCertificate: boolean;
    minimumCompletedVisitsForCertificate: number;
    requireRecordedTreatmentForCertificate: boolean;
  };
  auditTrail: RegulatoryAuditEntry[];
}

export interface RegulatoryAuditEntry {
  id: string;
  changedAt: string;
  changedBy: string;
  action: string;
  before: string;
  after: string;
}

export interface TreatmentCertificate {
  id: string;
  certificateNumber: string;
  trialId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  trialTitle: string;
  certificateType: 'Trial Participation' | 'Treatment Completion';
  treatmentStartDate: string;
  treatmentEndDate: string;
  completedVisits: number;
  actualTreatmentStatus: EnrollmentStatus;
  issueDate: string;
  authorizedSignatory: string;
  authorizedSignatoryTitle: string;
  issuedBy: string;
  issuedAt: string;
}

export interface CertificateAuditEntry {
  id: string;
  certificateId: string;
  trialId: string;
  patientId: string;
  changedAt: string;
  changedBy: string;
  action: 'Issued';
  certificateNumber: string;
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

export type ConsentStatus = 'Not Obtained' | 'Obtained' | 'Refused' | 'Withdrawn';
export type ScreeningEligibilityStatus = 'Pending' | 'Eligible' | 'Not Eligible';
export type EnrollmentStatus = 'Active' | 'Completed' | 'Withdrawn' | 'Discontinued';
export type PatientLifecycleStatus =
  | 'Registered'
  | 'Consent Pending'
  | 'Consent Obtained'
  | 'Screening Pending'
  | 'Eligible'
  | 'Not Eligible'
  | 'Enrolled'
  | 'Active Treatment'
  | 'Completed'
  | 'Withdrawn'
  | 'Discontinued';

export interface DemoConsentDocument {
  id: string;
  fileName: string;
  fileType: 'JPG' | 'JPEG' | 'PNG' | 'PDF' | 'CSV';
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  previewDataUrl?: string;
  csvDataSnippet?: string;
}

export interface ConsentAnalysisResult {
  detectedStatus: ConsentStatus;
  confidenceScore: number;
  hasSignature: boolean;
  hasWitnessSignature: boolean;
  hasDate: boolean;
  documentClassification?: string;
  detectedConsentVersion?: string;
  analysisSummary: string;
  extractedKeywords: string[];
  extractedFields?: string[];
  missingFields?: string[];
  analyzedAt: string;
}

export interface PatientConsent {
  id: string;
  patientId: string;
  trialId: string;
  status: ConsentStatus;
  consentDate?: string;
  consentTime?: string;
  consentVersion?: string;
  document?: DemoConsentDocument | null;
  analysisResult?: ConsentAnalysisResult | null;
  obtainedBy?: string;
  witnessName?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SafetyConsentDetails {
  status: ConsentStatus;
  consentDate?: string;
  consentVersion?: string;
  obtainedBy?: string;
  witnessName?: string;
  larConfirmed?: boolean;
  remarks?: string;
  document?: DemoConsentDocument | null;
  analysisResult?: ConsentAnalysisResult | null;
}

export type DeadlineCategory =
  | 'protocol_approval'
  | 'ethics_approval'
  | 'ctri_registration'
  | 'cdsco_permission'
  | 'treatment_certificate'
  | 'safety_report_review'
  | 'safety_expedited_submission'
  | 'interim_analysis'
  | 'ethics'
  | 'cdsco'
  | 'ctri'
  | 'investigator_cert'
  | 'gcp_cert'
  | 'site_clearance'
  | 'other';

export interface TrialDeadline {
  id: string;
  title: string;
  category: DeadlineCategory;
  trialId: string;
  centreId?: string;
  dueDate: string; // YYYY-MM-DD
  assignedToUserId: string;
  assignedToName: string;
  assignedToRole: UserType;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'escalated';
  reminderDaysBefore: number[];
  escalateToAdminIfOverdue?: boolean;
  escalationUserId?: string;
  escalationUserName?: string;
  escalationAdminEmail?: string;
  notes?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  category?: 'User Management' | 'Permissions' | 'Study Assignment' | 'Deadlines' | 'Security' | string;
  details: string;
  performedBy: string;
  performedByEmail?: string;
  performedByRole?: string;
  userRole?: string;
  targetId?: string;
  targetName?: string;
  targetUser?: string;
  timestamp: string;
}

export interface PatientScreening {
  id: string;
  patientId: string;
  trialId: string;
  screeningDate?: string;
  inclusionCriteria?: string;
  exclusionCriteria?: string;
  eligibilityStatus: ScreeningEligibilityStatus;
  screeningRemarks?: string;
  screenedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientEnrollment {
  id: string;
  patientId: string;
  trialId: string;
  enrollmentNumber?: string;
  enrollmentDate?: string;
  centre?: string;
  treatmentGroup?: string;
  randomizationNumber?: string;
  enrolledBy?: string;
  enrollmentStatus: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientVisit {
  id: string;
  patientId: string;
  trialId: string;
  visitNumber?: string;
  visitDate?: string;
  visitType?: string;
  status?: 'Scheduled' | 'Completed' | 'Missed';
  doctorInvestigator?: string;
  visitNotes?: string;
  medicines?: VisitMedicine[];
  problems?: VisitProblem[];
  observations?: VisitObservation[];
  adverseEvents?: VisitAdverseEvent[];
  labResults?: VisitLabResult[];
  treatmentResponse?: 'Improvement' | 'No Change' | 'Worsened' | '';
  treatmentResponseNotes?: string;
  nextVisitDate?: string;
  followUpInstructions?: string;
  additionalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VisitMedicine {
  id: string;
  medicineName: string;
  formulation?: string;
  batchNumber?: string;
  dose?: string;
  unit?: string;
  frequency?: string;
  route?: string;
  quantityProvided?: string;
  dateProvided?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string;
}

export interface VisitProblem {
  id: string;
  problem?: string;
  symptoms?: string;
  severity?: string;
  onsetDate?: string;
  duration?: string;
  currentStatus?: string;
  doctorObservation?: string;
}

export interface VisitObservation {
  id: string;
  temperature?: string;
  pulse?: string;
  bloodPressure?: string;
  weight?: string;
  otherObservations?: string;
  ayurvedicObservations?: string;
}

export interface VisitAdverseEvent {
  id: string;
  sideEffect?: string;
  date?: string;
  severity?: string;
  seriousness?: 'Serious' | 'Non-serious' | '';
  suspectedMedicine?: string;
  actionTaken?: string;
  treatmentGiven?: string;
  outcome?: string;
  additionalNotes?: string;
}

export interface VisitLabResult {
  id: string;
  testName?: string;
  testDate?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: 'Normal' | 'Abnormal' | '';
  remarks?: string;
}

export interface Patient {
  id: string;
  trialId: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  contactNumber?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  registrationDate?: string;
  centre?: string;
  registeredBy?: string;
  remarks?: string;
  consent?: PatientConsent;
  screening?: PatientScreening;
  enrollment?: PatientEnrollment;
  visits?: PatientVisit[];
  status: PatientLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TrialPatientSummary {
  totalPatients: number;
  registeredPatients: number;
  consentPending: number;
  consentObtained: number;
  consentNotObtained: number;
  screenedPatients: number;
  eligiblePatients: number;
  enrolledPatients: number;
  activePatients: number;
  withdrawnPatients: number;
  completedPatients: number;
}









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
