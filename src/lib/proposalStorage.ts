import { TrialProposal, CreateTrialProposalData } from './types';

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

export const saveCachedProposals = (proposals: TrialProposal[]): void => {
  memoryProposals = proposals;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify(proposals));
    } catch (err) {
      console.warn('Failed to save proposals to localStorage', err);
    }
  }
};

export const addProposalToCache = (data: CreateTrialProposalData): TrialProposal => {
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

  const updated = [newProp, ...proposals];
  saveCachedProposals(updated);
  return newProp;
};

export const updateProposalInCache = (id: string, data: Partial<CreateTrialProposalData>): TrialProposal => {
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

  proposals[index] = updatedProposal;
  saveCachedProposals([...proposals]);
  return updatedProposal;
};

export const deleteProposalFromCache = (id: string): void => {
  const proposals = getCachedProposals();
  const updated = proposals.filter((p) => p.id !== id);
  saveCachedProposals(updated);
};
