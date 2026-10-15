'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useDrugs } from '@/context/DrugContext';
import {
  Pill,
  Leaf,
  ArrowLeft,
  Building2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Printer,
  Boxes,
  UserCheck,
  AlertCircle,
  Tag,
  FlaskConical,
} from 'lucide-react';

export default function DrugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <DrugDetailContent drugId={id} />
      </div>
    </ProtectedRoute>
  );
}

function DrugDetailContent({ drugId }: { drugId: string }) {
  const { getDrug, isLoading } = useDrugs();
  const drug = getDrug(drugId);

  if (isLoading) {
    return (
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16 text-center text-slate-400 text-sm">
        Loading drug details for {drugId}...
      </main>
    );
  }

  if (!drug) {
    return (
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Drug Record Not Found</h2>
        <p className="text-sm text-slate-400">
          No investigational drug with ID &quot;{drugId}&quot; exists in the database.
        </p>
        <Link
          href="/drugs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Drug Catalog</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/drugs"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Drug Module Catalog</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Spec Dossier</span>
        </button>
      </div>

      {/* Main Dossier Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-800 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {drug.id}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {drug.trialPhase}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {drug.drugStatus}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {drug.drugType}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{drug.drugName}</h1>
            <p className="text-sm italic text-emerald-400 font-serif mt-0.5">{drug.genericName}</p>
            <p className="text-xs text-slate-400 mt-1">
              Formulation Name: <span className="text-white font-medium">{drug.formulationName}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Available Stock</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{drug.availableQuantity}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Batch: {drug.batchNumber}</span>
          </div>
        </div>

        {/* Technical Specification Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h3 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-400" />
              Dosage & Administration Regimen
            </h3>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Dosage Form:</span>
                <span className="font-semibold text-white">{drug.dosageForm}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Strength:</span>
                <span className="font-semibold text-white">{drug.strength}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Dosage:</span>
                <span className="font-semibold text-emerald-400">{drug.totalDosage}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Route of Admin:</span>
                <span className="text-white">{drug.routeOfAdministration}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Frequency:</span>
                <span className="text-white">{drug.frequency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Treatment Duration:</span>
                <span className="text-white">{drug.treatmentDuration}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Clinical Indication:</span>
                <span className="font-medium text-emerald-300 text-right">{drug.indication}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h3 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Investigator & Site Logistics
            </h3>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Principal Investigator:</span>
                <span className="font-semibold text-white">{drug.principalInvestigator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Assigned Centre:</span>
                <span className="font-semibold text-white">{drug.assignedCentre}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Manufacturer / Pharmacy:</span>
                <span className="text-white">{drug.manufacturer}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Batch Number:</span>
                <span className="font-mono font-bold text-emerald-400">{drug.batchNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Expiry Date:</span>
                <span className="font-mono text-white">{drug.expiryDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Storage Specification:</span>
                <span className="text-slate-300 text-right">{drug.storageConditions || 'Standard room temp'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Clearances */}
        <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-3">
          <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Regulatory Credentials & Approvals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">CTRI Registration Number</span>
              <span className="font-mono font-bold text-blue-400 text-sm mt-0.5 block">{drug.ctriRegistrationNumber}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">CDSCO Permission Status</span>
              <span className="font-bold text-white text-sm mt-0.5 block">{drug.cdscoPermissionStatus}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Regulatory Framework</span>
              <span className="font-bold text-emerald-400 text-sm mt-0.5 block">AYUSH GCP Guidelines</span>
            </div>
          </div>
        </div>

        {/* Active Components Detailed Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              Active Herbal Components & Botanical Matrix ({drug.componentCount || drug.components.length})
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Total Composition: {drug.totalDosage}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700/70">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Herbal Component / Extract</th>
                  <th className="px-5 py-3">Strength per Unit</th>
                  <th className="px-5 py-3">Botanical / Source Name</th>
                  <th className="px-5 py-3">Plant Part Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {drug.components.map((comp, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-5 py-3 font-semibold text-white">{comp.name}</td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-400">{comp.strength}</td>
                    <td className="px-5 py-3 italic text-slate-300">{comp.botanicalName || '—'}</td>
                    <td className="px-5 py-3 text-slate-400">{comp.partUsed || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
