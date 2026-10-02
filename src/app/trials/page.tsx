'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Centre, TrialProposal, CreateTrialProposalData, ProposalStatus } from '@/lib/types';
import { getCachedCentres } from '@/lib/centreStorage';
import {
  getCachedProposals,
  addProposalToCache,
  updateProposalInCache,
  deleteProposalFromCache,
  INITIAL_SAMPLE_PROPOSAL,
} from '@/lib/proposalStorage';
import {
  FlaskConical,
  Plus,
  Search,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
  Users,
  FileText,
  Sparkles,
  Award,
  Eye,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
  Send,
  Download,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  CheckSquare,
  Square,
  Activity,
  Tag,
} from 'lucide-react';

export default function TrialsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <TrialsContent />
      </div>
    </ProtectedRoute>
  );
}

function TrialsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.userType === 'administration';

  // Data states
  const [proposals, setProposals] = useState<TrialProposal[]>([]);
  const [availableCentres, setAvailableCentres] = useState<Centre[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<TrialProposal | null>(null);
  const [viewingProposal, setViewingProposal] = useState<TrialProposal | null>(null);

  // Form State
  const [trialId, setTrialId] = useState('CT-001');
  const [trialTitle, setTrialTitle] = useState('');
  const [studyType, setStudyType] = useState('Interventional');
  const [studyPhase, setStudyPhase] = useState('Phase II');
  const [studyObjective, setStudyObjective] = useState('');
  const [studyDesign, setStudyDesign] = useState('');
  const [targetDisease, setTargetDisease] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [duration, setDuration] = useState('');
  const [treatmentDuration, setTreatmentDuration] = useState('');
  const [inclusionCriteria, setInclusionCriteria] = useState('');
  const [exclusionCriteria, setExclusionCriteria] = useState('');
  const [primaryOutcome, setPrimaryOutcome] = useState('');
  const [secondaryOutcome, setSecondaryOutcome] = useState('');
  const [selectedCentreIds, setSelectedCentreIds] = useState<string[]>([]);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('Submitted');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load proposals and centres
  const loadData = () => {
    const props = getCachedProposals();
    const ctrs = getCachedCentres();
    setProposals([...props]);
    setAvailableCentres([...ctrs]);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle 1-Click Quick Fill using sample data provided by the user
  const handleQuickFillSample = () => {
    setTrialId('CT-001');
    setTrialTitle('Clinical Study to Evaluate the Safety and Efficacy of Nimba-Ayurvedic Tablet in Patients with Madhumeha');
    setStudyType('Interventional');
    setStudyPhase('Phase II');
    setStudyObjective('To evaluate the safety and efficacy of Nimba-Ayurvedic Tablet in patients with Madhumeha');
    setStudyDesign('Randomized, controlled, open-label, prospective');
    setTargetDisease('Madhumeha / Type 2 Diabetes Mellitus');
    setSampleSize('100 Participants');
    setDuration('12 Months');
    setTreatmentDuration('12 Weeks');
    setInclusionCriteria('Adults meeting the protocol-defined diagnostic criteria and willing to provide informed consent');
    setExclusionCriteria('Participants meeting protocol-defined exclusion conditions or contraindications');
    setPrimaryOutcome('Change in HbA1c from baseline to the predefined assessment visit');
    setSecondaryOutcome('Fasting Blood Glucose, PPBS, Ayurvedic symptom score and safety parameters');
    // Select first 3 active centres
    const activeCentres = availableCentres.filter((c) => c.status === 'active');
    setSelectedCentreIds(activeCentres.slice(0, 3).map((c) => c.id));
    setFormError(null);
    setFormSuccess('Sample Nimba Tablet Trial Data auto-filled successfully!');
  };

  // Open Form for Create
  const handleOpenCreateForm = () => {
    setEditingProposal(null);
    setFormError(null);
    setFormSuccess(null);
    setTrialId(`CT-${String(proposals.length + 1).padStart(3, '0')}`);
    setTrialTitle('');
    setStudyType('Interventional');
    setStudyPhase('Phase II');
    setStudyObjective('');
    setStudyDesign('');
    setTargetDisease('');
    setSampleSize('');
    setDuration('');
    setTreatmentDuration('');
    setInclusionCriteria('');
    setExclusionCriteria('');
    setPrimaryOutcome('');
    setSecondaryOutcome('');

    // Pre-select active centres by default
    const activeCentres = availableCentres.filter((c) => c.status === 'active');
    setSelectedCentreIds(activeCentres.slice(0, 2).map((c) => c.id));
    setProposalStatus('Submitted');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditForm = (p: TrialProposal) => {
    setEditingProposal(p);
    setFormError(null);
    setFormSuccess(null);
    setTrialId(p.trialId);
    setTrialTitle(p.trialTitle);
    setStudyType(p.studyType);
    setStudyPhase(p.studyPhase);
    setStudyObjective(p.studyObjective);
    setStudyDesign(p.studyDesign);
    setTargetDisease(p.targetDisease);
    setSampleSize(p.sampleSize);
    setDuration(p.duration);
    setTreatmentDuration(p.treatmentDuration);
    setInclusionCriteria(p.inclusionCriteria);
    setExclusionCriteria(p.exclusionCriteria);
    setPrimaryOutcome(p.primaryOutcome);
    setSecondaryOutcome(p.secondaryOutcome);
    setSelectedCentreIds(p.selectedCentreIds || []);
    setProposalStatus(p.proposalStatus);
    setIsFormOpen(true);
  };

  // Toggle selection of Centre
  const handleToggleCentre = (centreId: string) => {
    if (selectedCentreIds.includes(centreId)) {
      setSelectedCentreIds(selectedCentreIds.filter((id) => id !== centreId));
    } else {
      setSelectedCentreIds([...selectedCentreIds, centreId]);
    }
  };

  // Submit Proposal
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!trialId.trim() || !trialTitle.trim() || !targetDisease.trim()) {
      setFormError('Please fill in required fields (Trial ID, Trial Title, Target Disease).');
      return;
    }

    if (selectedCentreIds.length === 0) {
      setFormError('Please select at least one participating Centre for this trial proposal.');
      return;
    }

    try {
      setIsSubmitting(true);
      const userName = user?.fullName ? `${user.fullName} (${user.userType})` : 'Principal Investigator';

      if (editingProposal) {
        updateProposalInCache(editingProposal.id, {
          trialId,
          trialTitle,
          studyType,
          studyPhase,
          studyObjective,
          studyDesign,
          targetDisease,
          sampleSize,
          duration,
          treatmentDuration,
          inclusionCriteria,
          exclusionCriteria,
          primaryOutcome,
          secondaryOutcome,
          selectedCentreIds,
          proposalStatus,
          proposedBy: userName,
        });
        setFormSuccess(`Trial Proposal "${trialId}" updated successfully!`);
      } else {
        addProposalToCache({
          trialId,
          trialTitle,
          studyType,
          studyPhase,
          studyObjective,
          studyDesign,
          targetDisease,
          sampleSize,
          duration,
          treatmentDuration,
          inclusionCriteria,
          exclusionCriteria,
          primaryOutcome,
          secondaryOutcome,
          selectedCentreIds,
          proposalStatus,
          proposedBy: userName,
        });
        setFormSuccess(`Trial Proposal "${trialId}" created and submitted successfully!`);
      }

      setIsSubmitting(false);
      loadData();
      setTimeout(() => {
        setIsFormOpen(false);
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to save trial proposal.');
    }
  };

  // Delete Proposal
  const handleDeleteProposal = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete Trial Proposal "${code}"?`)) {
      deleteProposalFromCache(id);
      loadData();
    }
  };

  // Filtered proposals list
  const filteredProposals = proposals.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.trialId.toLowerCase().includes(q) ||
      p.trialTitle.toLowerCase().includes(q) ||
      p.targetDisease.toLowerCase().includes(q) ||
      p.studyPhase.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || p.proposalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>Clinical Research Protocol Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Trial Proposals & Site Selection
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, design, and manage clinical trial proposals with multi-centre selection and protocol parameters.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            onClick={handleOpenCreateForm}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Create New Trial Proposal</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Trial ID, Title, Disease, Phase..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Proposal Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({proposals.length})</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Active">Active</option>
              </select>
            </div>
          </div>
        </div>

        {/* Proposals Directory Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {filteredProposals.length === 0 ? (
            <div className="lg:col-span-2 py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <FlaskConical className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No Trial Proposals Found</p>
              <p className="text-xs text-slate-500 mt-1">
                Click "Create New Trial Proposal" to submit a new protocol proposal.
              </p>
            </div>
          ) : (
            filteredProposals.map((p) => {
              // Find assigned centres
              const assignedCentres = availableCentres.filter((c) =>
                p.selectedCentreIds?.includes(c.id)
              );

              return (
                <div
                  key={p.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {p.trialId}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {p.studyPhase}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {p.studyType}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">{p.trialTitle}</h3>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border shrink-0 ${
                          p.proposalStatus === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : p.proposalStatus === 'Active'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {p.proposalStatus}
                      </span>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Target Condition
                        </span>
                        <span className="font-semibold text-white">{p.targetDisease}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Sample Size
                        </span>
                        <span className="font-semibold text-emerald-400">{p.sampleSize}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Trial Duration
                        </span>
                        <span className="text-slate-300">{p.duration} ({p.treatmentDuration} Rx)</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Primary Outcome
                        </span>
                        <span className="text-slate-300 truncate block">{p.primaryOutcome}</span>
                      </div>
                    </div>

                    {/* Assigned Centres */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        Participating Centres ({assignedCentres.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCentres.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No centres assigned yet.</span>
                        ) : (
                          assignedCentres.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium"
                            >
                              <MapPin className="w-3 h-3 text-rose-400" />
                              <span>{c.centreName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({c.city})</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Proposed by: {p.proposedBy || 'Investigator'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingProposal(p)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Protocol</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditForm(p)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Proposal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProposal(p.id, p.trialId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Proposal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE / EDIT TRIAL PROPOSAL FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    CTMS Protocol Editor
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-400" />
                  {editingProposal ? `Edit Proposal: ${editingProposal.trialId}` : 'Create New Trial Proposal'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* 1-Click Quick Fill Button with User's Sample Data */}
                {!editingProposal && (
                  <button
                    type="button"
                    onClick={handleQuickFillSample}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>Auto-Fill Nimba Tablet Trial (CT-001)</span>
                  </button>
                )}

                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Banners */}
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

            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* Form Grid Section 1: Basic Trial Metadata */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> 1. Trial Metadata & Identification
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Trial ID */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Trial ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={trialId}
                      onChange={(e) => setTrialId(e.target.value)}
                      placeholder="CT-001"
                      required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Study Type */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Study Type
                    </label>
                    <select
                      value={studyType}
                      onChange={(e) => setStudyType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Interventional">Interventional</option>
                      <option value="Observational">Observational</option>
                      <option value="Expanded Access">Expanded Access</option>
                    </select>
                  </div>

                  {/* Study Phase */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Study Phase
                    </label>
                    <select
                      value={studyPhase}
                      onChange={(e) => setStudyPhase(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Phase I">Phase I</option>
                      <option value="Phase II">Phase II</option>
                      <option value="Phase III">Phase III</option>
                      <option value="Phase IV">Phase IV</option>
                    </select>
                  </div>
                </div>

                {/* Trial Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Trial Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={trialTitle}
                    onChange={(e) => setTrialTitle(e.target.value)}
                    placeholder="e.g. Clinical Study to Evaluate the Safety and Efficacy of Nimba-Ayurvedic Tablet in Patients with Madhumeha"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Grid Section 2: Study Parameters & Disease */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> 2. Study Objectives & Design Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Target Disease */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Target Disease / Condition <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={targetDisease}
                      onChange={(e) => setTargetDisease(e.target.value)}
                      placeholder="e.g. Madhumeha / Type 2 Diabetes Mellitus"
                      required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Sample Size */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Sample Size
                    </label>
                    <input
                      type="text"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(e.target.value)}
                      placeholder="e.g. 100 Participants"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Overall Trial Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 12 Months"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Treatment Duration */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Treatment Duration
                    </label>
                    <input
                      type="text"
                      value={treatmentDuration}
                      onChange={(e) => setTreatmentDuration(e.target.value)}
                      placeholder="e.g. 12 Weeks"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Study Objective */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Study Objective
                  </label>
                  <textarea
                    rows={2}
                    value={studyObjective}
                    onChange={(e) => setStudyObjective(e.target.value)}
                    placeholder="e.g. To evaluate the safety and efficacy of Nimba-Ayurvedic Tablet in patients with Madhumeha"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Study Design */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Study Design
                  </label>
                  <input
                    type="text"
                    value={studyDesign}
                    onChange={(e) => setStudyDesign(e.target.value)}
                    placeholder="e.g. Randomized, controlled, open-label, prospective"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Grid Section 3: Eligibility & Outcomes */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> 3. Eligibility Criteria & Outcome Measures
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Inclusion Criteria */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Inclusion Criteria
                    </label>
                    <textarea
                      rows={3}
                      value={inclusionCriteria}
                      onChange={(e) => setInclusionCriteria(e.target.value)}
                      placeholder="e.g. Adults meeting protocol-defined diagnostic criteria..."
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Exclusion Criteria */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Exclusion Criteria
                    </label>
                    <textarea
                      rows={3}
                      value={exclusionCriteria}
                      onChange={(e) => setExclusionCriteria(e.target.value)}
                      placeholder="e.g. Participants meeting protocol-defined exclusion conditions..."
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Primary Outcome */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Primary Outcome
                    </label>
                    <input
                      type="text"
                      value={primaryOutcome}
                      onChange={(e) => setPrimaryOutcome(e.target.value)}
                      placeholder="e.g. Change in HbA1c from baseline to predefined assessment visit"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Secondary Outcome */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Secondary Outcome
                    </label>
                    <input
                      type="text"
                      value={secondaryOutcome}
                      onChange={(e) => setSecondaryOutcome(e.target.value)}
                      placeholder="e.g. Fasting Blood Glucose, PPBS, Ayurvedic symptom score and safety parameters"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid Section 4: SELECT AVAILABLE CENTRES */}
              <div className="bg-gradient-to-r from-blue-950/40 via-slate-950 to-indigo-950/40 p-5 rounded-2xl border border-blue-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      4. Select Available Participating Centres ({selectedCentreIds.length} Selected) <span className="text-rose-400">*</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose which active clinical research centres will participate in this trial protocol.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {availableCentres.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No available centres found.</p>
                  ) : (
                    availableCentres.map((c) => {
                      const isSelected = selectedCentreIds.includes(c.id);
                      const isCentActive = c.status === 'active';

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleCentre(c.id)}
                          className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-md'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{c.centreName}</span>
                              <span className="text-[10px] font-mono text-blue-400 font-semibold">
                                ({c.centreCode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{c.city}, {c.state}</span>
                            </div>
                            <div className="text-[10px] text-purple-300 font-medium">
                              {c.accreditation}
                            </div>
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status & Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Proposal Submission Status:</span>
                  <select
                    value={proposalStatus}
                    onChange={(e) => setProposalStatus(e.target.value as ProposalStatus)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Draft">Draft</option>
                    <option value="Approved">Approved</option>
                    <option value="Active">Active</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting...' : editingProposal ? 'Update Proposal' : 'Submit Trial Proposal'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PROTOCOL VIEW MODAL */}
      {viewingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                    {viewingProposal.trialId}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {viewingProposal.studyPhase}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">{viewingProposal.trialTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">Proposed by: {viewingProposal.proposedBy || 'Investigator'}</p>
              </div>

              <button
                onClick={() => setViewingProposal(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Protocol Details Summary */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Study Type</span>
                  <span className="font-bold text-white">{viewingProposal.studyType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target Disease</span>
                  <span className="font-bold text-emerald-400">{viewingProposal.targetDisease}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sample Size</span>
                  <span className="font-bold text-white">{viewingProposal.sampleSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Trial Duration</span>
                  <span className="font-bold text-white">{viewingProposal.duration}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-blue-400 block">Study Objective</span>
                  <p className="text-slate-200 leading-relaxed">{viewingProposal.studyObjective || '—'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-blue-400 block">Study Design</span>
                  <p className="text-slate-200">{viewingProposal.studyDesign || '—'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-emerald-400 block">Inclusion Criteria</span>
                    <p className="text-slate-300 leading-snug">{viewingProposal.inclusionCriteria || '—'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-rose-400 block">Exclusion Criteria</span>
                    <p className="text-slate-300 leading-snug">{viewingProposal.exclusionCriteria || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-amber-400 block">Primary Outcome</span>
                    <p className="text-slate-300">{viewingProposal.primaryOutcome || '—'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-cyan-400 block">Secondary Outcome</span>
                    <p className="text-slate-300">{viewingProposal.secondaryOutcome || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Selected Participating Centres Display */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-indigo-950/30 border border-blue-800/30 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Selected Participating Centres ({viewingProposal.selectedCentreIds?.length || 0})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {availableCentres
                    .filter((c) => viewingProposal.selectedCentreIds?.includes(c.id))
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white text-xs">{c.centreName}</p>
                          <p className="text-[11px] text-slate-400">
                            {c.city}, {c.state} • <span className="font-mono text-blue-400">{c.centreCode}</span>
                          </p>
                          <span className="text-[10px] text-purple-300 font-medium">{c.accreditation}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingProposal(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Close Protocol Overview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
