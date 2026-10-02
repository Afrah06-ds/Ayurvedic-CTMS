import { Centre, CreateCentreData } from './types';

const STORAGE_CENTRES_KEY = 'ctms_cached_centres_v1';

export const INITIAL_SEED_CENTRES: Centre[] = [
  {
    id: 'ctr_seed_001',
    centreCode: 'CTR-DEL-001',
    centreName: 'All India Institute of Ayurveda (AIIA)',
    centreType: 'Government Hospital',
    address: 'Gautampuri, Sarita Vihar, Mathura Road',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110076',
    contactNumber: '+91 11 2695 0401',
    email: 'research@aiia.gov.in',
    accreditation: 'NABH Accredited & NABL Approved',
    status: 'active',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ctr_seed_002',
    centreCode: 'CTR-MUM-002',
    centreName: 'Tata Memorial Clinical Research Centre',
    centreType: 'Academic Research Institute',
    address: 'Dr. Ernest Borges Road, Parel',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    contactNumber: '+91 22 2417 7000',
    email: 'clinicaltrials@tmc.gov.in',
    accreditation: 'USFDA Inspected & GCP Certified',
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ctr_seed_003',
    centreCode: 'CTR-BLR-003',
    centreName: 'NIMHANS Integrative Medicine Research Centre',
    centreType: 'Government Hospital',
    address: 'Hosur Road, Lakkasandra, Wilson Garden',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560029',
    contactNumber: '+91 80 2699 5000',
    email: 'ctms-desk@nimhans.ac.in',
    accreditation: 'NABH Accredited',
    status: 'active',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ctr_seed_004',
    centreCode: 'CTR-CHE-004',
    centreName: 'Apollo Hospitals Dedicated Clinical Research Unit',
    centreType: 'Private Medical Center',
    address: '21 Greams Lane, Off Greams Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600006',
    contactNumber: '+91 44 2829 0200',
    email: 'cru.chennai@apollohospitals.com',
    accreditation: 'ISO 9001:2015 & GCP Certified',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ctr_seed_005',
    centreCode: 'CTR-HYD-005',
    centreName: 'Ayurvedic Medical Research & Pharmacology Center',
    centreType: 'Ayurvedic Specialty Hospital',
    address: 'Road No. 12, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    contactNumber: '+91 40 2339 4001',
    email: 'info@ayurresearch-hyd.org',
    accreditation: 'AYUSH Excellence Center',
    status: 'inactive',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ctr_seed_006',
    centreCode: 'CTR-PUN-006',
    centreName: 'Bharati Vidyapeeth Clinical Trial Center',
    centreType: 'Academic Research Institute',
    address: 'Pune-Satara Road, Katraj',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411043',
    contactNumber: '+91 20 2437 3226',
    email: 'trials@bvuniversity.edu.in',
    accreditation: 'NABL Approved',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let memoryCentres: Centre[] = INITIAL_SEED_CENTRES;

export const getCachedCentres = (): Centre[] => {
  if (typeof window === 'undefined') {
    return memoryCentres;
  }
  try {
    const raw = localStorage.getItem(STORAGE_CENTRES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CENTRES_KEY, JSON.stringify(INITIAL_SEED_CENTRES));
      return INITIAL_SEED_CENTRES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_CENTRES_KEY, JSON.stringify(INITIAL_SEED_CENTRES));
      return INITIAL_SEED_CENTRES;
    }
    return parsed;
  } catch (err) {
    console.warn('Centres read error, using memory fallback', err);
    return memoryCentres;
  }
};

export const saveCachedCentres = (centres: Centre[]): void => {
  memoryCentres = centres;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CENTRES_KEY, JSON.stringify(centres));
    } catch (err) {
      console.warn('Failed to save centres to localStorage', err);
    }
  }
};

export const generateCentreCode = (): string => {
  const centres = getCachedCentres();
  const nextNum = centres.length + 101;
  return `CTR-${nextNum}`;
};

export const addCentreToCache = (data: CreateCentreData): Centre => {
  const centres = getCachedCentres();

  const code = (data.centreCode && data.centreCode.trim())
    ? data.centreCode.trim().toUpperCase()
    : generateCentreCode();

  // Check duplicate centreCode
  const existing = centres.find((c) => c.centreCode.toUpperCase() === code);
  if (existing) {
    throw new Error(`Centre Code "${code}" already exists in the system.`);
  }

  const newCentre: Centre = {
    id: `ctr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    centreCode: code,
    centreName: data.centreName.trim(),
    centreType: data.centreType,
    address: data.address.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    contactNumber: data.contactNumber.trim(),
    email: data.email.trim().toLowerCase(),
    accreditation: data.accreditation.trim(),
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };

  const updated = [newCentre, ...centres];
  saveCachedCentres(updated);
  return newCentre;
};

export const updateCentreInCache = (id: string, data: Partial<CreateCentreData>): Centre => {
  const centres = getCachedCentres();
  const index = centres.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error('Centre record not found.');
  }

  const current = centres[index];
  const updatedCentre: Centre = {
    ...current,
    ...data,
    centreName: data.centreName ? data.centreName.trim() : current.centreName,
    address: data.address ? data.address.trim() : current.address,
    city: data.city ? data.city.trim() : current.city,
    state: data.state ? data.state.trim() : current.state,
    pincode: data.pincode ? data.pincode.trim() : current.pincode,
    contactNumber: data.contactNumber ? data.contactNumber.trim() : current.contactNumber,
    email: data.email ? data.email.trim().toLowerCase() : current.email,
    accreditation: data.accreditation ? data.accreditation.trim() : current.accreditation,
  };

  centres[index] = updatedCentre;
  saveCachedCentres([...centres]);
  return updatedCentre;
};

export const toggleCentreStatusInCache = (id: string): Centre => {
  const centres = getCachedCentres();
  const target = centres.find((c) => c.id === id);
  if (!target) {
    throw new Error('Centre not found.');
  }
  target.status = target.status === 'active' ? 'inactive' : 'active';
  saveCachedCentres([...centres]);
  return target;
};

export const deleteCentreFromCache = (id: string): void => {
  const centres = getCachedCentres();
  const updated = centres.filter((c) => c.id !== id);
  saveCachedCentres(updated);
};
