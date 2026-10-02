'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Centre, CreateCentreData, CentreType } from '@/lib/types';
import {
  getCachedCentres,
  addCentreToCache,
  updateCentreInCache,
  toggleCentreStatusInCache,
  deleteCentreFromCache,
  generateCentreCode,
} from '@/lib/centreStorage';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Award,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  Eye,
  AlertCircle,
  RefreshCw,
  Sparkles,
  LayoutGrid,
  List,
  ShieldCheck,
} from 'lucide-react';

const CENTRE_TYPES: CentreType[] = [
  'Government Hospital',
  'Private Medical Center',
  'Academic Research Institute',
  'Dedicated Clinical Research Unit',
  'Ayurvedic Specialty Hospital',
];

export default function CentresPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <CentresContent />
      </div>
    </ProtectedRoute>
  );
}

function CentresContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.userType === 'administration';

  // Data state
  const [centres, setCentres] = useState<Centre[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null);
  const [viewingCentre, setViewingCentre] = useState<Centre | null>(null);

  // Form State
  const [centreCode, setCentreCode] = useState('');
  const [centreName, setCentreName] = useState('');
  const [centreType, setCentreType] = useState<CentreType | string>('Government Hospital');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Centres from localStorage
  const loadCentres = () => {
    const list = getCachedCentres();
    setCentres([...list]);
  };

  useEffect(() => {
    loadCentres();
  }, []);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingCentre(null);
    setFormError(null);
    setFormSuccess(null);
    setCentreCode(generateCentreCode());
    setCentreName('');
    setCentreType('Government Hospital');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setContactNumber('');
    setEmail('');
    setAccreditation('NABH Accredited');
    setStatus('active');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (c: Centre) => {
    setEditingCentre(c);
    setFormError(null);
    setFormSuccess(null);
    setCentreCode(c.centreCode);
    setCentreName(c.centreName);
    setCentreType(c.centreType);
    setAddress(c.address);
    setCity(c.city);
    setState(c.state);
    setPincode(c.pincode);
    setContactNumber(c.contactNumber);
    setEmail(c.email);
    setAccreditation(c.accreditation);
    setStatus(c.status);
    setIsModalOpen(true);
  };

  // Submit form (Create or Update)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (
      !centreName.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim() ||
      !contactNumber.trim() ||
      !email.trim()
    ) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCentre) {
        // Update
        updateCentreInCache(editingCentre.id, {
          centreName,
          centreType,
          address,
          city,
          state,
          pincode,
          contactNumber,
          email,
          accreditation,
          status,
        });
        setFormSuccess(`Centre "${centreName}" updated successfully!`);
      } else {
        // Create
        addCentreToCache({
          centreCode,
          centreName,
          centreType,
          address,
          city,
          state,
          pincode,
          contactNumber,
          email,
          accreditation,
          status,
        });
        setFormSuccess(`New Centre "${centreName}" (${centreCode}) created successfully!`);
      }
      setIsSubmitting(false);
      loadCentres();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'An error occurred while saving the centre.');
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = (id: string, name: string) => {
    try {
      toggleCentreStatusInCache(id);
      loadCentres();
    } catch (err: any) {
      alert(err.message || 'Failed to update centre status.');
    }
  };

  // Delete centre
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete centre "${name}"?`)) {
      deleteCentreFromCache(id);
      loadCentres();
    }
  };

  // Filtered centres list
  const filteredCentres = centres.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.centreCode.toLowerCase().includes(q) ||
      c.centreName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.pincode.includes(q) ||
      c.accreditation.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.centreType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalCentres = centres.length;
  const activeCount = centres.filter((c) => c.status === 'active').length;
  const inactiveCount = centres.filter((c) => c.status === 'inactive').length;
  const accreditedCount = centres.filter(
    (c) => c.accreditation && c.accreditation.toLowerCase() !== 'none'
  ).length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Clinical Trial Site Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Centre Management Module
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage clinical research centres, medical institutes, trial sites, addresses, accreditation status, and active site availability.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all self-start md:self-auto shrink-0 group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Add New Centre</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Registered Centres</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalCentres}</p>
          <span className="text-[11px] text-slate-500">Clinical Trial Sites</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Centres</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{activeCount}</p>
          <span className="text-[11px] text-emerald-400/90">Permitted for Patient Enrollment</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inactive Centres</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2">{inactiveCount}</p>
          <span className="text-[11px] text-rose-400/90">Temporarily On-Hold or Deactivated</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Accredited Centres</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-300 mt-2">{accreditedCount}</p>
          <span className="text-[11px] text-purple-400/90">NABH / NABL / GCP Certified</span>
        </div>
      </div>

      {/* Control Bar: Search & Filter Options */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name, city, accreditation..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Status Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({totalCentres})</option>
                <option value="active">Active Only ({activeCount})</option>
                <option value="inactive">Inactive Only ({inactiveCount})</option>
              </select>
            </div>

            {/* Centre Type Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {CENTRE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Table / Grid Switcher */}
            <div className="flex items-center p-1 bg-slate-800 border border-slate-700 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadCentres}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View MODE 1: TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="pb-3 px-4">Centre Details</th>
                  <th className="pb-3 px-4">Centre Type</th>
                  <th className="pb-3 px-4">Location & Address</th>
                  <th className="pb-3 px-4">Contact Details</th>
                  <th className="pb-3 px-4">Accreditation</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Created At</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCentres.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="w-8 h-8 text-slate-600" />
                        <p className="text-sm">No centres found matching your query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCentres.map((c) => {
                    const isCentActive = c.status === 'active';
                    const formattedDate = new Date(c.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Code & Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{c.centreName}</div>
                              <div className="text-blue-400 text-xs font-mono font-semibold">
                                {c.centreCode}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Centre Type */}
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {c.centreType}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 text-slate-300">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-white">
                                {c.city}, {c.state}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight">
                                {c.address} ({c.pincode})
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span>{c.contactNumber}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{c.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Accreditation */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-semibold">
                            <Award className="w-3.5 h-3.5 text-purple-400" />
                            {c.accreditation || 'Standard CTMS'}
                          </span>
                        </td>

                        {/* STATUS BADGES (ACTIVE & INACTIVE) */}
                        <td className="py-4 px-4">
                          {isCentActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>ACTIVE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span>INACTIVE</span>
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingCentre(c)}
                              title="View Full Centre Details"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(c.id, c.centreName)}
                              title={isCentActive ? 'Set Status to Inactive' : 'Set Status to Active'}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              {isCentActive ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              title="Edit Centre Details"
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.centreName)}
                              title="Delete Centre"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW MODE 2: GRID CARD VIEW */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCentres.map((c) => {
              const isCentActive = c.status === 'active';
              return (
                <div
                  key={c.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="font-mono text-xs text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                          {c.centreCode}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                          {c.centreName}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{c.centreType}</p>
                      </div>

                      {/* Status Badge */}
                      {isCentActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>INACTIVE</span>
                        </span>
                      )}
                    </div>

                    {/* Address & Info */}
                    <div className="space-y-2 text-xs text-slate-300 border-t border-b border-slate-800/80 py-3 my-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white">
                            {c.city}, {c.state}
                          </p>
                          <p className="text-[11px] text-slate-400">{c.address} ({c.pincode})</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{c.contactNumber}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-purple-300 font-medium">{c.accreditation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingCentre(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c.id, c.centreName)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Toggle Status"
                      >
                        {isCentActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Centre"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.centreName)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Centre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CENTRE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  {editingCentre ? `Edit Centre: ${editingCentre.centreCode}` : 'Add New Clinical Centre'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Provide site location, accreditation certification, contact details, and status.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Form Alerts */}
            {formError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>{formSuccess}</div>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Centre Code */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Centre Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={centreCode}
                    onChange={(e) => setCentreCode(e.target.value)}
                    placeholder="e.g. CTR-101"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Centre Type Dropdown */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Centre Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={centreType}
                    onChange={(e) => setCentreType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {CENTRE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Centre Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Centre / Hospital Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={centreName}
                    onChange={(e) => setCentreName(e.target.value)}
                    placeholder="e.g. All India Institute of Medical Sciences"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Street Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Street Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Gautampuri, Sarita Vihar, Mathura Road"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    City <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Delhi"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Pincode / Postal Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 110076"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Contact Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +91 11 2695 0401"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@centre-domain.org"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Accreditation */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Accreditation Status
                  </label>
                  <input
                    type="text"
                    value={accreditation}
                    onChange={(e) => setAccreditation(e.target.value)}
                    placeholder="e.g. NABH Accredited / NABL Approved"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Radio / Checkbox Selection */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Site Operational Status
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Active centres can be assigned to active trial protocols.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      status === 'inactive'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCentre ? 'Update Centre' : 'Create Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewingCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  {viewingCentre.centreCode}
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">{viewingCentre.centreName}</h2>
                <p className="text-xs text-slate-400">{viewingCentre.centreType}</p>
              </div>

              {viewingCentre.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  INACTIVE
                </span>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Address & Location
                </span>
                <div className="flex items-start gap-2 text-slate-200">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">
                      {viewingCentre.city}, {viewingCentre.state} ({viewingCentre.pincode})
                    </p>
                    <p className="text-slate-400">{viewingCentre.address}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Contact Phone
                  </span>
                  <div className="flex items-center gap-2 text-slate-200 font-semibold">
                    <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{viewingCentre.contactNumber}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Email Contact
                  </span>
                  <div className="flex items-center gap-2 text-slate-200 font-mono text-[11px]">
                    <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{viewingCentre.email}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Accreditation & Certification
                  </span>
                  <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" />
                    {viewingCentre.accreditation || 'Standard Registered'}
                  </span>
                </div>
                <ShieldCheck className="w-6 h-6 text-purple-400 opacity-60" />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Registered Date
                </span>
                <span className="font-mono text-slate-300">
                  {new Date(viewingCentre.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewingCentre(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Close Centre Profile
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
