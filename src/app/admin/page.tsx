'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { User, Role, UserType, PermissionKey } from '@/lib/types';
import {
  USER_TYPES_CONFIG,
  ALL_PERMISSIONS_LIST,
  getDefaultPermissions,
  getUserTypeConfig,
} from '@/lib/permissions';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Building2,
  Mail,
  Lock,
  Phone,
  UserCheck,
  RefreshCw,
  Sparkles,
  KeyRound,
  Eye,
  CheckSquare,
  Square,
  Sliders,
  Filter,
} from 'lucide-react';

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <AdminDashboardContent />
      </div>
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { user, createUser, getUsersList, deleteUser, toggleUserStatus } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('principal_investigator');
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>(
    getDefaultPermissions('principal_investigator')
  );
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // UI States
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | UserType>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [viewPermissionsUser, setViewPermissionsUser] = useState<User | null>(null);

  // Load user list
  const loadUsers = () => {
    const list = getUsersList();
    setUsers([...list]);
  };

  useEffect(() => {
    loadUsers();
  }, [getUsersList]);

  // When UserType selection changes in dropdown, auto update default permissions & suggested department
  const handleUserTypeChange = (newType: UserType) => {
    setSelectedUserType(newType);
    const defaults = getDefaultPermissions(newType);
    setCustomPermissions(defaults);
    const config = getUserTypeConfig(newType);
    if (!department || Object.values(USER_TYPES_CONFIG).some((c) => c.label === department)) {
      setDepartment(config.label);
    }
  };

  const handleTogglePermission = (permKey: PermissionKey) => {
    if (customPermissions.includes(permKey)) {
      setCustomPermissions(customPermissions.filter((k) => k !== permKey));
    } else {
      setCustomPermissions([...customPermissions, permKey]);
    }
  };

  const handleResetDefaultPermissions = () => {
    setCustomPermissions(getDefaultPermissions(selectedUserType));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError('Please fill in all required fields (Full Name, Email, Password).');
      return;
    }

    const config = getUserTypeConfig(selectedUserType);
    const computedRole: Role = selectedUserType === 'administration' ? 'admin' : 'user';

    setIsSubmitting(true);
    const result = await createUser({
      fullName,
      email,
      password,
      userType: selectedUserType,
      role: computedRole,
      permissions: customPermissions,
      department: department || config.label,
      phone,
      status,
    });
    setIsSubmitting(false);

    if (result.success && result.user) {
      setFormSuccess(
        `User "${result.user.fullName}" created as "${config.label}" with ${customPermissions.length} permissions assigned! They can log in immediately.`
      );
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedUserType('principal_investigator');
      setCustomPermissions(getDefaultPermissions('principal_investigator'));
      setStatus('active');
      loadUsers();
    } else {
      setFormError(result.error || 'Failed to create user.');
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to permanently delete user "${userEmail}"?`)) {
      const res = await deleteUser(userId);
      if (res.success) {
        loadUsers();
      } else {
        alert(res.error || 'Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const res = await toggleUserStatus(userId);
    if (res.success) {
      loadUsers();
    } else {
      alert(res.error || 'Failed to update status');
    }
  };

  // Filtered users for directory
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || u.userType === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.userType === 'administration' || u.role === 'admin').length;

  const currentTypeConfig = getUserTypeConfig(selectedUserType);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>CTMS Admin Security Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            User Type Management & Granular RBAC Permissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Assign user roles (PI, Study Coordinator, Monitor, Ethics, PV, Admin, Regulator) and enforce permissions upon account creation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account with User Type</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Directory ({totalUsers})</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Authorized Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalUsers}</p>
          <span className="text-[11px] text-slate-500">Across 7 CTMS User Types</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{activeCount}</p>
          <span className="text-[11px] text-emerald-400/90">Authentication Enabled</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">System Administrators</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{adminCount}</p>
          <span className="text-[11px] text-purple-400/90">Full Admin & Management Control</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Configured User Types</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">7 Types</p>
          <span className="text-[11px] text-cyan-400/90">PI, Coord, CRA, Ethics, PV, Admin, Regulator</span>
        </div>
      </div>

      {/* TAB 1: CREATE USER FORM WITH USER TYPE DROPDOWN & PERMISSIONS */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Account Creation Form */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  Create Account & Assign User Type
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a user type dropdown option below to automatically assign permissions upon account creation.
                </p>
              </div>
            </div>

            {/* Banners */}
            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{formSuccess}</p>
                  <button
                    onClick={() => setActiveTab('list')}
                    className="text-xs text-emerald-400 hover:underline mt-1 inline-block"
                  >
                    View in User Directory →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* MANDATORY USER TYPE SELECTION DROPDOWN */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-800/40 shadow-inner">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    Select CTMS User Type <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">Determines system permissions</span>
                </label>
                <select
                  value={selectedUserType}
                  onChange={(e) => handleUserTypeChange(e.target.value as UserType)}
                  className="w-full px-4 py-3 bg-slate-800 border-2 border-blue-500/60 rounded-xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all cursor-pointer shadow-lg"
                >
                  <option value="principal_investigator">Principal Investigator</option>
                  <option value="study_coordinator">Study Coordinator</option>
                  <option value="monitor">Monitor</option>
                  <option value="ethics_committee">Ethics Committee</option>
                  <option value="pharmacovigilance">Pharmacovigilance</option>
                  <option value="administration">Administration</option>
                  <option value="regulator_read_only">Regulator - Read Only</option>
                </select>

                <p className="text-xs text-slate-300 mt-2.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentTypeConfig.description}</span>
                </p>
              </div>

              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Pendelton"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arthur.pendelton@ctms.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                    />
                  </div>
                </div>

                {/* Department / Unit */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Department / Unit
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Clinical Operations Site 101"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Phone Contact */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Phone Contact
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-8234"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Derived RBAC Privilege level indicator */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    System RBAC Level
                  </label>
                  <div className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-slate-300">Administrative Role:</span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        selectedUserType === 'administration'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {selectedUserType === 'administration' ? 'ADMIN (Full Access)' : 'USER (Role Restricted)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Permissions matrix for selected User Type */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Granted Permissions Matrix ({customPermissions.length} Active)
                  </label>
                  <button
                    type="button"
                    onClick={handleResetDefaultPermissions}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Defaults for {currentTypeConfig.label}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                  {ALL_PERMISSIONS_LIST.map((perm) => {
                    const isChecked = customPermissions.includes(perm.key);
                    return (
                      <button
                        type="button"
                        key={perm.key}
                        onClick={() => handleTogglePermission(perm.key)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isChecked
                            ? 'bg-blue-600/10 border-blue-500/30 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{perm.label}</span>
                            <span className="text-[9px] text-slate-500 font-mono">[{perm.category}]</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{perm.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <input
                  type="checkbox"
                  id="statusToggle"
                  checked={status === 'active'}
                  onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                />
                <label htmlFor="statusToggle" className="text-sm font-medium text-slate-200 cursor-pointer">
                  Activate user account immediately upon creation
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account as "{currentTypeConfig.label}"</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* User Type Guide Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-purple-400" />
                Available User Types & Roles
              </h3>

              <div className="space-y-3">
                {Object.values(USER_TYPES_CONFIG).map((cfg) => (
                  <div
                    key={cfg.id}
                    onClick={() => handleUserTypeChange(cfg.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedUserType === cfg.id
                        ? `${cfg.badgeBg} ${cfg.badgeBorder} ring-2 ring-blue-500/30`
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${cfg.badgeText}`}>{cfg.label}</span>
                      <span className="text-[10px] text-slate-400">{cfg.permissions.length} Default Perms</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{cfg.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & USER TYPE FILTER */}
      {activeTab === 'list' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, department..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">User Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
                >
                  <option value="all">All User Types (7)</option>
                  <option value="principal_investigator">Principal Investigator</option>
                  <option value="study_coordinator">Study Coordinator</option>
                  <option value="monitor">Monitor</option>
                  <option value="ethics_committee">Ethics Committee</option>
                  <option value="pharmacovigilance">Pharmacovigilance</option>
                  <option value="administration">Administration</option>
                  <option value="regulator_read_only">Regulator - Read Only</option>
                </select>
              </div>

              <button
                onClick={loadUsers}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                title="Refresh user directory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="pb-3 px-4">User Details</th>
                  <th className="pb-3 px-4">User Type</th>
                  <th className="pb-3 px-4">Permissions</th>
                  <th className="pb-3 px-4">Department</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No user accounts found matching your query or filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isMainAdmin = u.email.toLowerCase() === 'admin@ctms.com';
                    const config = getUserTypeConfig(u.userType);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{u.fullName}</div>
                              <div className="text-slate-400 text-xs font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                          >
                            {config.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setViewPermissionsUser(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                            <span>{u.permissions?.length || 0} Perms</span>
                            <Eye className="w-3 h-3 text-slate-500" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">{u.department || '—'}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            {u.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isMainAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(u.id)}
                                  title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  {u.status === 'active' ? (
                                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(u.id, u.email)}
                                  title="Delete User Account"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isMainAdmin && (
                              <span className="text-[11px] text-slate-500 italic pr-2">System Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions View Modal */}
      {viewPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  Granted Permissions List
                </h3>
                <p className="text-xs text-slate-400">
                  {viewPermissionsUser.fullName} ({getUserTypeConfig(viewPermissionsUser.userType).label})
                </p>
              </div>
              <button
                onClick={() => setViewPermissionsUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {viewPermissionsUser.permissions?.map((pKey) => {
                const pDef = ALL_PERMISSIONS_LIST.find((item) => item.key === pKey);
                return (
                  <div
                    key={pKey}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div className="font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pDef?.label || pKey}</span>
                      <span className="text-[10px] text-slate-400 font-mono">[{pDef?.category || 'General'}]</span>
                    </div>
                    {pDef?.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 ml-5">{pDef.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setViewPermissionsUser(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
