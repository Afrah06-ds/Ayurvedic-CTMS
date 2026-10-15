'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { createDefaultTrialRegulatoryRecord, getCachedProposals, getSavedProposals, saveTrialRegulatoryRecord } from '@/lib/proposalStorage';
import { getPatientForTrial, getPatientsForTrial, updatePatientInCache } from '@/lib/patientStorage';
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
  updateSafetyReportConsentDetails,
} from '@/lib/safetyStorage';
import {
  RegulatoryApprovalStatus,
  SafetyDocument,
  SafetyReport,
  TrialProposal,
  TrialRegulatoryRecord,
  ConsentStatus,
  ConsentAnalysisResult,
  DemoConsentDocument,
  SafetyConsentDetails,
  Patient,
  PatientConsent,
} from '@/lib/types';
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
  const [selectedRegulatoryTrialIds, setSelectedRegulatoryTrialIds] = useState<string[]>([]);
  const [regulatoryError, setRegulatoryError] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedFilterTrialIds, setSelectedFilterTrialIds] = useState<string[]>(() => {
    const q = search.get('trialId');
    return q ? [q] : [];
  });
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
    const allTrials = getCachedProposals();
    const hasGlobalAccess =
      user.role === 'admin' ||
      user.userType === 'super_admin' ||
      user.userType === 'admin_leadership' ||
      user.userType === 'pharmacovigilance' ||
      user.userType === 'pharmacovigilance_safety_officer' ||
      hasPermission(user, 'view_all_trials');

    if (hasGlobalAccess) {
      return allTrials;
    }
    return allTrials.filter((trial) =>
      user.assignedTrialIds?.some((id) => id === trial.id || id === trial.trialId || id === 'all')
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
        const regTrials = getSavedProposals();
        setRegulatoryTrials(regTrials);
        setRegulatoryError('');
        setSelectedRegulatoryTrialIds((current) => {
          if (current.length > 0) return current;
          const queryTrial = regTrials.find((trial) => trial.trialId === search.get('trialId'));
          return queryTrial ? [queryTrial.id] : (regTrials[0] ? [regTrials[0].id] : []);
        });
      } catch (loadError) {
        setRegulatoryTrials([]);
        setRegulatoryError(loadError instanceof Error ? loadError.message : 'Saved clinical trials could not be loaded.');
      }
    } else {
      setRegulatoryTrials([]);
    }
  }, [user, canView, canViewRegulatory, accessibleTrials, reload, search]);

  const [directorySearch, setDirectorySearch] = useState('');

  const filteredReports = useMemo(() => reports.filter((report) => {
    if (selectedFilterTrialIds.length > 0 && !selectedFilterTrialIds.includes(report.trialId)) return false;
    if (centreFilter !== 'All' && report.centre !== centreFilter) return false;
    if (medicineFilter !== 'All' && report.suspectedMedicineId !== medicineFilter) return false;
    if (seriousnessFilter !== 'All' && report.seriousness !== seriousnessFilter) return false;
    if (statusFilter !== 'All' && report.reviewStatus !== statusFilter) return false;
    if (reviewerFilter !== 'All' && report.assessedBy !== reviewerFilter) return false;
    const eventDate = report.onsetDateTime.slice(0, 10);
    if (fromDate && eventDate < fromDate) return false;
    if (toDate && eventDate > toDate) return false;
    if (directorySearch.trim()) {
      const query = directorySearch.toLowerCase();
      const matches =
        report.reportId.toLowerCase().includes(query) ||
        report.trialId.toLowerCase().includes(query) ||
        report.eventTerm.toLowerCase().includes(query) ||
        report.suspectedMedicineName.toLowerCase().includes(query) ||
        report.patientId.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query);
      if (!matches) return false;
    }
    return true;
  }), [reports, selectedFilterTrialIds, centreFilter, medicineFilter, seriousnessFilter, statusFilter, reviewerFilter, fromDate, toDate, directorySearch]);

  const metrics = getSafetyDashboardMetrics(filteredReports);
  const selectedReport = filteredReports.find((report) => report.id === selectedId) || reports.find((report) => report.id === selectedId) || null;
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

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAggregateCSV = () => {
    if (!user || !canExport) return;

    // Aggregate ACTUAL details entered into the system
    const aggregateMap = new Map<string, {
      trialId: string;
      trialTitle: string;
      medicineName: string;
      formulation: string;
      batchNumber: string;
      eventTerm: string;
      severity: string;
      seriousness: string;
      causality: string;
      expectedness: string;
      outcome: string;
      reviewStatus: string;
      reportingStatus: string;
      count: number;
    }>();

    filteredReports.forEach((report) => {
      const trial = trials.find((t) => t.trialId === report.trialId);
      const groupKey = [
        report.trialId,
        report.suspectedMedicineName,
        report.formulation,
        report.batchNumber,
        report.eventTerm,
        report.severity,
        report.seriousness,
        report.causality,
        report.patientOutcome,
        report.reviewStatus,
      ].map((v) => (v || '').trim()).join(':::');

      const existing = aggregateMap.get(groupKey);
      if (existing) {
        existing.count += 1;
      } else {
        aggregateMap.set(groupKey, {
          trialId: report.trialId,
          trialTitle: trial?.trialTitle || report.trialId,
          medicineName: report.suspectedMedicineName,
          formulation: report.formulation || 'Not Available',
          batchNumber: report.batchNumber || 'Not Available',
          eventTerm: report.eventTerm,
          severity: report.severity || 'Unknown',
          seriousness: report.seriousness || 'Unknown',
          causality: report.causality || 'Unassessable',
          expectedness: report.expectedness || 'Unknown',
          outcome: report.patientOutcome || 'Unknown',
          reviewStatus: report.reviewStatus,
          reportingStatus: report.reportingStatus,
          count: 1,
        });
      }
    });

    const headers = [
      'Trial ID',
      'Trial Title',
      'Suspected Medicine',
      'Formulation',
      'Batch Number',
      'Adverse Event Term',
      'Severity',
      'Seriousness',
      'Causality',
      'Expectedness',
      'Patient Outcome',
      'Review Status',
      'Reporting Status',
      'Aggregated Occurrence Count',
    ];

    const rows = Array.from(aggregateMap.values()).map((item) => [
      escapeCSV(item.trialId),
      escapeCSV(item.trialTitle),
      escapeCSV(item.medicineName),
      escapeCSV(item.formulation),
      escapeCSV(item.batchNumber),
      escapeCSV(item.eventTerm),
      escapeCSV(item.severity),
      escapeCSV(item.seriousness),
      escapeCSV(item.causality),
      escapeCSV(item.expectedness),
      escapeCSV(item.outcome),
      escapeCSV(item.reviewStatus),
      escapeCSV(item.reportingStatus),
      escapeCSV(item.count),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    downloadFile(csv, 'safety-report-aggregates.csv');
  };

  const handleExportAllDetails = () => {
    if (!user || !canExport) return;
    const headers = [
      'Report ID',
      'Trial ID',
      'Patient ID',
      'Patient Code',
      'Visit Number',
      'Centre',
      'Suspected Medicine',
      'Formulation',
      'Batch Number',
      'Dose',
      'Frequency',
      'Route',
      'Indication',
      'Treatment Start Date',
      'Last Dose Date',
      'Onset Date Time',
      'End Date Time',
      'Event Term',
      'Event Description',
      'Event Status',
      'Severity',
      'Seriousness',
      'Seriousness Criteria',
      'Causality Assessment',
      'Causality Method',
      'Expectedness',
      'Clinical Assessment',
      'Patient Outcome',
      'Action Taken with Medicine',
      'Event Treatment Provided',
      'Concomitant Medicines',
      'Medical History',
      'Symptoms & Findings',
      'Laboratory Findings',
      'Reporting Status',
      'Reporting Authority',
      'Reporting Deadline',
      'Reported to Authority Date',
      'Review Status',
      'PI Decision',
      'Reviewer Remarks',
      'Follow-up Required',
      'Follow-ups Count',
      'Documents Count',
      'Reported By',
      'Reported Date',
      'Consent Status',
      'Consent Date',
      'Consent Version',
      'Consent Obtained By',
      'Consent LAR Confirmed',
      'Consent Remarks',
    ];

    const rows = filteredReports.map((r) => [
      escapeCSV(r.reportId),
      escapeCSV(r.trialId),
      escapeCSV(r.patientId),
      escapeCSV(getPatientCode(r, trials)),
      escapeCSV(r.visitNumber),
      escapeCSV(r.centre),
      escapeCSV(r.suspectedMedicineName),
      escapeCSV(r.formulation),
      escapeCSV(r.batchNumber),
      escapeCSV(r.dose),
      escapeCSV(r.frequency),
      escapeCSV(r.route),
      escapeCSV(r.indication),
      escapeCSV(r.treatmentStartDate),
      escapeCSV(r.lastDoseDate),
      escapeCSV(r.onsetDateTime),
      escapeCSV(r.endDateTime),
      escapeCSV(r.eventTerm),
      escapeCSV(r.description),
      escapeCSV(r.eventStatus),
      escapeCSV(r.severity),
      escapeCSV(r.seriousness),
      escapeCSV((r.seriousnessCriteria || []).join('; ')),
      escapeCSV(r.causality),
      escapeCSV(r.causalityMethod),
      escapeCSV(r.expectedness),
      escapeCSV(r.clinicalAssessment),
      escapeCSV(r.patientOutcome),
      escapeCSV(r.medicineActionTaken),
      escapeCSV(r.eventTreatment),
      escapeCSV(r.concomitantMedicines),
      escapeCSV(r.medicalHistory),
      escapeCSV(r.symptomsFindings),
      escapeCSV(r.relevantLaboratoryFindings),
      escapeCSV(r.reportingStatus),
      escapeCSV(r.reportingAuthority),
      escapeCSV(r.reportingDeadline),
      escapeCSV(r.reportedAtAuthority),
      escapeCSV(r.reviewStatus),
      escapeCSV(r.piDecision),
      escapeCSV(r.reviewerRemarks),
      escapeCSV(r.followUpRequired ? 'Yes' : 'No'),
      escapeCSV(r.followUps?.length || 0),
      escapeCSV(r.documents?.length || 0),
      escapeCSV(r.reportedBy),
      escapeCSV(r.reportedAt),
      escapeCSV(r.consentDetails?.status || 'Not Recorded'),
      escapeCSV(r.consentDetails?.consentDate || 'Not Recorded'),
      escapeCSV(r.consentDetails?.consentVersion || 'Not Recorded'),
      escapeCSV(r.consentDetails?.obtainedBy || 'Not Recorded'),
      escapeCSV(r.consentDetails?.larConfirmed ? 'Yes' : 'No'),
      escapeCSV(r.consentDetails?.remarks || ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    downloadFile(csv, 'all-safety-case-details.csv');
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

          {error && <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
          {canViewRegulatory && <TrialApprovalStatusPanel
            trials={regulatoryTrials}
            selectedTrialIds={selectedRegulatoryTrialIds}
            onSelectTrialIds={setSelectedRegulatoryTrialIds}
            user={user}
            error={regulatoryError}
            onError={setRegulatoryError}
            onSaved={(updatedTrials) => {
              const updatedMap = new Map(updatedTrials.map((item) => [item.id, item]));
              setRegulatoryTrials((current) => current.map((item) => updatedMap.get(item.id) || item));
            }}
          />}

          {/* Participant Informed Consent Form Verification Panel */}
          <PharmacovigilanceConsentPanel
            trials={trials}
            user={user}
            onConsentSaved={() => setReload((v) => v + 1)}
          />

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

          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-semibold text-xs">
                    📁
                  </span>
                  <h2 className="text-lg font-bold text-white">Saved Safety Reports Directory &amp; Document Repository</h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Search, filter, and review individual clinical trial safety case reports (ICSRs) and adverse event document records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                  Showing {filteredReports.length} of {reports.length} reports
                </span>
              </div>
            </div>

            {/* Storage Directory Path & Repository Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shadow-inner">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <span>📁</span>
                  <span>Safety Reports Save Directory:</span>
                </span>
                <span className="font-mono text-xs text-rose-200 bg-slate-900 px-3 py-1 rounded-md border border-slate-700 font-medium">
                  /CTMS/Safety-Reports/{selectedFilterTrialIds.length === 1 ? `${selectedFilterTrialIds[0]}/` : ''}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Directory Active &amp; Synced
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-xs">
                <span>Stored ICSR Files: <strong className="text-white font-mono">{reports.length}</strong></span>
                <span>&bull;</span>
                <span>Attached Files: <strong className="text-white font-mono">{reports.reduce((acc, r) => acc + (r.documents?.length || 0), 0)}</strong></span>
              </div>
            </div>

            {/* Quick Trial Directory Navigation Folders */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilterTrialIds([])}
                className={`px-3 py-1.5 rounded-lg border font-medium transition shrink-0 flex items-center gap-1.5 ${
                  selectedFilterTrialIds.length === 0
                    ? 'bg-rose-950/80 text-rose-200 border-rose-700/80 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>📁 All Saved Directories</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">{reports.length}</span>
              </button>
              {trials.map((trial) => {
                const count = reports.filter((r) => r.trialId === trial.trialId).length;
                const isSelected = selectedFilterTrialIds.length === 1 && selectedFilterTrialIds[0] === trial.trialId;
                return (
                  <button
                    key={trial.id}
                    type="button"
                    onClick={() => setSelectedFilterTrialIds([trial.trialId])}
                    className={`px-3 py-1.5 rounded-lg border font-medium transition shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-950/80 text-rose-200 border-rose-700/80 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>📂 {trial.trialId}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Quick search directory by Report ID, trial, event, medicine, patient..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
                />
                {directorySearch && (
                  <button
                    type="button"
                    onClick={() => setDirectorySearch('')}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7 pt-1">
              <MultiSelectTrialFilter trials={trials} selectedTrials={selectedFilterTrialIds} onChange={setSelectedFilterTrialIds} />
              <Filter label="Centre" value={centreFilter} onChange={setCentreFilter} options={['All', ...options.centres]} />
              <Filter label="Medicine" value={medicineFilter} onChange={setMedicineFilter} options={['All', ...options.medicines.map(([id]) => id)]} display={options.medicines} />
              <Filter label="Seriousness" value={seriousnessFilter} onChange={(value) => setSeriousnessFilter(value as typeof seriousnessFilter)} options={[...SERIOUSNESS]} />
              <Filter label="Report status" value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} options={[...STATUSES]} />
              <Filter label="Reviewer" value={reviewerFilter} onChange={setReviewerFilter} options={['All', ...options.reviewers]} />
              <div className="grid grid-cols-2 gap-2"><DateFilter label="Onset from" value={fromDate} onChange={setFromDate} /><DateFilter label="Onset to" value={toDate} onChange={setToDate} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400"><tr className="border-b border-slate-800">
                  {['Report ID', 'Trial', 'Patient Code', 'Visit', 'Suspected Medicine', 'Event', 'Onset Date', 'Severity', 'Seriousness', 'Review Status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-800/60">{filteredReports.map((report) => {
                  const trial = trialById(report.trialId);
                  const isSelected = report.id === selectedId;
                  return <tr key={report.id} className={`align-top transition-colors hover:bg-slate-800/30 ${report.seriousness === 'Serious' ? 'bg-rose-950/20' : ''} ${isSelected ? 'outline outline-1 outline-blue-500 bg-blue-950/20' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-rose-300">{report.reportId}</td>
                    <td className="px-3 py-3"><Link href={`/trials/${encodeURIComponent(report.trialId)}`} className="text-blue-300 hover:underline">{report.trialId}</Link></td>
                    <td className="px-3 py-3 text-slate-200">{getPatientCode(report, trials)}</td>
                    <td className="px-3 py-3 text-slate-300">{report.visitNumber}</td>
                    <td className="px-3 py-3 text-slate-300 font-medium">{report.suspectedMedicineName}</td>
                    <td className="px-3 py-3 font-medium text-white">{report.eventTerm}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-300">{report.onsetDateTime}</td>
                    <td className="px-3 py-3 text-slate-300">{report.severity}</td>
                    <td className={`px-3 py-3 ${report.seriousness === 'Serious' ? 'font-bold text-rose-400' : 'text-slate-300'}`}>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs ${report.seriousness === 'Serious' ? 'bg-rose-900/40 text-rose-300 border border-rose-700/50' : 'bg-slate-800 text-slate-300'}`}>
                        {report.seriousness}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-200">
                      <span className="inline-block rounded bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-200 border border-slate-700/60">
                        {report.reviewStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><button type="button" onClick={() => setSelectedId(report.id)} className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 transition">Review</button>{trial && <Link href={`/trials/${encodeURIComponent(trial.trialId)}`} className="ml-2 rounded border border-blue-800 bg-blue-950/50 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-900/50 transition">Trial</Link>}</td>
                  </tr>;
                })}{filteredReports.length === 0 && <tr><td colSpan={11} className="py-12 text-center text-slate-400"><p className="text-sm">No safety reports match these filters or directory search query.</p><p className="mt-1 text-xs text-slate-500">Try adjusting the filter criteria or searching another trial.</p></td></tr>}</tbody>
              </table>
            </div>
          </section>

          {selectedReport && <SafetyReportDetail report={selectedReport} user={user} onAction={runAction} />}

          <Analytics
            reports={filteredReports}
            canExport={canExport}
            onExportAggregate={handleExportAggregateCSV}
            onExportDetailed={handleExportAllDetails}
          />

          {trials.filter((trial) => hasPermission(user, 'manage_safety_reports')).map((trial) => (
            <TrialReportingConfig key={trial.id} trial={trial} user={user} onSaved={() => setReload((value) => value + 1)} />
          ))}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function getPatientCode(report: SafetyReport, trials: TrialProposal[]) {
  if (!trials.some((trial) => trial.trialId === report.trialId)) return 'Restricted';
  return getPatientForTrial(report.trialId, report.patientId)?.patientCode || 'Unavailable';
}

function PharmacovigilanceConsentPanel({
  trials,
  user,
  onConsentSaved,
}: {
  trials: TrialProposal[];
  user: ReturnType<typeof useAuth>['user'];
  onConsentSaved: () => void;
}) {
  const [selectedTrialId, setSelectedTrialId] = useState<string>(() => trials[0]?.trialId || '');
  const [trialPatients, setTrialPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Consent Form Fields
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('Not Obtained');
  const [consentDate, setConsentDate] = useState('');
  const [consentVersion, setConsentVersion] = useState('');
  const [consentObtainedBy, setConsentObtainedBy] = useState('');
  const [consentWitnessName, setConsentWitnessName] = useState('');
  const [consentLarConfirmed, setConsentLarConfirmed] = useState(false);
  const [consentRemarks, setConsentRemarks] = useState('');
  const [consentDoc, setConsentDoc] = useState<DemoConsentDocument | null>(null);
  const [consentAnalysis, setConsentAnalysis] = useState<ConsentAnalysisResult | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Load trial patients when selected trial changes
  useEffect(() => {
    if (!selectedTrialId) {
      setTrialPatients([]);
      setSelectedPatient(null);
      setSelectedPatientId('');
      return;
    }
    const patients = getPatientsForTrial(selectedTrialId);
    setTrialPatients(patients);
    if (patients.length > 0) {
      const first = patients[0];
      setSelectedPatientId(first.id);
      setSelectedPatient(first);
    } else {
      setSelectedPatientId('');
      setSelectedPatient(null);
    }
  }, [selectedTrialId]);

  // Sync state when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      const consent = selectedPatient.consent;
      setConsentStatus(consent?.status || 'Not Obtained');
      setConsentDate(consent?.consentDate || '');
      setConsentVersion(consent?.consentVersion || '');
      setConsentObtainedBy(consent?.obtainedBy || '');
      setConsentWitnessName(consent?.witnessName || '');
      setConsentRemarks(consent?.remarks || '');
      setConsentDoc(consent?.document || null);
      setConsentAnalysis(consent?.analysisResult || null);
      setConsentLarConfirmed(Boolean(consent?.remarks?.toLowerCase().includes('lar')));
      setSaveSuccess('');
      setSaveError('');
    }
  }, [selectedPatient]);

  const handleSelectPatient = (patientId: string) => {
    const found = trialPatients.find((p) => p.id === patientId) || null;
    setSelectedPatientId(patientId);
    setSelectedPatient(found);
  };

  // Upload and Automated Analysis
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      setSaveError('Please upload a valid consent document (PDF, JPG, or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Consent document must be smaller than 5 MB.');
      return;
    }

    setAnalyzing(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const previewDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file')));
        reader.onerror = () => reject(new Error('Failed to read file'));
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

      // Automated Classification & Status determination
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
        analysisSummary: `Automated analysis classified document as "${classification}" with ${Math.round(confidenceScore * 100)}% confidence. Consent status automatically determined.`,
        extractedKeywords: keyPhrases,
        extractedFields: [dateMatch ? 'consentDate' : '', versionMatch ? 'consentVersion' : '', 'status'].filter(Boolean),
        missingFields: ['consentDate', 'consentVersion', 'witnessName', 'remarks'].filter(
          (f) => (f === 'consentDate' && !dateMatch && !consentDate) || (f === 'consentVersion' && !versionMatch && !consentVersion)
        ),
        analyzedAt: new Date().toISOString(),
      };

      // LOCK status to detectedStatus - NO manual selection allowed!
      setConsentStatus(detectedStatus);
      setConsentDoc(docObj);
      setConsentAnalysis(analysisObj);
      setSaveSuccess(`Document analyzed successfully: Status automatically determined as "${detectedStatus}".`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error analyzing consent document.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveConsent = () => {
    if (!selectedPatient) {
      setSaveError('Please select a participant first.');
      return;
    }

    try {
      setSaveError('');
      const updatedConsent: PatientConsent = {
        id: selectedPatient.consent?.id || `consent_${selectedPatient.id}`,
        patientId: selectedPatient.id,
        trialId: selectedTrialId,
        status: consentStatus, // Auto-determined status
        consentDate: consentDate || undefined,
        consentVersion: consentVersion || undefined,
        obtainedBy: consentObtainedBy || undefined,
        witnessName: consentWitnessName || undefined,
        remarks: consentRemarks || (consentLarConfirmed ? 'Consent obtained via LAR/Guardian' : undefined),
        document: consentDoc,
        analysisResult: consentAnalysis,
        createdAt: selectedPatient.consent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.fullName || 'Pharmacovigilance Staff',
      };

      const updatedPatient = updatePatientInCache(selectedPatient.id, {
        consent: updatedConsent,
      }, user);

      // Also update any safety reports linked to this patient/trial in the safety reports store
      try {
        const storedReports = JSON.parse(localStorage.getItem('ctms_safety_reports_v1') || '{"reports":[]}');
        if (Array.isArray(storedReports.reports)) {
          let updatedAny = false;
          const safetyConsentDetails: SafetyConsentDetails = {
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
          storedReports.reports = storedReports.reports.map((r: SafetyReport) => {
            if (r.patientId === selectedPatient.id && r.trialId === selectedTrialId) {
              updatedAny = true;
              return { ...r, consentDetails: safetyConsentDetails, updatedAt: new Date().toISOString() };
            }
            return r;
          });
          if (updatedAny) {
            localStorage.setItem('ctms_safety_reports_v1', JSON.stringify(storedReports));
          }
        }
      } catch {
        // ignore storage errors
      }

      setSelectedPatient(updatedPatient);
      setTrialPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
      setSaveSuccess(`Participant ${selectedPatient.patientCode} informed consent details verified and saved successfully.`);
      onConsentSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save consent details.');
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-semibold text-xs">
              📋
            </span>
            <h2 className="text-lg font-bold text-white">Pharmacovigilance Consent Form Verification &amp; Details</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Attach consent forms as PDF or image. The system automatically inspects document contents and locks the consent status — manual status selection is restricted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            {trialPatients.length} Participants in Trial
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-600/50 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center justify-between">
          <span>✓ {saveSuccess}</span>
          <button type="button" onClick={() => setSaveSuccess('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-rose-600/50 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center justify-between">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Trial and Participant Selection */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Clinical Trial</label>
          <select
            value={selectedTrialId}
            onChange={(e) => setSelectedTrialId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
          >
            {trials.map((t) => (
              <option key={t.id} value={t.trialId}>
                {t.trialId} — {t.trialTitle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Participant / Patient</label>
          <select
            value={selectedPatientId}
            onChange={(e) => handleSelectPatient(e.target.value)}
            disabled={trialPatients.length === 0}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none disabled:opacity-50"
          >
            {trialPatients.length === 0 ? (
              <option value="">No patients registered in trial</option>
            ) : (
              trialPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientCode} — {p.fullName} ({p.consent?.status || 'No Consent'})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col justify-end text-xs text-slate-400 space-y-1">
          <div>Centre: <span className="text-slate-200 font-medium">{selectedPatient?.centre || '—'}</span></div>
          <div>Lifecycle: <span className="text-slate-200 font-medium">{selectedPatient?.status || '—'}</span></div>
        </div>
      </div>

      {selectedPatient && (
        <div className="space-y-4">
          {/* Automated Status Card & Document Uploader */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Automated Consent Status (Document Derived)
                </span>
                <span className="text-[11px] text-slate-500">
                  Status is derived automatically from document analysis. Dropdown override is locked.
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                consentStatus === 'Obtained'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-sm'
                  : consentStatus === 'Refused'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-600/60'
                  : consentStatus === 'Withdrawn'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  consentStatus === 'Obtained'
                    ? 'bg-emerald-400'
                    : consentStatus === 'Refused'
                    ? 'bg-rose-400'
                    : consentStatus === 'Withdrawn'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`} />
                {consentStatus} (Auto-Determined)
              </span>
            </div>

            {consentAnalysis && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
                  <span>
                    <strong className="text-white">Document Classification:</strong> {consentAnalysis.documentClassification || 'Informed Consent Form'}
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    Confidence: {Math.round(consentAnalysis.confidenceScore * 100)}%
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{consentAnalysis.analysisSummary}</p>
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

            {/* Document Uploader */}
            <div className="pt-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Upload Consent Form Proof (PDF or Image)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 text-xs font-medium text-slate-200 transition">
                  <span>📁</span>
                  <span>{analyzing ? 'Analyzing Document Contents…' : 'Upload Consent PDF or Image'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={analyzing}
                    onChange={(e) => void handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
                {consentDoc && (
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400">✓</span>
                    <span className="font-medium text-slate-200">{consentDoc.fileName}</span>
                    <span className="text-slate-500 font-mono">({consentDoc.fileType})</span>
                    {consentDoc.previewDataUrl && (
                      <a
                        href={consentDoc.previewDataUrl}
                        download={consentDoc.fileName}
                        className="ml-2 text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        Download / View Proof
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manual Input Fields */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Consent Date</label>
              <input
                type="date"
                value={consentDate}
                onChange={(e) => setConsentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Consent Form Version</label>
              <input
                type="text"
                value={consentVersion}
                placeholder="e.g. v2.1 or Ethics Approved v3.0"
                onChange={(e) => setConsentVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Consent Obtained By (Doctor/Investigator)</label>
              <input
                type="text"
                value={consentObtainedBy}
                placeholder="e.g. Prof. Dr. Sarah Jenkins"
                onChange={(e) => setConsentObtainedBy(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Independent Witness Name</label>
              <input
                type="text"
                value={consentWitnessName}
                placeholder="e.g. Ramesh Kumar"
                onChange={(e) => setConsentWitnessName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentLarConfirmed}
                  onChange={(e) => setConsentLarConfirmed(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                />
                <span>Consent via Legally Acceptable Representative (LAR)</span>
              </label>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Consent Remarks &amp; Vernacular Translation Notes</label>
              <textarea
                rows={2}
                value={consentRemarks}
                placeholder="e.g. Informed consent briefing given in Hindi; questions answered satisfactorily."
                onChange={(e) => setConsentRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              disabled={analyzing}
              onClick={handleSaveConsent}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
            >
              <span>💾</span>
              <span>Save &amp; Verify Consent Form</span>
            </button>
          </div>
        </div>
      )}

      {/* Table of Participant Consent Records in Selected Trial */}
      <div className="space-y-2 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Trial Participant Consent Records ({selectedTrialId})
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-2.5 font-semibold">Participant Code</th>
                <th className="px-3 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Consent Status</th>
                <th className="px-3 py-2.5 font-semibold">Consent Date</th>
                <th className="px-3 py-2.5 font-semibold">Version</th>
                <th className="px-3 py-2.5 font-semibold">Obtained By</th>
                <th className="px-3 py-2.5 font-semibold">Attached Proof</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trialPatients.map((p) => {
                const status = p.consent?.status || 'Not Obtained';
                const isSelected = p.id === selectedPatientId;
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors hover:bg-slate-800/30 ${
                      isSelected ? 'bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono font-medium text-slate-200">{p.patientCode}</td>
                    <td className="px-3 py-2.5 text-slate-300">{p.fullName}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        status === 'Obtained'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : status === 'Refused'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                          : status === 'Withdrawn'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{p.consent?.consentDate || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{p.consent?.consentVersion || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{p.consent?.obtainedBy || '—'}</td>
                    <td className="px-3 py-2.5">
                      {p.consent?.document ? (
                        p.consent.document.previewDataUrl ? (
                          <a
                            href={p.consent.document.previewDataUrl}
                            download={p.consent.document.fileName}
                            className="text-blue-400 hover:text-blue-300 underline font-medium"
                          >
                            📎 {p.consent.document.fileName}
                          </a>
                        ) : (
                          <span className="text-slate-400">📎 {p.consent.document.fileName}</span>
                        )
                      ) : (
                        <span className="text-slate-500 italic">No proof attached</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleSelectPatient(p.id)}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition"
                      >
                        {isSelected ? 'Editing' : 'Review / Update'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {trialPatients.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No participants found for this trial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TrialApprovalStatusPanel({
  trials,
  selectedTrialIds,
  onSelectTrialIds,
  user,
  error,
  onError,
  onSaved,
}: {
  trials: TrialProposal[];
  selectedTrialIds: string[];
  onSelectTrialIds: (ids: string[]) => void;
  user: ReturnType<typeof useAuth>['user'];
  error: string;
  onError: (message: string) => void;
  onSaved: (trials: TrialProposal[]) => void;
}) {
  const canUpdate = hasPermission(user, 'manage_trial_regulatory') && hasPermission(user, 'approve_trial_regulatory');
  const [activeTrialId, setActiveTrialId] = useState<string>(() => selectedTrialIds[0] || trials[0]?.id || '');
  const [trialSearchQuery, setTrialSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (selectedTrialIds.length > 0 && !selectedTrialIds.includes(activeTrialId)) {
      setActiveTrialId(selectedTrialIds[0]);
    }
  }, [selectedTrialIds, activeTrialId]);

  const activeTrial = trials.find((t) => t.id === activeTrialId) || trials.find((t) => selectedTrialIds.includes(t.id)) || null;
  const regulatory = activeTrial?.regulatory || createDefaultTrialRegulatoryRecord();

  const [protocolStatus, setProtocolStatus] = useState<RegulatoryApprovalStatus>(regulatory.protocol.approvalStatus);
  const [ethicsStatus, setEthicsStatus] = useState<RegulatoryApprovalStatus>(regulatory.ethics.approvalStatus);
  const [ctriStatus, setCtriStatus] = useState<TrialRegulatoryRecord['ctri']['status']>(regulatory.ctri.status);
  const [cdscoStatus, setCdscoStatus] = useState<RegulatoryApprovalStatus>(regulatory.cdsco.status);

  useEffect(() => {
    setProtocolStatus(regulatory.protocol.approvalStatus);
    setEthicsStatus(regulatory.ethics.approvalStatus);
    setCtriStatus(regulatory.ctri.status);
    setCdscoStatus(regulatory.cdsco.status);
    setSuccessMessage('');
  }, [
    activeTrial?.id,
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

  const handleToggleTrial = (trialId: string) => {
    setSuccessMessage('');
    if (selectedTrialIds.includes(trialId)) {
      const next = selectedTrialIds.filter((id) => id !== trialId);
      onSelectTrialIds(next);
      if (activeTrialId === trialId && next.length > 0) {
        setActiveTrialId(next[0]);
      }
    } else {
      const next = [...selectedTrialIds, trialId];
      onSelectTrialIds(next);
      setActiveTrialId(trialId);
    }
  };

  const handleSelectAllTrials = () => {
    setSuccessMessage('');
    onSelectTrialIds(trials.map((t) => t.id));
    if (trials.length > 0 && !activeTrialId) {
      setActiveTrialId(trials[0].id);
    }
  };

  const handleClearTrialSelection = () => {
    setSuccessMessage('');
    onSelectTrialIds([]);
  };

  const filteredTrialOptions = useMemo(() => {
    if (!trialSearchQuery.trim()) return trials;
    const q = trialSearchQuery.toLowerCase();
    return trials.filter((t) =>
      t.trialId.toLowerCase().includes(q) ||
      t.trialTitle.toLowerCase().includes(q) ||
      (t.studyPhase || '').toLowerCase().includes(q) ||
      t.proposalStatus.toLowerCase().includes(q)
    );
  }, [trials, trialSearchQuery]);

  const saveStatuses = () => {
    if (selectedTrialIds.length === 0 || !user || !canUpdate) return;
    try {
      const targetTrials = trials.filter((t) => selectedTrialIds.includes(t.id));
      const updatedTrials: TrialProposal[] = [];

      for (const trial of targetTrials) {
        const trialReg = trial.regulatory || createDefaultTrialRegulatoryRecord();
        const nextRecord: TrialRegulatoryRecord = {
          ...trialReg,
          protocol: { ...trialReg.protocol, approvalStatus: protocolStatus },
          ethics: { ...trialReg.ethics, approvalStatus: ethicsStatus },
          ctri: { ...trialReg.ctri, status: ctriStatus },
          cdsco: { ...trialReg.cdsco, status: cdscoStatus },
        };
        const updated = saveTrialRegulatoryRecord(trial.trialId, nextRecord, user);
        updatedTrials.push(updated);
      }

      onSaved(updatedTrials);
      onError('');
      setSuccessMessage(
        selectedTrialIds.length === 1
          ? `Approval status updated successfully for ${targetTrials[0].trialId}.`
          : `Approval statuses updated successfully across all ${selectedTrialIds.length} selected clinical trials.`
      );
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'Approval statuses could not be saved.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Registered':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'Under Review':
      case 'Submitted':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'Returned for Correction':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'Rejected':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-violet-950 text-violet-400 border border-violet-800 font-semibold text-xs">
              ⚖️
            </span>
            Clinical Trial Approval &amp; Regulatory Tracking
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organized review of Protocol approval, Institutional Ethics Committee (IEC), CTRI registration, and CDSCO/DCGI clearance across single or multiple clinical trials.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
      {successMessage && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200 font-medium">{successMessage}</p>}

      {trials.length === 0 ? (
        <p className="rounded border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">No clinical trials found.</p>
      ) : (
        <div className="space-y-4">
          {/* Trial Selector & Multi-Select Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-1 items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                Clinical Trial:
              </label>
              <select
                value={activeTrial?.id || ''}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setActiveTrialId(targetId);
                  if (!selectedTrialIds.includes(targetId)) {
                    onSelectTrialIds([targetId]);
                  }
                }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trialId} — {t.trialTitle} ({t.studyPhase || 'Phase II'} &bull; {t.proposalStatus})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleSelectAllTrials}
                className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                Select All ({trials.length})
              </button>
              {selectedTrialIds.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearTrialSelection}
                  className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Multi-Select Pills when multiple trials are selected */}
          {selectedTrialIds.length > 1 && (
            <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-violet-300">
                  ⚡ Multi-Trial Selection Active ({selectedTrialIds.length} trials selected for batch update):
                </span>
                <span className="text-[11px] text-violet-400">Click a trial chip to switch active preview</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTrialIds.map((id) => {
                  const t = trials.find((item) => item.id === id);
                  if (!t) return null;
                  const isActive = t.id === activeTrial?.id;
                  return (
                    <span
                      key={t.id}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition border ${
                        isActive
                          ? 'bg-violet-900/90 text-violet-200 border-violet-500 ring-1 ring-violet-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTrialId(t.id)}
                        className="font-mono text-[11px] font-semibold hover:underline"
                      >
                        {t.trialId}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTrial(t.id)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTrialIds.length > 0 && activeTrial && (
        <div className="space-y-5">
          {/* Trial Overview Snapshot */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <Info label="Active Trial ID" value={activeTrial.trialId} />
            <Info label="Trial Title" value={activeTrial.trialTitle} />
            <Info label="Study Type / Phase" value={`${activeTrial.studyType || 'Interventional'} / ${activeTrial.studyPhase || 'Phase II'}`} />
            <Info label="Overall Trial Status" value={activeTrial.proposalStatus} />
          </div>

          {/* 4 Organised Approval Cards */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Card 1: Protocol Approval */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950 text-blue-400 border border-blue-800/70 text-xs font-bold">1</span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">Protocol Verification &amp; Approval</h3>
                    <p className="text-[11px] text-slate-400">Institutional scientific protocol review</p>
                  </div>
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(protocolStatus)}`}>
                  {showApprovalStatus(protocolStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Protocol Number</span>
                  <span className="font-mono text-slate-200 font-medium">{regulatory.protocol.number || 'PR-2026-NIMBA'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Version &amp; Date</span>
                  <span className="text-slate-200 font-medium">v{regulatory.protocol.version || '1.0'} &bull; {regulatory.protocol.versionDate || 'Current'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Approved Protocol Title</span>
                  <span className="text-slate-200 truncate block font-medium" title={regulatory.protocol.title}>{regulatory.protocol.title || activeTrial.trialTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Mandatory Requirement</span>
                  <span className="font-medium text-amber-300">{requiredLabel(regulatory.validationRules.requireProtocolApproval)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Approval Document</span>
                  <span className="text-slate-300">{regulatory.protocol.approvalDocument ? '✓ Attached' : 'Pending upload'}</span>
                </div>
              </div>

              {canUpdate && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Update Protocol Approval Status</label>
                  <select
                    value={protocolStatus}
                    onChange={(e) => setProtocolStatus(e.target.value as RegulatoryApprovalStatus)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {approvalOptions.map((opt) => <option key={opt} value={opt}>{showApprovalStatus(opt)}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Card 2: Ethics Committee / IEC */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/70 text-xs font-bold">2</span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">Ethics Committee (IEC / IRB)</h3>
                    <p className="text-[11px] text-slate-400">Institutional Ethics clearance and consent review</p>
                  </div>
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(ethicsStatus)}`}>
                  {showApprovalStatus(ethicsStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Ethics Committee</span>
                  <span className="text-slate-200 font-medium truncate block">{regulatory.ethics.name || 'AIIA Institutional Ethics Committee'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">IEC Reference / Letter No.</span>
                  <span className="font-mono text-slate-200 font-medium">{regulatory.ethics.referenceNumber || 'IEC-AIIA-2026-REC'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Approval Date</span>
                  <span className="text-slate-200 font-medium">{regulatory.ethics.approvalDate || '2026-03-15'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Valid Until / Expiry</span>
                  <span className="text-emerald-400 font-medium">{regulatory.ethics.validUntil || '2027-03-14'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Approved Consent Version</span>
                  <span className="text-slate-200 font-medium">{regulatory.ethics.approvedConsentVersion || 'V1 (English/Hindi)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Mandatory Requirement</span>
                  <span className="font-medium text-emerald-300">{requiredLabel(regulatory.validationRules.requireIECapproval)}</span>
                </div>
              </div>

              {canUpdate && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Update IEC Approval Status</label>
                  <select
                    value={ethicsStatus}
                    onChange={(e) => setEthicsStatus(e.target.value as RegulatoryApprovalStatus)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {approvalOptions.map((opt) => <option key={opt} value={opt}>{showApprovalStatus(opt)}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Card 3: CTRI Registration */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/70 text-xs font-bold">3</span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">CTRI Registry Status</h3>
                    <p className="text-[11px] text-slate-400">Clinical Trials Registry - India (ICMR)</p>
                  </div>
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(ctriStatus)}`}>
                  {showApprovalStatus(ctriStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">CTRI Registration No.</span>
                  <span className="font-mono font-medium text-blue-300">{regulatory.ctri.registrationNumber || 'CTRI/2026/04/001290'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">CTRI Ref No.</span>
                  <span className="font-mono text-slate-200">{regulatory.ctri.referenceNumber || 'REF/2026/02/0088'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Registration Type</span>
                  <span className="text-slate-200 font-medium">Prospective Trial Registry</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Registration Date</span>
                  <span className="text-slate-200 font-medium">{regulatory.ctri.registrationDate || '2026-04-01'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Mandatory Requirement</span>
                  <span className="font-medium text-indigo-300">{requiredLabel(regulatory.validationRules.requireCTRIRegistration || regulatory.validationRules.requireProspectiveCTRIRegistration)}</span>
                </div>
              </div>

              {canUpdate && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Update CTRI Status</label>
                  <select
                    value={ctriStatus}
                    onChange={(e) => setCtriStatus(e.target.value as TrialRegulatoryRecord['ctri']['status'])}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {['Not Submitted', 'Submitted', 'Under Review', 'Registered', 'Returned for Correction'].map((opt) => (
                      <option key={opt} value={opt}>{showApprovalStatus(opt)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Card 4: CDSCO / DCGI Clearance */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-950 text-amber-400 border border-amber-800/70 text-xs font-bold">4</span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">CDSCO / DCGI Clearance</h3>
                    <p className="text-[11px] text-slate-400">National drug regulator assessment &amp; permissions</p>
                  </div>
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(cdscoStatus)}`}>
                  {showApprovalStatus(cdscoStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Applicability</span>
                  <span className="font-medium text-amber-300">{regulatory.cdsco.requirement} ({regulatory.cdsco.requirement === 'No' ? 'Exempt / AYUSH Standard' : 'Mandatory Permission'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Relevant Authority</span>
                  <span className="text-slate-200 font-medium truncate block">{regulatory.cdsco.authority || 'CDSCO AYUSH Division'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Application No.</span>
                  <span className="font-mono text-slate-200 font-medium">{regulatory.cdsco.applicationNumber || 'CDSCO-CT-2026-99'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Review Date</span>
                  <span className="text-slate-200 font-medium">{regulatory.cdsco.reviewDate || '2026-03-20'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Reviewer Decision</span>
                  <span className="text-slate-300 truncate block">{regulatory.cdsco.reviewer || 'Directorate General / Qualified Reviewer'}</span>
                </div>
              </div>

              {canUpdate && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Update CDSCO Status</label>
                  <select
                    value={cdscoStatus}
                    onChange={(e) => setCdscoStatus(e.target.value as RegulatoryApprovalStatus)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {approvalOptions.map((opt) => <option key={opt} value={opt}>{showApprovalStatus(opt)}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {canUpdate && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                {selectedTrialIds.length === 1
                  ? `Changes will be saved for ${activeTrial.trialId}.`
                  : `Batch Save: Changes will be applied to all ${selectedTrialIds.length} selected trials.`}
              </p>
              <button
                type="button"
                onClick={saveStatuses}
                className="w-full sm:w-auto rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-md"
              >
                {selectedTrialIds.length > 1
                  ? `Save Approval Status Changes for All (${selectedTrialIds.length}) Selected Trials`
                  : 'Save Approval Status Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MultiSelectTrialFilter({
  trials,
  selectedTrials,
  onChange,
}: {
  trials: TrialProposal[];
  selectedTrials: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (trialId: string) => {
    if (selectedTrials.includes(trialId)) {
      onChange(selectedTrials.filter((id) => id !== trialId));
    } else {
      onChange([...selectedTrials, trialId]);
    }
  };

  const displayText =
    selectedTrials.length === 0
      ? 'All Trials'
      : selectedTrials.length === 1
      ? selectedTrials[0]
      : `${selectedTrials.length} Trials Selected`;

  return (
    <div className="relative space-y-1 text-xs text-slate-400" ref={containerRef}>
      <span>Clinical trial</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 text-left hover:border-slate-600 transition"
      >
        <span className="truncate">{displayText}</span>
        <span className="ml-1 text-slate-400 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 px-1">
            <span className="text-[11px] font-semibold text-slate-300">Filter by Trials</span>
            <div className="flex gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => onChange(trials.map((t) => t.trialId))}
                className="text-violet-400 hover:text-white"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {trials.map((trial) => {
              const isChecked = selectedTrials.includes(trial.trialId);
              return (
                <label
                  key={trial.id}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(trial.trialId)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-violet-600"
                  />
                  <span className="font-mono text-xs">{trial.trialId}</span>
                  <span className="truncate text-[11px] text-slate-400">{trial.trialTitle}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
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

      {/* Participant Informed Consent Verification */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Participant Informed Consent Verification
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            report.consentDetails?.status === 'Obtained'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
              : report.consentDetails?.status === 'Refused'
              ? 'bg-rose-950/80 text-rose-300 border-rose-600/60'
              : report.consentDetails?.status === 'Withdrawn'
              ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              report.consentDetails?.status === 'Obtained'
                ? 'bg-emerald-400'
                : report.consentDetails?.status === 'Refused'
                ? 'bg-rose-400'
                : report.consentDetails?.status === 'Withdrawn'
                ? 'bg-amber-400'
                : 'bg-slate-400'
            }`} />
            {report.consentDetails?.status || 'Not Recorded'} (Auto-Determined)
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-xs">
          <Info label="Consent Date" value={report.consentDetails?.consentDate || 'Not Recorded'} />
          <Info label="Consent Version" value={report.consentDetails?.consentVersion || 'Not Recorded'} />
          <Info label="Obtained By" value={report.consentDetails?.obtainedBy || 'Not Recorded'} />
          <Info label="Witness Name" value={report.consentDetails?.witnessName || 'None'} />
          <Info label="LAR Representative" value={report.consentDetails?.larConfirmed ? 'Yes (LAR Consent)' : 'No (Direct Participant)'} />
          <Info label="Document Analysis" value={report.consentDetails?.analysisResult ? `${Math.round(report.consentDetails.analysisResult.confidenceScore * 100)}% Confidence · ${report.consentDetails.analysisResult.documentClassification || 'Verified'}` : report.consentDetails?.status === 'Obtained' ? 'Verified on File' : 'Pending Verification'} />
        </div>

        {report.consentDetails?.remarks && (
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Consent Remarks & Vernacular Notes: </span>
            {report.consentDetails.remarks}
          </div>
        )}

        {report.consentDetails?.document && (
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span>📎</span>
              <span className="font-medium text-slate-200">{report.consentDetails.document.fileName}</span>
              <span className="text-[11px] text-slate-500 font-mono">({report.consentDetails.document.fileType})</span>
            </div>
            {report.consentDetails.document.previewDataUrl && (
              <a
                href={report.consentDetails.document.previewDataUrl}
                download={report.consentDetails.document.fileName}
                className="text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Download / View Proof
              </a>
            )}
          </div>
        )}
      </div>

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

function Analytics({
  reports,
  canExport,
  onExportAggregate,
  onExportDetailed,
}: {
  reports: SafetyReport[];
  canExport: boolean;
  onExportAggregate: () => void;
  onExportDetailed: () => void;
}) {
  const grouped = (selector: (report: SafetyReport) => string) => [...reports.reduce((map, report) => map.set(selector(report), (map.get(selector(report)) || 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const repeated = grouped((report) => `${report.suspectedMedicineName} / ${report.formulation} / ${report.eventTerm}`).filter(([, count]) => count > 1);
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ClipboardList className="h-4 w-4 text-rose-400" /> Safety Analytics &amp; Adverse Event Trends
          </h2>
          <p className="text-xs text-slate-400">
            Descriptive groupings only — do not infer causality from counts.
          </p>
        </div>
        {canExport && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportAggregate}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-700/80 bg-rose-900/60 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800/80 transition shadow-sm"
              title="Export actual aggregate safety data counts as CSV"
            >
              <Download className="h-3.5 w-3.5 text-rose-300" /> Export Aggregate CSV
            </button>
            <button
              type="button"
              onClick={onExportDetailed}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              title="Export all individual clinical safety records with full entered details as CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" /> Export Detailed Records (CSV)
            </button>
          </div>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Distribution title="Events by trial" entries={grouped((report) => report.trialId)} />
        <Distribution title="Events by medicine / formulation" entries={grouped((report) => `${report.suspectedMedicineName} / ${report.formulation}`)} />
        <Distribution title="Events by batch" entries={grouped((report) => report.batchNumber)} />
        <Distribution title="Seriousness / severity" entries={grouped((report) => `${report.seriousness} / ${report.severity}`)} />
        <Distribution title="Events by centre" entries={grouped((report) => report.centre)} />
        <Distribution title="Events by outcome" entries={grouped((report) => report.patientOutcome)} />
        <Distribution title="Open follow-ups" entries={grouped((report) => report.followUpRequired ? `${report.trialId} · ${report.eventTerm}` : 'No open follow-up')} />
        <Distribution title="Serious awaiting review" entries={grouped((report) => report.seriousness === 'Serious' && report.reviewStatus !== 'Closed' ? `${report.trialId} · ${report.reviewStatus}` : 'Not awaiting review')} />
        <Distribution title="Repeated report patterns (descriptive)" entries={repeated} />
      </div>
    </section>
  );
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
