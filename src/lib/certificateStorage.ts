import {
  CertificateAuditEntry,
  Patient,
  TreatmentCertificate,
  TrialProposal,
  User,
} from './types';
import { getPatientForTrial } from './patientStorage';
import { hasPermission } from './permissions';

const STORAGE_CERTIFICATE_STATE_KEY = 'ctms_treatment_certificate_state_v1';

interface CertificateState {
  certificates: TreatmentCertificate[];
  auditHistory: CertificateAuditEntry[];
}

let memoryState: CertificateState = { certificates: [], auditHistory: [] };

const readState = (): CertificateState => {
  if (typeof window === 'undefined') return memoryState;
  const raw = localStorage.getItem(STORAGE_CERTIFICATE_STATE_KEY);
  if (!raw) return memoryState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('certificates' in parsed) ||
      !Array.isArray(parsed.certificates) ||
      !('auditHistory' in parsed) ||
      !Array.isArray(parsed.auditHistory)
    ) {
      throw new Error('Stored certificate state is invalid.');
    }
    memoryState = parsed as CertificateState;
    return memoryState;
  } catch (error) {
    console.error(`Unable to read ${STORAGE_CERTIFICATE_STATE_KEY}.`, error);
    throw new Error('Certificate records could not be read. Refresh or contact your administrator.');
  }
};

const persistState = (state: CertificateState): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CERTIFICATE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error(`Unable to save ${STORAGE_CERTIFICATE_STATE_KEY}.`, error);
      throw new Error('Certificate records could not be saved in this browser.');
    }
  }
  memoryState = state;
};

const getRecordedTreatment = (patient: Patient) =>
  (patient.visits || []).flatMap((visit) =>
    (visit.medicines || []).map((medicine) => ({
      start: medicine.startDate || medicine.dateProvided || '',
      end: medicine.endDate || '',
      visitDate: visit.visitDate || '',
      visitCompleted: visit.status === 'Completed',
    }))
  ).filter((record) => Boolean(record.start));

const isValidDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00`).getTime()) &&
  new Date(`${value}T00:00:00`).toISOString().slice(0, 10) === value;

export const getTreatmentCertificateEligibility = (
  trial: TrialProposal,
  patient: Patient
): { eligible: boolean; reasons: string[]; completedVisits: number; treatmentStarted: boolean; startDate: string; endDate: string } => {
  const rules = trial.regulatory?.validationRules;
  const completedVisits = (patient.visits || []).filter((visit) => visit.status === 'Completed').length;
  const treatment = getRecordedTreatment(patient);
  const completedTreatment = treatment.filter((record) =>
    record.visitCompleted &&
    isValidDate(record.start) &&
    isValidDate(record.end) &&
    record.start <= record.end &&
    (!record.visitDate || isValidDate(record.visitDate))
  );
  const reasons: string[] = [];

  if (!patient.enrollment) reasons.push('The patient has not been enrolled.');
  if (patient.consent?.status !== 'Obtained') reasons.push('Valid informed consent is not recorded.');
  if (rules?.requireCompletedTreatmentForCertificate !== false && patient.enrollment?.enrollmentStatus !== 'Completed') {
    reasons.push('Treatment completion is not recorded.');
  }
  if (rules?.requireCompletedTreatmentForCertificate !== false && completedTreatment.length === 0) {
    reasons.push('A completed visit with dated treatment start and end is required to verify treatment completion.');
  }
  if (
    patient.enrollment?.enrollmentStatus === 'Withdrawn' ||
    patient.enrollment?.enrollmentStatus === 'Discontinued'
  ) {
    reasons.push('Withdrawn or discontinued patients are not eligible.');
  }
  if (completedVisits < (rules?.minimumCompletedVisitsForCertificate ?? 1)) {
    reasons.push(`At least ${rules?.minimumCompletedVisitsForCertificate ?? 1} completed visit(s) are required.`);
  }
  if (rules?.requireRecordedTreatmentForCertificate !== false && treatment.length === 0) {
    reasons.push('Dated treatment/medicine records are required.');
  }
  if (rules?.requireRecordedTreatmentForCertificate !== false && treatment.some((record) => !isValidDate(record.start))) {
    reasons.push('Treatment records must include valid dates.');
  }

  const startDates = treatment.map((item) => item.start).filter(Boolean).sort();
  const endDates = (rules?.requireCompletedTreatmentForCertificate === false
    ? treatment.filter((record) => isValidDate(record.end || record.visitDate))
    : completedTreatment)
    .map((item) => item.end || item.visitDate)
    .filter(Boolean)
    .sort();
  return {
    eligible: reasons.length === 0,
    reasons,
    completedVisits,
    treatmentStarted: treatment.length > 0,
    startDate: startDates[0] || '',
    endDate: endDates[endDates.length - 1] || '',
  };
};

export const getTreatmentCertificates = (trialId: string): TreatmentCertificate[] =>
  readState().certificates.filter((certificate) => certificate.trialId === trialId);

export const getCertificateAuditHistory = (trialId: string): CertificateAuditEntry[] =>
  readState().auditHistory.filter((entry) => entry.trialId === trialId);

export const issueTreatmentCertificate = (
  trial: TrialProposal,
  patientId: string,
  actor: User,
  authorizedSignatory: string,
  authorizedSignatoryTitle: string
): TreatmentCertificate => {
  if (!hasPermission(actor, 'approve_treatment_certificates')) {
    throw new Error('Permission denied. An authorized certificate approver must issue the certificate.');
  }
  if (!authorizedSignatory.trim() || !authorizedSignatoryTitle.trim()) {
    throw new Error('Authorized signatory name and title are required.');
  }
  if (authorizedSignatory.trim() !== actor.fullName.trim()) {
    throw new Error('The certificate signatory must match the authorized approving user.');
  }

  const patient = getPatientForTrial(trial.trialId, patientId);
  if (!patient) throw new Error('Patient was not found in the selected clinical trial.');
  const eligibility = getTreatmentCertificateEligibility(trial, patient);
  if (!eligibility.eligible) {
    throw new Error(`Certificate issuance is blocked:\n${eligibility.reasons.map((reason) => `• ${reason}`).join('\n')}`);
  }

  const state = readState();
  const certificates = state.certificates;
  if (certificates.some((certificate) => certificate.trialId === trial.trialId && certificate.patientId === patient.id)) {
    throw new Error('A certificate has already been issued for this patient in this trial.');
  }
  const enrollment = patient.enrollment;
  if (!enrollment) throw new Error('Certificate issuance requires an enrollment record.');

  const issuedAt = new Date().toISOString();
  const datePart = issuedAt.slice(0, 10).replace(/-/g, '');
  const sequence = certificates.filter((certificate) => certificate.issueDate === issuedAt.slice(0, 10)).length + 1;
  const certificate: TreatmentCertificate = {
    id: `certificate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    certificateNumber: `AYU-${trial.trialId}-${datePart}-${String(sequence).padStart(3, '0')}`,
    trialId: trial.trialId,
    patientId: patient.id,
    patientCode: patient.patientCode,
    patientName: patient.fullName,
    trialTitle: trial.trialTitle,
    certificateType: enrollment.enrollmentStatus === 'Completed' ? 'Treatment Completion' : 'Trial Participation',
    treatmentStartDate: eligibility.startDate,
    treatmentEndDate: eligibility.endDate,
    completedVisits: eligibility.completedVisits,
    actualTreatmentStatus: enrollment.enrollmentStatus,
    issueDate: issuedAt.slice(0, 10),
    authorizedSignatory: authorizedSignatory.trim(),
    authorizedSignatoryTitle: authorizedSignatoryTitle.trim(),
    issuedBy: actor.fullName,
    issuedAt,
  };
  const auditEntry: CertificateAuditEntry = {
    id: `certificate_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    certificateId: certificate.id,
    trialId: trial.trialId,
    patientId: patient.id,
    changedAt: issuedAt,
    changedBy: actor.fullName,
    action: 'Issued',
    certificateNumber: certificate.certificateNumber,
  };

  persistState({
    certificates: [...certificates, certificate],
    auditHistory: [...state.auditHistory, auditEntry],
  });
  return certificate;
};
