'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { getPatientForTrial, saveVisitForPatient } from '@/lib/patientStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import {
  Patient,
  PatientVisit,
  TrialProposal,
  VisitAdverseEvent,
  VisitLabResult,
  VisitMedicine,
  VisitObservation,
  VisitProblem,
} from '@/lib/types';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeEmptyVisit = (trialId: string, patientId: string, visitNumber: string): PatientVisit => ({
  id: newId('visit'),
  trialId,
  patientId,
  visitNumber,
  visitDate: today(),
  visitType: visitNumber === 'Visit 1' ? 'Baseline' : 'Follow-up',
  status: 'Scheduled',
  doctorInvestigator: '',
  visitNotes: '',
  medicines: [],
  problems: [],
  observations: [],
  adverseEvents: [],
  labResults: [],
  treatmentResponse: '',
  treatmentResponseNotes: '',
  nextVisitDate: '',
  followUpInstructions: '',
  additionalNotes: '',
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export default function PatientVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const trialId = decodeURIComponent(String(params.trialId || ''));
  const patientId = decodeURIComponent(String(params.patientId || ''));
  const visitId = decodeURIComponent(String(params.visitId || ''));
  const [trial, setTrial] = useState<TrialProposal | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const proposal = getCachedProposals().find((item) => item.trialId === trialId);
    const currentPatient = proposal ? getPatientForTrial(proposal.trialId, patientId) : undefined;
    setTrial(proposal || null);
    setPatient(currentPatient || null);

    if (!proposal || !currentPatient) return;
    if (visitId === 'new') {
      const nextNumber = (currentPatient.visits?.length || 0) + 1;
      setVisit(makeEmptyVisit(proposal.trialId, currentPatient.id, `Visit ${nextNumber}`));
      return;
    }

    const currentVisit = (currentPatient.visits || []).find(
      (item) => item.id === visitId && item.patientId === currentPatient.id && item.trialId === proposal.trialId
    );
    setVisit(currentVisit || null);
  }, [trialId, patientId, visitId]);

  const visitPath = `/trials/${encodeURIComponent(trialId)}/patients/${encodeURIComponent(patientId)}/visits`;

  const updateVisit = (patch: Partial<PatientVisit>) => {
    setVisit((current) => (current ? { ...current, ...patch } : current));
  };

  const updateArrayItem = <T extends { id: string }, K extends 'medicines' | 'problems' | 'observations' | 'adverseEvents' | 'labResults',>(
    key: K,
    itemId: string,
    patch: Partial<T>
  ) => {
    setVisit((current) => {
      if (!current) return current;
      const entries = (current[key] || []) as T[];
      return {
        ...current,
        [key]: entries.map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry)),
      };
    });
  };

  const addArrayItem = (key: 'medicines' | 'problems' | 'observations' | 'adverseEvents' | 'labResults') => {
    if (!visit) return;
    const id = newId(key);
    if (key === 'medicines') updateVisit({ medicines: [...(visit.medicines || []), { id, medicineName: '' }] });
    if (key === 'problems') updateVisit({ problems: [...(visit.problems || []), { id, problem: '' }] });
    if (key === 'observations') updateVisit({ observations: [...(visit.observations || []), { id }] });
    if (key === 'adverseEvents') updateVisit({ adverseEvents: [...(visit.adverseEvents || []), { id }] });
    if (key === 'labResults') updateVisit({ labResults: [...(visit.labResults || []), { id }] });
  };

  const removeArrayItem = (key: 'medicines' | 'problems' | 'observations' | 'adverseEvents' | 'labResults', id: string) => {
    if (!visit) return;
    if (key === 'medicines') updateVisit({ medicines: visit.medicines?.filter((item) => item.id !== id) });
    if (key === 'problems') updateVisit({ problems: visit.problems?.filter((item) => item.id !== id) });
    if (key === 'observations') updateVisit({ observations: visit.observations?.filter((item) => item.id !== id) });
    if (key === 'adverseEvents') updateVisit({ adverseEvents: visit.adverseEvents?.filter((item) => item.id !== id) });
    if (key === 'labResults') updateVisit({ labResults: visit.labResults?.filter((item) => item.id !== id) });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!trial || !patient || !visit) return;
    if (!visit.visitNumber?.trim() || !visit.visitDate) {
      setErrorMessage('Visit number and visit date are required.');
      setSuccessMessage('');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const savedPatient = saveVisitForPatient(trial.trialId, patient.id, {
        ...visit,
        patientId: patient.id,
        trialId: trial.trialId,
        updatedBy: user?.fullName || 'Demo User',
      });
      const savedVisit = (savedPatient.visits || []).find((item) => item.id === visit.id);
      if (!savedVisit) throw new Error('Visit was not found after saving.');
      setPatient(savedPatient);
      setVisit(savedVisit);
      setSuccessMessage('Visit saved successfully.');
      if (visitId === 'new') {
        router.replace(`${visitPath}?saved=1`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save visit.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!trial || !patient || !visit) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-16 text-center">
            <p className="text-lg font-semibold text-white">Visit not found for this patient and clinical trial.</p>
            <Link href={visitPath} className="mt-4 inline-flex items-center gap-2 text-blue-300 hover:text-blue-200">
              <ArrowLeft className="h-4 w-4" /> Back to visit history
            </Link>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="mx-auto flex-1 w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
          <header className="space-y-4 border-b border-slate-800 pb-6">
            <Link href={visitPath} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to visit history
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Patient Visit</p>
              <h1 className="mt-2 text-2xl font-bold text-white">{patient.fullName} · {visit.visitNumber}</h1>
              <div className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                <p><span className="text-slate-500">Patient:</span> {patient.fullName}</p>
                <p><span className="text-slate-500">Visit:</span> {visit.visitNumber}</p>
                <p><span className="text-slate-500">Visit Date:</span> {formatDate(visit.visitDate)}</p>
                <p><span className="text-slate-500">Clinical Trial:</span> {trial.trialTitle} ({trial.trialId})</p>
                <p><span className="text-slate-500">Patient Code:</span> {patient.patientCode}</p>
                <p><span className="text-slate-500">Centre:</span> {patient.centre || '—'}</p>
              </div>
            </div>
            {visit.id !== 'new' && hasPermission(user, 'create_safety_reports') && (
              <Link
                href={`/pharmacovigilance/new?trialId=${encodeURIComponent(trial.trialId)}&patientId=${encodeURIComponent(patient.id)}&visitId=${encodeURIComponent(visit.id)}`}
                className="inline-flex items-center justify-center rounded-lg border border-rose-700 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-950/40"
              >
                Report Adverse Event
              </Link>
            )}
          </header>

          {errorMessage && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{errorMessage}</p>}
          {successMessage && <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{successMessage}</p>}

          <form onSubmit={handleSave} className="space-y-5">
            <Section title="1. Visit Information">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Visit Number" value={visit.visitNumber || ''} onChange={(value) => updateVisit({ visitNumber: value })} required />
                <Field label="Visit Date" type="date" value={visit.visitDate || ''} onChange={(value) => updateVisit({ visitDate: value })} required />
                <Field label="Visit Type" value={visit.visitType || ''} onChange={(value) => updateVisit({ visitType: value })} placeholder="Baseline / Follow-up" />
                <SelectField label="Visit Status" value={visit.status || 'Scheduled'} options={['Scheduled', 'Completed', 'Missed']} onChange={(value) => updateVisit({ status: value as PatientVisit['status'] })} />
                <Field label="Doctor / Investigator" value={visit.doctorInvestigator || ''} onChange={(value) => updateVisit({ doctorInvestigator: value })} />
                <Field label="Visit Notes" value={visit.visitNotes || ''} onChange={(value) => updateVisit({ visitNotes: value })} />
              </div>
            </Section>

            <Section title="2. Medicine Provided" action={<AddButton onClick={() => addArrayItem('medicines')}>Add Medicine</AddButton>}>
              {(visit.medicines || []).length === 0 && <EmptyMessage>No medicines recorded for this visit.</EmptyMessage>}
              {(visit.medicines || []).map((medicine) => (
                <EntryCard key={medicine.id} onRemove={() => removeArrayItem('medicines', medicine.id)}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Medicine Name" value={medicine.medicineName} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { medicineName: value })} />
                    <Field label="Formulation" value={medicine.formulation || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { formulation: value })} />
                    <Field label="Batch Number" value={medicine.batchNumber || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { batchNumber: value })} />
                    <Field label="Dose" value={medicine.dose || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { dose: value })} />
                    <Field label="Unit" value={medicine.unit || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { unit: value })} />
                    <Field label="Frequency" value={medicine.frequency || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { frequency: value })} />
                    <Field label="Route" value={medicine.route || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { route: value })} />
                    <Field label="Quantity Provided" value={medicine.quantityProvided || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { quantityProvided: value })} />
                    <Field label="Date Provided" type="date" value={medicine.dateProvided || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { dateProvided: value })} />
                    <Field label="Start Date" type="date" value={medicine.startDate || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { startDate: value })} />
                    <Field label="End Date" type="date" value={medicine.endDate || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { endDate: value })} />
                    <Field label="Purpose / Indication" value={medicine.purpose || ''} onChange={(value) => updateArrayItem<VisitMedicine, 'medicines'>('medicines', medicine.id, { purpose: value })} />
                  </div>
                </EntryCard>
              ))}
            </Section>

            <Section title="3. Patient Problems / Complaints" action={<AddButton onClick={() => addArrayItem('problems')}>Add Problem</AddButton>}>
              {(visit.problems || []).length === 0 && <EmptyMessage>No problems or complaints recorded for this visit.</EmptyMessage>}
              {(visit.problems || []).map((problem) => (
                <EntryCard key={problem.id} onRemove={() => removeArrayItem('problems', problem.id)}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Problem / Chief Complaint" value={problem.problem || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { problem: value })} />
                    <Field label="Symptoms" value={problem.symptoms || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { symptoms: value })} />
                    <Field label="Severity" value={problem.severity || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { severity: value })} placeholder="Mild / Moderate / Severe" />
                    <Field label="Onset Date" type="date" value={problem.onsetDate || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { onsetDate: value })} />
                    <Field label="Duration" value={problem.duration || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { duration: value })} />
                    <Field label="Current Status" value={problem.currentStatus || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { currentStatus: value })} placeholder="Improving / Ongoing / Resolved" />
                    <Field label="Doctor Observation" value={problem.doctorObservation || ''} onChange={(value) => updateArrayItem<VisitProblem, 'problems'>('problems', problem.id, { doctorObservation: value })} />
                  </div>
                </EntryCard>
              ))}
            </Section>

            <Section title="4. Clinical Observations" action={<AddButton onClick={() => addArrayItem('observations')}>Add Observation</AddButton>}>
              {(visit.observations || []).length === 0 && <EmptyMessage>No clinical observations recorded for this visit.</EmptyMessage>}
              {(visit.observations || []).map((observation) => (
                <EntryCard key={observation.id} onRemove={() => removeArrayItem('observations', observation.id)}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Temperature" value={observation.temperature || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { temperature: value })} />
                    <Field label="Pulse" value={observation.pulse || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { pulse: value })} />
                    <Field label="Blood Pressure" value={observation.bloodPressure || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { bloodPressure: value })} />
                    <Field label="Weight" value={observation.weight || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { weight: value })} />
                    <Field label="Other Clinical Observations" value={observation.otherObservations || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { otherObservations: value })} />
                    <Field label="Ayurvedic Observations" value={observation.ayurvedicObservations || ''} onChange={(value) => updateArrayItem<VisitObservation, 'observations'>('observations', observation.id, { ayurvedicObservations: value })} />
                  </div>
                </EntryCard>
              ))}
            </Section>

            <Section title="5. Side Effects / ADR" action={<AddButton onClick={() => addArrayItem('adverseEvents')}>Add Side Effect</AddButton>}>
              {(visit.adverseEvents || []).length === 0 && <EmptyMessage>No side effects or adverse events recorded for this visit.</EmptyMessage>}
              {(visit.adverseEvents || []).map((event) => (
                <EntryCard key={event.id} onRemove={() => removeArrayItem('adverseEvents', event.id)}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Side Effect / Adverse Event" value={event.sideEffect || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { sideEffect: value })} />
                    <Field label="Date" type="date" value={event.date || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { date: value })} />
                    <Field label="Severity" value={event.severity || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { severity: value })} />
                    <SelectField label="Seriousness" value={event.seriousness || ''} options={['', 'Serious', 'Non-serious']} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { seriousness: value as VisitAdverseEvent['seriousness'] })} />
                    <Field label="Suspected Medicine" value={event.suspectedMedicine || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { suspectedMedicine: value })} />
                    <Field label="Action Taken" value={event.actionTaken || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { actionTaken: value })} />
                    <Field label="Treatment Given" value={event.treatmentGiven || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { treatmentGiven: value })} />
                    <Field label="Outcome" value={event.outcome || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { outcome: value })} />
                    <Field label="Additional Notes" value={event.additionalNotes || ''} onChange={(value) => updateArrayItem<VisitAdverseEvent, 'adverseEvents'>('adverseEvents', event.id, { additionalNotes: value })} />
                  </div>
                </EntryCard>
              ))}
            </Section>

            <Section title="6. Laboratory / Test Results" action={<AddButton onClick={() => addArrayItem('labResults')}>Add Test Result</AddButton>}>
              {(visit.labResults || []).length === 0 && <EmptyMessage>No laboratory or test results recorded for this visit.</EmptyMessage>}
              {(visit.labResults || []).map((result) => (
                <EntryCard key={result.id} onRemove={() => removeArrayItem('labResults', result.id)}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Test Name" value={result.testName || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { testName: value })} />
                    <Field label="Test Date" type="date" value={result.testDate || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { testDate: value })} />
                    <Field label="Result" value={result.result || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { result: value })} />
                    <Field label="Unit" value={result.unit || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { unit: value })} />
                    <Field label="Reference Range" value={result.referenceRange || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { referenceRange: value })} />
                    <SelectField label="Normal / Abnormal" value={result.interpretation || ''} options={['', 'Normal', 'Abnormal']} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { interpretation: value as VisitLabResult['interpretation'] })} />
                    <Field label="Remarks" value={result.remarks || ''} onChange={(value) => updateArrayItem<VisitLabResult, 'labResults'>('labResults', result.id, { remarks: value })} />
                  </div>
                </EntryCard>
              ))}
            </Section>

            <Section title="7. Doctor / Investigator Notes">
              <Field label="Doctor / Investigator Notes" value={visit.visitNotes || ''} onChange={(value) => updateVisit({ visitNotes: value })} />
            </Section>

            <Section title="8. Treatment Response">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Response" value={visit.treatmentResponse || ''} options={['', 'Improvement', 'No Change', 'Worsened']} onChange={(value) => updateVisit({ treatmentResponse: value as PatientVisit['treatmentResponse'] })} />
                <Field label="Treatment Response Notes" value={visit.treatmentResponseNotes || ''} onChange={(value) => updateVisit({ treatmentResponseNotes: value })} />
              </div>
            </Section>

            <Section title="9. Next Visit">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Next Visit Date" type="date" value={visit.nextVisitDate || ''} onChange={(value) => updateVisit({ nextVisitDate: value })} />
                <Field label="Follow-up Instructions" value={visit.followUpInstructions || ''} onChange={(value) => updateVisit({ followUpInstructions: value })} />
                <Field label="Additional Notes" value={visit.additionalNotes || ''} onChange={(value) => updateVisit({ additionalNotes: value })} />
              </div>
            </Section>

            <div className="flex justify-end border-t border-slate-800 pt-5">
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60">
                <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <h2 className="font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md border border-blue-700/70 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-600/10">
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function EntryCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex justify-end">
        <button type="button" onClick={onRemove} aria-label="Remove entry" className="text-slate-500 hover:text-rose-300">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
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
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
        {options.map((option) => <option key={option} value={option}>{option || 'Select...'}</option>)}
      </select>
    </label>
  );
}
