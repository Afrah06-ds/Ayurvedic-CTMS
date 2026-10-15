import {
  Patient,
  PatientVisit,
  SafetyAuditEntry,
  SafetyDocument,
  SafetyEscalation,
  SafetyFollowUp,
  SafetyNotification,
  SafetyDataQuery,
  SafetyReport,
  SafetyReportStatus,
  SafetyConsentDetails,
  TrialProposal,
  User,
} from './types';
import { getCachedDrugs } from './drugStorage';
import { getPatientForTrial, getPatientsForTrial } from './patientStorage';
import { getCachedProposals, saveTrialSafetyReportingConfig } from './proposalStorage';
import { getCachedUsers } from './storage';
import { hasPermission } from './permissions';

const SAFETY_STORE_KEY = 'ctms_safety_reports_v1';
const MAX_ATTACHMENT_BYTES = 1024 * 1024;
const SERIOUSNESS_CRITERIA = new Set([
  'Death',
  'Life-threatening event',
  'Hospitalization or prolonged hospitalization',
  'Persistent or significant disability',
  'Congenital anomaly / birth defect',
  'Other medically important event',
]);

interface SafetyStore {
  reports: SafetyReport[];
}

export interface SafetyReportDraft {
  patientId: string;
  trialId: string;
  visitId: string;
  centre?: string;
  eventTerm: string;
  description: string;
  onsetDateTime: string;
  endDateTime: string;
  symptomsFindings: string;
  eventTreatment: string;
  relevantLaboratoryFindings: string;
  medicalHistory: string;
  concomitantMedicines: string;
  eventStatus: SafetyReport['eventStatus'];
  suspectedMedicineId: string;
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
  severity: SafetyReport['severity'];
  seriousness: SafetyReport['seriousness'];
  seriousnessCriteria: string[];
  seriousnessOther: string;
  causality: string;
  causalityMethod: string;
  expectedness: SafetyReport['expectedness'];
  clinicalAssessment: string;
  actionTaken: string;
  patientOutcome: string;
  followUpRequired: boolean;
  initialMedicalReview: string;
  documents: SafetyDocument[];
  consentDetails?: SafetyConsentDetails;
}

export const INITIAL_SEED_SAFETY_REPORTS: SafetyReport[] = [
  {
    id: 'srep_seed_001',
    reportId: 'SR-CT001-2026-001',
    patientId: 'pat_001',
    trialId: 'CT-001',
    centre: 'AIIA Main Hospital, New Delhi',
    enrollmentNumber: 'ENR-2026-001',
    visitId: 'vis_001',
    visitNumber: 'Visit 2',
    reportedBy: 'Prof. Dr. Sarah Jenkins (Lead PI)',
    reportedByUserId: 'usr_pi_002',
    reportedByRole: 'principal_investigator',
    reportedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    eventTerm: 'Epigastric Distress and Nausea',
    description: 'Participant reported moderate epigastric burning sensation and recurring nausea 48 hours following commencement of Nimba Tablet.',
    onsetDateTime: new Date(Date.now() - 3600000 * 72).toISOString().slice(0, 16),
    endDateTime: new Date(Date.now() - 3600000 * 24).toISOString().slice(0, 16),
    symptomsFindings: 'Epigastric tenderness on palpation; pulse 76/min, BP 122/82 mmHg; tongue mildly coated (Ama lakshana).',
    eventTreatment: 'Oral antacid and carminative Ayurvedic kwatha administered; investigational drug temporarily paused.',
    relevantLaboratoryFindings: 'Serum creatinine: 0.88 mg/dL; LFT: ALT 26 IU/L, AST 24 IU/L; Hemoglobin: 13.4 g/dL.',
    medicalHistory: 'Mild non-ulcer dyspepsia 1 year prior, fully resolved without medication.',
    concomitantMedicines: 'None recorded.',
    eventStatus: 'Resolved',
    suspectedMedicineId: 'DRUG001',
    suspectedMedicineName: 'Nimba Tablet (Azadirachta indica)',
    formulation: '500 mg Ayurvedic Tablet',
    batchNumber: 'NMB-2026-01',
    dose: '500 mg',
    frequency: 'Twice daily after meals',
    route: 'Oral',
    treatmentStartDate: new Date(Date.now() - 3600000 * 120).toISOString().slice(0, 10),
    lastDoseDate: new Date(Date.now() - 3600000 * 48).toISOString().slice(0, 10),
    indication: 'Madhumeha / Type 2 Diabetes Mellitus',
    otherSuspectedMedicines: 'None',
    medicineActionTaken: 'Dose temporarily suspended then resumed at half strength',
    severity: 'Moderate',
    seriousness: 'Serious',
    seriousnessCriteria: ['Hospitalization or prolonged hospitalization'],
    seriousnessOther: '',
    causality: 'Probable/Likely',
    causalityMethod: 'WHO-UMC / Naranjo Causality Assessment Algorithm',
    expectedness: 'Expected',
    clinicalAssessment: 'Positive de-challenge observed within 24 hours of suspension. Mild gastrointestinal irritation is documented in Classical Ayurvedic Pharmacopoeia for Tikta rasa predominant preparations.',
    actionTaken: 'Monitored at clinical research unit; patient discharged in fully recovered state.',
    patientOutcome: 'Recovered',
    followUpRequired: false,
    assessedBy: 'Dr. Anita Patel (National PV Lead)',
    assessedByUserId: 'usr_pv_006',
    assessmentDate: new Date(Date.now() - 3600000 * 36).toISOString().slice(0, 10),
    reviewerRemarks: 'Comprehensive clinical evaluation complete. Event meets criteria for expedited reporting to CDSCO / PvPI.',
    reviewStatus: 'Under Review',
    initialMedicalReview: 'Causality evaluated by site investigator and pharmacovigilance officer; drug association is probable.',
    piDecision: 'Approved for resumption with dietary advice (Anupana with warm milk) to mitigate Tikta rasa irritation.',
    reportingAssessment: 'Schedule Y / Indian GCP expedited regulatory reporting applicable within 14 calendar days.',
    reportingStatus: 'Reporting Pending',
    reportingAuthority: 'CDSCO / Pharmacovigilance Program of India (PvPI)',
    reportingCriteria: 'Serious Adverse Event requiring hospitalization during active clinical trial phase',
    reportingDeadline: new Date(Date.now() + 3600000 * 48).toISOString().slice(0, 10),
    reportedAtAuthority: '',
    followUps: [],
    documents: [],
    consentDetails: {
      status: 'Obtained',
      consentDate: '2026-01-10',
      consentVersion: 'v2.1',
      obtainedBy: 'Prof. Dr. Sarah Jenkins (Lead PI)',
      witnessName: 'Ramesh Sharma',
      larConfirmed: false,
      remarks: 'Signed informed consent on file; verified against ethics approval version v2.1.',
      document: {
        id: 'doc_seed_001',
        fileName: 'Informed_Consent_Form_Signed_P001.pdf',
        fileType: 'PDF',
        mimeType: 'application/pdf',
        uploadedAt: '2026-01-10T09:30:00.000Z',
        uploadedBy: 'Prof. Dr. Sarah Jenkins',
      },
      analysisResult: {
        detectedStatus: 'Obtained',
        confidenceScore: 0.99,
        hasSignature: true,
        hasWitnessSignature: true,
        hasDate: true,
        documentClassification: 'Signed Informed Consent PDF',
        analysisSummary: 'Automated verification validated document signatures, participant affirmation, and protocol alignment.',
        extractedKeywords: ['Consent Verified', 'Ethics Version v2.1', 'Participant Signature Detected'],
        analyzedAt: '2026-01-10T09:31:00.000Z',
      },
    },
    notifications: [
      {
        id: 'notif_001',
        reportId: 'srep_seed_001',
        recipientId: 'usr_super_admin_001',
        recipientName: 'Dr. Rajesh Sharma (Super Admin)',
        role: 'super_admin',
        createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
        deliveryStatus: 'In-app notification recorded',
      },
    ],
    escalationHistory: [
      {
        id: 'esc_001',
        reportId: 'srep_seed_001',
        reason: 'Hospitalization reported - urgent review initiated',
        escalatedAt: new Date(Date.now() - 3600000 * 44).toISOString(),
        escalatedBy: 'Michael Vance (Study Coordinator)',
        recipients: ['usr_pi_002', 'usr_pv_006', 'usr_super_admin_001'],
        reportingDeadline: new Date(Date.now() + 3600000 * 48).toISOString().slice(0, 10),
      },
    ],
    dataQueries: [],
    auditHistory: [
      {
        id: 'aud_seed_001',
        reportId: 'srep_seed_001',
        action: 'Report Submitted',
        changedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        changedBy: 'Prof. Dr. Sarah Jenkins',
        userRole: 'principal_investigator',
        previousValues: '{}',
        newValues: 'Initial Serious Safety Report Entry Created',
      },
    ],
    closureReason: '',
    closedAt: '',
    closedBy: '',
    reopenedReason: '',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'srep_seed_002',
    reportId: 'SR-CT001-2026-002',
    patientId: 'pat_002',
    trialId: 'CT-001',
    centre: 'AIIA Main Hospital, New Delhi',
    enrollmentNumber: 'ENR-2026-002',
    visitId: 'vis_002',
    visitNumber: 'Visit 1',
    reportedBy: 'Michael Vance (Study Coordinator)',
    reportedByUserId: 'usr_coord_003',
    reportedByRole: 'study_coordinator',
    reportedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    eventTerm: 'Mild Cutaneous Pruritus (Skin Itching)',
    description: 'Participant noted localized mild itching over both forearms without macular rash, appearing on Day 5 of study therapy.',
    onsetDateTime: new Date(Date.now() - 3600000 * 36).toISOString().slice(0, 16),
    endDateTime: new Date(Date.now() - 3600000 * 12).toISOString().slice(0, 16),
    symptomsFindings: 'Mild erythema on bilateral forearms, no urticaria, vital signs normal.',
    eventTreatment: 'Topical coconut oil (Narikela taila) applied; oral antihistamine not required.',
    relevantLaboratoryFindings: 'Absolute eosinophil count: 280/mcL (normal).',
    medicalHistory: 'Seasonal pollen sensitivity.',
    concomitantMedicines: 'None.',
    eventStatus: 'Resolved',
    suspectedMedicineId: 'DRUG001',
    suspectedMedicineName: 'Nimba Tablet (Azadirachta indica)',
    formulation: '500 mg Ayurvedic Tablet',
    batchNumber: 'NMB-2026-01',
    dose: '500 mg',
    frequency: 'Twice daily after meals',
    route: 'Oral',
    treatmentStartDate: new Date(Date.now() - 3600000 * 96).toISOString().slice(0, 10),
    lastDoseDate: new Date(Date.now() - 3600000 * 12).toISOString().slice(0, 10),
    indication: 'Madhumeha / Type 2 Diabetes Mellitus',
    otherSuspectedMedicines: 'None',
    medicineActionTaken: 'Dose maintained without change',
    severity: 'Mild',
    seriousness: 'Non-serious',
    seriousnessCriteria: [],
    seriousnessOther: '',
    causality: 'Possible',
    causalityMethod: 'WHO-UMC Causality Assessment',
    expectedness: 'Expected',
    clinicalAssessment: 'Mild transient Pitta-Rakta vitiation. Resolved spontaneously with topical soothing measures.',
    actionTaken: 'Patient reassured and continued on trial protocol.',
    patientOutcome: 'Recovered',
    followUpRequired: false,
    assessedBy: 'Dr. Anita Patel (National PV Lead)',
    assessedByUserId: 'usr_pv_006',
    assessmentDate: new Date(Date.now() - 3600000 * 18).toISOString().slice(0, 10),
    reviewerRemarks: 'Non-serious adverse reaction noted. No systemic involvement.',
    reviewStatus: 'Submitted',
    initialMedicalReview: 'Reviewed by PV officer; classified as non-serious ADR.',
    piDecision: '',
    reportingAssessment: 'Periodic safety aggregate inclusion; expedited authority filing not required.',
    reportingStatus: 'Not Reportable',
    reportingAuthority: 'CDSCO / PvPI',
    reportingCriteria: 'Non-serious event recorded for periodic aggregate review',
    reportingDeadline: '',
    reportedAtAuthority: '',
    followUps: [],
    documents: [],
    notifications: [],
    escalationHistory: [],
    dataQueries: [],
    auditHistory: [],
    closureReason: '',
    closedAt: '',
    closedBy: '',
    reopenedReason: '',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

const emptyStore = (): SafetyStore => ({ reports: INITIAL_SEED_SAFETY_REPORTS });

const readStore = (): SafetyStore => {
  if (typeof window === 'undefined') return emptyStore();
  const raw = localStorage.getItem(SAFETY_STORE_KEY);
  if (!raw) {
    const initial = emptyStore();
    try {
      localStorage.setItem(SAFETY_STORE_KEY, JSON.stringify(initial));
    } catch {}
    return initial;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('reports' in parsed) ||
      !Array.isArray(parsed.reports)
    ) return emptyStore();
    if (parsed.reports.length === 0) {
      return emptyStore();
    }
    return parsed as SafetyStore;
  } catch (error) {
    console.error('Unable to read safety records.', error);
    return emptyStore();
  }
};

const writeStore = (store: SafetyStore): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SAFETY_STORE_KEY, JSON.stringify(store));
    } catch (error) {
      console.error('Unable to persist safety records.', error);
      throw new Error('Safety records could not be saved in this browser. Check available storage and try again.');
    }
  }
};

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const requirePermission = (user: User | null | undefined, permission: Parameters<typeof hasPermission>[1]) => {
  if (!hasPermission(user, permission)) throw new Error('Permission denied for this safety report action.');
  if (!user || user.status !== 'active') throw new Error('An active signed-in user is required.');
  return user;
};

const canAccessTrial = (user: User, trial: TrialProposal): boolean => {
  if (!hasPermission(user, 'view_safety_reports')) return false;
  // Super Admin, Admin Leadership, PV Team, and Users with view_all_trials have global study access
  if (
    user.role === 'admin' ||
    user.userType === 'super_admin' ||
    user.userType === 'admin_leadership' ||
    user.userType === 'pharmacovigilance' ||
    user.userType === 'pharmacovigilance_safety_officer' ||
    hasPermission(user, 'view_all_trials')
  ) {
    return true;
  }
  // Otherwise check study assignment
  return Boolean(
    user.assignedTrialIds?.some(
      (id) => id === trial.id || id === trial.trialId || id === 'all'
    )
  );
};

const requireTrialAccess = (user: User, trialId: string): TrialProposal => {
  const trial = getCachedProposals().find((proposal) => proposal.trialId === trialId || proposal.id === trialId);
  if (!trial || !canAccessTrial(user, trial)) {
    throw new Error('This clinical trial is not assigned to your account.');
  }
  return trial;
};

const auditSnapshot = (report: SafetyReport): string => {
  const { auditHistory: _auditHistory, documents, followUps, ...snapshot } = report;
  const documentMetadata = (items: SafetyDocument[]) =>
    items.map(({ id, fileName, mimeType, uploadedAt, uploadedBy }) => ({ id, fileName, mimeType, uploadedAt, uploadedBy }));
  return JSON.stringify({
    ...snapshot,
    documents: documentMetadata(documents),
    followUps: followUps.map((entry) => ({ ...entry, documents: documentMetadata(entry.documents) })),
  });
};

const appendAudit = (
  report: SafetyReport,
  user: User,
  action: string,
  previousValues: string,
  newValues: string
): SafetyReport => ({
  ...report,
  auditHistory: [
    ...report.auditHistory,
    {
      id: newId('safety_audit'),
      reportId: report.id,
      action,
      changedAt: new Date().toISOString(),
      changedBy: user.fullName,
      userRole: user.userType,
      previousValues,
      newValues,
    },
  ],
  updatedAt: new Date().toISOString(),
});

const persistUpdatedReport = (
  reportId: string,
  user: User,
  action: string,
  update: (report: SafetyReport) => SafetyReport
): SafetyReport => {
  const store = readStore();
  const index = store.reports.findIndex((report) => report.id === reportId);
  if (index < 0) throw new Error('Safety report was not found.');
  const current = store.reports[index];
  const trial = requireTrialAccess(user, current.trialId);
  if (!canAccessTrial(user, trial)) throw new Error('This clinical trial is not assigned to your account.');
  const candidate = update(current);
  const updated = appendAudit(current, user, action, auditSnapshot(current), auditSnapshot(candidate));
  store.reports[index] = updated;
  writeStore(store);
  return updated;
};

const notifySeriousEvent = (report: SafetyReport, trial: TrialProposal, reporter: User): SafetyNotification[] => {
  if (report.seriousness !== 'Serious') return [];
  const assignedUsers = getCachedUsers().filter((user) => {
    const assigned = user.assignedTrialIds?.some((id) => id === trial.id || id === trial.trialId);
    return assigned && user.status === 'active' &&
      (user.userType === 'principal_investigator' || user.userType === 'pharmacovigilance_safety_officer') &&
      user.id !== reporter.id;
  });
  return assignedUsers.map((recipient) => ({
    id: newId('safety_notification'),
    reportId: report.id,
    recipientId: recipient.id,
    recipientName: recipient.fullName,
    role: recipient.userType,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'In-app notification recorded',
  }));
};

const getDeadline = (trial: TrialProposal, reportedAt: string): string => {
  const hours = trial.safetyReporting?.reportingDeadlineHours;
  if (hours === undefined || !Number.isFinite(hours) || hours <= 0) return '';
  return new Date(new Date(reportedAt).getTime() + hours * 60 * 60 * 1000).toISOString();
};

const validateDraft = (
  draft: SafetyReportDraft,
  user: User,
  trial: TrialProposal,
  patient: Patient,
  visit: PatientVisit
): void => {
  if (!draft.eventTerm.trim()) throw new Error('Event/reaction term is required.');
  if (!draft.description.trim()) throw new Error('Event description is required.');
  if (!draft.onsetDateTime) throw new Error('Onset date/time is required; select Unknown if not available.');
  if (draft.seriousness === 'Serious' && draft.seriousnessCriteria.length === 0) {
    throw new Error('Select at least one seriousness criterion for a serious event.');
  }
  if (
    draft.seriousnessCriteria.includes('Other medically important event') &&
    !draft.seriousnessOther.trim()
  ) throw new Error('Describe the other medically important seriousness criterion.');
  if (draft.suspectedMedicineId && !['Unknown', 'Not Available', 'Not Applicable'].includes(draft.suspectedMedicineId)) {
    const existingDrug = getCachedDrugs().find((drug) => drug.id === draft.suspectedMedicineId);
    if (!existingDrug) throw new Error('The suspected medicine must be selected from the existing medicine master.');
  }
  if (visit.patientId !== patient.id || visit.trialId !== trial.trialId || draft.visitId !== visit.id) {
    throw new Error('Safety report visit does not belong to the selected patient and trial.');
  }
  if (!canAccessTrial(user, trial)) throw new Error('This clinical trial is not assigned to your account.');
  if (draft.documents.some((document) => !document.dataUrl || document.dataUrl.length > MAX_ATTACHMENT_BYTES * 1.4)) {
    throw new Error('Safety attachments must be valid files smaller than 1 MB.');
  }
}

export const getSafetyReportsForUser = (user: User | null | undefined): SafetyReport[] => {
  const activeUser = requirePermission(user, 'view_safety_reports');
  const allReports = readStore().reports;
  const hasGlobalTrialAccess =
    activeUser.role === 'admin' ||
    activeUser.userType === 'super_admin' ||
    activeUser.userType === 'admin_leadership' ||
    activeUser.userType === 'pharmacovigilance' ||
    activeUser.userType === 'pharmacovigilance_safety_officer' ||
    hasPermission(activeUser, 'view_all_trials');

  if (hasGlobalTrialAccess) {
    return allReports;
  }

  const accessibleTrials = new Set(
    getCachedProposals()
      .filter((trial) => canAccessTrial(activeUser, trial))
      .map((trial) => trial.trialId)
  );
  return allReports.filter((report) => accessibleTrials.has(report.trialId));
};

export const getSafetyReportsForTrial = (trialId: string, user: User | null | undefined): SafetyReport[] => {
  const activeUser = requirePermission(user, 'view_safety_reports');
  requireTrialAccess(activeUser, trialId);
  return readStore().reports.filter((report) => report.trialId === trialId);
};

export const getSafetyReportsForPatient = (
  trialId: string,
  patientId: string,
  user: User | null | undefined
): SafetyReport[] => getSafetyReportsForTrial(trialId, user).filter((report) => report.patientId === patientId);

export const createSafetyReport = (
  draft: SafetyReportDraft,
  user: User | null | undefined
): SafetyReport => {
  const activeUser = requirePermission(user, 'create_safety_reports');
  const trial = requireTrialAccess(activeUser, draft.trialId);
  const patient = getPatientForTrial(draft.trialId, draft.patientId);
  if (!patient) throw new Error('Select an existing patient registered in the selected trial.');
  const visit = (patient.visits || []).find((candidate) => candidate.id === draft.visitId);
  if (!visit) throw new Error('Select an existing visit belonging to this patient and trial.');
  validateDraft(draft, activeUser, trial, patient, visit);

  const now = new Date().toISOString();
  const id = newId('safety');
  const drug = getCachedDrugs().find((item) => item.id === draft.suspectedMedicineId);
  const base: SafetyReport = {
    id,
    reportId: `PV-${trial.trialId}-${now.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    patientId: patient.id,
    trialId: trial.trialId,
    centre: draft.centre?.trim() || patient.centre || 'Unknown',
    enrollmentNumber: patient.enrollment?.enrollmentNumber || 'Not Available',
    visitId: visit.id,
    visitNumber: visit.visitNumber || visit.id,
    reportedBy: activeUser.fullName,
    reportedByUserId: activeUser.id,
    reportedByRole: activeUser.userType,
    reportedAt: now,
    eventTerm: draft.eventTerm.trim(),
    description: draft.description.trim(),
    onsetDateTime: draft.onsetDateTime,
    endDateTime: draft.endDateTime || 'Unknown',
    symptomsFindings: draft.symptomsFindings || 'Not Available',
    eventTreatment: draft.eventTreatment || 'Not Available',
    relevantLaboratoryFindings: draft.relevantLaboratoryFindings || 'Not Available',
    medicalHistory: draft.medicalHistory || 'Not Available',
    concomitantMedicines: draft.concomitantMedicines || 'Not Available',
    eventStatus: draft.eventStatus,
    suspectedMedicineId: drug?.id || draft.suspectedMedicineId || 'Unknown',
    suspectedMedicineName: drug?.drugName || draft.suspectedMedicineId || 'Unknown',
    formulation: drug?.formulationName || draft.formulation || 'Not Available',
    batchNumber: draft.batchNumber || drug?.batchNumber || 'Not Available',
    dose: draft.dose || 'Not Available',
    frequency: draft.frequency || 'Not Available',
    route: draft.route || drug?.routeOfAdministration || 'Not Available',
    treatmentStartDate: draft.treatmentStartDate || 'Unknown',
    lastDoseDate: draft.lastDoseDate || 'Unknown',
    indication: draft.indication || drug?.indication || 'Not Available',
    otherSuspectedMedicines: draft.otherSuspectedMedicines || 'Not Available',
    medicineActionTaken: draft.medicineActionTaken || 'Not Available',
    severity: draft.severity,
    seriousness: draft.seriousness,
    seriousnessCriteria: [...draft.seriousnessCriteria],
    seriousnessOther: draft.seriousnessOther,
    causality: draft.causality || 'Unassessable/Unclassifiable',
    causalityMethod: draft.causalityMethod || 'Not Available',
    expectedness: draft.expectedness,
    clinicalAssessment: draft.clinicalAssessment || 'Not Available',
    actionTaken: draft.actionTaken || 'Not Available',
    patientOutcome: draft.patientOutcome || 'Unknown',
    followUpRequired: draft.followUpRequired,
    assessedBy: '',
    assessedByUserId: '',
    assessmentDate: '',
    reviewerRemarks: '',
    reviewStatus: 'Submitted',
    initialMedicalReview: draft.initialMedicalReview || '',
    piDecision: '',
    reportingAssessment: '',
    reportingStatus: 'Not Assessed',
    reportingAuthority: trial.safetyReporting?.reportingAuthority || 'Not Available',
    reportingCriteria: trial.safetyReporting?.reportingCriteria || 'Not configured',
    reportingDeadline: getDeadline(trial, now),
    reportedAtAuthority: '',
    followUps: [],
    documents: draft.documents,
    consentDetails: draft.consentDetails,
    notifications: [],
    escalationHistory: [],
    dataQueries: [],
    auditHistory: [],
    closureReason: '',
    closedAt: '',
    closedBy: '',
    reopenedReason: '',
    createdAt: now,
    updatedAt: now,
  };
  const notifications = notifySeriousEvent(base, trial, activeUser);
  const escalations: SafetyEscalation[] = base.seriousness === 'Serious' ? [{
    id: newId('safety_escalation'),
    reportId: id,
    reason: 'Serious event flagged for urgent review.',
    escalatedAt: now,
    escalatedBy: activeUser.fullName,
    recipients: notifications.map((notification) => notification.recipientId),
    reportingDeadline: base.reportingDeadline,
  }] : [];
  const initialReport = { ...base, notifications, escalationHistory: escalations, reviewStatus: base.seriousness === 'Serious' ? 'Escalated' as const : 'Submitted' as const };
  const report = appendAudit(
    initialReport,
    activeUser,
    'Safety report created and submitted',
    '',
    auditSnapshot(initialReport)
  );
  const store = readStore();
  store.reports.push(report);
  writeStore(store);
  return report;
};

export const updateSafetyReportNarrative = (
  reportId: string,
  patch: Pick<SafetyReportDraft,
    'eventTerm' | 'description' | 'onsetDateTime' | 'endDateTime' | 'symptomsFindings' |
    'eventTreatment' | 'relevantLaboratoryFindings' | 'medicalHistory' | 'concomitantMedicines' |
    'eventStatus' | 'suspectedMedicineId' | 'formulation' | 'batchNumber' | 'dose' | 'frequency' |
    'route' | 'treatmentStartDate' | 'lastDoseDate' | 'indication' | 'otherSuspectedMedicines' |
    'medicineActionTaken' | 'documents'>,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'edit_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Safety report narrative updated', (current) => {
    if (['Closed', 'Reported'].includes(current.reviewStatus)) throw new Error('Closed or reported safety reports cannot be edited.');
    const trial = requireTrialAccess(actor, current.trialId);
    const patient = getPatientForTrial(trial.trialId, current.patientId);
    const visit = patient?.visits?.find((item) => item.id === current.visitId);
    if (!patient || !visit) throw new Error('Existing patient visit link is no longer valid.');
    const draft = { ...patch, trialId: current.trialId, patientId: current.patientId, visitId: current.visitId } as SafetyReportDraft;
    validateDraft({ ...draft, severity: current.severity, seriousness: current.seriousness, seriousnessCriteria: current.seriousnessCriteria, seriousnessOther: current.seriousnessOther, causality: current.causality, causalityMethod: current.causalityMethod, expectedness: current.expectedness, clinicalAssessment: current.clinicalAssessment, actionTaken: current.actionTaken, patientOutcome: current.patientOutcome, followUpRequired: current.followUpRequired, initialMedicalReview: current.initialMedicalReview }, actor, trial, patient, visit);
    const medicine = getCachedDrugs().find((drug) => drug.id === patch.suspectedMedicineId);
    return {
      ...current,
      ...patch,
      suspectedMedicineName: medicine?.drugName || patch.suspectedMedicineId || 'Unknown',
      formulation: medicine?.formulationName || patch.formulation,
      batchNumber: patch.batchNumber || medicine?.batchNumber || 'Not Available',
      route: patch.route || medicine?.routeOfAdministration || 'Not Available',
      indication: patch.indication || medicine?.indication || 'Not Available',
    };
  });
};

export const reviewSafetyReport = (
  reportId: string,
  review: { status: 'Under Review' | 'Escalated'; initialMedicalReview: string; piDecision?: string; reviewerRemarks: string },
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'review_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Safety report review recorded', (report) => {
    if (report.reviewStatus === 'Closed') throw new Error('Reopen the report with a reason before reviewing it.');
    if (!review.initialMedicalReview.trim()) throw new Error('Initial medical review is required.');
    if (review.piDecision?.trim() && !['principal_investigator', 'system_administrator', 'administration'].includes(actor.userType)) {
      throw new Error('Only the assigned PI or system administrator may record the PI decision.');
    }
    if (report.seriousness === 'Serious' && review.status === 'Under Review' && !review.piDecision?.trim() && !report.piDecision.trim()) {
      throw new Error('Serious events must remain escalated until an authorized PI decision is recorded.');
    }
    return {
      ...report,
      reviewStatus: review.status,
      initialMedicalReview: review.initialMedicalReview,
      piDecision: review.piDecision || report.piDecision,
      reviewerRemarks: review.reviewerRemarks,
      assessedBy: actor.fullName,
      assessedByUserId: actor.id,
      assessmentDate: new Date().toISOString(),
    };
  });
};

export const assessSafetyReport = (
  reportId: string,
  assessment: Pick<SafetyReport, 'severity' | 'seriousness' | 'seriousnessCriteria' | 'seriousnessOther' | 'causality' | 'causalityMethod' | 'expectedness' | 'clinicalAssessment' | 'actionTaken' | 'patientOutcome' | 'followUpRequired' | 'reviewerRemarks'>,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'assess_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Safety assessment recorded', (report) => {
    if (report.reviewStatus === 'Closed') throw new Error('Reopen the report with a reason before updating its assessment.');
    if (!assessment.clinicalAssessment.trim() || !assessment.actionTaken.trim()) {
      throw new Error('Clinical assessment and action taken are required.');
    }
    if (assessment.seriousness === 'Serious' && assessment.seriousnessCriteria.length === 0) {
      throw new Error('A serious event requires at least one seriousness criterion.');
    }
    if (
      assessment.seriousnessCriteria.includes('Other medically important event') &&
      !assessment.seriousnessOther.trim()
    ) throw new Error('Describe the other medically important seriousness criterion.');
    if (!assessment.causality.trim() || !assessment.causalityMethod.trim()) {
      throw new Error('Record the selected causality method and its assessment, or select Unassessable/Unclassifiable.');
    }
    const now = new Date().toISOString();
    const becameSerious = assessment.seriousness === 'Serious' && report.seriousness !== 'Serious';
    const trial = requireTrialAccess(actor, report.trialId);
    const notifications = becameSerious ? notifySeriousEvent({ ...report, seriousness: 'Serious' }, trial, actor) : [];
    const escalation = becameSerious ? [{
      id: newId('safety_escalation'),
      reportId,
      reason: 'Safety assessment changed seriousness to Serious.',
      escalatedAt: now,
      escalatedBy: actor.fullName,
      recipients: notifications.map((notification) => notification.recipientId),
      reportingDeadline: report.reportingDeadline,
    }] : [];
    return {
      ...report,
      ...assessment,
      assessedBy: actor.fullName,
      assessedByUserId: actor.id,
      assessmentDate: now,
      reviewStatus: becameSerious ? 'Escalated' : report.followUpRequired ? 'Follow-up Required' : 'Under Review',
      notifications: [...report.notifications, ...notifications],
      escalationHistory: [...report.escalationHistory, ...escalation],
    };
  });
};

export const addSafetyFollowUp = (
  reportId: string,
  followUp: Omit<SafetyFollowUp, 'id' | 'recordedAt' | 'recordedBy'>,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'manage_safety_followups');
  return persistUpdatedReport(reportId, actor, 'Safety follow-up added', (report) => {
    if (report.reviewStatus === 'Closed') throw new Error('Reopen the report before adding follow-up.');
    if (!followUp.followUpDate) throw new Error('Follow-up date is required.');
    if (followUp.documents.some((document) => document.dataUrl.length > MAX_ATTACHMENT_BYTES * 1.4)) {
      throw new Error('Follow-up documents must be smaller than 1 MB.');
    }
    const now = new Date().toISOString();
    const entry: SafetyFollowUp = {
      ...followUp,
      id: newId('safety_followup'),
      recordedAt: now,
      recordedBy: actor.fullName,
    };
    const stillRequiresFollowUp = followUp.updatedOutcome === 'Ongoing' || !followUp.updatedOutcome.trim();
    return {
      ...report,
      followUps: [...report.followUps, entry],
      patientOutcome: followUp.updatedOutcome || report.patientOutcome,
      followUpRequired: stillRequiresFollowUp,
      reviewStatus: stillRequiresFollowUp ? 'Follow-up Required' : 'Under Review',
    };
  });
};

export const updateSafetyReportConsentDetails = (
  reportId: string,
  consentDetails: SafetyConsentDetails,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'manage_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Participant consent details updated', (current) => ({
    ...current,
    consentDetails,
  }));
};

export const updateSafetyReporting = (
  reportId: string,
  update: { assessment: string; status: SafetyReport['reportingStatus']; authority: string; reportedAtAuthority: string },
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'manage_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Reporting assessment/status updated', (report) => {
    if (!update.assessment.trim()) throw new Error('Document the reporting assessment.');
    if (update.status === 'Reported' && !update.reportedAtAuthority) {
      throw new Error('Provide the date the report was submitted to the authority.');
    }
    if (report.seriousness === 'Serious' && update.status === 'Not Assessed') {
      throw new Error('Serious events require a documented reporting assessment.');
    }
    return {
      ...report,
      reportingAssessment: update.assessment,
      reportingStatus: update.status,
      reportingAuthority: update.authority || 'Not Available',
      reportedAtAuthority: update.reportedAtAuthority,
      reviewStatus: update.status === 'Reported' ? 'Reported' : update.status === 'Reporting Pending' ? 'Reporting Pending' : report.reviewStatus,
    };
  });
};

export const closeSafetyReport = (
  reportId: string,
  reason: string,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'close_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Safety report closed', (report) => {
    if (!reason.trim()) throw new Error('A closure reason is required.');
    if (report.followUpRequired) throw new Error('The report cannot be closed while follow-up is required.');
    if (report.reviewStatus === 'Draft' || !report.initialMedicalReview.trim()) {
      throw new Error('Initial medical review must be complete before closure.');
    }
    if (!report.assessedByUserId || !report.assessmentDate || !report.clinicalAssessment.trim()) {
      throw new Error('A documented safety assessment is required before closure.');
    }
    if (report.seriousness === 'Serious' && !report.piDecision.trim()) {
      throw new Error('An authorized PI decision is required before closing a serious event.');
    }
    if (report.seriousness === 'Serious' && report.reportingStatus === 'Not Assessed') {
      throw new Error('A reporting assessment is required before closing a serious event.');
    }
    if (report.reportingStatus === 'Reporting Pending') {
      throw new Error('Complete the applicable reporting assessment before closing the report.');
    }
    return {
      ...report,
      reviewStatus: 'Closed',
      closureReason: reason.trim(),
      closedAt: new Date().toISOString(),
      closedBy: actor.fullName,
    };
  });
};

export const reopenSafetyReport = (
  reportId: string,
  reason: string,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'close_safety_reports');
  return persistUpdatedReport(reportId, actor, 'Safety report reopened', (report) => {
    if (report.reviewStatus !== 'Closed') throw new Error('Only a closed report may be reopened.');
    if (!reason.trim()) throw new Error('A reopening reason is required.');
    return {
      ...report,
      reviewStatus: 'Under Review',
      reopenedReason: reason.trim(),
      closureReason: '',
      closedAt: '',
      closedBy: '',
    };
  });
};

export const raiseSafetyDataQuery = (
  reportId: string,
  query: string,
  user: User | null | undefined
): SafetyReport => {
  const actor = requirePermission(user, 'raise_data_queries');
  return persistUpdatedReport(reportId, actor, 'Safety data query raised', (report) => {
    if (!query.trim()) throw new Error('Enter the data query.');
    const item: SafetyDataQuery = {
      id: newId('safety_query'),
      raisedAt: new Date().toISOString(),
      raisedBy: actor.fullName,
      raisedByRole: actor.userType,
      query: query.trim(),
      status: 'Open',
      response: '',
      resolvedAt: '',
    };
    return { ...report, dataQueries: [...report.dataQueries, item] };
  });
};

export const configureTrialSafetyReporting = (
  trialId: string,
  config: { reportingDeadlineHours: number; reportingAuthority: string; reportingCriteria: string },
  user: User | null | undefined
): TrialProposal => {
  const actor = requirePermission(user, 'manage_safety_reports');
  const trial = requireTrialAccess(actor, trialId);
  if (!Number.isFinite(config.reportingDeadlineHours) || config.reportingDeadlineHours < 0) {
    throw new Error('Reporting deadline must be zero (no fixed deadline) or a positive number of hours.');
  }
  const previous = JSON.stringify(trial.safetyReporting || null);
  const nextConfig = {
    ...config,
    configuredBy: actor.fullName,
    configuredAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    const key = 'ctms_safety_configuration_audit_v1';
    const raw = window.localStorage.getItem(key);
    let history: Array<Record<string, string>> = [];
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Invalid safety configuration audit history.');
        history = parsed as Array<Record<string, string>>;
      } catch (error) {
        console.error('Unable to read safety configuration audit history.', error);
        throw new Error('Safety configuration audit history could not be read.');
      }
    }
    history.push({
      id: newId('safety_config_audit'),
      trialId,
      changedAt: nextConfig.configuredAt,
      changedBy: actor.fullName,
      userRole: actor.userType,
      previousValues: previous,
      newValues: JSON.stringify(nextConfig),
    });
    try {
      window.localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Unable to persist safety configuration audit history.', error);
      throw new Error('Safety configuration audit history could not be saved.');
    }
  }
  return saveTrialSafetyReportingConfig(trial.id, nextConfig, actor);
};

export const getSafetyReportContext = (trialId: string, patientId: string, visitId: string) => {
  const trial = getCachedProposals().find((item) => item.trialId === trialId);
  const patient = trial ? getPatientForTrial(trial.trialId, patientId) : undefined;
  const visit = patient?.visits?.find((item) => item.id === visitId);
  return { trial, patient, visit };
};

export const getSafetyDashboardPatients = (trialId: string): Patient[] => getPatientsForTrial(trialId);

export const getSafetyDashboardMetrics = (reports: SafetyReport[]) => ({
  total: reports.length,
  new: reports.filter((report) => report.reviewStatus === 'Submitted').length,
  pendingReview: reports.filter((report) => ['Submitted', 'Under Review', 'Escalated'].includes(report.reviewStatus)).length,
  serious: reports.filter((report) => report.seriousness === 'Serious').length,
  followUp: reports.filter((report) => report.followUpRequired || report.reviewStatus === 'Follow-up Required').length,
  reported: reports.filter((report) => report.reportingStatus === 'Reported').length,
  closed: reports.filter((report) => report.reviewStatus === 'Closed').length,
});

export const getSafetySeriousnessCriteria = (): string[] => [...SERIOUSNESS_CRITERIA];
