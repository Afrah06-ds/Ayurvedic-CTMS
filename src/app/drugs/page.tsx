'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useDrugs } from '@/context/DrugContext';
import { Drug } from '@/lib/types';
import { CalendarDays, FlaskConical, Leaf, MapPin, Package, Pill, Search, ShieldCheck } from 'lucide-react';

const statuses: Drug['drugStatus'][] = ['Active', 'Under Review', 'Quarantine', 'Inactive', 'Discontinued', 'Recalled'];

export default function DrugsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <DrugInventory />
      </div>
    </ProtectedRoute>
  );
}

function DrugInventory() {
  const { drugs } = useDrugs();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  const filteredDrugs = drugs.filter((drug) => {
    const searchText = `${drug.id} ${drug.drugName} ${drug.genericName} ${drug.manufacturer} ${drug.batchNumber}`.toLowerCase();
    return searchText.includes(query.toLowerCase()) && (statusFilter === 'All statuses' || drug.drugStatus === statusFilter);
  });
  const activeCount = drugs.filter((drug) => drug.drugStatus === 'Active').length;
  const reviewCount = drugs.filter((drug) => drug.drugStatus === 'Under Review').length;
  const totalQuantity = drugs.reduce((total, drug) => total + (Number.parseInt(drug.availableQuantity, 10) || 0), 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400"><Leaf className="w-4 h-4" /> AYUSH Investigational Products</p>
          <h1 className="text-2xl font-bold text-white mt-2">Drug Management</h1>
          <p className="text-sm text-slate-400 mt-1">Formulations, study supply, botanical components, and regulatory records.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Clinical inventory</div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Drug inventory summary">
        <Summary label="Formulations" value={drugs.length.toString()} detail="Registered products" icon={<Pill className="w-4 h-4" />} />
        <Summary label="Active in trials" value={activeCount.toString()} detail={`${reviewCount} under review`} icon={<FlaskConical className="w-4 h-4" />} />
        <Summary label="Units available" value={totalQuantity.toLocaleString()} detail="Across listed batches" icon={<Package className="w-4 h-4" />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)] gap-6 items-start">
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, manufacturer, batch" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none" />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by drug status" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none">
              <option>All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>

          <div className="border-y border-slate-800">
            <div className="hidden md:grid grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(120px,0.8fr)_auto] gap-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Formulation</span><span>Trial phase</span><span>Batch</span><span>Status</span>
            </div>
            {filteredDrugs.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-slate-400">No formulations match these filters.</p>
            ) : filteredDrugs.map((drug) => (
              <button key={drug.id} type="button" onClick={() => setSelectedDrug(drug)} className={`grid w-full grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(120px,0.8fr)_auto] gap-2 md:gap-4 border-t border-slate-800 px-3 py-4 text-left hover:bg-slate-900/70 ${selectedDrug?.id === drug.id ? 'bg-slate-900' : ''}`}>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{drug.drugName}</span><span className="block truncate text-xs text-slate-400 mt-1">{drug.id} · {drug.genericName}</span></span>
                <span className="text-xs text-slate-300 self-center">{drug.trialPhase}</span>
                <span className="text-xs text-slate-300 self-center">{drug.batchNumber}</span>
                <span className={`text-xs self-center ${drug.drugStatus === 'Active' ? 'text-emerald-400' : 'text-amber-400'}`}>{drug.drugStatus}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="border-t border-slate-800 lg:border-t-0 lg:border-l lg:pl-6 pt-5 lg:pt-0">
          {selectedDrug ? <DrugDetails drug={selectedDrug} /> : (
            <div className="py-8 text-center lg:text-left">
              <Pill className="w-7 h-7 text-emerald-400 mx-auto lg:mx-0" />
              <h2 className="text-base font-semibold text-white mt-3">Select a formulation</h2>
              <p className="text-sm text-slate-400 mt-1">Choose a row to inspect its batch, dosage, ingredients, and trial assignment.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Summary({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="border-t-2 border-emerald-700/70 bg-slate-900/70 p-4"><div className="flex justify-between text-xs text-slate-400"><span>{label}</span><span className="text-emerald-400">{icon}</span></div><div className="mt-3 text-2xl font-bold text-white">{value}</div><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function DrugDetails({ drug }: { drug: Drug }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-mono text-emerald-400">{drug.id}</p><h2 className="text-lg font-bold text-white mt-1">{drug.drugName}</h2><p className="text-sm italic text-slate-400">{drug.genericName}</p></div>
        <span className="text-xs text-emerald-400">{drug.drugStatus}</span>
      </div>
      <div className="mt-5 space-y-4">
        <Detail icon={<Pill className="w-4 h-4" />} label="Dosage" value={`${drug.dosageForm} · ${drug.totalDosage}`} />
        <Detail icon={<Package className="w-4 h-4" />} label="Supply" value={`${drug.availableQuantity} · Batch ${drug.batchNumber}`} />
        <Detail icon={<CalendarDays className="w-4 h-4" />} label="Expiry" value={drug.expiryDate} />
        <Detail icon={<MapPin className="w-4 h-4" />} label="Trial site" value={`${drug.assignedCentre} · ${drug.principalInvestigator}`} />
        <Detail icon={<FlaskConical className="w-4 h-4" />} label="Study" value={`${drug.trialPhase} · ${drug.indication}`} />
        <Detail icon={<ShieldCheck className="w-4 h-4" />} label="CTRI / CDSCO" value={`${drug.ctriRegistrationNumber} · ${drug.cdscoPermissionStatus}`} />
      </div>
      <div className="mt-6 border-t border-slate-800 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Botanical components</h3>
        <ul className="mt-2 space-y-2">
          {drug.components.map((component) => <li key={component.id} className="text-sm text-slate-200">{component.name}<span className="text-xs text-slate-400"> · {component.strength}{component.botanicalName ? ` · ${component.botanicalName}` : ''}</span></li>)}
        </ul>
        {drug.storageConditions && <p className="text-xs text-slate-400 mt-4">Storage: {drug.storageConditions}</p>}
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><span className="text-slate-500 mt-0.5">{icon}</span><div><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="text-sm text-slate-200 mt-0.5">{value}</p></div></div>;
}
