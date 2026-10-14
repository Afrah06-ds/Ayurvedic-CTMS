'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getPatientForTrial } from '@/lib/patientStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import { Patient, TrialProposal } from '@/lib/types';
import { ArrowLeft, CalendarDays, Plus, Stethoscope } from 'lucide-react';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export default function PatientVisitsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const trialId = String(params.trialId || '');
  const patientId = String(params.patientId || '');
  const [trial, setTrial] = useState<TrialProposal | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const decodedTrialId = decodeURIComponent(trialId);
    const proposal = getCachedProposals().find((item) => item.trialId === decodedTrialId);
    setTrial(proposal || null);
    setPatient(proposal ? getPatientForTrial(proposal.trialId, decodeURIComponent(patientId)) || null : null);
  }, [trialId, patientId]);

  const basePath = `/trials/${encodeURIComponent(trialId)}/patients/${encodeURIComponent(patientId)}/visits`;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {!trial || !patient ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
              <p className="text-lg font-semibold text-white">Patient visits not found in this clinical trial.</p>
              <Link href="/trials" className="mt-4 inline-flex items-center gap-2 text-blue-300 hover:text-blue-200">
                <ArrowLeft className="h-4 w-4" /> Back to trials
              </Link>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-5 border-b border-slate-800 pb-6">
                <Link href={`/trials/${encodeURIComponent(trial.trialId)}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4" /> Back to patients
                </Link>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      <Stethoscope className="h-4 w-4" /> Patient Visit Management
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-white">{patient.fullName}</h1>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                      <p><span className="text-slate-500">Patient:</span> {patient.fullName}</p>
                      <p><span className="text-slate-500">Patient Code:</span> {patient.patientCode}</p>
                      <p><span className="text-slate-500">Clinical Trial:</span> {trial.trialTitle} ({trial.trialId})</p>
                      <p><span className="text-slate-500">Centre:</span> {patient.centre || '—'}</p>
                    </div>
                  </div>
                  <Link
                    href={`${basePath}/new`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    <Plus className="h-4 w-4" /> Add Visit
                  </Link>
                </div>
              </header>

              {searchParams.get('saved') === '1' && (
                <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  Visit saved successfully. The visit history has been updated.
                </p>
              )}

              <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="border-b border-slate-800 px-5 py-4">
                  <h2 className="text-lg font-semibold text-white">Visit History</h2>
                  <p className="mt-1 text-sm text-slate-400">{patient.visits?.length || 0} visits for {patient.patientCode}</p>
                </div>
                {(patient.visits?.length || 0) === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-400">
                    No visits have been recorded for this patient yet. Select Add Visit to create the first visit.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-5 py-3">Visit No.</th>
                          <th className="px-5 py-3">Visit Date</th>
                          <th className="px-5 py-3">Visit Type</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {[...(patient.visits || [])]
                          .sort((a, b) => (a.visitDate || '').localeCompare(b.visitDate || ''))
                          .map((visit) => (
                            <tr key={visit.id} className="hover:bg-slate-800/30">
                              <td className="px-5 py-4 font-medium text-white">{visit.visitNumber || 'Visit'}</td>
                              <td className="px-5 py-4 text-slate-300">{formatDate(visit.visitDate)}</td>
                              <td className="px-5 py-4 text-slate-300">{visit.visitType || '—'}</td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{visit.status || 'Scheduled'}</span>
                              </td>
                              <td className="px-5 py-4">
                                <Link
                                  href={`${basePath}/${encodeURIComponent(visit.id)}`}
                                  className="inline-flex items-center gap-2 rounded-md border border-blue-700/70 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-600/10"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" /> Open Visit
                                </Link>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
