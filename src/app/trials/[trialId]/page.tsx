'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import {
  addPatientToTrial,
  getPatientsForTrial,
  getTrialPatientSummary,
  updatePatientInCache,
} from '@/lib/patientStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import { getTrialActivationIssues } from '@/lib/proposalStorage';
import { hasPermission } from '@/lib/permissions';
import { TrialRegulatoryPanel } from '@/components/TrialRegulatoryPanel';
import { TreatmentCertificatesPanel } from '@/components/TreatmentCertificatesPanel';
import { getSafetyReportsForPatient } from '@/lib/safetyStorage';
import { SafetyReport } from '@/lib/types';
import {
  ConsentStatus,
  EnrollmentStatus,
  Patient,
  ScreeningEligibilityStatus,
  TrialProposal,
} from '@/lib/types';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  FileText,
  FileUser,
  FlaskConical,
  FolderHeart,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

const TAB_ITEMS = [
  'Patient Information',
  'Consent',
  'Screening',
  'Enrollment',
  'Visits',
  'Ayurvedic Assessment',
  'Medicines',
  'Symptoms / Observations',
  'Laboratory Reports',
  'ADR / Safety',
  'Treatment Outcome',
] as const;

const EMPTY_REGISTER_FORM = {
  patientCode: '',
  fullName: '',
  dateOfBirth: '',
  age: '',
  gender: 'F',
  contactNumber: '',
  address: '',
  emergencyContact: '',
  bloodGroup: '',
  registrationDate: new Date().toISOString().slice(0, 10),
  centre: '',
  registeredBy: '',
  remarks: '',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export default function TrialDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const trialIdParam = Array.isArray(params?.trialId) ? params.trialId[0] : params?.trialId;
  const [trial, setTrial] = useState<TrialProposal | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState({
    totalPatients: 0,
    registeredPatients: 0,
    consentPending: 0,
    consentObtained: 0,
    consentNotObtained: 0,
    screenedPatients: 0,
    eligiblePatients: 0,
    enrolledPatients: 0,
    activePatients: 0,
    withdrawnPatients: 0,
    completedPatients: 0,
  });
  const [selectedTab, setSelectedTab] = useState<(typeof TAB_ITEMS)[number]>('Patient Information');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showConsentFormModal, setShowConsentFormModal] = useState(false);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [patientSafetyReports, setPatientSafetyReports] = useState<SafetyReport[]>([]);
  const [safetyLoadError, setSafetyLoadError] = useState('');

  const [consentForm, setConsentForm] = useState({
    status: 'Not Obtained' as ConsentStatus,
    consentDate: new Date().toISOString().slice(0, 10),
    consentTime: '10:00',
    consentVersion: 'V1',
    obtainedBy: user?.fullName || 'Demo User',
    witnessName: '',
    remarks: '',
    document: null as {
      id: string;
      fileName: string;
      fileType: 'JPG' | 'JPEG' | 'PNG' | 'PDF';
      mimeType: string;
      uploadedAt: string;
      uploadedBy: string;
      previewDataUrl?: string;
    } | null,
  });

  const [screeningForm, setScreeningForm] = useState({
    screeningDate: new Date().toISOString().slice(0, 10),
    inclusionCriteria: '',
    exclusionCriteria: '',
    eligibilityStatus: 'Pending' as ScreeningEligibilityStatus,
    screeningRemarks: '',
    screenedBy: user?.fullName || 'Demo User',
  });

  const [enrollmentForm, setEnrollmentForm] = useState({
    enrollmentNumber: '',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    centre: '',
    treatmentGroup: '',
    randomizationNumber: '',
    enrolledBy: user?.fullName || 'Demo User',
    enrollmentStatus: 'Active' as EnrollmentStatus,
  });

  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!trialIdParam) return;
    const decoded = decodeURIComponent(String(trialIdParam));
    const currentTrial = getCachedProposals().find((item) => item.trialId === decoded);
    setTrial(currentTrial || null);
    if (!currentTrial) return;
    const patientList = getPatientsForTrial(currentTrial.trialId);
    setPatients(patientList);
    setSummary(getTrialPatientSummary(currentTrial.trialId));
  }, [trialIdParam]);

  useEffect(() => {
    if (!selectedPatient || !user) {
      setPatientSafetyReports([]);
      return;
    }
    try {
      setPatientSafetyReports(getSafetyReportsForPatient(selectedPatient.trialId, selectedPatient.id, user));
      setSafetyLoadError('');
    } catch (error) {
      setPatientSafetyReports([]);
      setSafetyLoadError(error instanceof Error ? error.message : 'Safety history could not be loaded.');
    }
  }, [selectedPatient, user]);

  const getEnrollmentBlockReason = (patient: Patient): string => {
    if (!hasPermission(user, 'approve_enrollment')) return 'Enrollment approval permission required';
    if (patient.enrollment) return '';
    if (patient.consent?.status !== 'Obtained') return 'Consent required';
    if (patient.screening?.eligibilityStatus !== 'Eligible') return 'Eligibility confirmation required';
    if (!trial || trial.proposalStatus !== 'Active') return 'Trial activation required';
    const activationIssues = getTrialActivationIssues(trial);
    if (activationIssues.length > 0) return 'Regulatory checks pending';
    const rules = trial.regulatory?.validationRules;
    const registrationDate = trial.regulatory?.ctri.registrationDate;
    if (
      rules?.requireProspectiveCTRIRegistration &&
      (!registrationDate || !enrollmentForm.enrollmentDate || registrationDate >= enrollmentForm.enrollmentDate)
    ) return 'Prospective CTRI registration required';
    return '';
  };
  const canEnroll = (patient: Patient) => !getEnrollmentBlockReason(patient);

  const openConsentModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setConsentForm({
      status: patient.consent?.status || 'Not Obtained',
      consentDate: patient.consent?.consentDate || new Date().toISOString().slice(0, 10),
      consentTime: patient.consent?.consentTime || '10:00',
      consentVersion: patient.consent?.consentVersion || 'V1',
      obtainedBy: patient.consent?.obtainedBy || user?.fullName || 'Demo User',
      witnessName: patient.consent?.witnessName || '',
      remarks: patient.consent?.remarks || '',
      document: patient.consent?.document || null,
    });
    setUploadState('idle');
    setUploadProgress(0);
    setShowConsentFormModal(true);
  };

  const openScreeningModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setScreeningForm({
      screeningDate: patient.screening?.screeningDate || new Date().toISOString().slice(0, 10),
      inclusionCriteria: patient.screening?.inclusionCriteria || '',
      exclusionCriteria: patient.screening?.exclusionCriteria || '',
      eligibilityStatus: patient.screening?.eligibilityStatus || 'Pending',
      screeningRemarks: patient.screening?.screeningRemarks || '',
      screenedBy: patient.screening?.screenedBy || user?.fullName || 'Demo User',
    });
    setShowScreeningModal(true);
  };

  const openEnrollmentModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setEnrollmentForm({
      enrollmentNumber: patient.enrollment?.enrollmentNumber || '',
      enrollmentDate: patient.enrollment?.enrollmentDate || new Date().toISOString().slice(0, 10),
      centre: patient.enrollment?.centre || patient.centre || '',
      treatmentGroup: patient.enrollment?.treatmentGroup || '',
      randomizationNumber: patient.enrollment?.randomizationNumber || '',
      enrolledBy: patient.enrollment?.enrolledBy || user?.fullName || 'Demo User',
      enrollmentStatus: patient.enrollment?.enrollmentStatus || 'Active',
    });
    setShowEnrollmentModal(true);
  };

  const handleRegisterPatient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!trial) return;

    if (!registerForm.patientCode.trim() || !registerForm.fullName.trim()) {
      setErrorMessage('Patient code and full name are required.');
      return;
    }

    try {
      const patient = addPatientToTrial(trial.trialId, {
        patientCode: registerForm.patientCode,
        fullName: registerForm.fullName,
        dateOfBirth: registerForm.dateOfBirth,
        age: Number(registerForm.age || 0) || undefined,
        gender: registerForm.gender,
        contactNumber: registerForm.contactNumber,
        address: registerForm.address,
        emergencyContact: registerForm.emergencyContact,
        bloodGroup: registerForm.bloodGroup,
        registrationDate: registerForm.registrationDate,
        centre: registerForm.centre,
        registeredBy: registerForm.registeredBy || user?.fullName || 'Demo User',
        remarks: registerForm.remarks,
      });
      setPatients((current) => [patient, ...current]);
      setSummary(getTrialPatientSummary(trial.trialId));
      setShowRegisterModal(false);
      setRegisterForm(EMPTY_REGISTER_FORM);
      setStatusMessage(`Patient ${patient.patientCode} registered successfully.`);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to register patient.');
    }
  };

  const handleConsentSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) return;

    const storedConsent = {
      id: selectedPatient.consent?.id || `consent_${selectedPatient.id}`,
      patientId: selectedPatient.id,
      trialId: selectedPatient.trialId,
      status: consentForm.status,
      consentDate: consentForm.consentDate,
      consentTime: consentForm.consentTime,
      consentVersion: consentForm.consentVersion,
      document: consentForm.document,
      obtainedBy: consentForm.obtainedBy,
      witnessName: consentForm.witnessName,
      remarks: consentForm.remarks,
      createdAt: selectedPatient.consent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: selectedPatient.consent?.createdBy || user?.fullName || 'Demo User',
      updatedBy: user?.fullName || 'Demo User',
    };

    const nextPatient = updatePatientInCache(selectedPatient.id, {
      consent: storedConsent,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.fullName || 'Demo User',
    });

    setPatients((current) => current.map((patient) => (patient.id === nextPatient.id ? nextPatient : patient)));
    setSummary(getTrialPatientSummary(trial!.trialId));
    setShowConsentFormModal(false);
    setStatusMessage(`Consent updated for ${selectedPatient.patientCode}.`);
  };

  const handleScreeningSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) return;

    const updatedScreening = {
      id: selectedPatient.screening?.id || `screen_${selectedPatient.id}`,
      patientId: selectedPatient.id,
      trialId: selectedPatient.trialId,
      screeningDate: screeningForm.screeningDate,
      inclusionCriteria: screeningForm.inclusionCriteria,
      exclusionCriteria: screeningForm.exclusionCriteria,
      eligibilityStatus: screeningForm.eligibilityStatus,
      screeningRemarks: screeningForm.screeningRemarks,
      screenedBy: screeningForm.screenedBy,
      createdAt: selectedPatient.screening?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextPatient = updatePatientInCache(selectedPatient.id, {
      screening: updatedScreening,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.fullName || 'Demo User',
    });
    setPatients((current) => current.map((patient) => (patient.id === nextPatient.id ? nextPatient : patient)));
    setSummary(getTrialPatientSummary(trial!.trialId));
    setShowScreeningModal(false);
    setStatusMessage(`Screening saved for ${selectedPatient.patientCode}.`);
  };

  const handleEnrollmentSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) return;

    const updatedEnrollment = {
      id: selectedPatient.enrollment?.id || `enroll_${selectedPatient.id}`,
      patientId: selectedPatient.id,
      trialId: selectedPatient.trialId,
      enrollmentNumber: enrollmentForm.enrollmentNumber,
      enrollmentDate: enrollmentForm.enrollmentDate,
      centre: enrollmentForm.centre,
      treatmentGroup: enrollmentForm.treatmentGroup,
      randomizationNumber: enrollmentForm.randomizationNumber,
      enrolledBy: enrollmentForm.enrolledBy,
      enrollmentStatus: enrollmentForm.enrollmentStatus,
      createdAt: selectedPatient.enrollment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const nextPatient = updatePatientInCache(selectedPatient.id, {
        enrollment: updatedEnrollment,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.fullName || 'Demo User',
      }, user);

      setPatients((current) => current.map((patient) => (patient.id === nextPatient.id ? nextPatient : patient)));
      setSummary(getTrialPatientSummary(trial!.trialId));
      setShowEnrollmentModal(false);
      setErrorMessage(null);
      setStatusMessage(`Enrollment saved for ${selectedPatient.patientCode}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save enrollment.');
    }
  };

  const handleConsentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.name.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : file.type.startsWith('image/')
        ? file.name.toLowerCase().endsWith('.png')
          ? 'PNG'
          : 'JPG'
        : 'JPG';

    const reader = new FileReader();
    reader.onload = () => {
      const preview = typeof reader.result === 'string' ? reader.result : undefined;
      setConsentForm((current) => ({
        ...current,
        document: {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          fileType,
          mimeType: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Demo User',
          previewDataUrl: preview,
        },
      }));
      setUploadState('uploading');
      setUploadProgress(15);
      window.setTimeout(() => {
        setUploadProgress(100);
        setUploadState('success');
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  if (!trial) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-16">
            <div className="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-300">
              <p className="text-lg font-semibold text-white">Clinical trial not found.</p>
              <Link href="/trials" className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
                <ArrowLeft className="w-4 h-4" /> Back to trials
              </Link>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">
              <FlaskConical className="w-4 h-4" /> Clinical Trial
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <Link href="/trials" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Trial Proposals
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{trial.trialTitle}</h1>
                <p className="text-sm text-slate-400 mt-1">{trial.trialId} · {trial.studyPhase} · {trial.targetDisease}</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <UserPlus className="w-4 h-4" /> + Register Patient
              </button>
              <Link
                href={`/pharmacovigilance?trialId=${encodeURIComponent(trial.trialId)}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-700 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-950/40"
              >
                ADR / Safety Reports
              </Link>
            </div>
          </div>

          <TrialRegulatoryPanel
            trial={trial}
            user={user}
            onSaved={(updatedTrial) => setTrial(updatedTrial)}
          />

          <TreatmentCertificatesPanel trial={trial} patients={patients} user={user} />

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <SummaryCard label="Total Patients" value={summary.totalPatients} detail="Registered" icon={<Users className="w-4 h-4" />} />
            <SummaryCard label="Registered" value={summary.registeredPatients} detail="Patients" icon={<FileUser className="w-4 h-4" />} />
            <SummaryCard label="Consent Pending" value={summary.consentPending} detail="Awaiting consent" icon={<CircleDashed className="w-4 h-4" />} />
            <SummaryCard label="Consent Obtained" value={summary.consentObtained} detail="Valid consent" icon={<CheckCircle2 className="w-4 h-4" />} />
            <SummaryCard label="Consent Not Obtained" value={summary.consentNotObtained} detail="Refused or pending" icon={<XCircle className="w-4 h-4" />} />
            <SummaryCard label="Screened" value={summary.screenedPatients} detail="Screened patients" icon={<ClipboardCheck className="w-4 h-4" />} />
            <SummaryCard label="Eligible" value={summary.eligiblePatients} detail="Ready for enrollment" icon={<ShieldCheck className="w-4 h-4" />} />
            <SummaryCard label="Enrolled" value={summary.enrolledPatients} detail="Trial enrollment" icon={<FolderHeart className="w-4 h-4" />} />
            <SummaryCard label="Active" value={summary.activePatients} detail="Active treatment" icon={<Activity className="w-4 h-4" />} />
            <SummaryCard label="Withdrawn" value={summary.withdrawnPatients} detail="Withdrew" icon={<XCircle className="w-4 h-4" />} />
            <SummaryCard label="Completed" value={summary.completedPatients} detail="Completed" icon={<CheckCircle2 className="w-4 h-4" />} />
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Patients</h2>
                <p className="text-sm text-slate-400">{patients.length} patients in {trial.trialId}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400 uppercase tracking-wide text-[11px]">
                  <tr className="border-b border-slate-800">
                    <th className="py-3 pr-4">Patient Code</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Age</th>
                    <th className="py-3 pr-4">Gender</th>
                    <th className="py-3 pr-4">Consent</th>
                    <th className="py-3 pr-4">Screening</th>
                    <th className="py-3 pr-4">Enrollment</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No patients have been registered in this trial yet.
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id} className="border-b border-slate-800/70 align-top">
                        <td className="py-3 pr-4 text-white font-medium">{patient.patientCode}</td>
                        <td className="py-3 pr-4 text-slate-200">{patient.fullName}</td>
                        <td className="py-3 pr-4 text-slate-300">{patient.age ?? '—'}</td>
                        <td className="py-3 pr-4 text-slate-300">{patient.gender || '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getConsentBadge(patient.consent?.status || 'Not Obtained')}`}>
                            {patient.consent?.status || 'Not Obtained'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{patient.screening?.eligibilityStatus || '—'}</td>
                        <td className="py-3 pr-4 text-slate-300">{patient.enrollment?.enrollmentStatus || '—'}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-slate-800 text-slate-200 px-2 py-0.5 text-[11px] font-medium">
                            {patient.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSelectedPatient(patient)} className="rounded border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800">View</button>
                            <Link
                              href={`/trials/${encodeURIComponent(trial.trialId)}/patients/${encodeURIComponent(patient.id)}/visits`}
                              className="rounded border border-blue-700/70 px-2 py-1 text-[11px] text-blue-300 hover:bg-blue-600/10"
                            >
                              Visits
                            </Link>
                            <button onClick={() => openConsentModal(patient)} className="rounded border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800">
                              {patient.consent?.status === 'Obtained' ? 'Consent' : 'Obtain Consent'}
                            </button>
                            <button onClick={() => openScreeningModal(patient)} className="rounded border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800">Screening</button>
                            <button
                              disabled={!canEnroll(patient)}
                              onClick={() => openEnrollmentModal(patient)}
                              className={`rounded px-2 py-1 text-[11px] ${canEnroll(patient) ? 'border border-emerald-700 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
                            >
                              {patient.enrollment ? 'Update Enrollment' : canEnroll(patient) ? 'Enroll Patient' : getEnrollmentBlockReason(patient)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {selectedPatient && (
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Patient Timeline</p>
                  <h3 className="text-xl font-bold text-white">{selectedPatient.patientCode} · {selectedPatient.fullName}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAB_ITEMS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border ${selectedTab === tab ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTab === 'Patient Information' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Patient Code" value={selectedPatient.patientCode} />
                  <InfoRow label="Name" value={selectedPatient.fullName} />
                  <InfoRow label="DOB" value={formatDate(selectedPatient.dateOfBirth)} />
                  <InfoRow label="Age" value={String(selectedPatient.age ?? '—')} />
                  <InfoRow label="Gender" value={selectedPatient.gender || '—'} />
                  <InfoRow label="Contact Number" value={selectedPatient.contactNumber || '—'} />
                  <InfoRow label="Address" value={selectedPatient.address || '—'} />
                  <InfoRow label="Emergency Contact" value={selectedPatient.emergencyContact || '—'} />
                  <InfoRow label="Blood Group" value={selectedPatient.bloodGroup || '—'} />
                  <InfoRow label="Registration Date" value={formatDate(selectedPatient.registrationDate)} />
                  <InfoRow label="Centre" value={selectedPatient.centre || '—'} />
                  <InfoRow label="Registered By" value={selectedPatient.registeredBy || '—'} />
                  <InfoRow label="Status" value={selectedPatient.status} />
                  <InfoRow label="Remarks" value={selectedPatient.remarks || '—'} />
                </div>
              )}

              {selectedTab === 'Consent' && (
                <div className="space-y-3 text-sm text-slate-200">
                  <InfoRow label="Consent Status" value={selectedPatient.consent?.status || 'Not Obtained'} />
                  <InfoRow label="Consent Date" value={formatDate(selectedPatient.consent?.consentDate)} />
                  <InfoRow label="Consent Time" value={selectedPatient.consent?.consentTime || '—'} />
                  <InfoRow label="Consent Version" value={selectedPatient.consent?.consentVersion || '—'} />
                  <InfoRow label="Obtained By" value={selectedPatient.consent?.obtainedBy || '—'} />
                  <InfoRow label="Witness Name" value={selectedPatient.consent?.witnessName || '—'} />
                  <InfoRow label="Remarks" value={selectedPatient.consent?.remarks || '—'} />
                  <InfoRow label="Document" value={selectedPatient.consent?.document?.fileName || 'No document uploaded'} />
                  {selectedPatient.consent?.document && (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{selectedPatient.consent.document.fileName}</p>
                          <p className="text-xs text-slate-400">{selectedPatient.consent.document.fileType} · Uploaded {formatDate(selectedPatient.consent.document.uploadedAt)}</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">Temporary Demo Record</span>
                      </div>
                      {selectedPatient.consent.document.previewDataUrl && (
                        selectedPatient.consent.document.fileType === 'PDF' ? (
                          <div className="border border-dashed border-slate-700 rounded-lg p-6 text-center text-slate-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                            <p className="font-medium text-white">Demo PDF Preview</p>
                            <p className="text-xs mt-1">{selectedPatient.consent.document.fileName}</p>
                          </div>
                        ) : (
                          <img src={selectedPatient.consent.document.previewDataUrl} alt="Consent preview" className="max-h-64 rounded-lg border border-slate-700 object-cover" />
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'Screening' && (
                <div className="space-y-3 text-sm text-slate-200">
                  <InfoRow label="Screening Date" value={formatDate(selectedPatient.screening?.screeningDate)} />
                  <InfoRow label="Eligibility Status" value={selectedPatient.screening?.eligibilityStatus || 'Pending'} />
                  <InfoRow label="Inclusion Criteria" value={selectedPatient.screening?.inclusionCriteria || '—'} />
                  <InfoRow label="Exclusion Criteria" value={selectedPatient.screening?.exclusionCriteria || '—'} />
                  <InfoRow label="Screened By" value={selectedPatient.screening?.screenedBy || '—'} />
                  <InfoRow label="Remarks" value={selectedPatient.screening?.screeningRemarks || '—'} />
                </div>
              )}

              {selectedTab === 'Enrollment' && (
                <div className="space-y-3 text-sm text-slate-200">
                  <InfoRow label="Enrollment Number" value={selectedPatient.enrollment?.enrollmentNumber || '—'} />
                  <InfoRow label="Enrollment Date" value={formatDate(selectedPatient.enrollment?.enrollmentDate)} />
                  <InfoRow label="Trial" value={selectedPatient.trialId} />
                  <InfoRow label="Centre" value={selectedPatient.enrollment?.centre || selectedPatient.centre || '—'} />
                  <InfoRow label="Treatment Group" value={selectedPatient.enrollment?.treatmentGroup || '—'} />
                  <InfoRow label="Randomization Number" value={selectedPatient.enrollment?.randomizationNumber || '—'} />
                  <InfoRow label="Enrolled By" value={selectedPatient.enrollment?.enrolledBy || '—'} />
                  <InfoRow label="Enrollment Status" value={selectedPatient.enrollment?.enrollmentStatus || '—'} />
                </div>
              )}

              {selectedTab === 'ADR / Safety' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h4 className="font-semibold text-white">Patient Safety History</h4><p className="text-xs text-slate-400">Shared reports linked to this patient, trial and visit.</p></div>
                  </div>
                  {hasPermission(user, 'create_safety_reports') && (selectedPatient.visits || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">{selectedPatient.visits?.map((visit) => (
                      <Link key={visit.id} href={`/pharmacovigilance/new?trialId=${encodeURIComponent(trial.trialId)}&patientId=${encodeURIComponent(selectedPatient.id)}&visitId=${encodeURIComponent(visit.id)}`} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-medium text-white">Report event from {visit.visitNumber || visit.visitDate || 'visit'}</Link>
                    ))}</div>
                  )}
                  {safetyLoadError && <p role="alert" className="text-sm text-rose-300">{safetyLoadError}</p>}
                  {patientSafetyReports.length === 0 ? <p className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">No safety reports are recorded for this patient.</p> : (
                    <div className="space-y-3">{patientSafetyReports.map((report) => (
                      <article key={report.id} className={`rounded-lg border p-4 ${report.seriousness === 'Serious' ? 'border-rose-700 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-white">{report.eventTerm} · {report.reportId}</p><p className="mt-1 text-xs text-slate-400">Visit {report.visitNumber} · {report.onsetDateTime} · {report.suspectedMedicineName}</p></div><span className={`rounded-full px-2 py-1 text-xs ${report.seriousness === 'Serious' ? 'bg-rose-900 text-rose-100' : 'bg-slate-800 text-slate-200'}`}>{report.seriousness} · {report.reviewStatus}</span></div>
                        <p className="mt-2 text-sm text-slate-300">Severity: {report.severity} · Outcome: {report.patientOutcome} · Follow-up {report.followUpRequired ? 'required' : 'not required'}</p>
                        <Link href={`/pharmacovigilance?trialId=${encodeURIComponent(trial.trialId)}&reportId=${encodeURIComponent(report.id)}`} className="mt-3 inline-block text-sm text-blue-300 underline">Open safety report</Link>
                      </article>
                    ))}</div>
                  )}
                </div>
              )}

              {selectedTab !== 'Patient Information' && selectedTab !== 'Consent' && selectedTab !== 'Screening' && selectedTab !== 'Enrollment' && selectedTab !== 'ADR / Safety' && (
                <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  {selectedTab} details are available in the workflow progression and can be completed in the main patient process.
                </div>
              )}
            </section>
          )}

          {showRegisterModal && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Register Patient</h3>
                  <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                {errorMessage && <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{errorMessage}</div>}
                <form onSubmit={handleRegisterPatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Patient Code / Subject ID" value={registerForm.patientCode} onChange={(value) => setRegisterForm((current) => ({ ...current, patientCode: value }))} />
                  <InputField label="Full Name" value={registerForm.fullName} onChange={(value) => setRegisterForm((current) => ({ ...current, fullName: value }))} />
                  <InputField label="Date of Birth" type="date" value={registerForm.dateOfBirth} onChange={(value) => setRegisterForm((current) => ({ ...current, dateOfBirth: value }))} />
                  <InputField label="Age" type="number" value={registerForm.age} onChange={(value) => setRegisterForm((current) => ({ ...current, age: value }))} />
                  <SelectField label="Gender" value={registerForm.gender} options={['F', 'M', 'Other']} onChange={(value) => setRegisterForm((current) => ({ ...current, gender: value }))} />
                  <InputField label="Contact Number" value={registerForm.contactNumber} onChange={(value) => setRegisterForm((current) => ({ ...current, contactNumber: value }))} />
                  <div className="md:col-span-2"><InputField label="Address" value={registerForm.address} onChange={(value) => setRegisterForm((current) => ({ ...current, address: value }))} /></div>
                  <InputField label="Emergency Contact" value={registerForm.emergencyContact} onChange={(value) => setRegisterForm((current) => ({ ...current, emergencyContact: value }))} />
                  <InputField label="Blood Group" value={registerForm.bloodGroup} onChange={(value) => setRegisterForm((current) => ({ ...current, bloodGroup: value }))} />
                  <InputField label="Registration Date" type="date" value={registerForm.registrationDate} onChange={(value) => setRegisterForm((current) => ({ ...current, registrationDate: value }))} />
                  <InputField label="Centre" value={registerForm.centre} onChange={(value) => setRegisterForm((current) => ({ ...current, centre: value }))} />
                  <InputField label="Registered By" value={registerForm.registeredBy} onChange={(value) => setRegisterForm((current) => ({ ...current, registeredBy: value }))} />
                  <div className="md:col-span-2"><InputField label="Remarks" value={registerForm.remarks} onChange={(value) => setRegisterForm((current) => ({ ...current, remarks: value }))} /></div>
                  <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowRegisterModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
                    <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Save Patient</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showConsentFormModal && selectedPatient && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Consent</h3>
                  <button onClick={() => setShowConsentFormModal(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                <form onSubmit={handleConsentSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField label="Consent Status" value={consentForm.status} options={['Not Obtained', 'Obtained', 'Refused', 'Withdrawn']} onChange={(value) => setConsentForm((current) => ({ ...current, status: value as ConsentStatus }))} />
                    <InputField label="Consent Date" type="date" value={consentForm.consentDate} onChange={(value) => setConsentForm((current) => ({ ...current, consentDate: value }))} />
                    <InputField label="Consent Time" type="time" value={consentForm.consentTime} onChange={(value) => setConsentForm((current) => ({ ...current, consentTime: value }))} />
                    <InputField label="Consent Version" value={consentForm.consentVersion} onChange={(value) => setConsentForm((current) => ({ ...current, consentVersion: value }))} />
                    <InputField label="Obtained By" value={consentForm.obtainedBy} onChange={(value) => setConsentForm((current) => ({ ...current, obtainedBy: value }))} />
                    <InputField label="Witness Name" value={consentForm.witnessName} onChange={(value) => setConsentForm((current) => ({ ...current, witnessName: value }))} />
                  </div>
                  <InputField label="Remarks" value={consentForm.remarks} onChange={(value) => setConsentForm((current) => ({ ...current, remarks: value }))} />

                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Consent Form Document</p>
                    <div className="flex flex-col gap-3">
                      <label className="inline-flex cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleConsentFileChange} />
                        Choose File
                      </label>

                      {consentForm.document ? (
                        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">{consentForm.document.fileName}</p>
                              <p className="text-xs text-slate-400">{consentForm.document.fileType} · {consentForm.document.uploadedBy}</p>
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">Temp Demo</span>
                          </div>

                          {uploadState !== 'idle' && (
                            <div className="mt-3">
                              <div className="h-2.5 w-full rounded-full bg-slate-700">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                              </div>
                              <p className="mt-2 text-xs text-slate-300">
                                {uploadState === 'uploading' ? 'Uploading Consent Form...' : '✓ Consent Form Uploaded Successfully'}
                              </p>
                            </div>
                          )}

                          {consentForm.document.previewDataUrl && (
                            consentForm.document.fileType === 'PDF' ? (
                              <div className="mt-4 border border-dashed border-slate-700 rounded-lg p-4 text-center text-sm text-slate-300">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                                <p className="font-semibold text-white">Demo PDF Preview</p>
                                <p className="text-xs text-slate-400">{consentForm.document.fileName}</p>
                              </div>
                            ) : (
                              <img src={consentForm.document.previewDataUrl} alt="Consent preview" className="mt-4 max-h-52 rounded-lg border border-slate-700 object-cover" />
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No dummy document attached yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowConsentFormModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
                    <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Save Consent</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showScreeningModal && selectedPatient && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Screening</h3>
                  <button onClick={() => setShowScreeningModal(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                <form onSubmit={handleScreeningSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Screening Date" type="date" value={screeningForm.screeningDate} onChange={(value) => setScreeningForm((current) => ({ ...current, screeningDate: value }))} />
                    <SelectField label="Eligibility Status" value={screeningForm.eligibilityStatus} options={['Pending', 'Eligible', 'Not Eligible']} onChange={(value) => setScreeningForm((current) => ({ ...current, eligibilityStatus: value as ScreeningEligibilityStatus }))} />
                    <div className="md:col-span-2"><InputField label="Inclusion Criteria" value={screeningForm.inclusionCriteria} onChange={(value) => setScreeningForm((current) => ({ ...current, inclusionCriteria: value }))} /></div>
                    <div className="md:col-span-2"><InputField label="Exclusion Criteria" value={screeningForm.exclusionCriteria} onChange={(value) => setScreeningForm((current) => ({ ...current, exclusionCriteria: value }))} /></div>
                    <InputField label="Screened By" value={screeningForm.screenedBy} onChange={(value) => setScreeningForm((current) => ({ ...current, screenedBy: value }))} />
                    <InputField label="Screening Remarks" value={screeningForm.screeningRemarks} onChange={(value) => setScreeningForm((current) => ({ ...current, screeningRemarks: value }))} />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowScreeningModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Screening</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEnrollmentModal && selectedPatient && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Enrollment</h3>
                  <button onClick={() => setShowEnrollmentModal(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                <form onSubmit={handleEnrollmentSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Enrollment Number" value={enrollmentForm.enrollmentNumber} onChange={(value) => setEnrollmentForm((current) => ({ ...current, enrollmentNumber: value }))} />
                    <InputField label="Enrollment Date" type="date" value={enrollmentForm.enrollmentDate} onChange={(value) => setEnrollmentForm((current) => ({ ...current, enrollmentDate: value }))} />
                    <InputField label="Trial" value={trial.trialId} disabled />
                    <InputField label="Centre" value={enrollmentForm.centre} onChange={(value) => setEnrollmentForm((current) => ({ ...current, centre: value }))} />
                    <InputField label="Treatment Group" value={enrollmentForm.treatmentGroup} onChange={(value) => setEnrollmentForm((current) => ({ ...current, treatmentGroup: value }))} />
                    <InputField label="Randomization Number" value={enrollmentForm.randomizationNumber} onChange={(value) => setEnrollmentForm((current) => ({ ...current, randomizationNumber: value }))} />
                    <InputField label="Enrolled By" value={enrollmentForm.enrolledBy} onChange={(value) => setEnrollmentForm((current) => ({ ...current, enrolledBy: value }))} />
                    <SelectField label="Enrollment Status" value={enrollmentForm.enrollmentStatus} options={['Active', 'Completed', 'Withdrawn', 'Discontinued']} onChange={(value) => setEnrollmentForm((current) => ({ ...current, enrollmentStatus: value as EnrollmentStatus }))} />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowEnrollmentModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
                    <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Save Enrollment</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="fixed right-4 bottom-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg">
              {statusMessage}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-blue-400">{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-slate-500 mt-1">{detail}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-slate-100">{value || '—'}</p>
    </div>
  );
}

function getConsentBadge(status: ConsentStatus) {
  switch (status) {
    case 'Obtained':
      return 'bg-emerald-500/10 text-emerald-300';
    case 'Not Obtained':
      return 'bg-rose-500/10 text-rose-300';
    case 'Refused':
      return 'bg-amber-500/10 text-amber-300';
    case 'Withdrawn':
      return 'bg-slate-700 text-slate-200';
    default:
      return 'bg-slate-700 text-slate-200';
  }
}

function InputField({
  label,
  value,
  type = 'text',
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  type?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
