'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { createDefaultTrialRegulatoryRecord, getCachedProposals, getSavedProposals, saveTrialRegulatoryRecord } from '@/lib/proposalStorage';
import { getPatientForTrial } from '@/lib/patientStorage';
import {
  addSafetyFollowUp,
  assessSafetyReport,
  closeSafetyReport,
  configureTrialSafetyReporting,
  getSafetyDashboardMetrics,
  getSafetyReportsForUser,
  raiseSafetyDataQuery,
  reopenSafetyReport,
  reviewSafetyReport,
  updateSafetyReporting,
} from '@/lib/safetyStorage';
import { RegulatoryApprovalStatus, SafetyDocument, SafetyReport, TrialProposal, TrialRegulatoryRecord } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { AlertTriangle, ClipboardList, Download, HeartPulse, Plus, ShieldAlert } from 'lucide-react';

const SERIOUSNESS = ['All', 'Serious', 'Non-serious', 'Unknown'] as const;
const STATUSES = ['All', 'Draft', 'Submitted', 'Under Review', 'Follow-up Required', 'Escalated', 'Reporting Pending', 'Reported', 'Closed'] as const;

export default function PharmacovigilancePage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><PharmacovigilanceDashboard /></Suspense>;
}

function PharmacovigilanceDashboard() {
  const { user } = useAuth();
  const search = useSearchParams();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [trials, setTrials] = useState<TrialProposal[]>([]);
  const [regulatoryTrials, setRegulatoryTrials] = useState<TrialProposal[]>([]);
  const [selectedRegulatoryTrialId, setSelectedRegulatoryTrialId] = useState('');
  const [regulatoryError, setRegulatoryError] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [trialFilter, setTrialFilter] = useState(search.get('trialId') || 'All');
  const [centreFilter, setCentreFilter] = useState('All');
  const [medicineFilter, setMedicineFilter] = useState('All');
  const [seriousnessFilter, setSeriousnessFilter] = useState<(typeof SERIOUSNESS)[number]>('All');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('All');
  const [reviewerFilter, setReviewerFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reload, setReload] = useState(0);
  const canView = hasPermission(user, 'view_safety_reports');
  const canViewRegulatory = hasPermission(user, 'view_regulatory_tmf') ||
    hasPermission(user, 'manage_trial_regulatory') ||
    hasPermission(user, 'approve_trial_regulatory');
  const canExport = hasPermission(user, 'export_reports');
  const accessibleTrials = useMemo(() => {
    if (!user) return [];
    return getCachedProposals().filter((trial) =>
      user.assignedTrialIds?.some((id) => id === trial.id || id === trial.trialId)
    );
  }, [user]);

  useEffect(() => {
    if (!user || !canView) return;
    try {
      const currentReports = getSafetyReportsForUser(user);
      setReports(currentReports);
      setTrials(accessibleTrials);
      setError('');
      const reportId = search.get('reportId');
      if (reportId) setSelectedId(reportId);
      else if (selectedId && !currentReports.some((report) => report.id === selectedId)) setSelectedId('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Safety reports could not be loaded.');
      setReports([]);
    }
    if (canViewRegulatory) {
      try {
        setRegulatoryTrials(getSavedProposals());
        setRegulatoryError('');
      } catch (loadError) {
        setRegulatoryTrials([]);
        setRegulatoryError(loadError instanceof Error ? loadError.message : 'Saved clinical trials could not be loaded.');
      }
    } else {
      setRegulatoryTrials([]);
    }
  }, [user, canView, canViewRegulatory, accessibleTrials, reload, search]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    if (trialFilter !== 'All' && report.trialId !== trialFilter) return false;
    if (centreFilter !== 'All' && report.centre !== centreFilter) return false;
    if (medicineFilter !== 'All' && report.suspectedMedicineId !== medicineFilter) return false;
    if (seriousnessFilter !== 'All' && report.seriousness !== seriousnessFilter) return false;
    if (statusFilter !== 'All' && report.reviewStatus !== statusFilter) return false;
    if (reviewerFilter !== 'All' && report.assessedBy !== reviewerFilter) return false;
    const eventDate = report.onsetDateTime.slice(0, 10);
    if (fromDate && eventDate < fromDate) return false;
    if (toDate && eventDate > toDate) return false;
    return true;
  }), [reports, trialFilter, centreFilter, medicineFilter, seriousnessFilter, statusFilter, reviewerFilter, fromDate, toDate]);

  const metrics = getSafetyDashboardMetrics(filteredReports);
  const selectedReport = filteredReports.find((report) => report.id === selectedId) || reports.find((report) => report.id === selectedId) || null;
  const selectedRegulatoryTrial = regulatoryTrials.find((trial) => trial.id === selectedRegulatoryTrialId) || null;
  const trialById = (id: string) => trials.find((trial) => trial.trialId === id);
  const options = {
    centres: [...new Set(reports.map((report) => report.centre).filter(Boolean))],
    medicines: [...new Map(reports.map((report) => [report.suspectedMedicineId, report.suspectedMedicineName])).entries()],
    reviewers: [...new Set(reports.map((report) => report.assessedBy).filter(Boolean))],
  };

  const refresh = (updated: SafetyReport) => {
    setReports((current) => current.map((report) => report.id === updated.id ? updated : report));
  };
  const runAction = (action: () => SafetyReport) => {
    try {
      const updated = action();
      refresh(updated);
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Safety report action failed.');
    }
  };
  const handleExport = () => {
    if (!user || !canExport) return;
    const group = new Map<string, number>();
    filteredReports.forEach((report) => {
      const key = [report.trialId, report.suspectedMedicineName, report.batchNumber, report.severity, report.seriousness, report.reviewStatus, report.patientOutcome].join('|');
      group.set(key, (group.get(key) || 0) + 1);
    });
    const csv = [
      'Trial,Medicine,Formulation,Batch,Severity,Seriousness,Status,Outcome,Report count',
      ...[...group.entries()].map(([key, count]) => `${key},${count}`),
    ].map((row) => `"${row.replace(/"/g, '""')}"`).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'safety-report-aggregates.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) return <ProtectedRoute><div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="mx-auto max-w-5xl p-8"><p className="rounded-lg border border-rose-800 bg-rose-950/40 p-4">You do not have permission to view safety reports.</p></main></div></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar />
        <main className="mx-auto max-w-7xl space-y-7 px-4 py-8">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-300"><HeartPulse className="h-4 w-4" /> Clinical Trial Safety</p><h1 className="mt-2 text-2xl font-bold text-white">Pharmacovigilance &amp; Drug Safety</h1><p className="mt-1 text-sm text-slate-400">Shared safety reports linked to existing trial, patient, visit and medicine records.</p></div>
            {hasPermission(user, 'create_safety_reports') && <Link href="/pharmacovigilance/new" className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"><Plus className="h-4 w-4" /> Create safety report</Link>}
          </header>

          <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-100">Descriptive safety counts only; event counts do not establish medicine causality or safety signals. Reporting deadlines are configured per trial and are not presumed to be universal.</div>
          {error && <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
          {canViewRegulatory && <TrialApprovalStatusPanel
            trials={regulatoryTrials}
            selectedTrial={selectedRegulatoryTrial}
            user={user}
            error={regulatoryError}
            onSelect={setSelectedRegulatoryTrialId}
            onError={setRegulatoryError}
            onSaved={(updatedTrial) => setRegulatoryTrials((current) => current.map((item) => item.id === updatedTrial.id ? updatedTrial : item))}
          />}

          {reports.filter((report) => report.seriousness === 'Serious' && report.reviewStatus !== 'Closed').length > 0 && (
            <section role="alert" className="space-y-2 rounded-xl border-2 border-rose-500 bg-rose-950/70 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-rose-100"><ShieldAlert className="h-5 w-5" /> Serious safety events — urgent review required</h2>
              {reports.filter((report) => report.seriousness === 'Serious' && report.reviewStatus !== 'Closed').map((report) => (
                <button key={report.id} type="button" onClick={() => setSelectedId(report.id)} className="block w-full rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-left text-sm text-rose-100 hover:bg-rose-900/60">
                  {report.reportId} · {report.trialId} · {report.eventTerm} · {report.reviewStatus} · Deadline {report.reportingDeadline || 'not configured'}
                </button>
              ))}
              <p className="text-xs text-rose-200">These alerts cannot be dismissed from the dashboard. Escalation and in-app notification records are retained on each report.</p>
            </section>
          )}
          {user && reports.some((report) => report.notifications.some((notification) => notification.recipientId === user.id)) && (
            <section className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4">
              <h2 className="font-semibold text-amber-100">Safety notifications assigned to you</h2>
              {reports.flatMap((report) => report.notifications.filter((notification) => notification.recipientId === user.id).map((notification) => (
                <button key={notification.id} type="button" onClick={() => setSelectedId(report.id)} className="mt-2 block w-full rounded border border-amber-800/70 p-2 text-left text-sm text-amber-100">
                  {report.reportId} · {report.eventTerm} · {notification.deliveryStatus} · {notification.createdAt}
                </button>
              )))}
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Metric label="Total Safety Reports" value={metrics.total} />
            <Metric label="New Reports" value={metrics.new} />
            <Metric label="Pending Safety Review" value={metrics.pendingReview} />
            <Metric label="Serious Events" value={metrics.serious} danger />
            <Metric label="Follow-up Required" value={metrics.followUp} />
            <Metric label="Reports Submitted" value={metrics.reported} />
            <Metric label="Closed Reports" value={metrics.closed} />
          </section>

          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
              <Filter label="Clinical trial" value={trialFilter} onChange={setTrialFilter} options={['All', ...trials.map((trial) => trial.trialId)]} />
              <Filter label="Centre" value={centreFilter} onChange={setCentreFilter} options={['All', ...options.centres]} />
              <Filter label="Medicine" value={medicineFilter} onChange={setMedicineFilter} options={['All', ...options.medicines.map(([id]) => id)]} display={options.medicines} />
              <Filter label="Seriousness" value={seriousnessFilter} onChange={(value) => setSeriousnessFilter(value as typeof seriousnessFilter)} options={[...SERIOUSNESS]} />
              <Filter label="Report status" value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} options={[...STATUSES]} />
              <Filter label="Reviewer" value={reviewerFilter} onChange={setReviewerFilter} options={['All', ...options.reviewers]} />
              <div className="grid grid-cols-2 gap-2"><DateFilter label="Onset from" value={fromDate} onChange={setFromDate} /><DateFilter label="Onset to" value={toDate} onChange={setToDate} /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-slate-400"><tr className="border-b border-slate-800">
                  {['Report ID', 'Trial', 'Patient Code', 'Visit', 'Suspected Medicine', 'Event', 'Onset Date', 'Severity', 'Seriousness', 'Review Status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap py-3 pr-4">{heading}</th>)}
                </tr></thead>
                <tbody>{filteredReports.map((report) => {
                  const trial = trialById(report.trialId);
                  const isSelected = report.id === selectedId;
                  return <tr key={report.id} className={`border-b border-slate-800/70 align-top ${report.seriousness === 'Serious' ? 'bg-rose-950/20' : ''} ${isSelected ? 'outline outline-1 outline-blue-500' : ''}`}>
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-white">{report.reportId}</td>
                    <td className="py-3 pr-4"><Link href={`/trials/${encodeURIComponent(report.trialId)}`} className="text-blue-300 underline">{report.trialId}</Link></td>
                    <td className="py-3 pr-4 text-slate-200">{getPatientCode(report, trials)}</td>
                    <td className="py-3 pr-4 text-slate-300">{report.visitNumber}</td>
                    <td className="py-3 pr-4 text-slate-300">{report.suspectedMedicineName}</td>
                    <td className="py-3 pr-4 font-medium text-white">{report.eventTerm}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-300">{report.onsetDateTime}</td>
                    <td className="py-3 pr-4 text-slate-300">{report.severity}</td>
                    <td className={`py-3 pr-4 ${report.seriousness === 'Serious' ? 'font-bold text-rose-300' : 'text-slate-300'}`}>{report.seriousness}</td>
                    <td className="py-3 pr-4 text-slate-200">{report.reviewStatus}</td>
                    <td className="py-3"><button type="button" onClick={() => setSelectedId(report.id)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800">Review</button>{trial && <Link href={`/trials/${encodeURIComponent(trial.trialId)}`} className="ml-2 rounded border border-blue-800 px-2 py-1 text-xs text-blue-200">Trial</Link>}</td>
                  </tr>;
                })}{filteredReports.length === 0 && <tr><td colSpan={11} className="py-10 text-center text-slate-400">No safety reports match these filters.</td></tr>}</tbody>
              </table>
            </div>
          </section>

          {selectedReport && <SafetyReportDetail report={selectedReport} user={user} onAction={runAction} />}

          <Analytics reports={filteredReports} canExport={canExport} onExport={handleExport} />

          {trials.filter((trial) => hasPermission(user, 'manage_safety_reports')).map((trial) => (
            <TrialReportingConfig key={trial.id} trial={trial} user={user} onSaved={() => setReload((value) => value + 1)} />
          ))}

          <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">Current storage uses this browser’s local storage and provides no server/API authorization, secure attachment storage, or external authority delivery. Use only demonstration or non-identifiable data until server-backed authentication, database policies and protected file storage are configured.</p>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function getPatientCode(report: SafetyReport, trials: TrialProposal[]) {
  if (!trials.some((trial) => trial.trialId === report.trialId)) return 'Restricted';
  return getPatientForTrial(report.trialId, report.patientId)?.patientCode || 'Unavailable';
}

function TrialApprovalStatusPanel({
  trials,
  selectedTrial,
  user,
  error,
  onSelect,
  onError,
  onSaved,
}: {
  trials: TrialProposal[];
  selectedTrial: TrialProposal | null;
  user: ReturnType<typeof useAuth>['user'];
  error: string;
  onSelect: (trialId: string) => void;
  onError: (message: string) => void;
  onSaved: (trial: TrialProposal) => void;
}) {
  const canUpdate = hasPermission(user, 'manage_trial_regulatory') && hasPermission(user, 'approve_trial_regulatory');
  const regulatory = selectedTrial?.regulatory || createDefaultTrialRegulatoryRecord();
  const [protocolStatus, setProtocolStatus] = useState<RegulatoryApprovalStatus>(regulatory.protocol.approvalStatus);
  const [ethicsStatus, setEthicsStatus] = useState<RegulatoryApprovalStatus>(regulatory.ethics.approvalStatus);
  const [ctriStatus, setCtriStatus] = useState<TrialRegulatoryRecord['ctri']['status']>(regulatory.ctri.status);
  const [cdscoStatus, setCdscoStatus] = useState<RegulatoryApprovalStatus>(regulatory.cdsco.status);

  useEffect(() => {
    setProtocolStatus(regulatory.protocol.approvalStatus);
    setEthicsStatus(regulatory.ethics.approvalStatus);
    setCtriStatus(regulatory.ctri.status);
    setCdscoStatus(regulatory.cdsco.status);
  }, [
    selectedTrial?.id,
    regulatory.protocol.approvalStatus,
    regulatory.ethics.approvalStatus,
    regulatory.ctri.status,
    regulatory.cdsco.status,
  ]);

  const approvalOptions: RegulatoryApprovalStatus[] = [
    'Not Started',
    'Submitted',
    'Under Review',
    'Approved',
    'Returned for Correction',
    'Rejected',
  ];
  const showApprovalStatus = (status: string) => status === 'Not Started' || status === 'Not Submitted' ? 'Pending' : status;
  const requiredLabel = (required: boolean) => required ? 'Required' : 'Not required';

  const saveStatuses = () => {
    if (!selectedTrial || !user || !canUpdate) return;
    try {
      const nextRecord: TrialRegulatoryRecord = {
        ...regulatory,
        protocol: { ...regulatory.protocol, approvalStatus: protocolStatus },
        ethics: { ...regulatory.ethics, approvalStatus: ethicsStatus },
        ctri: { ...regulatory.ctri, status: ctriStatus },
        cdsco: { ...regulatory.cdsco, status: cdscoStatus },
      };
      const updatedTrial = saveTrialRegulatoryRecord(selectedTrial.trialId, nextRecord, user);
      onSaved(updatedTrial);
      onError('');
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'Approval statuses could not be saved.');
    }
  };

  const statusField = (
    label: string,
    status: string,
    options: string[],
    onChange: (value: string) => void,
    required: string
  ) => (
    <div className="grid gap-2 border-b border-slate-800 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <span className="text-sm text-slate-200">{label}</span>
      <span className="text-xs text-slate-400">{required}</span>
      {canUpdate
        ? <select value={status} onChange={(event) => onChange(event.target.value)} className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">{options.map((option) => <option key={option} value={option}>{showApprovalStatus(option)}</option>)}</select>
        : <span className="text-sm font-medium text-slate-100">{showApprovalStatus(status)}</span>}
    </div>
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Clinical trial approvals</h2>
        <p className="text-xs text-slate-400">Select an existing trial to review its regulatory requirements and saved approval statuses.</p>
      </div>
      {error && <p role="alert" className="rounded border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
      {trials.length === 0
        ? <p className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">No clinical trials found.</p>
        : <label className="block max-w-2xl space-y-1 text-sm">
          <span className="text-slate-300">Clinical trial</span>
          <select value={selectedTrial?.id || ''} onChange={(event) => onSelect(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
            <option value="">Select a clinical trial</option>
            {trials.map((trial) => <option key={trial.id} value={trial.id}>{trial.trialId} — {trial.trialTitle}</option>)}
          </select>
        </label>}
      {selectedTrial && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Trial ID" value={selectedTrial.trialId} />
          <Info label="Trial title" value={selectedTrial.trialTitle} />
          <Info label="Study type / phase" value={`${selectedTrial.studyType || 'Not recorded'} / ${selectedTrial.studyPhase || 'Not recorded'}`} />
          <Info label="Trial status" value={selectedTrial.proposalStatus} />
          <Info label="Protocol" value={`${regulatory.protocol.number || 'Number not recorded'} · ${regulatory.protocol.title || 'Title not recorded'} · v${regulatory.protocol.version || '—'}`} />
          <Info label="Ethics committee / IEC" value={`${regulatory.ethics.name || 'Name not recorded'} · ${regulatory.ethics.referenceNumber || 'Reference not recorded'}`} />
          <Info label="CTRI registration" value={regulatory.ctri.registrationNumber || 'Not registered'} />
          <Info label="CDSCO / DCGI authority" value={`${regulatory.cdsco.authority || 'Not recorded'} · ${regulatory.cdsco.applicationNumber || 'Application number not recorded'}`} />
        </div>
        <div>
          <h3 className="font-medium text-slate-200">Regulatory approval requirements and current status</h3>
          {statusField('Trial protocol approval', protocolStatus, approvalOptions, (value) => setProtocolStatus(value as RegulatoryApprovalStatus), requiredLabel(regulatory.validationRules.requireProtocolApproval))}
          {statusField('Ethics committee / IEC approval', ethicsStatus, approvalOptions, (value) => setEthicsStatus(value as RegulatoryApprovalStatus), requiredLabel(regulatory.validationRules.requireIECapproval))}
          {statusField('CTRI registration', ctriStatus, ['Not Submitted', 'Submitted', 'Under Review', 'Registered', 'Returned for Correction'], (value) => setCtriStatus(value as TrialRegulatoryRecord['ctri']['status']), requiredLabel(regulatory.validationRules.requireCTRIRegistration || regulatory.validationRules.requireProspectiveCTRIRegistration))}
          {statusField('CDSCO / DCGI permission', cdscoStatus, approvalOptions, (value) => setCdscoStatus(value as RegulatoryApprovalStatus), regulatory.cdsco.requirement === 'No'
            ? 'Not required'
            : regulatory.cdsco.requirement === 'To Be Determined'
              ? 'Applicability decision pending'
              : 'Required')}
          <p className="mt-2 text-xs text-slate-400">CDSCO/DCGI applicability: {regulatory.cdsco.requirement}. {regulatory.cdsco.applicabilityReason || 'No applicability rationale recorded.'}</p>
        </div>
        {canUpdate && <button type="button" onClick={saveStatuses} className="rounded bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600">Save approval status changes</button>}
      </>}
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-lg border p-3 ${danger ? 'border-rose-800 bg-rose-950/40' : 'border-slate-800 bg-slate-900/70'}`}><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold ${danger ? 'text-rose-300' : 'text-white'}`}>{value}</p></div>;
}

function Filter({ label, value, onChange, options, display = [] }: { label: string; value: string; onChange: (value: string) => void; options: string[]; display?: [string, string][] }) {
  return <label className="block space-y-1 text-xs text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100">{options.map((option) => <option key={option} value={option}>{display.find(([id]) => id === option)?.[1] || option}</option>)}</select></label>;
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-xs text-slate-400">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100" /></label>;
}

function SafetyReportDetail({ report, user, onAction }: { report: SafetyReport; user: ReturnType<typeof useAuth>['user']; onAction: (action: () => SafetyReport) => void }) {
  const [reviewText, setReviewText] = useState(report.initialMedicalReview);
  const [piDecision, setPiDecision] = useState(report.piDecision);
  const [reviewerRemarks, setReviewerRemarks] = useState(report.reviewerRemarks);
  const [severity, setSeverity] = useState(report.severity);
  const [seriousness, setSeriousness] = useState(report.seriousness);
  const [criteria, setCriteria] = useState(report.seriousnessCriteria);
  const [other, setOther] = useState(report.seriousnessOther);
  const [causality, setCausality] = useState(report.causality);
  const [causalityMethod, setCausalityMethod] = useState(report.causalityMethod);
  const [expectedness, setExpectedness] = useState(report.expectedness);
  const [clinicalAssessment, setClinicalAssessment] = useState(report.clinicalAssessment);
  const [actionTaken, setActionTaken] = useState(report.actionTaken);
  const [outcome, setOutcome] = useState(report.patientOutcome);
  const [followUpRequired, setFollowUpRequired] = useState(report.followUpRequired);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpSymptoms, setFollowUpSymptoms] = useState('');
  const [followUpLabs, setFollowUpLabs] = useState('');
  const [followUpOutcome, setFollowUpOutcome] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [followUpDocs, setFollowUpDocs] = useState<SafetyDocument[]>([]);
  const [reportingAssessment, setReportingAssessment] = useState(report.reportingAssessment);
  const [reportingStatus, setReportingStatus] = useState(report.reportingStatus);
  const [authority, setAuthority] = useState(report.reportingAuthority);
  const [reportedAt, setReportedAt] = useState(report.reportedAtAuthority);
  const [closeReason, setCloseReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [dataQuery, setDataQuery] = useState('');
  const seriousCriteria = ['Death', 'Life-threatening event', 'Hospitalization or prolonged hospitalization', 'Persistent or significant disability', 'Congenital anomaly / birth defect', 'Other medically important event'];
  const canReview = hasPermission(user, 'review_safety_reports');
  const canAssess = hasPermission(user, 'assess_safety_reports');
  const canFollowUp = hasPermission(user, 'manage_safety_followups');
  const canReport = hasPermission(user, 'manage_safety_reports');
  const canClose = hasPermission(user, 'close_safety_reports');
  const canRaiseQuery = hasPermission(user, 'raise_data_queries');
  const isSeriousOpen = report.seriousness === 'Serious' && report.reviewStatus !== 'Closed';

  useEffect(() => {
    setReviewText(report.initialMedicalReview);
    setPiDecision(report.piDecision);
    setReviewerRemarks(report.reviewerRemarks);
    setSeverity(report.severity);
    setSeriousness(report.seriousness);
    setCriteria(report.seriousnessCriteria);
    setOther(report.seriousnessOther);
    setCausality(report.causality);
    setCausalityMethod(report.causalityMethod);
    setExpectedness(report.expectedness);
    setClinicalAssessment(report.clinicalAssessment);
    setActionTaken(report.actionTaken);
    setOutcome(report.patientOutcome);
    setFollowUpRequired(report.followUpRequired);
    setReportingAssessment(report.reportingAssessment);
    setReportingStatus(report.reportingStatus);
    setAuthority(report.reportingAuthority);
    setReportedAt(report.reportedAtAuthority);
  }, [report]);

  const run = (action: () => SafetyReport) => {
    try {
      onAction(action);
      setActionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action failed.');
    }
  };
  const attachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    const values = await Promise.all(selected.map((file) => new Promise<SafetyDocument>((resolve, reject) => {
      if (file.size > 1024 * 1024 || !allowed.includes(file.type)) {
        reject(new Error('Follow-up attachments must be PDF, JPEG or PNG and smaller than 1 MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      reader.onload = () => {
        if (typeof reader.result !== 'string') return reject(new Error(`Unable to read ${file.name}.`));
        resolve({ id: `safety_doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, fileName: file.name, mimeType: file.type, dataUrl: reader.result, uploadedAt: new Date().toISOString(), uploadedBy: user?.fullName || 'Unknown user' });
      };
      reader.readAsDataURL(file);
    }))).catch((error: Error) => {
      setActionError(error.message);
      return [];
    });
    setFollowUpDocs((current) => [...current, ...values]);
  };

  return (
    <section className={`space-y-5 rounded-xl border p-5 ${isSeriousOpen ? 'border-rose-600 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'}`}>
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-400">Safety Report Detail · {report.reportId}</p><h2 className="mt-1 text-xl font-bold text-white">{report.eventTerm} · {report.reviewStatus}</h2><p className="mt-1 text-sm text-slate-400">{report.trialId} · Patient {report.patientId} · Visit {report.visitNumber} · Reported by {report.reportedBy}</p></div>{isSeriousOpen && <span className="rounded-lg border border-rose-500 bg-rose-900/60 px-3 py-2 text-sm font-bold text-rose-100"><AlertTriangle className="mr-1 inline h-4 w-4" /> Serious — urgent review</span>}</header>
      {actionError && <p role="alert" className="whitespace-pre-line rounded border border-rose-700 p-3 text-sm text-rose-200">{actionError}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <Info label="Severity" value={report.severity} /><Info label="Seriousness" value={report.seriousness} /><Info label="Seriousness criteria" value={[...report.seriousnessCriteria, report.seriousnessOther].filter(Boolean).join(', ') || 'Not recorded'} />
        <Info label="Causality" value={`${report.causality} · ${report.causalityMethod}`} /><Info label="Expectedness" value={report.expectedness} /><Info label="Event status" value={report.eventStatus} />
        <Info label="Onset" value={report.onsetDateTime} /><Info label="End" value={report.endDateTime} /><Info label="Suspected medicine" value={`${report.suspectedMedicineName} · ${report.formulation} · batch ${report.batchNumber}`} />
        <Info label="Dose / frequency / route" value={`${report.dose} / ${report.frequency} / ${report.route}`} /><Info label="Treatment dates" value={`${report.treatmentStartDate} – ${report.lastDoseDate}`} /><Info label="Patient outcome" value={report.patientOutcome} />
        <Info label="Symptoms / findings" value={report.symptomsFindings} /><Info label="Event treatment" value={report.eventTreatment} /><Info label="Laboratory findings" value={report.relevantLaboratoryFindings} />
      </div>
      {report.seriousness === 'Serious' && <div className="rounded-lg border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-100"><strong>Urgent escalation:</strong> {report.notifications.length} notification record(s); delivery is in-app only. Deadline: {report.reportingDeadline || 'No deadline configured for this trial.'}<div className="mt-2 space-y-1">{report.notifications.map((notification) => <p key={notification.id}>{notification.recipientName} ({notification.role}) · {notification.deliveryStatus} · {notification.createdAt}</p>)}</div>{report.escalationHistory.map((entry) => <p key={entry.id} className="mt-1 text-xs">Escalated {entry.escalatedAt} by {entry.escalatedBy}: {entry.reason}</p>)}</div>}
      {report.seriousness === 'Serious' && <Info label="Applicable reporting basis" value={report.reportingCriteria} />}
      {report.documents.length > 0 && <div className="text-sm text-slate-300">Attachments: {report.documents.map((document) => <a key={document.id} className="mr-3 text-blue-300 underline" href={document.dataUrl} download={document.fileName}>{document.fileName}</a>)}</div>}

      {canReview && report.reviewStatus !== 'Closed' && <Panel title="Initial medical review and PI decision">
        <div className="grid gap-3 md:grid-cols-2"><TextArea label="Initial medical review" value={reviewText} onChange={setReviewText} /><TextArea label="Reviewer remarks" value={reviewerRemarks} onChange={setReviewerRemarks} /><TextArea label="PI decision (PI only for serious events)" value={piDecision} onChange={setPiDecision} /></div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => run(() => reviewSafetyReport(report.id, { status: report.seriousness === 'Serious' && !piDecision.trim() ? 'Escalated' : 'Under Review', initialMedicalReview: reviewText, piDecision, reviewerRemarks }, user))} className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Save medical review</button></div>
      </Panel>}

      {canAssess && report.reviewStatus !== 'Closed' && <Panel title="Safety Assessment — severity and seriousness are independent">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Severity" value={severity} options={['Unknown', 'Mild', 'Moderate', 'Severe']} onChange={(value) => setSeverity(value as typeof severity)} />
          <Select label="Seriousness" value={seriousness} options={['Unknown', 'Non-serious', 'Serious']} onChange={(value) => setSeriousness(value as typeof seriousness)} />
          {seriousness === 'Serious' && <div className="space-y-2 md:col-span-2">{seriousCriteria.map((item) => <label key={item} className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={criteria.includes(item)} onChange={(event) => setCriteria(event.target.checked ? [...criteria, item] : criteria.filter((value) => value !== item))} />{item}</label>)}{criteria.includes('Other medically important event') && <Field label="Other criterion" value={other} onChange={setOther} />}</div>}
          <Select label="Causality" value={causality} options={['Unassessable/Unclassifiable', 'Certain', 'Probable/Likely', 'Possible', 'Unlikely']} onChange={setCausality} />
          <Field label="Assessment method" value={causalityMethod} onChange={setCausalityMethod} />
          <Select label="Expectedness" value={expectedness} options={['Unknown', 'Expected', 'Unexpected', 'Not Applicable']} onChange={(value) => setExpectedness(value as typeof expectedness)} />
          <Field label="Patient outcome" value={outcome} onChange={setOutcome} />
          <TextArea label="Clinical assessment" value={clinicalAssessment} onChange={setClinicalAssessment} />
          <TextArea label="Action taken" value={actionTaken} onChange={setActionTaken} />
          <TextArea label="Reviewer remarks" value={reviewerRemarks} onChange={setReviewerRemarks} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={followUpRequired} onChange={(event) => setFollowUpRequired(event.target.checked)} />Follow-up required</label>
        </div>
        <button type="button" onClick={() => run(() => assessSafetyReport(report.id, { severity, seriousness, seriousnessCriteria: criteria, seriousnessOther: other, causality, causalityMethod, expectedness, clinicalAssessment, actionTaken, patientOutcome: outcome, followUpRequired, reviewerRemarks }, user))} className="mt-3 rounded bg-indigo-700 px-3 py-2 text-sm text-white">Save safety assessment</button>
      </Panel>}

      {canFollowUp && report.reviewStatus !== 'Closed' && <Panel title={`Follow-up entries (${report.followUps.length})`}>
        <div className="grid gap-3 md:grid-cols-2"><Field label="Follow-up date" type="date" value={followUpDate} onChange={setFollowUpDate} /><Field label="Updated outcome" value={followUpOutcome} onChange={setFollowUpOutcome} placeholder="Ongoing / Recovered / Unknown" /><TextArea label="New symptoms / findings" value={followUpSymptoms} onChange={setFollowUpSymptoms} /><TextArea label="New laboratory results" value={followUpLabs} onChange={setFollowUpLabs} /><TextArea label="Additional action taken" value={followUpAction} onChange={setFollowUpAction} /><TextArea label="Follow-up notes" value={followUpNotes} onChange={setFollowUpNotes} />
          <label className="text-sm text-slate-300">Supporting documents<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => void attachments(event.target.files)} className="mt-1 block w-full text-sm" /></label>
        </div>
        <button type="button" onClick={() => run(() => addSafetyFollowUp(report.id, { followUpDate, newSymptomsFindings: followUpSymptoms, newLaboratoryResults: followUpLabs, updatedOutcome: followUpOutcome, additionalActionTaken: followUpAction, notes: followUpNotes, documents: followUpDocs }, user))} className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white">Record follow-up</button>
        <div className="mt-3 space-y-2">{report.followUps.map((entry) => <details key={entry.id} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm"><summary className="cursor-pointer">{entry.followUpDate} · Recorded by {entry.recordedBy}</summary><p className="mt-2 text-slate-300">{entry.newSymptomsFindings} · labs: {entry.newLaboratoryResults} · outcome: {entry.updatedOutcome} · action: {entry.additionalActionTaken} · {entry.notes}</p>{entry.documents.map((document) => <a key={document.id} href={document.dataUrl} download={document.fileName} className="mr-3 text-blue-300 underline">{document.fileName}</a>)}</details>)}</div>
      </Panel>}

      {canReport && report.reviewStatus !== 'Closed' && <Panel title="Reporting assessment (trial-specific obligation)">
        <div className="grid gap-3 md:grid-cols-2"><TextArea label="Reporting assessment" value={reportingAssessment} onChange={setReportingAssessment} /><Field label="Reporting authority" value={authority} onChange={setAuthority} /><Select label="Reporting status" value={reportingStatus} options={['Not Assessed', 'Not Reportable', 'Reporting Pending', 'Reported']} onChange={(value) => setReportingStatus(value as typeof reportingStatus)} /><Field label="Reported date" type="date" value={reportedAt} onChange={setReportedAt} /></div>
        <button type="button" onClick={() => run(() => updateSafetyReporting(report.id, { assessment: reportingAssessment, status: reportingStatus, authority, reportedAtAuthority: reportedAt }, user))} className="mt-3 rounded bg-cyan-700 px-3 py-2 text-sm text-white">Save reporting assessment</button>
      </Panel>}

      {canRaiseQuery && <Panel title={`Data quality queries (${report.dataQueries.length})`}>
        <p className="text-xs text-slate-400">Data Managers may query completeness or inconsistencies; queries do not change clinical assessments.</p>
        <div className="flex flex-wrap items-end gap-3"><TextArea label="Data query" value={dataQuery} onChange={setDataQuery} /><button type="button" onClick={() => run(() => raiseSafetyDataQuery(report.id, dataQuery, user))} className="rounded bg-amber-700 px-3 py-2 text-sm text-white">Raise query</button></div>
        {report.dataQueries.map((query) => <div key={query.id} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm"><p className="text-slate-200">{query.query}</p><p className="mt-1 text-xs text-slate-500">Open · {query.raisedBy} ({query.raisedByRole}) · {query.raisedAt}</p></div>)}
      </Panel>}

      <Panel title="Close / Reopen report">
        {report.reviewStatus !== 'Closed' && canClose && <div className="flex flex-wrap gap-2"><Field label="Closure reason" value={closeReason} onChange={setCloseReason} /><button type="button" onClick={() => run(() => closeSafetyReport(report.id, closeReason, user))} className="self-end rounded bg-rose-700 px-3 py-2 text-sm text-white">Close report</button></div>}
        {report.reviewStatus === 'Closed' && <div className="grid gap-3 md:grid-cols-2"><Info label="Closed by / date" value={`${report.closedBy} · ${report.closedAt}`} /><Info label="Closure reason" value={report.closureReason} />{canClose && <><Field label="Reopening reason" value={reopenReason} onChange={setReopenReason} /><button type="button" onClick={() => run(() => reopenSafetyReport(report.id, reopenReason, user))} className="self-end rounded bg-amber-700 px-3 py-2 text-sm text-white">Reopen report</button></>}</div>}
      </Panel>

      {hasPermission(user, 'view_audit_logs') && <Panel title={`Immutable-by-UI audit history (${report.auditHistory.length})`}>{report.auditHistory.map((entry) => <details key={entry.id} className="mb-2 rounded border border-slate-800 bg-slate-950 p-3 text-sm"><summary className="cursor-pointer">{entry.action} · {entry.changedBy} ({entry.userRole}) · {entry.changedAt}</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-slate-400">Previous: {entry.previousValues}</pre><pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-slate-400">New: {entry.newValues}</pre></div></details>)}</Panel>}
    </section>
  );
}

function TrialReportingConfig({ trial, user, onSaved }: { trial: TrialProposal; user: ReturnType<typeof useAuth>['user']; onSaved: () => void }) {
  const [hours, setHours] = useState(String(trial.safetyReporting?.reportingDeadlineHours || 0));
  const [authority, setAuthority] = useState(trial.safetyReporting?.reportingAuthority || '');
  const [criteria, setCriteria] = useState(trial.safetyReporting?.reportingCriteria || '');
  const [error, setError] = useState('');
  return <details className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><summary className="cursor-pointer font-semibold text-slate-200">Reporting obligations · {trial.trialId}</summary><p className="mt-2 text-xs text-slate-400">No universal deadline is assumed. Configure only after applicable trial and regulatory review. Set zero hours if no fixed deadline is configured.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><Field label="Deadline from report creation (hours, 0 = none)" type="number" value={hours} onChange={setHours} /><Field label="Authority" value={authority} onChange={setAuthority} /><Field label="Applicable criteria / basis" value={criteria} onChange={setCriteria} /></div>{error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}<button type="button" onClick={() => { try { configureTrialSafetyReporting(trial.trialId, { reportingDeadlineHours: Number(hours), reportingAuthority: authority, reportingCriteria: criteria }, user); setError(''); onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save reporting obligations.'); } }} className="mt-3 rounded bg-violet-700 px-3 py-2 text-sm text-white">Save reporting configuration</button></details>;
}

function Analytics({ reports, canExport, onExport }: { reports: SafetyReport[]; canExport: boolean; onExport: () => void }) {
  const grouped = (selector: (report: SafetyReport) => string) => [...reports.reduce((map, report) => map.set(selector(report), (map.get(selector(report)) || 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const repeated = grouped((report) => `${report.suspectedMedicineName} / ${report.formulation} / ${report.eventTerm}`).filter(([, count]) => count > 1);
  return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"><header className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><ClipboardList className="h-4 w-4" /> Safety analytics</h2><p className="text-xs text-slate-400">Descriptive groupings only — do not infer causality from counts.</p></div>{canExport && <button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded border border-slate-700 px-3 py-2 text-sm text-slate-200"><Download className="h-4 w-4" /> Export aggregate CSV</button>}</header><div className="grid gap-4 md:grid-cols-3"><Distribution title="Events by trial" entries={grouped((report) => report.trialId)} /><Distribution title="Events by medicine / formulation" entries={grouped((report) => `${report.suspectedMedicineName} / ${report.formulation}`)} /><Distribution title="Events by batch" entries={grouped((report) => report.batchNumber)} /><Distribution title="Seriousness / severity" entries={grouped((report) => `${report.seriousness} / ${report.severity}`)} /><Distribution title="Events by centre" entries={grouped((report) => report.centre)} /><Distribution title="Events by outcome" entries={grouped((report) => report.patientOutcome)} /><Distribution title="Open follow-ups" entries={grouped((report) => report.followUpRequired ? `${report.trialId} · ${report.eventTerm}` : 'No open follow-up')} /><Distribution title="Serious awaiting review" entries={grouped((report) => report.seriousness === 'Serious' && report.reviewStatus !== 'Closed' ? `${report.trialId} · ${report.reviewStatus}` : 'Not awaiting review')} /><Distribution title="Repeated report patterns (descriptive)" entries={repeated} /></div></section>;
}

function Distribution({ title, entries }: { title: string; entries: [string, number][] }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><h3 className="mb-2 text-sm font-semibold text-slate-200">{title}</h3>{entries.length === 0 ? <p className="text-xs text-slate-500">No recorded reports</p> : <ul className="space-y-1 text-xs text-slate-300">{entries.slice(0, 5).map(([label, count]) => <li key={label} className="flex justify-between gap-2"><span className="truncate">{label}</span><span>{count}</span></li>)}</ul>}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4"><legend className="px-2 font-semibold text-white">{title}</legend>{children}</fieldset>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-slate-800 bg-slate-950/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{value || 'Not recorded'}</p></div>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-sm"><span className="text-slate-300">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
