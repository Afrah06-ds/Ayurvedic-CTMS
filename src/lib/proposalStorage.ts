import {
  TrialProposal,
  CreateTrialProposalData,
  TrialRegulatoryRecord,
  TrialSafetyReportingConfig,
  User,
} from './types';
import { hasPermission } from './permissions';

const STORAGE_PROPOSALS_KEY = 'ctms_cached_trial_proposals_v1';

export const INITIAL_SAMPLE_PROPOSAL: TrialProposal = {
  id: 'prop_sample_001',
  trialId: 'CT-001',
  trialTitle: 'Clinical Study to Evaluate the Safety and Efficacy of Nimba-Ayurvedic Tablet in Patients with Madhumeha',
  studyType: 'Interventional',
  studyPhase: 'Phase II',
  studyObjective: 'To evaluate the safety and efficacy of Nimba-Ayurvedic Tablet in patients with Madhumeha',
  studyDesign: 'Randomized, controlled, open-label, prospective',
  targetDisease: 'Madhumeha / Type 2 Diabetes Mellitus',
  sampleSize: '100 Participants',
  duration: '12 Months',
  treatmentDuration: '12 Weeks',
  inclusionCriteria: 'Adults meeting the protocol-defined diagnostic criteria and willing to provide informed consent',
  exclusionCriteria: 'Participants meeting protocol-defined exclusion conditions or contraindications',
  primaryOutcome: 'Change in HbA1c from baseline to the predefined assessment visit',
  secondaryOutcome: 'Fasting Blood Glucose, PPBS, Ayurvedic symptom score and safety parameters',
  selectedCentreIds: ['ctr_seed_001', 'ctr_seed_002', 'ctr_seed_003'],
  proposalStatus: 'Approved',
  proposedBy: 'Dr. Sarah Jenkins (Principal Investigator)',
  createdAt: new Date().toISOString(),
};

let memoryProposals: TrialProposal[] = [INITIAL_SAMPLE_PROPOSAL];

export const createDefaultTrialRegulatoryRecord = (): TrialRegulatoryRecord => ({
  protocol: {
    number: '',
    version: '',
    title: '',
    versionDate: '',
    principalInvestigator: '',
    approvalStatus: 'Not Started',
  },
  ethics: {
    name: '',
    registrationDetails: '',
    referenceNumber: '',
    submissionDate: '',
    approvalStatus: 'Not Started',
    approvalDate: '',
    validUntil: '',
    approvedProtocolVersion: '',
    approvedConsentVersion: '',
    remarks: '',
  },
  ctri: {
    referenceNumber: '',
    registrationNumber: '',
    submissionDate: '',
    registrationDate: '',
    status: 'Not Submitted',
  },
  cdsco: {
    requirement: 'To Be Determined',
    applicabilityReason: '',
    authority: '',
    applicationNumber: '',
    submissionDate: '',
    approvalDate: '',
    status: 'Not Started',
    reviewer: '',
    reviewDate: '',
  },
  siteReadiness: {
    activationStatus: 'Not Ready',
    principalInvestigator: '',
    investigators: [],
    qualificationsVerified: false,
    approvedProtocolVersion: '',
    approvedConsentVersion: '',
    medicineAvailable: false,
    safetyReportingReady: false,
    readinessChecklist: '',
    reviewerRemarks: '',
  },
  validationRules: {
    requireProtocolApproval: true,
    requireIECapproval: true,
    requireCTRIRegistration: true,
    requireCDSCOAssessment: true,
    requireSiteReadiness: true,
    requireProspectiveCTRIRegistration: true,
    requireCompletedTreatmentForCertificate: true,
    minimumCompletedVisitsForCertificate: 1,
    requireRecordedTreatmentForCertificate: true,
  },
  auditTrail: [],
});

export const getTrialActivationIssues = (
  trial: TrialProposal,
  today = new Date().toISOString().slice(0, 10)
): string[] => {
  const record = trial.regulatory || createDefaultTrialRegulatoryRecord();
  const issues: string[] = [];
  const { validationRules: rules, protocol, ethics, ctri, cdsco, siteReadiness } = record;
  const isValidDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime()) &&
    new Date(`${value}T00:00:00`).toISOString().slice(0, 10) === value;
  const hasDocument = (document?: TrialRegulatoryRecord['protocol']['approvalDocument']) =>
    Boolean(document?.fileName && document.dataUrl && /^data:(application\/pdf|image\/jpeg|image\/png);base64,/.test(document.dataUrl));

  if (rules.requireProtocolApproval && (
    protocol.approvalStatus !== 'Approved' ||
    !protocol.number.trim() ||
    !protocol.version.trim() ||
    !protocol.title.trim() ||
    !isValidDate(protocol.versionDate) ||
    protocol.versionDate > today ||
    !protocol.principalInvestigator.trim() ||
    !hasDocument(protocol.approvalDocument)
  )) {
    issues.push('Approved trial protocol, version, and approval document are required.');
  }

  if (rules.requireIECapproval && (
    ethics.approvalStatus !== 'Approved' ||
    !ethics.name.trim() ||
    !ethics.registrationDetails.trim() ||
    !ethics.referenceNumber.trim() ||
    !isValidDate(ethics.submissionDate) ||
    !hasDocument(ethics.approvalDocument) ||
    !isValidDate(ethics.approvalDate) ||
    !isValidDate(ethics.validUntil) ||
    ethics.submissionDate > ethics.approvalDate ||
    ethics.approvalDate > today ||
    ethics.validUntil < ethics.approvalDate ||
    ethics.validUntil < today ||
    !ethics.approvedProtocolVersion ||
    ethics.approvedProtocolVersion !== protocol.version ||
    !ethics.approvedConsentVersion
  )) {
    issues.push('Current IEC approval, matching approved protocol version, consent version, and approval document are required.');
  }

  if ((rules.requireCTRIRegistration || rules.requireProspectiveCTRIRegistration) && (
    ctri.status !== 'Registered' ||
    !ctri.referenceNumber.trim() ||
    !ctri.registrationNumber.trim() ||
    !isValidDate(ctri.submissionDate) ||
    !isValidDate(ctri.registrationDate) ||
    ctri.registrationDate < ctri.submissionDate ||
    ctri.registrationDate > today ||
    !hasDocument(ctri.registrationRecord)
  )) {
    issues.push('Completed CTRI registration and registration record are required.');
  }

  if (rules.requireCDSCOAssessment && (
    cdsco.requirement === 'To Be Determined' ||
    !cdsco.applicabilityReason.trim() ||
    !cdsco.reviewer.trim() ||
    !isValidDate(cdsco.reviewDate) ||
    cdsco.reviewDate > today ||
    (cdsco.requirement === 'Yes' && (
      cdsco.status !== 'Approved' ||
      !cdsco.authority.trim() ||
      !cdsco.applicationNumber.trim() ||
      !isValidDate(cdsco.submissionDate) ||
      !hasDocument(cdsco.approvalDocument) ||
      !isValidDate(cdsco.approvalDate) ||
      cdsco.submissionDate > cdsco.approvalDate ||
      cdsco.approvalDate > today
    ))
  )) {
    issues.push('A reasoned CDSCO/DCGI applicability decision is required; permission and approval evidence are required when applicable.');
  }

  if (rules.requireSiteReadiness && (
    siteReadiness.activationStatus !== 'Ready' ||
    !siteReadiness.principalInvestigator.trim() ||
    !siteReadiness.investigators.some((investigator) => investigator.trim()) ||
    !siteReadiness.qualificationsVerified ||
    siteReadiness.approvedProtocolVersion !== protocol.version ||
    siteReadiness.approvedConsentVersion !== ethics.approvedConsentVersion ||
    !siteReadiness.medicineAvailable ||
    !siteReadiness.safetyReportingReady ||
    !siteReadiness.readinessChecklist.trim()
  )) {
    issues.push('Site and investigator readiness is incomplete or does not match approved document versions.');
  }

  return issues;
};

const getProposalByTrialId = (trialId: string): TrialProposal | undefined =>
  getCachedProposals().find((proposal) => proposal.trialId === trialId);

export const getCachedProposals = (): TrialProposal[] => {
  if (typeof window === 'undefined') {
    return memoryProposals;
  }
  try {
    const raw = localStorage.getItem(STORAGE_PROPOSALS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify([INITIAL_SAMPLE_PROPOSAL]));
      return [INITIAL_SAMPLE_PROPOSAL];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify([INITIAL_SAMPLE_PROPOSAL]));
      return [INITIAL_SAMPLE_PROPOSAL];
    }
    return parsed;
  } catch (err) {
    console.warn('Proposals read error, using memory fallback', err);
    return memoryProposals;
  }
};

export const getSavedProposals = (): TrialProposal[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_PROPOSALS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid clinical trial records.');
    return parsed.filter((proposal): proposal is TrialProposal =>
      Boolean(
        proposal &&
        typeof proposal === 'object' &&
        typeof proposal.id === 'string' &&
        typeof proposal.trialId === 'string' &&
        typeof proposal.trialTitle === 'string'
      )
    );
  } catch (error) {
    console.error('Unable to read saved clinical trial records.', error);
    throw new Error('Saved clinical trials could not be loaded.');
  }
};

const saveCachedProposals = (proposals: TrialProposal[]): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify(proposals));
    } catch (err) {
      console.warn('Failed to save proposals to localStorage', err);
      throw new Error('Unable to save trial data in this browser. Check available storage and try again.');
    }
  }
  memoryProposals = proposals;
};

export const addProposalToCache = (data: CreateTrialProposalData, actor?: User | null): TrialProposal => {
  const proposals = getCachedProposals();

  const newProp: TrialProposal = {
    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    trialId: data.trialId.trim(),
    trialTitle: data.trialTitle.trim(),
    studyType: data.studyType.trim(),
    studyPhase: data.studyPhase.trim(),
    studyObjective: data.studyObjective.trim(),
    studyDesign: data.studyDesign.trim(),
    targetDisease: data.targetDisease.trim(),
    sampleSize: data.sampleSize.trim(),
    duration: data.duration.trim(),
    treatmentDuration: data.treatmentDuration.trim(),
    inclusionCriteria: data.inclusionCriteria.trim(),
    exclusionCriteria: data.exclusionCriteria.trim(),
    primaryOutcome: data.primaryOutcome.trim(),
    secondaryOutcome: data.secondaryOutcome.trim(),
    selectedCentreIds: data.selectedCentreIds || [],
    proposalStatus: data.proposalStatus || 'Submitted',
    proposedBy: data.proposedBy || 'CTMS Investigator',
    createdAt: new Date().toISOString(),
  };

  if (newProp.proposalStatus === 'Active') {
    if (!hasPermission(actor, 'manage_trial_configuration')) {
      throw new Error('Permission denied. An authorized trial configurator must activate this trial.');
    }
    const issues = getTrialActivationIssues(newProp);
    if (issues.length > 0) {
      throw new Error(`Trial activation is blocked:\n${issues.map((issue) => `• ${issue}`).join('\n')}`);
    }
  }

  const updated = [newProp, ...proposals];
  saveCachedProposals(updated);
  return newProp;
};

const applyProposalUpdate = (
  id: string,
  data: Partial<CreateTrialProposalData> & {
    regulatory?: TrialRegulatoryRecord;
    safetyReporting?: TrialSafetyReportingConfig;
  },
  actor?: User | null
): TrialProposal => {
  const proposals = getCachedProposals();
  const index = proposals.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error('Trial proposal not found.');
  }

  const current = proposals[index];
  const updatedProposal: TrialProposal = {
    ...current,
    ...data,
  };

  if (updatedProposal.proposalStatus === 'Active' && current.proposalStatus !== 'Active') {
    if (!hasPermission(actor, 'manage_trial_configuration')) {
      throw new Error('Permission denied. An authorized trial configurator must activate this trial.');
    }
    const issues = getTrialActivationIssues(updatedProposal);
    if (issues.length > 0) {
      throw new Error(`Trial activation is blocked:\n${issues.map((issue) => `• ${issue}`).join('\n')}`);
    }
  }

  if (updatedProposal.proposalStatus !== current.proposalStatus) {
    const regulatory = updatedProposal.regulatory || createDefaultTrialRegulatoryRecord();
    updatedProposal.regulatory = {
      ...regulatory,
      auditTrail: [
        ...regulatory.auditTrail,
        {
          id: `trial_status_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          changedAt: new Date().toISOString(),
          changedBy: actor?.fullName || 'System',
          action: `Trial status changed from ${current.proposalStatus} to ${updatedProposal.proposalStatus}`,
          before: JSON.stringify({ proposalStatus: current.proposalStatus }),
          after: JSON.stringify({ proposalStatus: updatedProposal.proposalStatus }),
        },
      ],
    };
  }

  proposals[index] = updatedProposal;
  saveCachedProposals([...proposals]);
  return updatedProposal;
};

export const updateProposalInCache = (
  id: string,
  data: Partial<CreateTrialProposalData>,
  actor?: User | null
): TrialProposal => applyProposalUpdate(id, data, actor);

export const saveTrialSafetyReportingConfig = (
  id: string,
  config: TrialSafetyReportingConfig,
  actor: User
): TrialProposal => {
  if (!hasPermission(actor, 'manage_safety_reports')) {
    throw new Error('Permission denied. Only an authorized safety user may configure reporting obligations.');
  }
  return applyProposalUpdate(id, { safetyReporting: config }, actor);
};

const approvalFieldsChanged = (
  before: TrialRegulatoryRecord,
  after: TrialRegulatoryRecord
): boolean => (
  before.protocol.approvalStatus !== after.protocol.approvalStatus ||
  before.ethics.approvalStatus !== after.ethics.approvalStatus ||
  before.ctri.status !== after.ctri.status ||
  before.cdsco.requirement !== after.cdsco.requirement ||
  before.cdsco.status !== after.cdsco.status
);

const regulatoryAuditSnapshot = (record: TrialRegulatoryRecord): string => {
  const documentMetadata = (document?: TrialRegulatoryRecord['protocol']['approvalDocument']) =>
    document
      ? { fileName: document.fileName, uploadedAt: document.uploadedAt, uploadedBy: document.uploadedBy }
      : undefined;
  return JSON.stringify({
    ...record,
    protocol: { ...record.protocol, approvalDocument: documentMetadata(record.protocol.approvalDocument) },
    ethics: { ...record.ethics, approvalDocument: documentMetadata(record.ethics.approvalDocument) },
    ctri: { ...record.ctri, registrationRecord: documentMetadata(record.ctri.registrationRecord) },
    cdsco: { ...record.cdsco, approvalDocument: documentMetadata(record.cdsco.approvalDocument) },
    auditTrail: undefined,
  });
};

export const saveTrialRegulatoryRecord = (
  trialId: string,
  nextRecord: TrialRegulatoryRecord,
  actor: User
): TrialProposal => {
  const trial = getProposalByTrialId(trialId);
  if (!trial) throw new Error('Clinical trial was not found.');
  if (!hasPermission(actor, 'manage_trial_regulatory')) {
    throw new Error('Permission denied. Trial regulatory records cannot be changed by this user.');
  }

  const previous = trial.regulatory || createDefaultTrialRegulatoryRecord();
  if (approvalFieldsChanged(previous, nextRecord) && !hasPermission(actor, 'approve_trial_regulatory')) {
    throw new Error('Permission denied. Only an authorized regulatory reviewer may change approval or applicability decisions.');
  }
  if (
    JSON.stringify(previous.validationRules) !== JSON.stringify(nextRecord.validationRules) &&
    !hasPermission(actor, 'manage_trial_configuration')
  ) {
    throw new Error('Permission denied. Only an authorized trial configurator may change validation rules.');
  }
  if (!Number.isInteger(nextRecord.validationRules.minimumCompletedVisitsForCertificate) || nextRecord.validationRules.minimumCompletedVisitsForCertificate < 0) {
    throw new Error('Minimum completed visits for certificate eligibility must be a non-negative whole number.');
  }

  const savedRecord: TrialRegulatoryRecord = {
    ...nextRecord,
    auditTrail: [
      ...previous.auditTrail,
      {
        id: `reg_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        changedAt: new Date().toISOString(),
        changedBy: actor.fullName,
        action: 'Updated trial regulatory records',
        before: regulatoryAuditSnapshot(previous),
        after: regulatoryAuditSnapshot(nextRecord),
      },
    ],
  };
  return applyProposalUpdate(trial.id, { regulatory: savedRecord }, actor);
};

export const deleteProposalFromCache = (id: string): void => {
  const proposals = getCachedProposals();
  const updated = proposals.filter((p) => p.id !== id);
  saveCachedProposals(updated);
};
