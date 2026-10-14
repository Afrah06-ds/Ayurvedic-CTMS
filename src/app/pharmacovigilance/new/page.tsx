'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useDrugs } from '@/context/DrugContext';
import { getPatientsForTrial } from '@/lib/patientStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import { createSafetyReport, getSafetyReportContext, SafetyReportDraft } from '@/lib/safetyStorage';
import { Patient, TrialProposal, PatientVisit, SafetyDocument } from '@/lib/types';
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
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><NewSafetyReportForm /></Suspense>;
}

function NewSafetyReportForm() {
  const { user } = useAuth();
  const { drugs } = useDrugs();
  const router = useRouter();
  const search = useSearchParams();
  const [trialId, setTrialId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
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

  useEffect(() => {
    if (!user) return;
    try {
      const trials = getCachedProposals().filter((item) =>
        hasPermission(user, 'view_safety_reports') &&
        user.assignedTrialIds?.some((assigned) => assigned === item.id || assigned === item.trialId)
      );
      setAvailableTrials(trials);
      const initialTrialId = search.get('trialId') || '';
      const initialPatientId = search.get('patientId') || '';
      const initialVisitId = search.get('visitId') || '';
      const initialAdverseEventId = search.get('adverseEventId') || '';
      if (initialTrialId) setTrialId(initialTrialId);
      if (initialPatientId) setPatientId(initialPatientId);
      if (initialVisitId) setVisitId(initialVisitId);
      const context = getSafetyReportContext(initialTrialId, initialPatientId, initialVisitId);
      setTrial(context.trial || null);
      setPatient(context.patient || null);
      setVisit(context.visit || null);
      if (context.patient) setAvailablePatients([context.patient]);
      if (context.patient && context.visit) {
        const linkedEvent = context.visit.adverseEvents?.find((event) => event.id === initialAdverseEventId)
          || context.visit.adverseEvents?.[0];
        const visitMedicine = context.visit.medicines?.find((medicine) =>
          !linkedEvent?.suspectedMedicine || medicine.medicineName === linkedEvent.suspectedMedicine
        );
        const selectedMedicine = drugs.find((drug) =>
          drug.drugName === linkedEvent?.suspectedMedicine || drug.drugName === visitMedicine?.medicineName
        );
        setDraft((current) => ({
          ...current,
          centre: context.patient?.centre || '',
          symptomsFindings: context.visit?.adverseEvents?.map((event) => event.sideEffect).filter(Boolean).join('; ') || '',
          eventTerm: linkedEvent?.sideEffect || '',
          onsetDateTime: linkedEvent?.date || '',
          medicineActionTaken: linkedEvent?.actionTaken || '',
          eventTreatment: linkedEvent?.treatmentGiven || '',
          patientOutcome: linkedEvent?.outcome || 'Unknown',
          suspectedMedicineId: selectedMedicine?.id || '',
          dose: visitMedicine?.dose || '',
          frequency: visitMedicine?.frequency || '',
          route: visitMedicine?.route || selectedMedicine?.routeOfAdministration || '',
          treatmentStartDate: visitMedicine?.startDate || visitMedicine?.dateProvided || '',
          lastDoseDate: visitMedicine?.endDate || '',
          batchNumber: visitMedicine?.batchNumber || selectedMedicine?.batchNumber || '',
          formulation: visitMedicine?.formulation || selectedMedicine?.formulationName || '',
        }));
      }
      setLoadingError('');
    } catch (loadError) {
      setLoadingError(loadError instanceof Error ? loadError.message : 'Patient/trial records could not be loaded.');
    }
  }, [user, search, drugs]);

  useEffect(() => {
    if (!user || !trialId) return;
    try {
      const trials = getCachedProposals();
      const selected = trials.find((item) => item.trialId === trialId) || null;
      const assigned = selected && user.assignedTrialIds?.some((id) => id === selected.id || id === selected.trialId);
      if (!assigned) {
        setTrial(null);
        setAvailablePatients([]);
        return;
      }
      setTrial(selected);
      const allTrialPatients = selected ? getPatientsForTrial(selected.trialId) : [];
      setAvailablePatients(allTrialPatients);
      setPatient(allTrialPatients.find((item) => item.id === patientId) || null);
      setVisit(allTrialPatients.find((item) => item.id === patientId)?.visits?.find((item) => item.id === visitId) || null);
    } catch (loadError) {
      setLoadingError(loadError instanceof Error ? loadError.message : 'Trial patients could not be loaded.');
    }
  }, [user, trialId, patientId, visitId]);

  const selectedDrug = drugs.find((drug) => drug.id === draft.suspectedMedicineId);
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
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Unable to read ${file.name}.`));
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('Sign in with an active account before submitting a safety report.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const context = getSafetyReportContext(trialId, patientId, visitId);
      if (!context.trial || !context.patient || !context.visit) {
        throw new Error('Select an assigned trial, an existing patient in that trial, and one of that patient’s visits.');
      }
      const report = createSafetyReport({
        ...draft,
        trialId: context.trial.trialId,
        patientId: context.patient.id,
        visitId: context.visit.id,
      }, user);
      router.push(`/pharmacovigilance?trialId=${encodeURIComponent(report.trialId)}&reportId=${encodeURIComponent(report.id)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Safety report could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <ProtectedRoute><div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="mx-auto max-w-5xl p-8"><p className="rounded-lg border border-rose-800 bg-rose-950/40 p-4">You do not have permission to create safety reports.</p></main></div></ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-5">
            <div><Link href="/pharmacovigilance" className="text-sm text-blue-300">← Pharmacovigilance</Link><h1 className="mt-2 text-2xl font-bold text-white">Create Safety Report</h1><p className="mt-1 text-sm text-slate-400">Use existing clinical trial, patient, visit and medicine records. Unknown information remains explicitly unknown.</p></div>
          </header>
          {loadingError && <Alert text={loadingError} />}
          {error && <Alert text={error} />}
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-100">A suspected event is not proof of medicine causality. Qualified reviewers record causality separately.</div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section title="Patient, trial and visit">
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Clinical trial" value={trialId} disabled={Boolean(search.get('trialId'))} onChange={setTrialId} options={[['', 'Select assigned trial'], ...availableTrials.map((item): [string, string] => [item.trialId, `${item.trialId} — ${item.trialTitle}`])]} />
                <Select label="Existing patient" value={patientId} disabled={Boolean(search.get('patientId'))} onChange={setPatientId} options={[['', 'Select patient'], ...availablePatients.map((item): [string, string] => [item.id, `${item.patientCode} — ${item.fullName}`])]} />
                <Select label="Related existing visit" value={visitId} disabled={Boolean(search.get('visitId'))} onChange={setVisitId} options={[['', 'Select visit'], ...(patient?.visits || []).map((item): [string, string] => [item.id, `${item.visitNumber || item.id} · ${item.visitDate || 'Date unknown'}`])]} />
                <Readonly label="Patient code" value={patient?.patientCode || '—'} />
                <Readonly label="Patient ID" value={patient?.id || '—'} />
                <Readonly label="Centre" value={patient?.centre || 'Unknown'} />
                <Readonly label="Enrollment number" value={patient?.enrollment?.enrollmentNumber || 'Not Available'} />
                <Readonly label="Reported by" value={`${user?.fullName || '—'} (${user?.userType || '—'})`} />
                <Readonly label="Report date and time" value={new Date().toLocaleString()} />
              </div>
            </Section>

            <Section title="Event details">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event / reaction term" required value={draft.eventTerm} onChange={(value) => update('eventTerm', value)} />
                <Select label="Event status" value={draft.eventStatus} onChange={(value) => update('eventStatus', value as DraftState['eventStatus'])} options={['Ongoing', 'Resolved', 'Unknown']} />
                <Field label="Onset date and time (or Unknown)" required value={draft.onsetDateTime} onChange={(value) => update('onsetDateTime', value)} placeholder="YYYY-MM-DD HH:mm / Unknown" />
                <Field label="End date and time (or Unknown / Ongoing)" value={draft.endDateTime} onChange={(value) => update('endDateTime', value)} placeholder="YYYY-MM-DD HH:mm / Unknown" />
                <Area label="Detailed description" required value={draft.description} onChange={(value) => update('description', value)} />
                <Area label="Symptoms and clinical findings" value={draft.symptomsFindings} onChange={(value) => update('symptomsFindings', value)} />
                <Area label="Treatment provided for event" value={draft.eventTreatment} onChange={(value) => update('eventTreatment', value)} />
                <Area label="Relevant laboratory findings" value={draft.relevantLaboratoryFindings} onChange={(value) => update('relevantLaboratoryFindings', value)} />
                <Area label="Medical history" value={draft.medicalHistory} onChange={(value) => update('medicalHistory', value)} />
                <Area label="Concomitant medicines" value={draft.concomitantMedicines} onChange={(value) => update('concomitantMedicines', value)} />
              </div>
            </Section>

            <Section title="Suspected medicine — existing medicine master">
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Medicine ID and name" value={draft.suspectedMedicineId} onChange={(value) => {
                  update('suspectedMedicineId', value);
                  const medicine = drugs.find((item) => item.id === value);
                  if (medicine) {
                    update('formulation', medicine.formulationName);
                    update('batchNumber', medicine.batchNumber);
                    update('route', medicine.routeOfAdministration);
                    update('indication', medicine.indication);
                  }
                }} options={[['', 'Select medicine'], ['Unknown', 'Unknown'], ['Not Available', 'Not Available'], ['Not Applicable', 'Not Applicable'], ...drugs.map((item): [string, string] => [item.id, `${item.id} — ${item.drugName}`])]} />
                <Readonly label="Formulation" value={selectedDrug?.formulationName || draft.formulation || 'Not Available'} />
                <Readonly label="Batch / lot number" value={selectedDrug?.batchNumber || draft.batchNumber || 'Not Available'} />
                <Field label="Dose (or Unknown / Not Available)" value={draft.dose} onChange={(value) => update('dose', value)} />
                <Field label="Frequency (or Unknown / Not Available)" value={draft.frequency} onChange={(value) => update('frequency', value)} />
                <Readonly label="Route" value={selectedDrug?.routeOfAdministration || draft.route || 'Not Available'} />
                <Field label="Treatment start date (or Unknown)" value={draft.treatmentStartDate} onChange={(value) => update('treatmentStartDate', value)} />
                <Field label="Last dose date (or Unknown / Not Applicable)" value={draft.lastDoseDate} onChange={(value) => update('lastDoseDate', value)} />
                <Readonly label="Indication" value={selectedDrug?.indication || draft.indication || 'Not Available'} />
                <Field label="Action taken with medicine" value={draft.medicineActionTaken} onChange={(value) => update('medicineActionTaken', value)} />
                <Area label="Other suspected / concomitant medicines" value={draft.otherSuspectedMedicines} onChange={(value) => update('otherSuspectedMedicines', value)} />
              </div>
            </Section>

            <Section title="Safety assessment">
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Severity" value={draft.severity} onChange={(value) => update('severity', value as DraftState['severity'])} options={['Unknown', 'Mild', 'Moderate', 'Severe']} />
                <Select label="Seriousness (separate from severity)" value={draft.seriousness} onChange={(value) => update('seriousness', value as DraftState['seriousness'])} options={['Unknown', 'Non-serious', 'Serious']} />
                {draft.seriousness === 'Serious' && <div className="space-y-2 md:col-span-2"><p className="text-sm font-medium text-rose-200">Seriousness criteria — select all that apply</p>{CRITERIA.map((criterion) => <label key={criterion} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.seriousnessCriteria.includes(criterion)} onChange={(event) => update('seriousnessCriteria', event.target.checked ? [...draft.seriousnessCriteria, criterion] : draft.seriousnessCriteria.filter((value) => value !== criterion))} />{criterion}</label>)}
                  {draft.seriousnessCriteria.includes('Other medically important event') && <Field label="Other criterion details" required value={draft.seriousnessOther} onChange={(value) => update('seriousnessOther', value)} />}
                </div>}
                <Select label="Causality assessment" value={draft.causality} onChange={(value) => update('causality', value)} options={['Unassessable/Unclassifiable', 'Certain', 'Probable/Likely', 'Possible', 'Unlikely']} />
                <Field label="Causality assessment method" value={draft.causalityMethod} onChange={(value) => update('causalityMethod', value)} placeholder="Method used / Not Available" />
                <Select label="Expectedness" value={draft.expectedness} onChange={(value) => update('expectedness', value as DraftState['expectedness'])} options={['Unknown', 'Expected', 'Unexpected', 'Not Applicable']} />
                <Select label="Patient outcome" value={draft.patientOutcome} onChange={(value) => update('patientOutcome', value)} options={['Unknown', 'Ongoing', 'Recovered', 'Recovering', 'Recovered with sequelae', 'Not recovered', 'Fatal', 'Not Available']} />
                <Area label="Clinical assessment" value={draft.clinicalAssessment} onChange={(value) => update('clinicalAssessment', value)} />
                <Area label="Action taken" value={draft.actionTaken} onChange={(value) => update('actionTaken', value)} />
                <Area label="Initial medical review" value={draft.initialMedicalReview} onChange={(value) => update('initialMedicalReview', value)} />
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.followUpRequired} onChange={(event) => update('followUpRequired', event.target.checked)} />Follow-up required</label>
              </div>
            </Section>

            <Section title="Supporting documents">
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => void attachFiles(event.target.files)} className="text-sm text-slate-300" />
              <p className="mt-2 text-xs text-amber-200">This demonstration stores attachments in browser storage, not secure document storage. Do not attach identifiable health records until a protected storage service is configured.</p>
              {draft.documents.map((document) => <p key={document.id} className="mt-2 text-sm text-slate-300">{document.fileName} <button type="button" onClick={() => update('documents', draft.documents.filter((item) => item.id !== document.id))} className="ml-2 text-rose-300 underline">Remove</button></p>)}
            </Section>

            {!visit && <p className="text-right text-sm text-amber-200">Choose a trial, patient, and patient visit before submitting.</p>}
            <div className="flex justify-end gap-3"><Link href="/pharmacovigilance" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</Link><button type="submit" disabled={submitting} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Saving…' : 'Submit safety report'}</button></div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-lg font-semibold text-white">{title}</h2>{children}</section>;
}

function Field({ label, value, onChange, required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><input required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600" /></label>;
}

function Area({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><textarea required={required} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" /></label>;
}

function Select({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: string[] | [string, string][]; disabled?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60">{options.map((item) => {const [optionValue, optionLabel] = Array.isArray(item) ? item : [item, item]; return <option key={optionValue} value={optionValue}>{optionLabel}</option>;})}</select></label>;
}

function Readonly({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1 text-sm"><p className="text-slate-400">{label}</p><p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300">{value}</p></div>;
}

function Alert({ text }: { text: string }) {
  return <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{text}</p>;
}
