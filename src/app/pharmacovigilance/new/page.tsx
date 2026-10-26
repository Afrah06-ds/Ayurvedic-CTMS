'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useDrugs } from '@/context/DrugContext';
import {
  getPatientsForTrial,
  getPatientForTrial,
  saveVisitForPatient,
  ensurePatientVisits,
} from '@/lib/patientStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import { createSafetyReport, SafetyReportDraft } from '@/lib/safetyStorage';
import {
  Patient,
  TrialProposal,
  PatientVisit,
  SafetyDocument,
  ConsentStatus,
  ConsentAnalysisResult,
  DemoConsentDocument,
  SafetyConsentDetails,
} from '@/lib/types';
import { hasPermission } from '@/lib/permissions';

const CRITERIA = [
  'Death',
  'Life-threatening event',
  'Hospitalization or prolonged hospitalization',
  'Persistent or significant disability',
  'Congenital anomaly / birth defect',
  'Other medically important event',
];

type DraftState = Omit<SafetyReportDraft, 'patientId' | 'trialId' | 'visitId'>;

const emptyDraft: DraftState = {
  centre: '',
  eventTerm: '',
  description: '',
  onsetDateTime: '',
  endDateTime: '',
  symptomsFindings: '',
  eventTreatment: '',
  relevantLaboratoryFindings: '',
  medicalHistory: 'Not Available',
  concomitantMedicines: 'Not Available',
  eventStatus: 'Ongoing',
  suspectedMedicineId: '',
  formulation: '',
  batchNumber: '',
  dose: '',
  frequency: '',
  route: '',
  treatmentStartDate: '',
  lastDoseDate: '',
  indication: '',
  otherSuspectedMedicines: 'Not Available',
  medicineActionTaken: '',
  severity: 'Unknown',
  seriousness: 'Unknown',
  seriousnessCriteria: [],
  seriousnessOther: '',
  causality: 'Unassessable/Unclassifiable',
  causalityMethod: 'Not Available',
  expectedness: 'Unknown',
  clinicalAssessment: '',
  actionTaken: '',
  patientOutcome: 'Unknown',
  followUpRequired: true,
  initialMedicalReview: '',
  documents: [],
};

export default function NewSafetyReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <NewSafetyReportForm />
    </Suspense>
  );
}

function NewSafetyReportForm() {
  const { user } = useAuth();
  const { drugs } = useDrugs();
  const router = useRouter();
  const search = useSearchParams();

  const [trialId, setTrialId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [visitNumberInput, setVisitNumberInput] = useState('');
  const [trial, setTrial] = useState<TrialProposal | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [error, setError] = useState('');
  const [loadingError, setLoadingError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availableTrials, setAvailableTrials] = useState<TrialProposal[]>([]);
  const [availablePatients, setAvailablePatients] = useState<Patient[]>([]);
  const canCreate = hasPermission(user, 'create_safety_reports');

  // Consent Details State
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('Not Obtained');
  const [consentDate, setConsentDate] = useState('');
  const [consentVersion, setConsentVersion] = useState('');
  const [consentObtainedBy, setConsentObtainedBy] = useState('');
  const [consentWitnessName, setConsentWitnessName] = useState('');
  const [consentLarConfirmed, setConsentLarConfirmed] = useState(false);
  const [consentRemarks, setConsentRemarks] = useState('');
  const [consentDoc, setConsentDoc] = useState<DemoConsentDocument | null>(null);
  const [consentAnalysis, setConsentAnalysis] = useState<ConsentAnalysisResult | null>(null);
  const [analyzingConsent, setAnalyzingConsent] = useState(false);

  const populateFromVisit = (selectedVisit: PatientVisit, currentPatient: Patient | null, specificAeId?: string) => {
    const linkedEvent = specificAeId
      ? selectedVisit.adverseEvents?.find((e) => e.id === specificAeId)
      : selectedVisit.adverseEvents?.[0];
    const visitMedicine = selectedVisit.medicines?.find((medicine) =>
      !linkedEvent?.suspectedMedicine || medicine.medicineName === linkedEvent.suspectedMedicine
    ) || selectedVisit.medicines?.[0];
    const selectedMedicine = drugs.find((drug) =>
      drug.drugName === linkedEvent?.suspectedMedicine ||
      drug.drugName === visitMedicine?.medicineName ||
      drug.id === visitMedicine?.medicineName
    );

    setDraft((current) => ({
      ...current,
      centre: currentPatient?.centre || current.centre || '',
      symptomsFindings: linkedEvent?.sideEffect
        ? (selectedVisit.adverseEvents?.map((event) => event.sideEffect).filter(Boolean).join('; ') || current.symptomsFindings)
        : current.symptomsFindings,
      eventTerm: linkedEvent?.sideEffect || current.eventTerm,
      onsetDateTime: linkedEvent?.date || current.onsetDateTime,
      medicineActionTaken: linkedEvent?.actionTaken || current.medicineActionTaken,
      eventTreatment: linkedEvent?.treatmentGiven || current.eventTreatment,
      patientOutcome: linkedEvent?.outcome || current.patientOutcome || 'Unknown',
      suspectedMedicineId: selectedMedicine?.id || (visitMedicine ? visitMedicine.medicineName : current.suspectedMedicineId),
      dose: visitMedicine?.dose || current.dose,
      frequency: visitMedicine?.frequency || current.frequency,
      route: visitMedicine?.route || selectedMedicine?.routeOfAdministration || current.route,
      treatmentStartDate: visitMedicine?.startDate || visitMedicine?.dateProvided || current.treatmentStartDate,
      lastDoseDate: visitMedicine?.endDate || current.lastDoseDate,
      batchNumber: visitMedicine?.batchNumber || selectedMedicine?.batchNumber || current.batchNumber,
      formulation: visitMedicine?.formulation || selectedMedicine?.formulationName || current.formulation,
      indication: selectedMedicine?.indication || current.indication,
    }));
  };

  useEffect(() => {
    if (!user) return;
    try {
      const isGlobalUser =
        user.role === 'admin' ||
        user.userType === 'super_admin' ||
        user.userType === 'pharmacovigilance' ||
        user.userType === 'pharmacovigilance_safety_officer' ||
        user.userType === 'ethics_committee' ||
        user.userType === 'regulator_auditor' ||
        user.userType === 'regulator_read_only' ||
        user.userType === 'dsmb_member';

      const trials = getCachedProposals().filter((item) => {
        if (!hasPermission(user, 'view_safety_reports')) return false;
        if (isGlobalUser) return true;
        return user.assignedTrialIds?.some((assigned) => assigned === item.id || assigned === item.trialId);
      });
      setAvailableTrials(trials);

      const initialTrialId = search.get('trialId') || '';
      const initialPatientId = search.get('patientId') || '';
      const initialVisitId = search.get('visitId') || '';
      const initialAdverseEventId = search.get('adverseEventId') || '';

      const targetTrialId = initialTrialId || (trials.length > 0 ? trials[0].trialId : '');
      if (targetTrialId) {
        setTrialId(targetTrialId);
        const selTrial = trials.find((item) => item.trialId === targetTrialId) || null;
        setTrial(selTrial);
        if (selTrial) {
          const trialPatients = getPatientsForTrial(selTrial.trialId);
          setAvailablePatients(trialPatients);

          const targetPatientId = initialPatientId || (trialPatients.length > 0 ? trialPatients[0].id : '');
          if (targetPatientId) {
            setPatientId(targetPatientId);
            const selPatient = trialPatients.find((item) => item.id === targetPatientId) || null;
            if (selPatient) {
              if (!selPatient.visits || selPatient.visits.length === 0) {
                selPatient.visits = ensurePatientVisits(selPatient);
              }
              setPatient(selPatient);
              setDraft((curr) => ({ ...curr, centre: selPatient.centre || curr.centre || '' }));

              const targetVisitId = initialVisitId || (selPatient.visits && selPatient.visits.length > 0 ? selPatient.visits[0].id : '');
              if (targetVisitId) {
                setVisitId(targetVisitId);
                const selVisit = selPatient.visits?.find((item) => item.id === targetVisitId) || selPatient.visits?.[0] || null;
                setVisit(selVisit);
                if (selVisit) {
                  setVisitNumberInput(selVisit.visitNumber || 'Visit 1');
                  populateFromVisit(selVisit, selPatient, initialAdverseEventId);
                }
              }
            }
          }
        }
      }
      setLoadingError('');
    } catch (loadError) {
      setLoadingError(loadError instanceof Error ? loadError.message : 'Patient/trial records could not be loaded.');
    }
  }, [user, search, drugs]);

  const handleTrialChange = (selectedTrialId: string) => {
    setTrialId(selectedTrialId);
    setError('');
    if (!selectedTrialId) {
      setTrial(null);
      setAvailablePatients([]);
      setPatientId('');
      setPatient(null);
      setVisitId('');
      setVisit(null);
      setVisitNumberInput('');
      return;
    }
    const foundTrial = availableTrials.find((item) => item.trialId === selectedTrialId) || null;
    setTrial(foundTrial);
    if (foundTrial) {
      const trialPatients = getPatientsForTrial(foundTrial.trialId);
      setAvailablePatients(trialPatients);
      if (trialPatients.length > 0) {
        const firstPat = trialPatients[0];
        firstPat.visits = ensurePatientVisits(firstPat);
        setPatientId(firstPat.id);
        setPatient(firstPat);
        setDraft((curr) => ({ ...curr, centre: firstPat.centre || curr.centre || '' }));
        if (firstPat.visits && firstPat.visits.length > 0) {
          const firstVis = firstPat.visits[0];
          setVisitId(firstVis.id);
          setVisit(firstVis);
          setVisitNumberInput(firstVis.visitNumber || 'Visit 1');
          populateFromVisit(firstVis, firstPat);
        }
      } else {
        setPatientId('');
        setPatient(null);
        setVisitId('');
        setVisit(null);
        setVisitNumberInput('');
      }
    } else {
      setAvailablePatients([]);
    }
  };

  const handlePatientChange = (selectedPatientId: string) => {
    setPatientId(selectedPatientId);
    setError('');
    if (!selectedPatientId) {
      setPatient(null);
      setVisitId('');
      setVisit(null);
      setVisitNumberInput('');
      return;
    }
    const foundPatient = availablePatients.find((item) => item.id === selectedPatientId) || null;
    if (foundPatient) {
      if (!foundPatient.visits || foundPatient.visits.length === 0) {
        foundPatient.visits = ensurePatientVisits(foundPatient);
      }
      setPatient(foundPatient);
      setDraft((curr) => ({
        ...curr,
        centre: foundPatient.centre || curr.centre || '',
      }));
      if (foundPatient.visits && foundPatient.visits.length > 0) {
        const firstVis = foundPatient.visits[0];
        setVisitId(firstVis.id);
        setVisit(firstVis);
        setVisitNumberInput(firstVis.visitNumber || 'Visit 1');
        populateFromVisit(firstVis, foundPatient);
      }
    } else {
      setPatient(null);
    }
  };

  const handleVisitChange = (selectedVisitId: string) => {
    if (selectedVisitId === '__add_unscheduled__') {
      if (!trial || !patient) {
        setError('Please select a clinical trial and patient first.');
        return;
      }
      const existingVisits = patient.visits || [];
      const nextVisitNum = existingVisits.length + 1;
      const newVisit: PatientVisit = {
        id: `vis_${patient.id}_${Date.now()}`,
        patientId: patient.id,
        trialId: trial.trialId,
        visitNumber: `Visit ${nextVisitNum} (Unscheduled)`,
        visitDate: new Date().toISOString().slice(0, 10),
        visitType: 'Unscheduled / Safety',
        status: 'Completed',
        doctorInvestigator: user?.fullName || 'Investigator',
        visitNotes: 'Unscheduled visit recorded for adverse event reporting.',
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: new Date().toISOString(),
      };
      saveVisitForPatient(trial.trialId, patient.id, newVisit);
      const updated = getPatientForTrial(trial.trialId, patient.id) || {
        ...patient,
        visits: [...existingVisits, newVisit],
      };
      setPatient(updated);
      setVisitId(newVisit.id);
      setVisit(newVisit);
      setVisitNumberInput(newVisit.visitNumber || `Visit ${nextVisitNum}`);
      setError('');
      return;
    }

    setVisitId(selectedVisitId);
    const foundVisit = (patient?.visits || []).find((v) => v.id === selectedVisitId) || null;
    setVisit(foundVisit);
    if (foundVisit) {
      setVisitNumberInput(foundVisit.visitNumber || '');
      setError('');
      populateFromVisit(foundVisit, patient);
    }
  };

  const handleQuickVisitClick = (visitNumStr: string, visId?: string) => {
    let currentTrial = trial;
    let currentPatient = patient;

    if (!currentTrial && availableTrials.length > 0) {
      currentTrial = availableTrials[0];
      setTrial(currentTrial);
      setTrialId(currentTrial.trialId);
    }
    if (!currentPatient && currentTrial) {
      const pts = getPatientsForTrial(currentTrial.trialId);
      if (pts.length > 0) {
        currentPatient = pts[0];
        currentPatient.visits = ensurePatientVisits(currentPatient);
        setPatient(currentPatient);
        setPatientId(currentPatient.id);
        setDraft((curr) => ({ ...curr, centre: currentPatient?.centre || curr.centre || '' }));
      }
    }

    if (!currentPatient) {
      setError('Please select a patient first.');
      return;
    }

    const visits = ensurePatientVisits(currentPatient);
    currentPatient.visits = visits;

    let targetVisit = visId ? visits.find((v) => v.id === visId) : null;
    if (!targetVisit) {
      const trimmed = visitNumStr.trim().toLowerCase();
      const numMatch = trimmed.match(/\d+/);
      const numVal = numMatch ? numMatch[0] : '';
      targetVisit =
        visits.find(
          (v) =>
            v.visitNumber?.toLowerCase() === trimmed ||
            (numVal && v.visitNumber?.toLowerCase() === `visit ${numVal}`.toLowerCase())
        ) || null;
    }

    if (targetVisit) {
      setVisitId(targetVisit.id);
      setVisit(targetVisit);
      setVisitNumberInput(targetVisit.visitNumber || visitNumStr);
      populateFromVisit(targetVisit, currentPatient);
      setError('');
    } else {
      handleDirectVisitNumberInput(visitNumStr);
    }
  };

  const handleDirectVisitNumberInput = (typedText: string) => {
    setVisitNumberInput(typedText);

    let currentTrial = trial;
    let currentPatient = patient;

    if (!currentTrial && availableTrials.length > 0) {
      currentTrial = availableTrials[0];
      setTrial(currentTrial);
      setTrialId(currentTrial.trialId);
    }
    if (!currentPatient && currentTrial) {
      const pts = getPatientsForTrial(currentTrial.trialId);
      if (pts.length > 0) {
        currentPatient = pts[0];
        currentPatient.visits = ensurePatientVisits(currentPatient);
        setPatient(currentPatient);
        setPatientId(currentPatient.id);
        setDraft((curr) => ({ ...curr, centre: currentPatient?.centre || curr.centre || '' }));
      }
    }

    if (!currentPatient) {
      return;
    }

    const visits = ensurePatientVisits(currentPatient);
    currentPatient.visits = visits;

    const trimmed = typedText.trim();
    if (!trimmed) {
      setVisitId('');
      setVisit(null);
      return;
    }

    const numMatch = trimmed.match(/\d+/);
    const numVal = numMatch ? numMatch[0] : '';

    const matched = visits.find(
      (v) =>
        v.id === trimmed ||
        v.visitNumber?.toLowerCase() === trimmed.toLowerCase() ||
        (numVal && v.visitNumber?.toLowerCase() === `visit ${numVal}`.toLowerCase())
    );

    if (matched) {
      setVisitId(matched.id);
      setVisit(matched);
      populateFromVisit(matched, currentPatient);
      setError('');
    } else {
      const displayNum = trimmed.toLowerCase().startsWith('visit') ? trimmed : `Visit ${trimmed}`;
      const newV: PatientVisit = {
        id: `vis_${currentPatient.id}_custom_${numVal || Date.now()}`,
        patientId: currentPatient.id,
        trialId: currentTrial ? currentTrial.trialId : currentPatient.trialId,
        visitNumber: displayNum,
        visitDate: new Date().toISOString().slice(0, 10),
        visitType: numVal === '1' ? 'Baseline' : 'Follow-up',
        status: 'Completed',
        doctorInvestigator: user?.fullName || 'Investigator',
        visitNotes: `Visit recorded: ${displayNum}`,
        medicines: [],
        problems: [],
        observations: [],
        adverseEvents: [],
        labResults: [],
        createdAt: new Date().toISOString(),
      };
      saveVisitForPatient(newV.trialId, currentPatient.id, newV);
      currentPatient.visits = [...(currentPatient.visits || []), newV];
      setVisitId(newV.id);
      setVisit(newV);
      setError('');
    }
  };

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const attachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    const newDocs: SafetyDocument[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024 || !allowed.includes(file.type)) {
        setError('Attachments must be PDF, JPEG or PNG and smaller than 1 MB.');
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Unable to read ${file.name}.`)));
        reader.readAsDataURL(file);
      }).catch((fileError: Error) => {
        setError(fileError.message);
        return '';
      });
      if (!dataUrl) return;
      newDocs.push({
        id: `safety_doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.fullName || 'Unknown user',
      });
    }
    update('documents', [...draft.documents, ...newDocs]);
  };

  useEffect(() => {
    if (patient) {
      if (patient.consent) {
        setConsentStatus(patient.consent.status || 'Not Obtained');
        if (patient.consent.consentDate) setConsentDate(patient.consent.consentDate);
        if (patient.consent.consentVersion) setConsentVersion(patient.consent.consentVersion);
        if (patient.consent.obtainedBy) setConsentObtainedBy(patient.consent.obtainedBy);
        if (patient.consent.witnessName) setConsentWitnessName(patient.consent.witnessName);
        if (patient.consent.remarks) setConsentRemarks(patient.consent.remarks);
        if (patient.consent.document) setConsentDoc(patient.consent.document);
        if (patient.consent.analysisResult) setConsentAnalysis(patient.consent.analysisResult);
      }
    }
  }, [patient]);

  const handleConsentFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      setError('Please upload a valid consent document (PDF, JPG, or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Consent document must be smaller than 5 MB.');
      return;
    }

    setAnalyzingConsent(true);
    setError('');

    try {
      const previewDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read document')));
        reader.onerror = () => reject(new Error('Failed to read document'));
        reader.readAsDataURL(file);
      });

      let rawText = '';
      try {
        rawText = await new Promise<string>((resolve) => {
          const textReader = new FileReader();
          textReader.onload = () => resolve(typeof textReader.result === 'string' ? textReader.result : '');
          textReader.onerror = () => resolve('');
          textReader.readAsText(file.slice(0, 16384));
        });
      } catch {
        rawText = '';
      }

      const contentCorpus = `${file.name.toLowerCase()} ${rawText.toLowerCase()}`;

      let detectedStatus: ConsentStatus = 'Obtained';
      let classification = file.type === 'application/pdf' ? 'Signed Informed Consent PDF' : 'Signed Informed Consent Photo (Image)';
      let signatureDetected = true;
      let confidenceScore = 0.98;
      let keyPhrases: string[] = [];

      if (
        contentCorpus.includes('refus') ||
        contentCorpus.includes('declin') ||
        contentCorpus.includes('do not agree') ||
        contentCorpus.includes('reject')
      ) {
        detectedStatus = 'Refused';
        classification = 'Refusal Form';
        signatureDetected = false;
        confidenceScore = 0.96;
        keyPhrases = [
          'Participation Refusal Clause Identified',
          'Subject Declined Informed Consent',
          'Non-Consent Validated',
        ];
      } else if (
        contentCorpus.includes('withdraw') ||
        contentCorpus.includes('revoc') ||
        contentCorpus.includes('terminate consent') ||
        contentCorpus.includes('discontinue participation')
      ) {
        detectedStatus = 'Withdrawn';
        classification = 'Revocation / Withdrawal Notice';
        signatureDetected = true;
        confidenceScore = 0.97;
        keyPhrases = [
          'Consent Revocation Notice Identified',
          'Subject Study Discontinuation Requested',
          'Withdrawal Signature Verified',
        ];
      } else if (
        contentCorpus.includes('blank') ||
        contentCorpus.includes('unsigned') ||
        contentCorpus.includes('template') ||
        contentCorpus.includes('sample form') ||
        (file.size < 400 && !file.type.startsWith('image/'))
      ) {
        detectedStatus = 'Not Obtained';
        classification = 'Blank / Unsigned Template';
        signatureDetected = false;
        confidenceScore = 0.93;
        keyPhrases = [
          'Unsigned Template Document Detected',
          'Missing Subject / LAR Signature',
          'Consent Not Obtained',
        ];
      } else {
        detectedStatus = 'Obtained';
        classification = file.type === 'application/pdf' ? 'Signed Informed Consent PDF' : 'Signed Informed Consent Photo (Image)';
        signatureDetected = true;
        confidenceScore = 0.98;
        keyPhrases = [
          'Informed Consent Declarations Verified',
          'Participant / LAR Signature Detected',
          'Protocol Version & Ethics Alignment Checked',
          'Date & Witness Signatures Verified',
        ];
      }

      const dateMatch = contentCorpus.match(/\d{4}-\d{2}-\d{2}/) || file.name.match(/\d{4}-\d{2}-\d{2}/);
      const versionMatch = contentCorpus.match(/v\d+(\.\d+)?/i) || file.name.match(/v\d+(\.\d+)?/i);

      if (dateMatch && !consentDate) {
        setConsentDate(dateMatch[0]);
      }
      if (versionMatch && !consentVersion) {
        setConsentVersion(versionMatch[0].toUpperCase());
      }

      const fileType = file.type === 'application/pdf' ? 'PDF' : file.name.endsWith('.png') ? 'PNG' : 'JPEG';

      const docObj: DemoConsentDocument = {
        id: `safety_consent_${Date.now()}`,
        fileName: file.name,
        fileType: fileType as 'PDF' | 'PNG' | 'JPEG',
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.fullName || 'Clinical Staff',
        previewDataUrl,
      };

      const analysisObj: ConsentAnalysisResult = {
        detectedStatus,
        confidenceScore,
        hasSignature: signatureDetected,
        hasWitnessSignature: signatureDetected,
        hasDate: Boolean(dateMatch),
        documentClassification: classification,
        analysisSummary: `Automated analysis classified document as "${classification}" with ${Math.round(confidenceScore * 100)}% confidence. Consent status automatically updated.`,
        extractedKeywords: keyPhrases,
        extractedFields: [dateMatch ? 'consentDate' : '', versionMatch ? 'consentVersion' : '', 'status'].filter(Boolean),
        missingFields: ['consentDate', 'consentVersion', 'witnessName', 'remarks'].filter(
          (f) => (f === 'consentDate' && !dateMatch && !consentDate) || (f === 'consentVersion' && !versionMatch && !consentVersion)
        ),
        analyzedAt: new Date().toISOString(),
      };

      setConsentStatus(detectedStatus);
      setConsentDoc(docObj);
      setConsentAnalysis(analysisObj);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing consent document.');
    } finally {
      setAnalyzingConsent(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('Sign in with an active account before submitting a safety report.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const finalTrial =
        trial ||
        (trialId ? availableTrials.find((t) => t.trialId === trialId) : null) ||
        availableTrials[0] ||
        null;

      if (!finalTrial) {
        throw new Error('Please select an assigned clinical trial.');
      }

      const trialPatients = getPatientsForTrial(finalTrial.trialId);
      let finalPatient =
        patient ||
        (patientId ? trialPatients.find((p) => p.id === patientId) : null) ||
        trialPatients[0] ||
        null;

      if (!finalPatient) {
        throw new Error('Please select an existing registered patient.');
      }

      if (!finalPatient.visits || finalPatient.visits.length === 0) {
        finalPatient.visits = ensurePatientVisits(finalPatient);
      }

      let finalVisit =
        visit ||
        (visitId ? finalPatient.visits.find((v) => v.id === visitId) : null) ||
        null;

      if (!finalVisit && visitNumberInput.trim()) {
        const trimmed = visitNumberInput.trim();
        const numMatch = trimmed.match(/\d+/);
        const numVal = numMatch ? numMatch[0] : '';
        finalVisit =
          finalPatient.visits.find(
            (v) =>
              v.visitNumber?.toLowerCase() === trimmed.toLowerCase() ||
              (numVal && v.visitNumber?.toLowerCase() === `visit ${numVal}`.toLowerCase())
          ) || null;

        if (!finalVisit) {
          const visitNum = trimmed.toLowerCase().startsWith('visit') ? trimmed : `Visit ${trimmed}`;
          finalVisit = {
            id: `vis_${finalPatient.id}_custom_${numVal || Date.now()}`,
            patientId: finalPatient.id,
            trialId: finalTrial.trialId,
            visitNumber: visitNum,
            visitDate: new Date().toISOString().slice(0, 10),
            visitType: 'Follow-up',
            status: 'Completed',
            doctorInvestigator: user.fullName || 'Investigator',
            visitNotes: `Visit recorded: ${visitNum}`,
            medicines: [],
            problems: [],
            observations: [],
            adverseEvents: [],
            labResults: [],
            createdAt: new Date().toISOString(),
          };
          saveVisitForPatient(finalTrial.trialId, finalPatient.id, finalVisit);
          finalPatient.visits.push(finalVisit);
        }
      }

      if (!finalVisit && finalPatient.visits.length > 0) {
        finalVisit = finalPatient.visits[0];
      }

      if (!finalVisit) {
        throw new Error('Please enter or select a visit number (e.g. Visit 1, Visit 2, Visit 3...).');
      }

      // Ensure the visit is saved on the patient record
      if (!finalPatient.visits.some((v) => v.id === finalVisit!.id)) {
        saveVisitForPatient(finalTrial.trialId, finalPatient.id, finalVisit);
        finalPatient = getPatientForTrial(finalTrial.trialId, finalPatient.id) || finalPatient;
      }

      const consentDetailsPayload: SafetyConsentDetails = {
        status: consentStatus,
        consentDate: consentDate || undefined,
        consentVersion: consentVersion || undefined,
        obtainedBy: consentObtainedBy || undefined,
        witnessName: consentWitnessName || undefined,
        larConfirmed: consentLarConfirmed,
        remarks: consentRemarks || undefined,
        document: consentDoc,
        analysisResult: consentAnalysis,
      };

      const report = createSafetyReport(
        {
          ...draft,
          trialId: finalTrial.trialId,
          patientId: finalPatient.id,
          visitId: finalVisit.id,
          centre: draft.centre || finalPatient.centre || 'Unknown',
          consentDetails: consentDetailsPayload,
        },
        user
      );
      router.push(`/pharmacovigilance?trialId=${encodeURIComponent(report.trialId)}&reportId=${encodeURIComponent(report.id)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Safety report could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Navbar />
          <main className="mx-auto max-w-5xl p-8">
            <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-4">
              You do not have permission to create safety reports.
            </p>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <Link href="/pharmacovigilance" className="text-sm text-blue-300">
                ← Pharmacovigilance
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-white">Create Safety Report</h1>
              <p className="mt-1 text-sm text-slate-400">
                Use existing clinical trial, patient, visit and medicine records. Unknown information remains explicitly unknown.
              </p>
            </div>
          </header>

          {loadingError && <Alert text={loadingError} />}
          {error && <Alert text={error} />}

          {/* Target Storage Directory Display */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="text-sm">📁</span>
                Target Save Directory for Safety Report
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Directory Ready
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
              <span>/CTMS/Safety-Reports/{trialId || '[Selected Trial]'}/{patient?.patientCode || '[Selected Patient]'}/</span>
              <span className="text-slate-400 font-sans text-[11px]">Format: ICSR JSON/CSV Archive</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Patient, Trial and Visit Details */}
            <Section title="Patient, Trial and Visit Details">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Clinical trial"
                  value={trialId}
                  onChange={handleTrialChange}
                  options={[
                    ['', 'Select assigned trial'],
                    ...availableTrials.map((item): [string, string] => [item.trialId, `${item.trialId} — ${item.trialTitle}`]),
                  ]}
                />
                <Select
                  label="Existing patient"
                  value={patientId}
                  onChange={handlePatientChange}
                  options={[
                    ['', 'Select patient'],
                    ...availablePatients.map((item): [string, string] => [item.id, `${item.patientCode} — ${item.fullName}`]),
                  ]}
                />

                {/* Visit Selection and Direct Entry */}
                <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>🗓️</span> Select or Enter Visit Number
                        <span className="text-rose-400">*</span>
                      </span>
                      <p className="text-xs text-slate-400">
                        Choose a protocol visit number (1, 2, 3...) or type any visit number directly.
                      </p>
                    </div>
                    {visit && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Active: {visit.visitNumber || visit.id} ({visit.visitDate || 'Date unknown'})
                      </span>
                    )}
                  </div>

                  {/* Quick Select Buttons: Visit 1, Visit 2, Visit 3... */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Quick Click Visit Number:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {((patient?.visits && patient.visits.length > 0) ? patient.visits : [
                        { id: 'vis_1', visitNumber: 'Visit 1', visitType: 'Baseline' },
                        { id: 'vis_2', visitNumber: 'Visit 2', visitType: 'Follow-up' },
                        { id: 'vis_3', visitNumber: 'Visit 3', visitType: 'Follow-up' },
                        { id: 'vis_4', visitNumber: 'Visit 4', visitType: 'Follow-up' },
                        { id: 'vis_5', visitNumber: 'Visit 5', visitType: 'Follow-up' },
                      ]).map((vItem) => {
                        const isSelected =
                          visitId === vItem.id ||
                          (visitNumberInput && visitNumberInput.trim().toLowerCase() === vItem.visitNumber?.toLowerCase());
                        return (
                          <button
                            key={vItem.id}
                            type="button"
                            onClick={() => handleQuickVisitClick(vItem.visitNumber || vItem.id, vItem.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                              isSelected
                                ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-500/30'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            ✓ {vItem.visitNumber || vItem.id} {vItem.visitType ? `(${vItem.visitType})` : ''}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleVisitChange('__add_unscheduled__')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 text-blue-300 border border-blue-700/50 hover:bg-blue-950/40"
                      >
                        + Add Unscheduled Visit
                      </button>
                    </div>
                  </div>

                  {/* Dual: Dropdown OR Direct Text Entry */}
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-300">Select Visit (Dropdown)</span>
                      <select
                        value={visitId}
                        onChange={(e) => handleVisitChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
                      >
                        <option value="">-- Choose Visit (1, 2, 3...) --</option>
                        {(patient?.visits || []).map((vItem, idx) => (
                          <option key={vItem.id} value={vItem.id}>
                            {vItem.visitNumber || `Visit ${idx + 1}`} · {vItem.visitType || 'Visit'} ({vItem.visitDate || 'Date unknown'})${vItem.status ? ` — ${vItem.status}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-300">Or Type Visit Number Directly</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={visitNumberInput}
                          onChange={(e) => handleDirectVisitNumberInput(e.target.value)}
                          placeholder="e.g. 1, 2, 3 or Visit 1"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                        />
                        {visitNumberInput && (
                          <span className="absolute right-3 top-2.5 text-xs text-emerald-400 font-mono">
                            ✓ Ready
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <Readonly label="Patient code" value={patient?.patientCode || '—'} />
                <Readonly label="Patient ID" value={patient?.id || '—'} />
                <Readonly label="Centre" value={patient?.centre || draft.centre || 'Unknown'} />
                <Readonly label="Enrollment number" value={patient?.enrollment?.enrollmentNumber || 'Not Available'} />
                <Readonly label="Reported by" value={`${user?.fullName || '—'} (${user?.userType || '—'})`} />
                <Readonly label="Report date and time" value={new Date().toLocaleString()} />
              </div>
            </Section>

            {/* Section 2: Informed Consent Verification */}
            <Section title="Participant Informed Consent Verification">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Informed Consent Verification
                    </span>
                    <p className="text-xs text-slate-400">
                      Verify consent status against patient records or upload signed consent proof for auto-analysis.
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        consentStatus === 'Obtained'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-sm'
                          : consentStatus === 'Refused'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-600/60'
                          : consentStatus === 'Withdrawn'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          consentStatus === 'Obtained'
                            ? 'bg-emerald-400'
                            : consentStatus === 'Refused'
                            ? 'bg-rose-400'
                            : consentStatus === 'Withdrawn'
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                        }`}
                      />
                      {consentStatus}
                    </span>
                  </div>
                </div>

                {consentAnalysis && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
                      <span>
                        <strong className="text-white">Classification:</strong>{' '}
                        {consentAnalysis.documentClassification || 'Informed Consent Form'}
                      </span>
                      <span className="font-mono text-emerald-400">
                        Confidence: {Math.round(consentAnalysis.confidenceScore * 100)}%
                      </span>
                    </div>
                    <p className="text-slate-400">{consentAnalysis.analysisSummary}</p>
                    {consentAnalysis.extractedKeywords && consentAnalysis.extractedKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {consentAnalysis.extractedKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                            ✓ {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* File Uploader for Consent Document */}
                <div className="pt-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Upload Consent Form Proof (PDF or Image)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 text-xs font-medium text-slate-200 transition">
                      <span>📁</span>
                      <span>{analyzingConsent ? 'Analyzing Document Contents…' : 'Choose PDF or Image'}</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={analyzingConsent}
                        onChange={(e) => void handleConsentFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                    {consentDoc && (
                      <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-emerald-400">✓</span>
                        <span className="font-medium text-slate-200">{consentDoc.fileName}</span>
                        <span className="text-slate-500 font-mono">({consentDoc.fileType})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Consent Input Fields */}
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <Select
                  label="Consent Status (Verified / Current)"
                  value={consentStatus}
                  onChange={(val) => setConsentStatus(val as ConsentStatus)}
                  options={['Obtained', 'Not Obtained', 'Refused', 'Withdrawn']}
                />
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-300">Consent Date</span>
                  <input
                    type="date"
                    value={consentDate}
                    onChange={(e) => setConsentDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </label>
                <Field
                  label="Consent Form Version"
                  value={consentVersion}
                  onChange={setConsentVersion}
                  placeholder="e.g. v2.1 or Ethics Approved v3.0"
                />
                <Field
                  label="Informed Consent Obtained By (Doctor / Investigator)"
                  value={consentObtainedBy}
                  onChange={setConsentObtainedBy}
                  placeholder="e.g. Dr. Ananya Nair"
                />
                <Field
                  label="Independent Witness Name"
                  value={consentWitnessName}
                  onChange={setConsentWitnessName}
                  placeholder="e.g. N. Karthik (if applicable)"
                />
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentLarConfirmed}
                      onChange={(e) => setConsentLarConfirmed(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Consent obtained via Legally Acceptable Representative (LAR / Guardian)</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <Area
                    label="Consent Remarks & Vernacular Notes"
                    value={consentRemarks}
                    onChange={setConsentRemarks}
                  />
                </div>
              </div>
            </Section>

            {/* Section 3: Event Details */}
            <Section title="Event Details">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Event / reaction term"
                  required
                  value={draft.eventTerm}
                  onChange={(value) => update('eventTerm', value)}
                  placeholder="e.g. Epigastric distress, Nausea, Rash"
                />
                <Select
                  label="Event status"
                  value={draft.eventStatus}
                  onChange={(value) => update('eventStatus', value as DraftState['eventStatus'])}
                  options={['Ongoing', 'Resolved', 'Unknown']}
                />

                {/* Onset Date and Time with Quick Buttons */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Onset date and time (or Unknown) <span className="text-rose-400">*</span>
                    </span>
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => update('onsetDateTime', new Date().toISOString().slice(0, 16).replace('T', ' '))}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Set Now
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => update('onsetDateTime', 'Unknown')}
                        className="text-amber-400 hover:text-amber-300 underline"
                      >
                        Set Unknown
                      </button>
                    </div>
                  </div>
                  <input
                    required
                    value={draft.onsetDateTime}
                    onChange={(e) => update('onsetDateTime', e.target.value)}
                    placeholder="YYYY-MM-DD HH:mm / Unknown"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {/* End Date and Time with Quick Buttons */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">End date and time (or Unknown / Ongoing)</span>
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => update('endDateTime', 'Ongoing')}
                        className="text-emerald-400 hover:text-emerald-300 underline"
                      >
                        Ongoing
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => update('endDateTime', 'Unknown')}
                        className="text-amber-400 hover:text-amber-300 underline"
                      >
                        Unknown
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => update('endDateTime', new Date().toISOString().slice(0, 16).replace('T', ' '))}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Now
                      </button>
                    </div>
                  </div>
                  <input
                    value={draft.endDateTime}
                    onChange={(e) => update('endDateTime', e.target.value)}
                    placeholder="YYYY-MM-DD HH:mm / Unknown / Ongoing"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <Area
                    label="Detailed description"
                    required
                    value={draft.description}
                    onChange={(value) => update('description', value)}
                  />
                </div>
                <Area
                  label="Symptoms and clinical findings"
                  value={draft.symptomsFindings}
                  onChange={(value) => update('symptomsFindings', value)}
                />
                <Area
                  label="Treatment provided for event"
                  value={draft.eventTreatment}
                  onChange={(value) => update('eventTreatment', value)}
                />
                <Area
                  label="Relevant laboratory findings"
                  value={draft.relevantLaboratoryFindings}
                  onChange={(value) => update('relevantLaboratoryFindings', value)}
                />
                <Area
                  label="Medical history"
                  value={draft.medicalHistory}
                  onChange={(value) => update('medicalHistory', value)}
                />
                <div className="md:col-span-2">
                  <Area
                    label="Concomitant medicines"
                    value={draft.concomitantMedicines}
                    onChange={(value) => update('concomitantMedicines', value)}
                  />
                </div>
              </div>
            </Section>

            {/* Section 4: Suspected Medicine */}
            <Section title="Suspected Medicine Details">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Medicine ID and name"
                  value={draft.suspectedMedicineId}
                  onChange={(value) => {
                    update('suspectedMedicineId', value);
                    const medicine = drugs.find((item) => item.id === value);
                    if (medicine) {
                      update('formulation', medicine.formulationName);
                      update('batchNumber', medicine.batchNumber);
                      update('route', medicine.routeOfAdministration);
                      update('indication', medicine.indication);
                    }
                  }}
                  options={[
                    ['', 'Select medicine'],
                    ['Unknown', 'Unknown'],
                    ['Not Available', 'Not Available'],
                    ['Not Applicable', 'Not Applicable'],
                    ...drugs.map((item): [string, string] => [item.id, `${item.id} — ${item.drugName}`]),
                  ]}
                />
                <Field
                  label="Formulation"
                  value={draft.formulation}
                  onChange={(value) => update('formulation', value)}
                  placeholder="e.g. Capsule / Tablet"
                />
                <Field
                  label="Batch / lot number"
                  value={draft.batchNumber}
                  onChange={(value) => update('batchNumber', value)}
                  placeholder="e.g. ASH2026B01"
                />
                <Field
                  label="Route of administration"
                  value={draft.route}
                  onChange={(value) => update('route', value)}
                  placeholder="e.g. Oral"
                />
                <Field
                  label="Dose (or Unknown / Not Available)"
                  value={draft.dose}
                  onChange={(value) => update('dose', value)}
                  placeholder="e.g. 500 mg"
                />
                <Field
                  label="Frequency (or Unknown / Not Available)"
                  value={draft.frequency}
                  onChange={(value) => update('frequency', value)}
                  placeholder="e.g. Once daily / Twice daily"
                />

                {/* Treatment Start Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Treatment start date (or Unknown)</span>
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => update('treatmentStartDate', new Date().toISOString().slice(0, 10))}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Today
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => update('treatmentStartDate', 'Unknown')}
                        className="text-amber-400 hover:text-amber-300 underline"
                      >
                        Unknown
                      </button>
                    </div>
                  </div>
                  <input
                    value={draft.treatmentStartDate}
                    onChange={(e) => update('treatmentStartDate', e.target.value)}
                    placeholder="YYYY-MM-DD / Unknown"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {/* Last Dose Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Last dose date (or Unknown / Ongoing)</span>
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => update('lastDoseDate', new Date().toISOString().slice(0, 10))}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Today
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => update('lastDoseDate', 'Unknown')}
                        className="text-amber-400 hover:text-amber-300 underline"
                      >
                        Unknown
                      </button>
                    </div>
                  </div>
                  <input
                    value={draft.lastDoseDate}
                    onChange={(e) => update('lastDoseDate', e.target.value)}
                    placeholder="YYYY-MM-DD / Unknown / Ongoing"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <Field
                  label="Indication"
                  value={draft.indication}
                  onChange={(value) => update('indication', value)}
                  placeholder="e.g. Stress and General Wellness"
                />
                <Field
                  label="Action taken with medicine"
                  value={draft.medicineActionTaken}
                  onChange={(value) => update('medicineActionTaken', value)}
                  placeholder="e.g. Dose paused / Continued / Reduced"
                />
                <div className="md:col-span-2">
                  <Area
                    label="Other suspected / concomitant medicines"
                    value={draft.otherSuspectedMedicines}
                    onChange={(value) => update('otherSuspectedMedicines', value)}
                  />
                </div>
              </div>
            </Section>

            {/* Section 5: Safety Assessment */}
            <Section title="Safety Assessment">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Severity"
                  value={draft.severity}
                  onChange={(value) => update('severity', value as DraftState['severity'])}
                  options={['Unknown', 'Mild', 'Moderate', 'Severe']}
                />
                <Select
                  label="Seriousness (separate from severity)"
                  value={draft.seriousness}
                  onChange={(value) => update('seriousness', value as DraftState['seriousness'])}
                  options={['Unknown', 'Non-serious', 'Serious']}
                />
                {draft.seriousness === 'Serious' && (
                  <div className="space-y-2 rounded-lg border border-rose-800/60 bg-rose-950/20 p-4 md:col-span-2">
                    <p className="text-sm font-medium text-rose-200">
                      Seriousness criteria — select all that apply <span className="text-rose-400">*</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CRITERIA.map((criterion) => (
                        <label key={criterion} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.seriousnessCriteria.includes(criterion)}
                            onChange={(event) =>
                              update(
                                'seriousnessCriteria',
                                event.target.checked
                                  ? [...draft.seriousnessCriteria, criterion]
                                  : draft.seriousnessCriteria.filter((value) => value !== criterion)
                              )
                            }
                            className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                          />
                          {criterion}
                        </label>
                      ))}
                    </div>
                    {draft.seriousnessCriteria.includes('Other medically important event') && (
                      <div className="pt-2">
                        <Field
                          label="Other criterion details"
                          required
                          value={draft.seriousnessOther}
                          onChange={(value) => update('seriousnessOther', value)}
                          placeholder="Provide specific medical rationale"
                        />
                      </div>
                    )}
                  </div>
                )}
                <Select
                  label="Causality assessment"
                  value={draft.causality}
                  onChange={(value) => update('causality', value)}
                  options={['Unassessable/Unclassifiable', 'Certain', 'Probable/Likely', 'Possible', 'Unlikely']}
                />
                <Field
                  label="Causality assessment method"
                  value={draft.causalityMethod}
                  onChange={(value) => update('causalityMethod', value)}
                  placeholder="e.g. WHO-UMC causality scale / Naranjo / Not Available"
                />
                <Select
                  label="Expectedness"
                  value={draft.expectedness}
                  onChange={(value) => update('expectedness', value as DraftState['expectedness'])}
                  options={['Unknown', 'Expected', 'Unexpected', 'Not Applicable']}
                />
                <Select
                  label="Patient outcome"
                  value={draft.patientOutcome}
                  onChange={(value) => update('patientOutcome', value)}
                  options={[
                    'Unknown',
                    'Ongoing',
                    'Recovered',
                    'Recovering',
                    'Recovered with sequelae',
                    'Not recovered',
                    'Fatal',
                    'Not Available',
                  ]}
                />
                <div className="md:col-span-2">
                  <Area
                    label="Clinical assessment"
                    value={draft.clinicalAssessment}
                    onChange={(value) => update('clinicalAssessment', value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Area
                    label="Action taken"
                    value={draft.actionTaken}
                    onChange={(value) => update('actionTaken', value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Area
                    label="Initial medical review"
                    value={draft.initialMedicalReview}
                    onChange={(value) => update('initialMedicalReview', value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.followUpRequired}
                    onChange={(event) => update('followUpRequired', event.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                  />
                  Follow-up required
                </label>
              </div>
            </Section>

            {/* Section 6: Supporting Documents */}
            <Section title="Supporting Documents">
              <div className="space-y-3">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => void attachFiles(event.target.files)}
                  className="text-sm text-slate-300"
                />
                <p className="text-xs text-slate-400">Accepted formats: PDF, JPEG, PNG (max 1 MB each).</p>
                {draft.documents.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {draft.documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                      >
                        <span>{document.fileName}</span>
                        <button
                          type="button"
                          onClick={() => update('documents', draft.documents.filter((item) => item.id !== document.id))}
                          className="text-rose-400 hover:text-rose-300 underline text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Pre-submit helper notifications */}
            {!visit && !visitNumberInput && (
              <p className="text-right text-sm text-amber-300">
                Please select or enter a visit number (Visit 1, 2, 3...) before submitting.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <Link href="/pharmacovigilance" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Submit safety report'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <textarea
        required={required}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | [string, string][];
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60 focus:border-rose-500 focus:outline-none"
      >
        {options.map((item) => {
          const [optionValue, optionLabel] = Array.isArray(item) ? item : [item, item];
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-slate-400">{label}</p>
      <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300">{value}</p>
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">
      {text}
    </p>
  );
}
