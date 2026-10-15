'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Role,
  UserType,
  PermissionKey,
  TrialDeadline,
  DeadlineCategory,
  AdminAuditLog,
  Centre,
  TrialProposal,
} from '@/lib/types';
import { getCachedCentres } from '@/lib/centreStorage';
import { getCachedProposals } from '@/lib/proposalStorage';
import {
  USER_TYPES_CONFIG,
  ALL_PERMISSIONS_LIST,
  getDefaultPermissions,
  getUserTypeConfig,
} from '@/lib/permissions';
import {
  getCachedDeadlines,
  addDeadline,
  updateDeadlineStatus,
  deleteDeadline,
  getCachedAdminAuditLogs,
  addAdminAuditLog,
  updateUserInCache,
} from '@/lib/storage';
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
  Calendar,
  Clock,
  AlertTriangle,
  FileBadge,
  Bell,
  ArrowUpRight,
  History,
  Edit3,
  X,
  FileText,
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'deadlines' | 'audit_logs'>('list');

  // External Cached Entities
  const [availableTrials, setAvailableTrials] = useState<TrialProposal[]>([]);
  const [availableCentres, setAvailableCentres] = useState<Centre[]>([]);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | UserType>('all');
  const [viewPermissionsUser, setViewPermissionsUser] = useState<User | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserType, setEditUserType] = useState<UserType>('principal_investigator');
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [editAssignedTrialIds, setEditAssignedTrialIds] = useState<string[]>([]);
  const [editAssignedCentreIds, setEditAssignedCentreIds] = useState<string[]>([]);
  const [editDepartment, setEditDepartment] = useState('');
  const [editPermCategory, setEditPermCategory] = useState<string>('All');

  // Create User Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('principal_investigator');
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>(
    getDefaultPermissions('principal_investigator')
  );
  const [department, setDepartment] = useState('Department of Kayachikitsa');
  const [phone, setPhone] = useState('');
  const [assignedTrialIds, setAssignedTrialIds] = useState<string[]>([]);
  const [assignedCentreIds, setAssignedCentreIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deadlines State (Issue 7)
  const [deadlines, setDeadlines] = useState<TrialDeadline[]>([]);
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [showCreateDeadlineModal, setShowCreateDeadlineModal] = useState(false);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineCategory, setNewDeadlineCategory] = useState<DeadlineCategory>('ethics');
  const [newDeadlineTrialId, setNewDeadlineTrialId] = useState('');
  const [newDeadlineAssignedUserId, setNewDeadlineAssignedUserId] = useState('');
  const [newDeadlineDueDate, setNewDeadlineDueDate] = useState('');
  const [newDeadlineReminderDays, setNewDeadlineReminderDays] = useState('15, 7, 1');
  const [newDeadlineEscalationUser, setNewDeadlineEscalationUser] = useState('admin@ctms.com');
  const [newDeadlineRemarks, setNewDeadlineRemarks] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Reload functions
  const loadUsers = () => {
    const list = getUsersList();
    setUsers([...list]);
  };

  const loadDeadlines = () => {
    setDeadlines(getCachedDeadlines());
  };

  const loadAuditLogs = () => {
    setAuditLogs(getCachedAdminAuditLogs());
  };

  useEffect(() => {
    loadUsers();
    loadDeadlines();
    loadAuditLogs();
    const trls = getCachedProposals();
    const ctrs = getCachedCentres();
    setAvailableTrials(trls);
    setAvailableCentres(ctrs);

    if (trls.length > 0) {
      setAssignedTrialIds([trls[0].trialId]);
      setNewDeadlineTrialId(trls[0].trialId);
    }
    if (ctrs.length > 0) {
      setAssignedCentreIds([ctrs[0].id]);
    }
  }, []);

  // When UserType selection changes in Create Form
  const handleUserTypeChange = (newType: UserType) => {
    setSelectedUserType(newType);
    setCustomPermissions(getDefaultPermissions(newType));
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

  const handleToggleTrialAssignment = (trialId: string) => {
    setAssignedTrialIds((prev) =>
      prev.includes(trialId) ? prev.filter((id) => id !== trialId) : [...prev, trialId]
    );
  };

  const handleToggleCentreAssignment = (centreId: string) => {
    setAssignedCentreIds((prev) =>
      prev.includes(centreId) ? prev.filter((id) => id !== centreId) : [...prev, centreId]
    );
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError('Please fill in all required fields (Full Name, Email, Password).');
      return;
    }

    const config = getUserTypeConfig(selectedUserType);
    const computedRole: Role =
      selectedUserType === 'super_admin' ||
      selectedUserType === 'administration' ||
      selectedUserType === 'system_administrator'
        ? 'admin'
        : 'user';

    setIsSubmitting(true);
    const result = await createUser({
      fullName,
      email,
      password,
      role: computedRole,
      userType: selectedUserType,
      department: department || config.label,
      phone,
      assignedTrialIds: assignedTrialIds.length > 0 ? assignedTrialIds : ['all'],
      assignedCentreIds: assignedCentreIds.length > 0 ? assignedCentreIds : ['all'],
      permissions: customPermissions,
      status,
    });
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess(`User account for "${fullName}" created successfully as ${config.label}!`);
      // Log audit
      addAdminAuditLog({
        action: 'USER_CREATED',
        performedBy: user?.email || 'admin@ctms.com',
        userRole: user?.role || 'admin',
        targetUser: email,
        details: `Created new user ${fullName} (${selectedUserType}) with ${customPermissions.length} granted permissions.`,
      });
      loadUsers();
      loadAuditLogs();
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
    } else {
      setFormError(result.error || 'Failed to create user account.');
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserType(u.userType);
    setEditPermissions(u.permissions || getDefaultPermissions(u.userType));
    setEditAssignedTrialIds(u.assignedTrialIds || ['all']);
    setEditAssignedCentreIds(u.assignedCentreIds || ['all']);
    setEditDepartment(u.department || '');
  };

  // Save Edit User
  const handleSaveEditUser = () => {
    if (!editingUser) return;
    try {
      const isRoleAdmin =
        editUserType === 'super_admin' ||
        editUserType === 'administration' ||
        editUserType === 'system_administrator';
      const computedRole = isRoleAdmin ? 'admin' : 'user';

      const updated = updateUserInCache(editingUser.id, {
        role: computedRole,
        userType: editUserType,
        permissions: editPermissions,
        assignedTrialIds: editAssignedTrialIds,
        assignedCentreIds: editAssignedCentreIds,
        department: editDepartment,
      });

      addAdminAuditLog({
        action: 'PERMISSIONS_UPDATED',
        performedBy: user?.email || 'admin@ctms.com',
        userRole: user?.role || 'admin',
        targetUser: editingUser.email,
        details: `Updated role to ${editUserType} (${computedRole}), ${editPermissions.length} permissions, ${editAssignedTrialIds.length} trials, ${editAssignedCentreIds.length} centres.`,
      });

      setEditingUser(null);
      loadUsers();
      loadAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    }
  };

  // Toggle user status
  const handleToggleStatus = async (userId: string) => {
    const res = await toggleUserStatus(userId);
    if (res.success) {
      loadUsers();
      loadAuditLogs();
    }
  };

  // Delete user
  const handleDelete = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to permanently delete user "${userEmail}"?`)) {
      const res = await deleteUser(userId);
      if (res.success) {
        addAdminAuditLog({
          action: 'USER_DELETED',
          performedBy: user?.email || 'admin@ctms.com',
          userRole: user?.role || 'admin',
          targetUser: userEmail,
          details: `User account deleted permanently.`,
        });
        loadUsers();
        loadAuditLogs();
      }
    }
  };

  // Create Deadline (Issue 7)
  const handleCreateDeadlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineTitle.trim() || !newDeadlineDueDate) {
      alert('Title and Due Date are mandatory.');
      return;
    }

    const assignedUserObj = users.find((u) => u.id === newDeadlineAssignedUserId || u.email === newDeadlineAssignedUserId);
    const reminderDaysArray = newDeadlineReminderDays
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const created = addDeadline({
      title: newDeadlineTitle,
      category: newDeadlineCategory,
      trialId: newDeadlineTrialId || 'CT-001',
      assignedToUserId: assignedUserObj?.id || newDeadlineAssignedUserId,
      assignedToName: assignedUserObj?.fullName || 'Assigned Investigator',
      assignedToRole: assignedUserObj?.userType || 'principal_investigator',
      dueDate: newDeadlineDueDate,
      reminderDaysBefore: reminderDaysArray.length > 0 ? reminderDaysArray : [15, 7, 1],
      escalateToAdminIfOverdue: true,
      escalationAdminEmail: newDeadlineEscalationUser || 'admin@ctms.com',
      status: 'pending',
      remarks: newDeadlineRemarks,
    });

    addAdminAuditLog({
      action: 'DEADLINE_ASSIGNED',
      performedBy: user?.email || 'admin@ctms.com',
      userRole: user?.role || 'admin',
      details: `Created deadline "${created.title}" assigned to ${created.assignedToName} due ${created.dueDate}.`,
    });

    setShowCreateDeadlineModal(false);
    setNewDeadlineTitle('');
    setNewDeadlineDueDate('');
    setNewDeadlineRemarks('');
    loadDeadlines();
    loadAuditLogs();
  };

  // Escalate Deadline to Admin (Issue 7)
  const handleEscalateDeadline = (id: string, title: string) => {
    updateDeadlineStatus(id, 'escalated');
    addAdminAuditLog({
      action: 'DEADLINE_ESCALATED',
      performedBy: user?.email || 'admin@ctms.com',
      userRole: user?.role || 'admin',
      details: `Escalated overdue deadline "${title}" to Administrators for priority action.`,
    });
    loadDeadlines();
    loadAuditLogs();
  };

  // Mark Deadline Completed
  const handleCompleteDeadline = (id: string, title: string) => {
    updateDeadlineStatus(id, 'completed');
    addAdminAuditLog({
      action: 'DEADLINE_COMPLETED',
      performedBy: user?.email || 'admin@ctms.com',
      userRole: user?.role || 'admin',
      details: `Marked deadline "${title}" as Approved / Completed.`,
    });
    loadDeadlines();
    loadAuditLogs();
  };

  // Delete Deadline
  const handleDeleteDeadline = (id: string) => {
    if (confirm('Are you sure you want to delete this deadline?')) {
      deleteDeadline(id);
      loadDeadlines();
      loadAuditLogs();
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || u.userType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [users, searchQuery, typeFilter]);

  // Filtered Deadlines List
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((d) => {
      const q = deadlineSearch.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.trialId.toLowerCase().includes(q) ||
        d.assignedToName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    });
  }, [deadlines, deadlineSearch]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = auditSearch.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.targetUser || '').toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  // Metrics Counters
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const overdueDeadlines = deadlines.filter((d) => {
    const today = new Date().toISOString().slice(0, 10);
    return (d.status === 'pending' || d.status === 'escalated') && d.dueDate < today;
  }).length;

  const currentTypeConfig = getUserTypeConfig(selectedUserType);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>AIIA CTMS Enterprise Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Security, Permissions &amp; Regulatory Control
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage 10 User Access Modules, multi-trial assignments, granular CRUD permissions, certificate deadlines, and audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Directory ({totalUsers})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'deadlines'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Deadlines &amp; Reminders ({deadlines.length})</span>
            {overdueDeadlines > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-bold">
                {overdueDeadlines}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Logs ({auditLogs.length})</span>
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
          <span className="text-[11px] text-slate-500">Active: {activeCount} users</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">User Access Modules</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">10 Modules</p>
          <span className="text-[11px] text-cyan-400/90">Super Admin, PI, CRA, IEC, PV, DM, DSMB, Leadership</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Approval &amp; Cert Deadlines</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{deadlines.length}</p>
          <span className="text-[11px] text-amber-300 font-medium">
            {overdueDeadlines} Overdue / Escalated
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Security Audit Trail</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{auditLogs.length} Events</p>
          <span className="text-[11px] text-emerald-400/90">Tamper-evident system log</span>
        </div>
      </div>

      {/* TAB 1: USER DIRECTORY & ROLE PERMISSIONS */}
      {activeTab === 'list' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
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
                <span className="text-slate-400">Filter Role:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All 10 Access Modules</option>
                  <option value="super_admin">1. Super Admin</option>
                  <option value="principal_investigator">2. Principal Investigator (PI)</option>
                  <option value="study_coordinator">3. Study Coordinator</option>
                  <option value="clinical_monitor">4. Clinical Monitor (CRA)</option>
                  <option value="ethics_committee">5. Ethics Committee (IEC)</option>
                  <option value="pharmacovigilance">6. Pharmacovigilance Team</option>
                  <option value="data_manager">7. Data Manager</option>
                  <option value="dsmb_member">8. DSMB Member</option>
                  <option value="admin_leadership">9. Admin / Leadership</option>
                  <option value="regulator_auditor">10. Regulator / Auditor</option>
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
                  <th className="pb-3 px-4">Access Module</th>
                  <th className="pb-3 px-4">Permissions Matrix</th>
                  <th className="pb-3 px-4">Assigned Studies &amp; Sites</th>
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
                    const trialCount = (u.assignedTrialIds || []).includes('all')
                      ? 'All Studies'
                      : `${(u.assignedTrialIds || []).length} Studies`;
                    const centreCount = (u.assignedCentreIds || []).includes('all')
                      ? 'All Centres'
                      : `${(u.assignedCentreIds || []).length} Centres`;

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

                        <td className="py-3.5 px-4 text-slate-300">
                          <div className="text-xs font-medium text-slate-200">{trialCount}</div>
                          <div className="text-[11px] text-slate-500">{centreCount}</div>
                        </td>

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
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit Role, Permissions & Study Assignments"
                              className="px-2.5 py-1 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Configure</span>
                            </button>

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
                              <span className="text-[11px] text-slate-500 italic pr-2">Protected</span>
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

      {/* TAB 2: CREATE USER FORM WITH ROLE PRESET, STUDY ASSIGNMENT & PERMISSION MATRIX */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  Create User &amp; Assign Role Permissions
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a user access module, assign clinical trials &amp; study centres, and grant fine-grained CRUD permissions.
                </p>
              </div>
            </div>

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
              {/* 10 Core User Access Modules Dropdown */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-800/40 shadow-inner">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    User Access Module / Role <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">10 Enterprise Roles Supported</span>
                </label>
                <select
                  value={selectedUserType}
                  onChange={(e) => handleUserTypeChange(e.target.value as UserType)}
                  className="w-full px-4 py-3 bg-slate-800 border-2 border-blue-500/60 rounded-xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all cursor-pointer shadow-lg"
                >
                  <option value="super_admin">1. Super Admin (System settings, user management, audit logs)</option>
                  <option value="principal_investigator">2. Principal Investigator (Study management, patient records, safety approvals)</option>
                  <option value="study_coordinator">3. Study Coordinator (Patient screening, enrolment, consent, visits)</option>
                  <option value="clinical_monitor">4. Clinical Monitor / CRA (Site monitoring, protocol deviations, data queries)</option>
                  <option value="ethics_committee">5. Ethics Committee / IEC (Ethics review, protocol approval, renewals)</option>
                  <option value="pharmacovigilance">6. Pharmacovigilance Team (ADR/AE/SAE reports, safety analysis, deadlines)</option>
                  <option value="data_manager">7. Data Manager (Data validation, quality checks, query management, data export)</option>
                  <option value="dsmb_member">8. DSMB Member (Safety trends, interim analysis, risk reports)</option>
                  <option value="admin_leadership">9. Admin / Leadership (Overall dashboard, KPIs, study progress, reports)</option>
                  <option value="regulator_auditor">10. Regulator / Auditor (Read-only trial records, regulatory TMF, audit trails)</option>
                </select>

                <p className="text-xs text-slate-300 mt-2.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentTypeConfig.description}</span>
                </p>
              </div>

              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    required
                    className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

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
                      placeholder="rajesh.sharma@aiia.gov.in"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

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
                      placeholder="Initial login password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Department / Institution
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Department of Dravyaguna"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Study & Centre Multi-Select Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Assign Clinical Trials
                    </label>
                    <span className="text-[10px] text-slate-400">{assignedTrialIds.length} Selected</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedTrialIds.includes('all')}
                        onChange={() => {
                          if (assignedTrialIds.includes('all')) {
                            setAssignedTrialIds([]);
                          } else {
                            setAssignedTrialIds(['all']);
                          }
                        }}
                      />
                      <span className="font-semibold text-blue-300">All Clinical Trials (Global Access)</span>
                    </label>
                    {availableTrials.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignedTrialIds.includes(t.trialId) || assignedTrialIds.includes('all')}
                          disabled={assignedTrialIds.includes('all')}
                          onChange={() => handleToggleTrialAssignment(t.trialId)}
                        />
                        <span className="truncate">{t.trialId} — {t.trialTitle}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Assign Study Centres
                    </label>
                    <span className="text-[10px] text-slate-400">{assignedCentreIds.length} Selected</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedCentreIds.includes('all')}
                        onChange={() => {
                          if (assignedCentreIds.includes('all')) {
                            setAssignedCentreIds([]);
                          } else {
                            setAssignedCentreIds(['all']);
                          }
                        }}
                      />
                      <span className="font-semibold text-emerald-300">All Study Centres (Multi-Centre Access)</span>
                    </label>
                    {availableCentres.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignedCentreIds.includes(c.id) || assignedCentreIds.includes('all')}
                          disabled={assignedCentreIds.includes('all')}
                          onChange={() => handleToggleCentreAssignment(c.id)}
                        />
                        <span className="truncate">{c.centreName} ({c.city})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fine-Grained Permissions Matrix */}
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
                    <RefreshCw className="w-3 h-3" /> Load Role Preset for {currentTypeConfig.label}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
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

          {/* Quick Role Guide Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-purple-400" />
                10 User Access Modules
              </h3>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
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
                      <span className="text-[10px] text-slate-400">{cfg.permissions.length} Perms</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{cfg.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: APPROVAL & CERTIFICATE DEADLINES (Issue 7) */}
      {activeTab === 'deadlines' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Approval &amp; Certificate Deadlines Management
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign deadlines to responsible users with automated reminder rules, overdue tracking, and Administrator escalation.
              </p>
            </div>

            <button
              onClick={() => setShowCreateDeadlineModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign New Deadline</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={deadlineSearch}
                onChange={(e) => setDeadlineSearch(e.target.value)}
                placeholder="Search deadline title, trial ID, user..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredDeadlines.length} of {deadlines.length} scheduled deadlines
            </span>
          </div>

          {/* Deadlines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="pb-3 px-4">Requirement / Title</th>
                  <th className="pb-3 px-4">Trial ID</th>
                  <th className="pb-3 px-4">Responsible User</th>
                  <th className="pb-3 px-4">Due Date</th>
                  <th className="pb-3 px-4">Reminders</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDeadlines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No approval or certificate deadlines found.
                    </td>
                  </tr>
                ) : (
                  filteredDeadlines.map((d) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isOverdue = (d.status === 'pending' || d.status === 'escalated') && d.dueDate < today;

                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-semibold text-white">{d.title}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {d.category}
                              </span>
                              {d.remarks && <span className="text-[11px] text-slate-400">· {d.remarks}</span>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-blue-300">
                          {d.trialId}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{d.assignedToName}</div>
                          <div className="text-[11px] text-slate-400">{d.assignedToRole}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`font-mono font-medium ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                            {d.dueDate}
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Past Deadline
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                            <Bell className="w-3 h-3 text-amber-400" />
                            <span>{(d.reminderDaysBefore || []).join(', ')} days prior</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              d.status === 'completed'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                : d.status === 'escalated'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60 animate-pulse'
                                : isOverdue
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                            }`}
                          >
                            {d.status === 'completed'
                              ? '✓ Completed'
                              : d.status === 'escalated'
                              ? '⚠️ Escalated to Admin'
                              : isOverdue
                              ? '🚨 Overdue'
                              : '⏳ Pending'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {d.status !== 'completed' && (
                              <button
                                onClick={() => handleCompleteDeadline(d.id, d.title)}
                                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium"
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                            )}

                            {d.status !== 'escalated' && d.status !== 'completed' && (
                              <button
                                onClick={() => handleEscalateDeadline(d.id, d.title)}
                                className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium"
                                title="Escalate to Administrator"
                              >
                                Escalate
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteDeadline(d.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Delete Deadline"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 4: ADMINISTRATIVE AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Administrative Activity &amp; Permissions Audit Trail
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete traceability of user creation, role permission grants, study assignments, and regulatory escalations.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit action, user, details..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredAuditLogs.length} logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="pb-3 px-4">Timestamp</th>
                  <th className="pb-3 px-4">Action</th>
                  <th className="pb-3 px-4">Performed By</th>
                  <th className="pb-3 px-4">Target User</th>
                  <th className="pb-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No administrative audit log entries found.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {log.timestamp.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.performedBy} ({log.userRole})
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.targetUser || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT USER & ROLE CONFIGURATION MODAL (Issue 6) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Configure User Role, Permissions &amp; Study Access
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingUser.fullName} ({editingUser.email})
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Select Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">User Access Module</label>
              <div className="flex gap-2">
                <select
                  value={editUserType}
                  onChange={(e) => {
                    const nextType = e.target.value as UserType;
                    setEditUserType(nextType);
                    setEditPermissions(getDefaultPermissions(nextType));
                  }}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none"
                >
                  <option value="super_admin">1. Super Admin</option>
                  <option value="principal_investigator">2. Principal Investigator (PI)</option>
                  <option value="study_coordinator">3. Study Coordinator</option>
                  <option value="clinical_monitor">4. Clinical Monitor (CRA)</option>
                  <option value="ethics_committee">5. Ethics Committee (IEC)</option>
                  <option value="pharmacovigilance">6. Pharmacovigilance Team</option>
                  <option value="data_manager">7. Data Manager</option>
                  <option value="dsmb_member">8. DSMB Member</option>
                  <option value="admin_leadership">9. Admin / Leadership</option>
                  <option value="regulator_auditor">10. Regulator / Auditor</option>
                </select>
                <button
                  type="button"
                  onClick={() => setEditPermissions(getDefaultPermissions(editUserType))}
                  className="px-3 py-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600/30 transition"
                  title="Reload default permissions for selected role"
                >
                  Reset to Role Preset
                </button>
              </div>
            </div>

            {/* Study & Centre Multi-Select Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Assigned Clinical Trials</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAssignedTrialIds.includes('all')}
                      onChange={() => {
                        if (editAssignedTrialIds.includes('all')) setEditAssignedTrialIds([]);
                        else setEditAssignedTrialIds(['all']);
                      }}
                    />
                    <span className="font-semibold text-blue-300">All Trials (Global)</span>
                  </label>
                  {availableTrials.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editAssignedTrialIds.includes(t.trialId) || editAssignedTrialIds.includes('all')}
                        disabled={editAssignedTrialIds.includes('all')}
                        onChange={() => {
                          setEditAssignedTrialIds((prev) =>
                            prev.includes(t.trialId)
                              ? prev.filter((id) => id !== t.trialId)
                              : [...prev, t.trialId]
                          );
                        }}
                      />
                      <span className="truncate">{t.trialId}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Assigned Study Centres</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAssignedCentreIds.includes('all')}
                      onChange={() => {
                        if (editAssignedCentreIds.includes('all')) setEditAssignedCentreIds([]);
                        else setEditAssignedCentreIds(['all']);
                      }}
                    />
                    <span className="font-semibold text-emerald-300">All Centres</span>
                  </label>
                  {availableCentres.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editAssignedCentreIds.includes(c.id) || editAssignedCentreIds.includes('all')}
                        disabled={editAssignedCentreIds.includes('all')}
                        onChange={() => {
                          setEditAssignedCentreIds((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          );
                        }}
                      />
                      <span className="truncate">{c.centreName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase text-slate-300">
                  Granular Permissions Matrix ({editPermissions.length} / {ALL_PERMISSIONS_LIST.length} Enabled)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditPermissions(ALL_PERMISSIONS_LIST.map((p) => p.key))}
                    className="text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setEditPermissions([])}
                    className="text-slate-400 hover:text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 pb-1">
                {['All', 'Administration', 'Protocol & Trial', 'Patient & CRF', 'Monitoring & Query', 'Safety & Ethics', 'Regulatory & Audit'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditPermCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                      editPermCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {ALL_PERMISSIONS_LIST.filter(
                  (perm) => editPermCategory === 'All' || perm.category === editPermCategory
                ).map((perm) => {
                  const isChecked = editPermissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-950/40 border-blue-600/40 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setEditPermissions((prev) =>
                            prev.includes(perm.key)
                              ? prev.filter((k) => k !== perm.key)
                              : [...prev, perm.key]
                          );
                        }}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-white">{perm.label}</div>
                        <div className="text-[10px] text-slate-400">{perm.category}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditUser}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
              >
                Save Role &amp; Permission Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DEADLINE MODAL (Issue 7) */}
      {showCreateDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Schedule Approval or Certificate Deadline
              </h3>
              <button
                onClick={() => setShowCreateDeadlineModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeadlineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Deadline Title / Requirement <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  placeholder="e.g. IEC Annual Renewal Approval"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newDeadlineCategory}
                    onChange={(e) => setNewDeadlineCategory(e.target.value as DeadlineCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="ethics">Ethics / IEC Approval</option>
                    <option value="cdsco">CDSCO / DCGI Clearance</option>
                    <option value="ctri">CTRI Periodic Filing</option>
                    <option value="investigator_cert">Investigator Certification</option>
                    <option value="gcp_cert">GCP Training Certificate</option>
                    <option value="site_clearance">Site Initiation Clearance</option>
                    <option value="other">Other Regulatory Deadline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Clinical Trial
                  </label>
                  <select
                    value={newDeadlineTrialId}
                    onChange={(e) => setNewDeadlineTrialId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                  >
                    {availableTrials.map((t) => (
                      <option key={t.id} value={t.trialId}>
                        {t.trialId} — {t.trialTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Responsible User <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newDeadlineAssignedUserId}
                    onChange={(e) => setNewDeadlineAssignedUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="">Select Responsible User...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.userType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Due Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDeadlineDueDate}
                    onChange={(e) => setNewDeadlineDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Reminder Rules (Days Prior)
                  </label>
                  <input
                    type="text"
                    value={newDeadlineReminderDays}
                    onChange={(e) => setNewDeadlineReminderDays(e.target.value)}
                    placeholder="15, 7, 1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Escalation Contact
                  </label>
                  <input
                    type="email"
                    value={newDeadlineEscalationUser}
                    onChange={(e) => setNewDeadlineEscalationUser(e.target.value)}
                    placeholder="admin@ctms.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Remarks / Regulatory Reference
                </label>
                <input
                  type="text"
                  value={newDeadlineRemarks}
                  onChange={(e) => setNewDeadlineRemarks(e.target.value)}
                  placeholder="e.g. Schedule-Y / NDCT 2019 Rule 26 requirement"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateDeadlineModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                >
                  Assign Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY PERMISSIONS VIEW MODAL */}
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
