'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { User, Patient, TrialProposal } from '@/lib/types';
import {
  getCertificateAuditHistory,
  getTreatmentCertificateEligibility,
  getTreatmentCertificates,
  issueTreatmentCertificate,
} from '@/lib/certificateStorage';
import { hasPermission } from '@/lib/permissions';

interface TreatmentCertificatesPanelProps {
  trial: TrialProposal;
  patients: Patient[];
  user: User | null;
}

const printEscape = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);

export function TreatmentCertificatesPanel({ trial, patients, user }: TreatmentCertificatesPanelProps) {
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [certificates, setCertificates] = useState<ReturnType<typeof getTreatmentCertificates>>([]);
  const [auditHistory, setAuditHistory] = useState<ReturnType<typeof getCertificateAuditHistory>>([]);
  const [signatory, setSignatory] = useState(user?.fullName || '');
  const [signatoryTitle, setSignatoryTitle] = useState(user?.department || user?.userType || '');
  const canApprove = hasPermission(user, 'approve_treatment_certificates');
  const canViewAudit = hasPermission(user, 'view_audit_logs');
  useEffect(() => {
    setSignatory(user?.fullName || '');
    setSignatoryTitle(user?.department || user?.userType || '');
  }, [user]);
  useEffect(() => {
    try {
      setCertificates(getTreatmentCertificates(trial.trialId));
      setAuditHistory(getCertificateAuditHistory(trial.trialId));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Certificate records could not be loaded.');
    }
  }, [refresh, trial.trialId]);
  const eligibility = useMemo(
    () => patients.map((patient) => ({
      patient,
      assessment: getTreatmentCertificateEligibility(trial, patient),
      certificate: certificates.find((item) => item.patientId === patient.id),
    })),
    [certificates, patients, trial]
  );

  const counts = {
    registered: patients.length,
    consent: patients.filter((patient) => patient.consent?.status === 'Obtained').length,
    enrolled: patients.filter((patient) => Boolean(patient.enrollment)).length,
    started: eligibility.filter((item) => item.assessment.treatmentStarted).length,
    completed: patients.filter((patient) => patient.enrollment?.enrollmentStatus === 'Completed').length,
    withdrawn: patients.filter((patient) => ['Withdrawn', 'Discontinued'].includes(patient.enrollment?.enrollmentStatus || '')).length,
    eligible: eligibility.filter((item) => item.assessment.eligible).length,
    issued: certificates.length,
  };

  const issue = (patientId: string) => {
    if (!user) return;
    try {
      const certificate = issueTreatmentCertificate(trial, patientId, user, signatory, signatoryTitle);
      setError('');
      setNotice(`${certificate.certificateNumber} issued.`);
      setRefresh((current) => current + 1);
    } catch (issueError) {
      setNotice('');
      setError(issueError instanceof Error ? issueError.message : 'Certificate could not be issued.');
    }
  };

  const printCertificate = (certificateId: string) => {
    const certificate = certificates.find((item) => item.id === certificateId);
    if (!certificate) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('The certificate print window was blocked. Allow pop-ups and try again.');
      return;
    }
    const content = `
      <!doctype html><html><head><meta charset="utf-8"><title>${printEscape(certificate.certificateNumber)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:48px}
        article{max-width:780px;margin:0 auto;border:3px double #64748b;padding:48px;text-align:center}
        h1{font-size:28px;margin:0 0 8px}h2{font-size:20px;color:#475569;margin:0 0 32px}
        p{font-size:16px;line-height:1.7}.meta{margin:32px auto;text-align:left;max-width:560px}
        .sign{margin:52px auto 0;border-top:1px solid #64748b;padding-top:10px;width:260px}
        .notice{font-size:12px;color:#475569;margin-top:36px}
      </style></head><body><article>
      <h1>${printEscape(certificate.certificateType)} Certificate</h1>
      <h2>${printEscape(certificate.trialTitle)}</h2>
      <p>This certifies that <strong>${printEscape(certificate.patientName)}</strong> (participant code <strong>${printEscape(certificate.patientCode)}</strong>) participated in the clinical trial.</p>
      <div class="meta">
        <p><strong>Treatment period:</strong> ${printEscape(certificate.treatmentStartDate || 'Not recorded')} to ${printEscape(certificate.treatmentEndDate || 'Not recorded')}</p>
        <p><strong>Completed visits:</strong> ${certificate.completedVisits}</p>
        <p><strong>Actual treatment status:</strong> ${printEscape(certificate.actualTreatmentStatus)}</p>
        <p><strong>Certificate number:</strong> ${printEscape(certificate.certificateNumber)}</p>
        <p><strong>Issue date:</strong> ${printEscape(certificate.issueDate)}</p>
      </div>
      <div class="sign"><strong>${printEscape(certificate.authorizedSignatory)}</strong><br>${printEscape(certificate.authorizedSignatoryTitle)}</div>
      <p class="notice">This document confirms trial participation/treatment status only. It is not a medical cure certificate and makes no claim that the participant was cured.</p>
      </article><script>window.onload=function(){window.print()}</script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <header>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300"><Award className="h-4 w-4" /> Selected Clinical Trial</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Treatment Certificates</h2>
        <p className="mt-1 text-sm text-slate-400">Eligibility is calculated from enrollment, consent, completed visits, and recorded treatment—not consent alone.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <CountCard label="Registered patients" value={counts.registered} />
        <CountCard label="Consent obtained" value={counts.consent} />
        <CountCard label="Enrolled patients" value={counts.enrolled} />
        <CountCard label="Treatment started" value={counts.started} />
        <CountCard label="Treatment completed" value={counts.completed} />
        <CountCard label="Withdrawn / discontinued" value={counts.withdrawn} />
        <CountCard label="Certificate eligible" value={counts.eligible} />
        <CountCard label="Certificate issued" value={counts.issued} />
      </div>

      {!canApprove && <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-sm text-amber-200">You can review certificate status, but only an authorized approver can issue a certificate.</p>}
      {error && <p role="alert" className="whitespace-pre-line rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Authorized signatory name</span>
          <input value={signatory} readOnly className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 opacity-80" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Authorized signatory title / qualification</span>
          <input value={signatoryTitle} disabled={!canApprove} onChange={(event) => setSignatoryTitle(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="py-3 pr-4">Patient</th><th className="py-3 pr-4">Treatment</th><th className="py-3 pr-4">Completed visits</th><th className="py-3 pr-4">Certificate</th><th className="py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {eligibility.map(({ patient, assessment, certificate }) => (
              <tr key={patient.id} className="border-b border-slate-800/70 align-top">
                <td className="py-3 pr-4"><p className="font-medium text-white">{patient.patientCode} · {patient.fullName}</p><p className="text-xs text-slate-400">{patient.enrollment?.enrollmentStatus || 'Not enrolled'}</p></td>
                <td className="py-3 pr-4 text-slate-300">{assessment.treatmentStarted ? `${assessment.startDate || 'Start date missing'} – ${assessment.endDate || 'Ongoing'}` : 'No dated treatment record'}</td>
                <td className="py-3 pr-4 text-slate-300">{assessment.completedVisits}</td>
                <td className="py-3 pr-4 text-slate-300">{certificate ? `${certificate.certificateNumber} · ${certificate.issueDate}` : assessment.eligible ? 'Eligible' : assessment.reasons.join(' ')}</td>
                <td className="py-3">
                  {certificate ? (
                    <button type="button" onClick={() => printCertificate(certificate.id)} className="inline-flex items-center gap-1 rounded border border-blue-700 px-2 py-1 text-xs text-blue-200 hover:bg-blue-900/40"><Printer className="h-3 w-3" /> Print</button>
                  ) : (
                    <button type="button" disabled={!assessment.eligible || !canApprove} onClick={() => issue(patient.id)} className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500">Approve &amp; issue</button>
                  )}
                </td>
              </tr>
            ))}
            {patients.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No patient records are available for this trial.</td></tr>}
          </tbody>
        </table>
      </div>

      {counts.eligible > counts.issued && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300">Pending Certificate Issuance:</span>
            <span>{counts.eligible - counts.issued} completed participant{counts.eligible - counts.issued > 1 ? 's' : ''} eligible for Treatment Completion Certificates.</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">Action Required</span>
        </div>
      )}

      {canViewAudit && (
        <details className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Certificate audit history ({auditHistory.length})</summary>
          {auditHistory.length === 0 ? <p className="mt-3 text-sm text-slate-400">No certificates have been issued.</p> : (
            <div className="mt-3 space-y-2">
              {[...auditHistory].reverse().map((entry) => (
                <p key={entry.id} className="text-sm text-slate-300">{entry.changedAt} · {entry.changedBy} issued {entry.certificateNumber} for patient {entry.patientId}</p>
              ))}
            </div>
          )}
        </details>
      )}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-white">{value}</p></div>;
}
