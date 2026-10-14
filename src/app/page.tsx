'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useDrugs } from '@/context/DrugContext';
import { getUserTypeConfig } from '@/lib/permissions';
import { TrialProposal } from '@/lib/types';
import { getCachedProposals } from '@/lib/proposalStorage';
import { getCachedCentres } from '@/lib/centreStorage';
import { Activity, Building2, Calendar, ChevronRight, FlaskConical, Leaf, Pill, Plus, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <HomeDashboardContent />
      </div>
    </ProtectedRoute>
  );
}

function HomeDashboardContent() {
  const { user } = useAuth();
  const { drugs } = useDrugs();
  const [proposals, setProposals] = useState<TrialProposal[]>([]);
  const [centresCount, setCentresCount] = useState(0);

  useEffect(() => {
    setProposals(getCachedProposals());
    setCentresCount(getCachedCentres().length);
  }, []);

  if (!user) return null;

  const typeConfig = getUserTypeConfig(user.userType);
  const isAdmin = user.role === 'admin' || user.userType === 'administration' || user.userType === 'system_administrator';
  const activeDrugs = drugs.filter((drug) => drug.drugStatus === 'Active').length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800 pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Leaf className="w-4 h-4" /> Ayurvedic & AYUSH Clinical Trial Workspace
          </p>
          <h1 className="text-2xl font-bold text-white mt-2">Welcome back, {user.fullName}</h1>
          <p className="text-sm text-slate-400 mt-1">{typeConfig.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/drugs" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
            <Pill className="w-4 h-4" /> Drug Module <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/trials" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Trial Proposals
          </Link>
          {isAdmin && <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"><Shield className="w-4 h-4" /> Admin</Link>}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Workspace summary">
        <SummaryItem icon={<Pill className="w-4 h-4" />} label="Drug formulations" value={`${drugs.length}`} detail={`${activeDrugs} active`} color="text-emerald-400" />
        <SummaryItem icon={<FlaskConical className="w-4 h-4" />} label="Trial proposals" value={`${proposals.length}`} detail="Protocols in workspace" color="text-blue-400" />
        <SummaryItem icon={<Building2 className="w-4 h-4" />} label="Research centres" value={`${centresCount}`} detail="Registered sites" color="text-cyan-400" />
        <SummaryItem icon={<Calendar className="w-4 h-4" />} label="Upcoming visits" value="36" detail="Scheduled this week" color="text-amber-400" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-white">Investigational formulations</h2>
              <p className="text-xs text-slate-400 mt-1">AYUSH products registered in this workspace</p>
            </div>
            <Link href="/drugs" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">View all <ChevronRight className="w-4 h-4" /></Link>
          </div>
          {drugs.length === 0 ? (
            <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center text-sm text-slate-400">No drug formulations have been added.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {drugs.slice(0, 4).map((drug) => (
                <Link key={drug.id} href="/drugs" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 hover:bg-slate-900/60 px-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{drug.drugName}<span className="text-xs font-normal italic text-slate-400"> · {drug.genericName}</span></p>
                    <p className="text-xs text-slate-400 mt-1">{drug.id} · {drug.trialPhase} · {drug.dosageForm} ({drug.strength})</p>
                  </div>
                  <span className="text-xs text-emerald-400">{drug.drugStatus}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="border-l border-slate-800 lg:pl-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> Recent proposals</h2>
          <div className="mt-3 divide-y divide-slate-800">
            {proposals.slice(0, 4).map((proposal) => (
              <Link key={proposal.id} href={`/trials/${encodeURIComponent(proposal.trialId)}`} className="block py-3 hover:bg-slate-900/60 px-2">
                <p className="text-sm font-medium text-slate-200">{proposal.trialTitle}</p>
                <p className="text-xs text-slate-400 mt-1">{proposal.trialId} · {proposal.proposalStatus}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryItem({ icon, label, value, detail, color }: { icon: React.ReactNode; label: string; value: string; detail: string; color: string }) {
  return (
    <div className="border-t-2 border-slate-700 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><span className={color}>{icon}</span></div>
      <div className="text-2xl font-bold text-white mt-3">{value}</div>
      <p className="text-xs text-slate-500 mt-1">{detail}</p>
    </div>
  );
}
