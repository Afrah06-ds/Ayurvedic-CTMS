import {
  Patient,
  PatientConsent,
  PatientLifecycleStatus,
  PatientVisit,
  TrialPatientSummary,
  User,
} from './types';
import { getCachedProposals, getTrialActivationIssues } from './proposalStorage';
import { hasPermission } from './permissions';

const STORAGE_PATIENTS_KEY = 'ctms_cached_trial_patients_v1';

const makeConsent = (patientId: string, trialId: string, createdBy?: string): PatientConsent => {
  const now = new Date().toISOString();
  return {
    id: `consent_${patientId}`,
    patientId,
    trialId,
    status: 'Not Obtained',
    consentVersion: 'V1',
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || 'Demo User',
    updatedBy: createdBy || 'Demo User',
  };
};

const buildPatientStatus = (patient: Patient): PatientLifecycleStatus => {
  const consentStatus = patient.consent?.status || 'Not Obtained';
  const screeningStatus = patient.screening?.eligibilityStatus || 'Pending';
  const enrollmentStatus = patient.enrollment?.enrollmentStatus;

  if (enrollmentStatus === 'Completed') return 'Completed';
  if (enrollmentStatus === 'Withdrawn') return 'Withdrawn';
  if (enrollmentStatus === 'Discontinued') return 'Discontinued';
  if (enrollmentStatus === 'Active') return 'Active Treatment';

  if (consentStatus === 'Not Obtained') return 'Consent Pending';
  if (consentStatus === 'Obtained' && screeningStatus === 'Pending') return 'Screening Pending';
  if (screeningStatus === 'Eligible') return 'Eligible';
  if (screeningStatus === 'Not Eligible') return 'Not Eligible';
  if (consentStatus === 'Obtained') return 'Consent Obtained';
  if (patient.enrollment) return 'Enrolled';

  return 'Registered';
};

export const ensurePatientVisits = (patient: Patient): PatientVisit[] => {
  if (patient.visits && patient.visits.length > 0) {
    return patient.visits;
  }
  const defaultVisits: PatientVisit[] = [
    {
      id: `vis_${patient.id}_1`,
      patientId: patient.id,
      trialId: patient.trialId,
      visitNumber: 'Visit 1',
      visitDate: patient.registrationDate || new Date().toISOString().slice(0, 10),
      visitType: 'Baseline',
      status: 'Completed',
      doctorInvestigator: patient.registeredBy || 'Dr. Ananya Nair',
      visitNotes: 'Protocol baseline visit completed.',
      medicines: [
        {
          id: `med_${patient.id}_1`,
          medicineName: 'Ashwagandha Herbal Capsule',
          dose: '500 mg',
          frequency: 'Once daily',
          route: 'Oral',
          startDate: patient.registrationDate || new Date().toISOString().slice(0, 10),
          batchNumber: 'ASH2026B01',
          formulation: 'Ashwagandha Herbal Capsule',
        },
      ],
      problems: [],
      observations: [],
      adverseEvents: [],
      labResults: [],
      treatmentResponse: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: `vis_${patient.id}_2`,
      patientId: patient.id,
      trialId: patient.trialId,
      visitNumber: 'Visit 2',
      visitDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
      visitType: 'Follow-up',
      status: 'Completed',
      doctorInvestigator: patient.registeredBy || 'Dr. Ananya Nair',
      visitNotes: 'First follow-up visit.',
      medicines: [
        {
          id: `med_${patient.id}_2`,
          medicineName: 'Ashwagandha Herbal Capsule',
          dose: '500 mg',
          frequency: 'Once daily',
          route: 'Oral',
          startDate: patient.registrationDate || new Date().toISOString().slice(0, 10),
          batchNumber: 'ASH2026B01',
          formulation: 'Ashwagandha Herbal Capsule',
        },
      ],
      problems: [],
      observations: [],
      adverseEvents: [],
      labResults: [],
      treatmentResponse: 'Improvement',
      createdAt: new Date().toISOString(),
    },
    {
      id: `vis_${patient.id}_3`,
      patientId: patient.id,
      trialId: patient.trialId,
      visitNumber: 'Visit 3',
      visitDate: new Date().toISOString().slice(0, 10),
      visitType: 'Follow-up',
      status: 'Scheduled',
      doctorInvestigator: patient.registeredBy || 'Dr. Ananya Nair',
      visitNotes: 'Second follow-up visit.',
      medicines: [
        {
          id: `med_${patient.id}_3`,
          medicineName: 'Ashwagandha Herbal Capsule',
          dose: '500 mg',
          frequency: 'Once daily',
          route: 'Oral',
          startDate: patient.registrationDate || new Date().toISOString().slice(0, 10),
          batchNumber: 'ASH2026B01',
          formulation: 'Ashwagandha Herbal Capsule',
        },
      ],
      problems: [],
      observations: [],
      adverseEvents: [],
      labResults: [],
      treatmentResponse: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: `vis_${patient.id}_4`,
      patientId: patient.id,
      trialId: patient.trialId,
      visitNumber: 'Visit 4',
      visitDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      visitType: 'Follow-up',
      status: 'Scheduled',
      doctorInvestigator: patient.registeredBy || 'Dr. Ananya Nair',
      visitNotes: 'Third follow-up visit.',
      medicines: [],
      problems: [],
      observations: [],
      adverseEvents: [],
      labResults: [],
      treatmentResponse: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: `vis_${patient.id}_5`,
      patientId: patient.id,
      trialId: patient.trialId,
      visitNumber: 'Visit 5',
      visitDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      visitType: 'Follow-up',
      status: 'Scheduled',
      doctorInvestigator: patient.registeredBy || 'Dr. Ananya Nair',
      visitNotes: 'Study evaluation visit.',
      medicines: [],
      problems: [],
      observations: [],
      adverseEvents: [],
      labResults: [],
      treatmentResponse: '',
      createdAt: new Date().toISOString(),
    },
  ];
  return defaultVisits;
};

const syncPatientStatus = (patient: Patient): Patient => {
  patient.status = buildPatientStatus(patient);
  if (!patient.visits || patient.visits.length === 0) {
    patient.visits = ensurePatientVisits(patient);
  }
  patient.updatedAt = new Date().toISOString();
  return patient;
};

const samplePatients: Patient[] = [
  {
    id: 'patient_p001',
    trialId: 'CT-001',
    patientCode: 'P001',
    fullName: 'Patient A',
    dateOfBirth: '1980-05-12',
    age: 45,
    gender: 'F',
    contactNumber: '+91 98765 43210',
    address: 'Chennai',
    emergencyContact: 'Ravi A',
    bloodGroup: 'O+',
    registrationDate: '2026-10-01',
    centre: 'AIIA Research Centre',
    registeredBy: 'Dr. Ananya Nair',
    remarks: 'First visit scheduled after enrollment',
    consent: {
      id: 'consent_patient_p001',
      patientId: 'patient_p001',
      trialId: 'CT-001',
      status: 'Obtained',
      consentDate: '2026-10-02',
      consentTime: '10:15',
      consentVersion: 'V1',
      obtainedBy: 'Dr. Ananya Nair',
      witnessName: 'N. Karthik',
      remarks: 'Consent obtained after protocol briefing',
      createdAt: '2026-10-02T10:15:00.000Z',
      updatedAt: '2026-10-02T10:15:00.000Z',
      createdBy: 'Demo User',
      updatedBy: 'Demo User',
    },
    screening: {
      id: 'screen_patient_p001',
      patientId: 'patient_p001',
      trialId: 'CT-001',
      screeningDate: '2026-10-03',
      inclusionCriteria: 'Age 40-60, diagnosed with Madhumeha',
      exclusionCriteria: 'No prior severe renal complications',
      eligibilityStatus: 'Eligible',
      screeningRemarks: 'Meets all inclusion criteria',
      screenedBy: 'Dr. Nisha Rao',
      createdAt: '2026-10-03T09:00:00.000Z',
      updatedAt: '2026-10-03T09:00:00.000Z',
    },
    enrollment: {
      id: 'enroll_patient_p001',
      patientId: 'patient_p001',
      trialId: 'CT-001',
      enrollmentNumber: 'MCT-001',
      enrollmentDate: '2026-10-04',
      centre: 'AIIA Research Centre',
      treatmentGroup: 'Intervention Group A',
      randomizationNumber: 'R-1001',
      enrolledBy: 'Dr. Ananya Nair',
      enrollmentStatus: 'Active',
      createdAt: '2026-10-04T09:00:00.000Z',
      updatedAt: '2026-10-04T09:00:00.000Z',
    },
    visits: [
      {
        id: 'vis_p001_1',
        patientId: 'patient_p001',
        trialId: 'CT-001',
        visitNumber: 'Visit 1',
        visitDate: '2026-10-05',
        visitType: 'Baseline',
        status: 'Completed',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Protocol baseline visit completed. Consent confirmed, baseline labs recorded, and trial medication initiated.',
        medicines: [
          {
            id: 'med_p001_1',
            medicineName: 'Ashwagandha Herbal Capsule',
            dose: '500 mg',
            frequency: 'Once daily',
            route: 'Oral',
            startDate: '2026-10-05',
            endDate: '2026-10-19',
            batchNumber: 'ASH2026B01',
            formulation: 'Ashwagandha Herbal Capsule',
            purpose: 'Trial Intervention',
          },
        ],
        problems: [],
        observations: [
          {
            id: 'obs_p001_1',
            bloodPressure: '120/80 mmHg',
            pulse: '72 bpm',
            temperature: '98.4 F',
            ayurvedicObservations: 'Pitta-Kapha dominant',
            otherObservations: 'Stable, all baseline parameters within acceptable range',
          },
        ],
        adverseEvents: [],
        labResults: [
          {
            id: 'lab_p001_1',
            testName: 'Fasting Blood Sugar',
            testDate: '2026-10-05',
            result: '138 mg/dL',
            referenceRange: '70-100 mg/dL',
            interpretation: 'Abnormal',
            remarks: 'Consistent with protocol inclusion criteria',
          },
        ],
        treatmentResponse: 'No Change',
        treatmentResponseNotes: 'Treatment initiated at baseline.',
        nextVisitDate: '2026-10-12',
        followUpInstructions: 'Take 1 capsule daily after breakfast with warm water.',
        createdAt: '2026-10-05T10:00:00.000Z',
      },
      {
        id: 'vis_p001_2',
        patientId: 'patient_p001',
        trialId: 'CT-001',
        visitNumber: 'Visit 2',
        visitDate: '2026-10-12',
        visitType: 'Follow-up',
        status: 'Completed',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Follow-up visit 2. Participant reports mild epigastric discomfort and nausea following morning dose.',
        medicines: [
          {
            id: 'med_p001_2',
            medicineName: 'Ashwagandha Herbal Capsule',
            dose: '500 mg',
            frequency: 'Once daily',
            route: 'Oral',
            startDate: '2026-10-05',
            endDate: '2026-10-26',
            batchNumber: 'ASH2026B01',
            formulation: 'Ashwagandha Herbal Capsule',
            purpose: 'Trial Intervention',
          },
        ],
        problems: [
          {
            id: 'prob_p001_1',
            problem: 'Epigastric distress and nausea',
            onsetDate: '2026-10-10',
            currentStatus: 'Active',
          },
        ],
        observations: [
          {
            id: 'obs_p001_2',
            bloodPressure: '122/82 mmHg',
            pulse: '76 bpm',
            otherObservations: 'Epigastric tenderness on palpation, no acute abdomen',
          },
        ],
        adverseEvents: [
          {
            id: 'ae_p001_1',
            sideEffect: 'Epigastric distress and nausea',
            severity: 'Moderate',
            date: '2026-10-10 14:00',
            actionTaken: 'Dose temporarily paused, antacid given',
            treatmentGiven: 'Oral carminative Ayurvedic kwatha',
            outcome: 'Recovering',
            suspectedMedicine: 'Ashwagandha Herbal Capsule',
          },
        ],
        labResults: [],
        treatmentResponse: 'Improvement',
        treatmentResponseNotes: 'Primary symptoms stable, gastric symptoms being actively managed.',
        nextVisitDate: '2026-10-19',
        createdAt: '2026-10-12T11:00:00.000Z',
      },
      {
        id: 'vis_p001_3',
        patientId: 'patient_p001',
        trialId: 'CT-001',
        visitNumber: 'Visit 3',
        visitDate: '2026-10-19',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Scheduled follow-up visit 3.',
        medicines: [
          {
            id: 'med_p001_3',
            medicineName: 'Ashwagandha Herbal Capsule',
            dose: '500 mg',
            frequency: 'Once daily',
            route: 'Oral',
            startDate: '2026-10-05',
            endDate: '2026-11-02',
            batchNumber: 'ASH2026B01',
            formulation: 'Ashwagandha Herbal Capsule',
          },
        ],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        treatmentResponse: 'Improvement',
        nextVisitDate: '2026-10-26',
        createdAt: '2026-10-19T09:30:00.000Z',
      },
      {
        id: 'vis_p001_4',
        patientId: 'patient_p001',
        trialId: 'CT-001',
        visitNumber: 'Visit 4',
        visitDate: '2026-10-26',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Scheduled follow-up visit 4.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        treatmentResponse: '',
        nextVisitDate: '2026-11-02',
        createdAt: '2026-10-19T09:30:00.000Z',
      },
      {
        id: 'vis_p001_5',
        patientId: 'patient_p001',
        trialId: 'CT-001',
        visitNumber: 'Visit 5',
        visitDate: '2026-11-02',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Scheduled follow-up visit 5.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        treatmentResponse: '',
        nextVisitDate: '2026-11-09',
        createdAt: '2026-10-19T09:30:00.000Z',
      },
    ],
    status: 'Active Treatment',
    createdAt: '2026-10-01T15:00:00.000Z',
    updatedAt: '2026-10-04T09:00:00.000Z',
    createdBy: 'Demo User',
    updatedBy: 'Demo User',
  },
  {
    id: 'patient_p002',
    trialId: 'CT-001',
    patientCode: 'P002',
    fullName: 'Patient B',
    dateOfBirth: '1974-04-22',
    age: 52,
    gender: 'M',
    contactNumber: '+91 99777 11223',
    address: 'Bengaluru',
    emergencyContact: 'Suma B',
    bloodGroup: 'A+',
    registrationDate: '2026-10-02',
    centre: 'AIIA Research Centre',
    registeredBy: 'Dr. Ananya Nair',
    remarks: 'Awaiting consent',
    consent: makeConsent('patient_p002', 'CT-001'),
    screening: undefined,
    enrollment: undefined,
    visits: [
      {
        id: 'vis_p002_1',
        patientId: 'patient_p002',
        trialId: 'CT-001',
        visitNumber: 'Visit 1',
        visitDate: '2026-10-06',
        visitType: 'Baseline',
        status: 'Completed',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Baseline screening visit.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: '2026-10-06T10:00:00.000Z',
      },
      {
        id: 'vis_p002_2',
        patientId: 'patient_p002',
        trialId: 'CT-001',
        visitNumber: 'Visit 2',
        visitDate: '2026-10-13',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Follow-up visit 2.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: '2026-10-06T10:00:00.000Z',
      },
      {
        id: 'vis_p002_3',
        patientId: 'patient_p002',
        trialId: 'CT-001',
        visitNumber: 'Visit 3',
        visitDate: '2026-10-20',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Follow-up visit 3.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: '2026-10-06T10:00:00.000Z',
      },
    ],
    status: 'Consent Pending',
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    createdBy: 'Demo User',
    updatedBy: 'Demo User',
  },
  {
    id: 'patient_p003',
    trialId: 'CT-001',
    patientCode: 'P003',
    fullName: 'Patient C',
    dateOfBirth: '1978-11-11',
    age: 48,
    gender: 'F',
    contactNumber: '+91 91112 22334',
    address: 'Hyderabad',
    emergencyContact: 'Ramesh C',
    bloodGroup: 'B-',
    registrationDate: '2026-10-03',
    centre: 'AIIA Research Centre',
    registeredBy: 'Dr. Ananya Nair',
    remarks: 'Consent refused',
    consent: {
      id: 'consent_patient_p003',
      patientId: 'patient_p003',
      trialId: 'CT-001',
      status: 'Refused',
      consentVersion: 'V1',
      createdAt: '2026-10-03T10:30:00.000Z',
      updatedAt: '2026-10-03T10:30:00.000Z',
      createdBy: 'Demo User',
      updatedBy: 'Demo User',
    },
    screening: undefined,
    enrollment: undefined,
    visits: [
      {
        id: 'vis_p003_1',
        patientId: 'patient_p003',
        trialId: 'CT-001',
        visitNumber: 'Visit 1',
        visitDate: '2026-10-08',
        visitType: 'Baseline',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Initial protocol visit.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: '2026-10-08T10:00:00.000Z',
      },
      {
        id: 'vis_p003_2',
        patientId: 'patient_p003',
        trialId: 'CT-001',
        visitNumber: 'Visit 2',
        visitDate: '2026-10-15',
        visitType: 'Follow-up',
        status: 'Scheduled',
        doctorInvestigator: 'Dr. Ananya Nair',
        visitNotes: 'Follow-up visit 2.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: '2026-10-08T10:00:00.000Z',
      },
    ],
    status: 'Consent Pending',
    createdAt: '2026-10-03T10:30:00.000Z',
    updatedAt: '2026-10-03T10:30:00.000Z',
    createdBy: 'Demo User',
    updatedBy: 'Demo User',
  },
];

let memoryPatients: Patient[] = samplePatients;

export const getCachedPatients = (): Patient[] => {
  if (typeof window === 'undefined') {
    return memoryPatients.map((patient) => syncPatientStatus(patient));
  }

  try {
    const raw = localStorage.getItem(STORAGE_PATIENTS_KEY);
    if (!raw) {
      const initialized = samplePatients.map((patient) => syncPatientStatus(patient));
      localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(initialized));
      return initialized;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initialized = samplePatients.map((patient) => syncPatientStatus(patient));
      localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(initialized));
      return initialized;
    }
    const synced = parsed.map((patient: Patient) => syncPatientStatus(patient));
    const hadMissingVisits = parsed.some((p: Patient) => !p.visits || p.visits.length === 0);
    if (hadMissingVisits) {
      try {
        localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(synced));
      } catch (err) {
        console.warn('Could not re-sync visits in storage', err);
      }
    }
    return synced;
  } catch (err) {
    console.warn('Patient cache read error, using memory fallback', err);
    return memoryPatients.map((patient) => syncPatientStatus(patient));
  }
};

const saveCachedPatients = (patients: Patient[]) => {
  memoryPatients = patients;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(patients.map((patient) => syncPatientStatus(patient))));
    } catch (err) {
      console.warn('Failed to save patients to localStorage', err);
      throw new Error('Unable to save patient data in this browser. Check available storage and try again.');
    }
  }
};

export const getPatientsForTrial = (trialId: string): Patient[] => {
  return getCachedPatients().filter((patient) => patient.trialId === trialId);
};

export const getPatientForTrial = (trialId: string, patientId: string): Patient | undefined => {
  return getCachedPatients().find((patient) => patient.trialId === trialId && patient.id === patientId);
};

export const getVisitsForPatient = (trialId: string, patientId: string): PatientVisit[] => {
  return getPatientForTrial(trialId, patientId)?.visits || [];
};

export const saveVisitForPatient = (trialId: string, patientId: string, visit: PatientVisit): Patient => {
  const patient = getPatientForTrial(trialId, patientId);
  if (!patient) {
    throw new Error('Patient was not found in the selected clinical trial.');
  }
  if (visit.trialId !== trialId || visit.patientId !== patientId) {
    throw new Error('Visit does not belong to the selected patient and clinical trial.');
  }

  const existingVisits = patient.visits || [];
  const visitExists = existingVisits.some((item) => item.id === visit.id);
  const savedVisit: PatientVisit = {
    ...visit,
    createdAt: visit.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const visits = visitExists
    ? existingVisits.map((item) => (item.id === visit.id ? savedVisit : item))
    : [...existingVisits, savedVisit];

  return updatePatientInCache(patientId, { visits });
};

export const getTrialPatientSummary = (trialId: string): TrialPatientSummary => {
  const patients = getPatientsForTrial(trialId);

  const consentPending = patients.filter((patient) => (patient.consent?.status || 'Not Obtained') === 'Not Obtained').length;
  const consentObtained = patients.filter((patient) => patient.consent?.status === 'Obtained').length;
  const consentNotObtained = patients.filter(
    (patient) => ['Not Obtained', 'Refused', 'Withdrawn'].includes(patient.consent?.status || 'Not Obtained')
  ).length;
  const screenedPatients = patients.filter((patient) => !!patient.screening).length;
  const eligiblePatients = patients.filter((patient) => patient.screening?.eligibilityStatus === 'Eligible').length;
  const enrolledPatients = patients.filter((patient) => !!patient.enrollment).length;
  const activePatients = patients.filter((patient) => patient.enrollment?.enrollmentStatus === 'Active').length;
  const withdrawnPatients = patients.filter((patient) => patient.enrollment?.enrollmentStatus === 'Withdrawn').length;
  const completedPatients = patients.filter((patient) => patient.enrollment?.enrollmentStatus === 'Completed').length;

  return {
    totalPatients: patients.length,
    registeredPatients: patients.length,
    consentPending,
    consentObtained,
    consentNotObtained,
    screenedPatients,
    eligiblePatients,
    enrolledPatients,
    activePatients,
    withdrawnPatients,
    completedPatients,
  };
};

export const addPatientToTrial = (
  trialId: string,
  data: Partial<Patient> & Pick<Patient, 'patientCode' | 'fullName' | 'registrationDate' | 'centre' | 'registeredBy'>
): Patient => {
  const patients = getCachedPatients();
  const duplicate = patients.find(
    (patient) => patient.trialId === trialId && patient.patientCode.trim().toLowerCase() === data.patientCode.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error(`Patient ${data.patientCode} already exists for this trial.`);
  }

  const createdAt = new Date().toISOString();
  const patientId = `patient_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const consent = makeConsent(patientId, trialId, data.registeredBy || 'Demo User');

  const patient: Patient = {
    id: patientId,
    trialId,
    patientCode: data.patientCode.trim(),
    fullName: data.fullName.trim(),
    dateOfBirth: data.dateOfBirth,
    age: data.age,
    gender: data.gender,
    contactNumber: data.contactNumber,
    address: data.address,
    emergencyContact: data.emergencyContact,
    bloodGroup: data.bloodGroup,
    registrationDate: data.registrationDate,
    centre: data.centre,
    registeredBy: data.registeredBy,
    remarks: data.remarks,
    consent,
    screening: undefined,
    enrollment: undefined,
    visits: [],
    status: 'Registered',
    createdAt,
    updatedAt: createdAt,
    createdBy: data.registeredBy || 'Demo User',
    updatedBy: data.registeredBy || 'Demo User',
  };

  const updated = [syncPatientStatus(patient), ...patients];
  saveCachedPatients(updated);
  return updated[0];
};

export const updatePatientInCache = (
  patientId: string,
  patch: Partial<Patient>,
  actor?: User | null
): Patient => {
  const patients = getCachedPatients();
  const index = patients.findIndex((patient) => patient.id === patientId);

  if (index === -1) {
    throw new Error('Patient not found.');
  }

  const current = patients[index];
  if (patch.enrollment && !current.enrollment) {
    const enrollment = patch.enrollment;
    if (!hasPermission(actor, 'approve_enrollment')) {
      throw new Error('Permission denied. An authorized enrollment approver must enroll this participant.');
    }
    const trial = getCachedProposals().find((proposal) => proposal.trialId === current.trialId);
    if (!trial) {
      throw new Error('Enrollment is blocked because the clinical trial record is missing.');
    }
    if (enrollment.enrollmentStatus !== 'Active') {
      throw new Error('A participant must first be enrolled as Active; withdrawal or completion must follow actual enrollment.');
    }
    if (current.consent?.status !== 'Obtained' || current.screening?.eligibilityStatus !== 'Eligible') {
      throw new Error('Enrollment requires obtained informed consent and confirmed eligibility.');
    }
    if (trial.proposalStatus !== 'Active') {
      throw new Error('Enrollment is blocked until the trial is activated.');
    }

    const activationIssues = getTrialActivationIssues(trial);
    if (activationIssues.length > 0) {
      throw new Error(`Enrollment is blocked:\n${activationIssues.map((issue) => `• ${issue}`).join('\n')}`);
    }

    const rules = trial.regulatory?.validationRules;
    const registrationDate = trial.regulatory?.ctri.registrationDate;
    if (
      rules?.requireProspectiveCTRIRegistration &&
      (!registrationDate || !enrollment.enrollmentDate || registrationDate >= enrollment.enrollmentDate)
    ) {
      throw new Error('First participant enrollment must occur after prospective CTRI registration is complete.');
    }
  } else if (patch.enrollment && current.enrollment) {
    if (!hasPermission(actor, 'approve_enrollment')) {
      throw new Error('Permission denied. An authorized enrollment approver must update enrollment status.');
    }
    if (
      current.enrollment.enrollmentStatus !== patch.enrollment.enrollmentStatus &&
      patch.enrollment.enrollmentStatus === 'Completed'
    ) {
      const completedTreatmentVisit = (current.visits || []).some(
        (visit) => visit.status === 'Completed' &&
          (visit.medicines || []).some((medicine) =>
            Boolean(medicine.startDate && medicine.endDate && medicine.startDate <= medicine.endDate)
          )
      );
      if (!completedTreatmentVisit) {
        throw new Error('Treatment cannot be marked complete without a completed visit and recorded treatment start/end dates.');
      }
    }
  }

  const next = syncPatientStatus({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  patients[index] = next;
  saveCachedPatients([...patients]);
  return next;
};

export const removePatientFromTrial = (patientId: string): void => {
  const patients = getCachedPatients().filter((patient) => patient.id !== patientId);
  saveCachedPatients(patients);
};

export const normalizePatientStatus = (patient: Patient): Patient => syncPatientStatus(patient);
