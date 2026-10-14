import { Drug } from './types';

const STORAGE_DRUGS_KEY = 'ctms_cached_drugs_v1';

export const INITIAL_DRUGS: Drug[] = [
  {
    id: 'DRUG001',
    drugName: 'Ashwagandha Herbal Capsule',
    genericName: 'Withania somnifera Extract',
    drugType: 'Indian System of Medicine (AYUSH)',
    formulationName: 'Ashwagandha Herbal Capsule',
    dosageForm: 'Capsule',
    strength: '500 mg',
    manufacturer: 'AIIA Research Pharmacy',
    batchNumber: 'ASH2026B01',
    expiryDate: '2028-09-30',
    routeOfAdministration: 'Oral',
    indication: 'Stress and General Wellness',
    trialPhase: 'Phase II',
    ctriRegistrationNumber: 'CTRI/2026/09/000001',
    cdscoPermissionStatus: 'Not Applicable',
    assignedCentre: 'AIIA Chennai Centre',
    principalInvestigator: 'Dr. Arjun Kumar',
    availableQuantity: '500 Capsules',
    frequency: 'Once daily',
    treatmentDuration: '12 weeks',
    drugStatus: 'Active',
    componentCount: 1,
    components: [
      {
        id: 'DRUG001-COMP-01',
        name: 'Ashwagandha root extract',
        strength: '500 mg',
        botanicalName: 'Withania somnifera',
        partUsed: 'Root',
      },
    ],
    totalDosage: '500 mg per capsule',
    storageConditions: 'Store in a cool, dry place away from direct sunlight.',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

let memoryDrugs: Drug[] = INITIAL_DRUGS;

export const getCachedDrugs = (): Drug[] => {
  if (typeof window === 'undefined') return memoryDrugs;

  try {
    const raw = localStorage.getItem(STORAGE_DRUGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_DRUGS_KEY, JSON.stringify(INITIAL_DRUGS));
      return INITIAL_DRUGS;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_DRUGS_KEY, JSON.stringify(INITIAL_DRUGS));
      return INITIAL_DRUGS;
    }

    return parsed as Drug[];
  } catch (error) {
    console.warn('Drug records read error, using memory fallback', error);
    return memoryDrugs;
  }
};

export const saveCachedDrugs = (drugs: Drug[]): void => {
  memoryDrugs = drugs;
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_DRUGS_KEY, JSON.stringify(drugs));
  } catch (error) {
    console.warn('Failed to save drug records to localStorage', error);
  }
};
