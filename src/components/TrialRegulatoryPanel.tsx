'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, FileText, ShieldCheck } from 'lucide-react';
import { User, RegulatoryApprovalStatus, RegulatoryDocument, TrialProposal, TrialRegulatoryRecord } from '@/lib/types';
import {
  createDefaultTrialRegulatoryRecord,
  getTrialActivationIssues,
  saveTrialRegulatoryRecord,
} from '@/lib/proposalStorage';
import { hasPermission } from '@/lib/permissions';

const APPROVAL_STATUSES: readonly RegulatoryApprovalStatus[] = [
  'Not Started',
  'Submitted',
  'Under Review',
  'Approved',
  'Returned for Correction',
  'Rejected',
];
const CTRI_STATUSES = ['Not Submitted', 'Submitted', 'Under Review', 'Registered', 'Returned for Correction'] as const;

interface TrialRegulatoryPanelProps {
  trial: TrialProposal;
  user: User | null;
  onSaved: (trial: TrialProposal) => void;
}

const dateLabel = (date?: string) => {
  if (!date) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
};

function InputField({
  label,
  value,
  onChange,
  disabled = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm text-slate-300 ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function DocumentField({
  label,
  document,
  disabled,
  uploadedBy,
  onChange,
}: {
  label: string;
  document?: RegulatoryDocument;
  disabled: boolean;
  uploadedBy: string;
  onChange: (document?: RegulatoryDocument) => void;
}) {
  const [error, setError] = useState('');

  const handleFile = (file?: File) => {
    setError('');
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError('Choose a document smaller than 1 MB for browser storage.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only PDF, JPEG, and PNG documents are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('The selected document could not be read.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('The selected document could not be read.');
        return;
      }
      onChange({
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span className="text-slate-300">{label}</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0])}
          className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100 disabled:opacity-60"
        />
      </label>
      {document && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <FileText className="h-4 w-4" />
          <span>{document.fileName} · uploaded {dateLabel(document.uploadedAt.slice(0, 10))}</span>
          {document.dataUrl && <a href={document.dataUrl} download={document.fileName} className="text-blue-300 underline">Open/download</a>}
          {!disabled && <button type="button" onClick={() => onChange(undefined)} className="text-rose-300 underline">Remove</button>}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}

export function TrialRegulatoryPanel({ trial, user, onSaved }: TrialRegulatoryPanelProps) {
  const [draft, setDraft] = useState<TrialRegulatoryRecord>(
    () => trial.regulatory || createDefaultTrialRegulatoryRecord()
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const canManage = hasPermission(user, 'manage_trial_regulatory');
  const canApprove = hasPermission(user, 'approve_trial_regulatory');
  const canConfigure = hasPermission(user, 'manage_trial_configuration');
  const issues = useMemo(
    () => getTrialActivationIssues({ ...trial, regulatory: draft }),
    [draft, trial]
  );

  useEffect(() => {
    setDraft(trial.regulatory || createDefaultTrialRegulatoryRecord());
  }, [trial.regulatory]);

  const updateProtocol = (patch: Partial<TrialRegulatoryRecord['protocol']>) =>
    setDraft((current) => ({ ...current, protocol: { ...current.protocol, ...patch } }));
  const updateEthics = (patch: Partial<TrialRegulatoryRecord['ethics']>) =>
    setDraft((current) => ({ ...current, ethics: { ...current.ethics, ...patch } }));
  const updateCTRI = (patch: Partial<TrialRegulatoryRecord['ctri']>) =>
    setDraft((current) => ({ ...current, ctri: { ...current.ctri, ...patch } }));
  const updateCDSCO = (patch: Partial<TrialRegulatoryRecord['cdsco']>) =>
    setDraft((current) => ({ ...current, cdsco: { ...current.cdsco, ...patch } }));
  const updateReadiness = (patch: Partial<TrialRegulatoryRecord['siteReadiness']>) =>
    setDraft((current) => ({ ...current, siteReadiness: { ...current.siteReadiness, ...patch } }));
  const updateRules = (patch: Partial<TrialRegulatoryRecord['validationRules']>) =>
    setDraft((current) => ({ ...current, validationRules: { ...current.validationRules, ...patch } }));

  const save = () => {
    if (!user) {
      setError('Sign in again to update regulatory records.');
      return;
    }
    try {
      const updated = saveTrialRegulatoryRecord(trial.trialId, draft, user);
      onSaved(updated);
      setError('');
      setSaved('Regulatory records and audit history saved.');
    } catch (saveError) {
      setSaved('');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save regulatory records.');
    }
  };

  const approvals = [
    { name: 'Trial protocol', approved: draft.protocol.approvalStatus === 'Approved' && Boolean(draft.protocol.approvalDocument?.dataUrl), required: draft.validationRules.requireProtocolApproval },
    { name: 'Ethics Committee / IEC', approved: draft.ethics.approvalStatus === 'Approved' && Boolean(draft.ethics.approvalDocument?.dataUrl) && Boolean(draft.ethics.validUntil && draft.ethics.validUntil >= new Date().toISOString().slice(0, 10)), required: draft.validationRules.requireIECapproval },
    { name: 'CTRI registration', approved: draft.ctri.status === 'Registered' && Boolean(draft.ctri.registrationRecord?.dataUrl), required: draft.validationRules.requireCTRIRegistration || draft.validationRules.requireProspectiveCTRIRegistration },
    { name: 'CDSCO/DCGI assessment', approved: Boolean(draft.cdsco.applicabilityReason.trim() && draft.cdsco.authority.trim() && draft.cdsco.reviewer.trim() && draft.cdsco.reviewDate) && (draft.cdsco.requirement === 'No' || (draft.cdsco.requirement === 'Yes' && draft.cdsco.status === 'Approved' && Boolean(draft.cdsco.approvalDocument?.dataUrl))), required: draft.validationRules.requireCDSCOAssessment },
    { name: 'Site readiness', approved: draft.siteReadiness.activationStatus === 'Ready', required: draft.validationRules.requireSiteReadiness },
  ];
  const approvedCount = approvals.filter((item) => item.approved).length;
  const pendingCount = approvals.filter((item) => item.required && !item.approved).length;
  const expired = Boolean(draft.ethics.validUntil && draft.ethics.validUntil < new Date().toISOString().slice(0, 10));
  const expiryDate = draft.ethics.validUntil ? new Date(`${draft.ethics.validUntil}T00:00:00`) : null;
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  const upcomingExpiry = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 60;

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            <ShieldCheck className="h-4 w-4" /> Clinical Trial Details
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Trial Regulatory &amp; Approval</h2>
          <p className="mt-1 text-sm text-slate-400">Regulatory applicability and approval evidence are reviewed per trial; CDSCO/DCGI permission is not presumed.</p>
        </div>
        <button type="button" onClick={save} disabled={!canManage} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
          Save regulatory records
        </button>
      </header>

      {!canManage && <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-sm text-amber-200">Read-only: you do not have permission to manage trial regulatory records.</p>}
      {error && <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-300">{saved}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <DashboardCard label="Pending approvals" value={pendingCount} tone="amber" />
        <DashboardCard label="Approved items" value={approvedCount} tone="emerald" />
        <DashboardCard label="Expired documents" value={expired ? 1 : 0} tone={expired ? 'rose' : 'slate'} />
        <DashboardCard label="Upcoming expiry (60d)" value={upcomingExpiry ? 1 : 0} tone={upcomingExpiry ? 'amber' : 'slate'} />
        <DashboardCard label="Activation readiness" value={issues.length === 0 ? 'Ready' : 'Blocked'} tone={issues.length === 0 ? 'emerald' : 'rose'} />
      </div>

      {(expired || upcomingExpiry || issues.length > 0) && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-semibold text-amber-200">
            <CircleAlert className="h-4 w-4" />
            {expired ? `IEC approval expired ${dateLabel(draft.ethics.validUntil)}.` : upcomingExpiry ? `IEC approval expires ${dateLabel(draft.ethics.validUntil)}.` : 'Activation checks'}
          </p>
          {issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-amber-100/90">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
        </div>
      )}

      <RegulatoryGroup title="1. Trial Protocol">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Protocol number" value={draft.protocol.number} disabled={!canManage} onChange={(number) => updateProtocol({ number })} />
          <InputField label="Protocol version" value={draft.protocol.version} disabled={!canManage} onChange={(version) => updateProtocol({ version })} />
          <InputField label="Protocol title" value={draft.protocol.title} disabled={!canManage} onChange={(title) => updateProtocol({ title })} />
          <InputField label="Version date" type="date" value={draft.protocol.versionDate} disabled={!canManage} onChange={(versionDate) => updateProtocol({ versionDate })} />
          <InputField label="PI" value={draft.protocol.principalInvestigator} disabled={!canManage} onChange={(principalInvestigator) => updateProtocol({ principalInvestigator })} />
          <SelectField label="Protocol approval status" value={draft.protocol.approvalStatus} options={APPROVAL_STATUSES} disabled={!canApprove} onChange={(approvalStatus) => updateProtocol({ approvalStatus })} />
          <DocumentField label="Protocol approval document" document={draft.protocol.approvalDocument} disabled={!canManage} uploadedBy={user?.fullName || 'Unknown user'} onChange={(approvalDocument) => updateProtocol({ approvalDocument })} />
        </div>
      </RegulatoryGroup>

      <RegulatoryGroup title="2. Ethics Committee / IEC">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="IEC name" value={draft.ethics.name} disabled={!canManage} onChange={(name) => updateEthics({ name })} />
          <InputField label="IEC registration details" value={draft.ethics.registrationDetails} disabled={!canManage} onChange={(registrationDetails) => updateEthics({ registrationDetails })} />
          <InputField label="Application/reference number" value={draft.ethics.referenceNumber} disabled={!canManage} onChange={(referenceNumber) => updateEthics({ referenceNumber })} />
          <InputField label="Submission date" type="date" value={draft.ethics.submissionDate} disabled={!canManage} onChange={(submissionDate) => updateEthics({ submissionDate })} />
          <SelectField label="Approval status" value={draft.ethics.approvalStatus} options={APPROVAL_STATUSES} disabled={!canApprove} onChange={(approvalStatus) => updateEthics({ approvalStatus })} />
          <InputField label="Approval date" type="date" value={draft.ethics.approvalDate} disabled={!canManage} onChange={(approvalDate) => updateEthics({ approvalDate })} />
          <InputField label="Approval validity / valid until" type="date" value={draft.ethics.validUntil} disabled={!canManage} onChange={(validUntil) => updateEthics({ validUntil })} />
          <InputField label="Approved protocol version" value={draft.ethics.approvedProtocolVersion} disabled={!canManage} onChange={(approvedProtocolVersion) => updateEthics({ approvedProtocolVersion })} />
          <InputField label="Approved informed-consent version" value={draft.ethics.approvedConsentVersion} disabled={!canManage} onChange={(approvedConsentVersion) => updateEthics({ approvedConsentVersion })} />
          <DocumentField label="IEC approval document" document={draft.ethics.approvalDocument} disabled={!canManage} uploadedBy={user?.fullName || 'Unknown user'} onChange={(approvalDocument) => updateEthics({ approvalDocument })} />
          <div className="md:col-span-2"><TextAreaField label="Changes requested / remarks" value={draft.ethics.remarks} disabled={!canManage} onChange={(remarks) => updateEthics({ remarks })} /></div>
        </div>
      </RegulatoryGroup>

      <RegulatoryGroup title="3. CTRI Registration">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="CTRI reference number" value={draft.ctri.referenceNumber} disabled={!canManage} onChange={(referenceNumber) => updateCTRI({ referenceNumber })} />
          <InputField label="CTRI registration number" value={draft.ctri.registrationNumber} disabled={!canManage} onChange={(registrationNumber) => updateCTRI({ registrationNumber })} />
          <InputField label="Submission date" type="date" value={draft.ctri.submissionDate} disabled={!canManage} onChange={(submissionDate) => updateCTRI({ submissionDate })} />
          <InputField label="Registration date" type="date" value={draft.ctri.registrationDate} disabled={!canManage} onChange={(registrationDate) => updateCTRI({ registrationDate })} />
          <SelectField label="CTRI status" value={draft.ctri.status} options={CTRI_STATUSES} disabled={!canApprove} onChange={(status) => updateCTRI({ status })} />
          <DocumentField label="Registration record / PDF" document={draft.ctri.registrationRecord} disabled={!canManage} uploadedBy={user?.fullName || 'Unknown user'} onChange={(registrationRecord) => updateCTRI({ registrationRecord })} />
          <p className="md:col-span-2 rounded-lg border border-blue-800/50 bg-blue-950/20 p-3 text-sm text-blue-100">When prospective registration is required, the registration date must be before the first participant enrollment date. This is re-checked by the enrollment storage helper.</p>
        </div>
      </RegulatoryGroup>

      <RegulatoryGroup title="4. CDSCO / DCGI Regulatory Assessment">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Requirement status" value={draft.cdsco.requirement} options={['Yes', 'No', 'To Be Determined']} disabled={!canApprove} onChange={(requirement) => updateCDSCO({ requirement })} />
          <InputField label="Relevant authority" value={draft.cdsco.authority} disabled={!canManage} onChange={(authority) => updateCDSCO({ authority })} />
          <InputField label="Application / permission number" value={draft.cdsco.applicationNumber} disabled={!canManage} onChange={(applicationNumber) => updateCDSCO({ applicationNumber })} />
          <InputField label="Submission date" type="date" value={draft.cdsco.submissionDate} disabled={!canManage} onChange={(submissionDate) => updateCDSCO({ submissionDate })} />
          <InputField label="Approval date" type="date" value={draft.cdsco.approvalDate} disabled={!canManage} onChange={(approvalDate) => updateCDSCO({ approvalDate })} />
          <SelectField label="Application status" value={draft.cdsco.status} options={APPROVAL_STATUSES} disabled={!canApprove} onChange={(status) => updateCDSCO({ status })} />
          <InputField label="Reviewer" value={draft.cdsco.reviewer} disabled={!canManage} onChange={(reviewer) => updateCDSCO({ reviewer })} />
          <InputField label="Review date" type="date" value={draft.cdsco.reviewDate} disabled={!canManage} onChange={(reviewDate) => updateCDSCO({ reviewDate })} />
          <DocumentField label="Approval document" document={draft.cdsco.approvalDocument} disabled={!canManage} uploadedBy={user?.fullName || 'Unknown user'} onChange={(approvalDocument) => updateCDSCO({ approvalDocument })} />
          <div className="md:col-span-2"><TextAreaField label="Reason for applicability decision (product classification, study type, applicable rules)" value={draft.cdsco.applicabilityReason} disabled={!canManage} onChange={(applicabilityReason) => updateCDSCO({ applicabilityReason })} /></div>
        </div>
      </RegulatoryGroup>

      <RegulatoryGroup title="5. Site & Investigator Readiness">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Site activation status" value={draft.siteReadiness.activationStatus} options={['Not Ready', 'In Progress', 'Ready']} disabled={!canManage} onChange={(activationStatus) => updateReadiness({ activationStatus })} />
          <InputField label="Assigned PI" value={draft.siteReadiness.principalInvestigator} disabled={!canManage} onChange={(principalInvestigator) => updateReadiness({ principalInvestigator })} />
          <div className="md:col-span-2"><TextAreaField label="Assigned investigators (one per line)" value={draft.siteReadiness.investigators.join('\n')} disabled={!canManage} onChange={(value) => updateReadiness({ investigators: value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean) })} /></div>
          <InputField label="Approved protocol version" value={draft.siteReadiness.approvedProtocolVersion} disabled={!canManage} onChange={(approvedProtocolVersion) => updateReadiness({ approvedProtocolVersion })} />
          <InputField label="Approved consent version" value={draft.siteReadiness.approvedConsentVersion} disabled={!canManage} onChange={(approvedConsentVersion) => updateReadiness({ approvedConsentVersion })} />
          <CheckField label="Investigator qualification verification complete" checked={draft.siteReadiness.qualificationsVerified} disabled={!canManage} onChange={(qualificationsVerified) => updateReadiness({ qualificationsVerified })} />
          <CheckField label="Medicine available" checked={draft.siteReadiness.medicineAvailable} disabled={!canManage} onChange={(medicineAvailable) => updateReadiness({ medicineAvailable })} />
          <CheckField label="Safety-reporting readiness confirmed" checked={draft.siteReadiness.safetyReportingReady} disabled={!canManage} onChange={(safetyReportingReady) => updateReadiness({ safetyReportingReady })} />
          <div className="md:col-span-2"><TextAreaField label="Readiness checklist" value={draft.siteReadiness.readinessChecklist} disabled={!canManage} onChange={(readinessChecklist) => updateReadiness({ readinessChecklist })} /></div>
          <div className="md:col-span-2"><TextAreaField label="Reviewer remarks" value={draft.siteReadiness.reviewerRemarks} disabled={!canManage} onChange={(reviewerRemarks) => updateReadiness({ reviewerRemarks })} /></div>
        </div>
      </RegulatoryGroup>

      <RegulatoryGroup title="Configurable validation rules">
        <div className="grid gap-3 md:grid-cols-2">
          <CheckField label="Require approved protocol and document" checked={draft.validationRules.requireProtocolApproval} disabled={!canConfigure} onChange={(requireProtocolApproval) => updateRules({ requireProtocolApproval })} />
          <CheckField label="Require current IEC approval" checked={draft.validationRules.requireIECapproval} disabled={!canConfigure} onChange={(requireIECapproval) => updateRules({ requireIECapproval })} />
          <CheckField label="Require CTRI registration" checked={draft.validationRules.requireCTRIRegistration} disabled={!canConfigure} onChange={(requireCTRIRegistration) => updateRules({ requireCTRIRegistration })} />
          <CheckField label="Require a CDSCO/DCGI applicability decision" checked={draft.validationRules.requireCDSCOAssessment} disabled={!canConfigure} onChange={(requireCDSCOAssessment) => updateRules({ requireCDSCOAssessment })} />
          <CheckField label="Require site readiness" checked={draft.validationRules.requireSiteReadiness} disabled={!canConfigure} onChange={(requireSiteReadiness) => updateRules({ requireSiteReadiness })} />
          <CheckField label="Require CTRI registration before first enrollment" checked={draft.validationRules.requireProspectiveCTRIRegistration} disabled={!canConfigure} onChange={(requireProspectiveCTRIRegistration) => updateRules({ requireProspectiveCTRIRegistration })} />
          <CheckField label="Require completed treatment for a certificate" checked={draft.validationRules.requireCompletedTreatmentForCertificate} disabled={!canConfigure} onChange={(requireCompletedTreatmentForCertificate) => updateRules({ requireCompletedTreatmentForCertificate })} />
          <CheckField label="Require dated treatment/medicine records for a certificate" checked={draft.validationRules.requireRecordedTreatmentForCertificate} disabled={!canConfigure} onChange={(requireRecordedTreatmentForCertificate) => updateRules({ requireRecordedTreatmentForCertificate })} />
          <InputField label="Minimum completed visits for certificate" type="number" value={String(draft.validationRules.minimumCompletedVisitsForCertificate)} disabled={!canConfigure} onChange={(value) => updateRules({ minimumCompletedVisitsForCertificate: Math.max(0, Number(value) || 0) })} />
        </div>
        {!canConfigure && <p className="text-xs text-slate-500">Changing these rules requires the Manage Trial Configuration permission.</p>}
      </RegulatoryGroup>

      {user && hasPermission(user, 'view_audit_logs') && (
        <RegulatoryGroup title={`Regulatory audit trail (${draft.auditTrail.length})`}>
          {draft.auditTrail.length === 0 ? <p className="text-sm text-slate-400">No changes recorded yet.</p> : (
            <div className="space-y-2">
              {[...draft.auditTrail].reverse().map((entry) => (
                <details key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
                  <summary className="cursor-pointer text-slate-200">{entry.action} · {entry.changedBy} · {dateLabel(entry.changedAt.slice(0, 10))}</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-slate-400">Before: {entry.before}</pre>
                    <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-slate-400">After: {entry.after}</pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </RegulatoryGroup>
      )}

      <div className={`flex items-center gap-2 text-sm ${issues.length === 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
        {issues.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
        Trial activation {issues.length === 0 ? 'ready for authorized activation' : 'is blocked until required checks are complete'}.
      </div>
    </section>
  );
}

function DashboardCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    slate: 'text-slate-300',
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function RegulatoryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <legend className="px-2 text-base font-semibold text-white">{title}</legend>
      {children}
    </fieldset>
  );
}
