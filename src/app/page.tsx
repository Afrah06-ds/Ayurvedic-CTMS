'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useDrugs } from '@/context/DrugContext';
import { getUserTypeConfig } from '@/lib/permissions';
import { TrialProposal } from '@/lib/types';
import { getCachedProposals } from '@/lib/proposalStorage';
import { getCachedCentres } from '@/lib/centreStorage';
import {
  Activity,
  Shield,
  Users,
  FlaskConical,
  Calendar,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Building2,
  Plus,
  MapPin,
  Pill,
  Leaf,
} from 'lucide-react';

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
    try {
      const list = getCachedProposals();
      setProposals(list);
      const ctrs = getCachedCentres();
      setCentresCount(ctrs.length);
    } catch {
      // ignore
    }
  }, []);

  if (!user) return null;

  const totalDrugs = drugs.length;
  const activeDrugs = drugs.filter((d) => d.drugStatus === 'Active').length;
  const typeConfig = getUserTypeConfig(user.userType);
  const isAdmin = user.role === 'admin' || user.userType === 'administration';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-800/40 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                Ayurvedic & AYUSH Clinical Trial Workspace
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeConfig.badgeBg} ${typeConfig.badgeText} ${typeConfig.badgeBorder}`}
              >
                User Type: {typeConfig.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {user.fullName}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {typeConfig.description} Signed in as <span className="font-mono text-blue-300">{user.email}</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/trials"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all group"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Create Trial Proposal</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/drugs"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all group"
            >
              <Pill className="w-4 h-4" />
              <span>Drug Module ({totalDrugs})</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Clinical Trials & Formulations Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Submitted Proposals</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <FlaskConical className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{proposals.length} Proposals</div>
            <p className="text-xs text-slate-500 mt-1">Including Nimba Tablet (CT-001)</p>
          </div>

          <Link href="/drugs" className="group">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                  Investigational Drugs (IP)
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{totalDrugs} Formulations</div>
              <p className="text-xs text-emerald-400/90 mt-1">{activeDrugs} active in clinical evaluation</p>
            </div>
          </Link>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Available Centres</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{centresCount} Sites</div>
            <p className="text-xs text-purple-400/90 mt-1">Registered & Accredited Sites</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Subjects Enrolled</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">1,420</div>
            <p className="text-xs text-blue-400/90 mt-1">+84 enrolled this month</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Operational Status
            </h3>
            <span className="text-[10px] uppercase tracking-wide text-emerald-400">Live</span>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Protocol Compliance</span>
              <span className="font-semibold text-emerald-400">96%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Safety Review</span>
              <span className="font-semibold text-blue-400">On Track</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Data Quality</span>
              <span className="font-semibold text-purple-400">A+</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Key Milestones
            </h3>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Trial proposal review cycle refreshed</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>New site onboarding updated</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Monitoring visits scheduled for next 7 days</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              Access & Security
            </h3>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>User access</span>
              <span className="font-semibold text-violet-400">{typeConfig.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Role profile</span>
              <span className="font-semibold text-emerald-400">{user.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Admin portal</span>
              <span className="font-semibold text-blue-400">{isAdmin ? 'Enabled' : 'Restricted'}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

          </div>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Trial Proposals List & Granted User Permissions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Trial Proposals List */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Submitted Trial Proposals & Protocols</h3>
              <p className="text-xs text-slate-400">Protocols submitted for IRB review and site allocation</p>
            </div>
            <Link
              href="/trials"
              className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All ({proposals.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
=======
      {/* Featured AYUSH Drug Spotlight & Active Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Investigational Drugs List */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Leaf className="w-3.5 h-3.5" />
                <span>Featured Investigational Products</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">Ayurvedic Trial Formulations</h3>
            </div>
            <Link
              href="/drugs"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View All ({totalDrugs})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
>>>>>>> Stashed changes
            </Link>
          </div>

          <div className="space-y-3">
<<<<<<< Updated upstream
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {prop.trialId}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {prop.studyPhase}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {prop.proposalStatus}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white leading-snug">{prop.trialTitle}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: <span className="text-slate-200">{prop.targetDisease}</span> • Sample: <span className="text-emerald-400">{prop.sampleSize}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <Link
                    href="/trials"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                  >
                    <span>View Proposal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
=======
            {drugs.slice(0, 3).map((drug) => (
              <Link
                key={drug.id}
                href="/drugs"
                className="block p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800/80 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-400">{drug.id}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {drug.trialPhase}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {drug.drugStatus}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        CTRI: {drug.ctriRegistrationNumber}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {drug.drugName} &mdash; <span className="text-xs italic text-slate-400">{drug.genericName}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Indication: {drug.indication} • PI: {drug.principalInvestigator} ({drug.assignedCentre})
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xs text-slate-400">{drug.dosageForm} ({drug.strength})</div>
                    <div className="text-sm font-bold text-emerald-400">{drug.availableQuantity}</div>
                  </div>
                </div>
              </Link>
>>>>>>> Stashed changes
            ))}
          </div>
        </div>

        {/* Granted User Permissions Box */}
        <div className="space-y-6">
<<<<<<< Updated upstream
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                Granted Role Permissions
              </span>
              <span className="text-xs text-blue-400 font-semibold">{user.permissions?.length || 0} Active</span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {user.permissions?.map((pKey) => {
                const pDef = ALL_PERMISSIONS_LIST.find((item) => item.key === pKey);
                return (
                  <div
                    key={pKey}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div className="font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pDef?.label || pKey}</span>
                    </div>
                    {pDef?.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-5.5 leading-snug">{pDef.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-900/40 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              RBAC Enforcement Active
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your account permissions are dynamically synchronized based on your assigned User Type ({typeConfig.label}).
=======
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              System Status
            </h3>
            <div className="space-y-3 text-xs text-slate-300 mt-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Drug Module</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">AYUSH GCP Protocol</span>
                <span className="text-emerald-400 font-semibold">Compliant</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">CTRI Tracking</span>
                <span className="text-blue-400 font-semibold">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Primary Seed</span>
                <span className="text-emerald-300 font-mono font-medium">DRUG001 (Ashwagandha)</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-900/30 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <Pill className="w-4 h-4" />
              Drug Inventory Ready
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Explore formulation specifications, botanical components, dosage calculations, and regulatory filings in the Drug Module.
>>>>>>> Stashed changes
            </p>
            <Link
              href="/drugs"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              <span>Open Drug Management Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
