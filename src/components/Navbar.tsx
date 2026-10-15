'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserTypeConfig } from '@/lib/permissions';
import {
  Shield,
  Home,
  LogOut,
  User as UserIcon,
  Database,
  Building2,
  FlaskConical,
  Pill,
  Leaf,
  HeartPulse,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import { getCachedDeadlines, updateDeadlineStatus } from '@/lib/storage';
import { TrialDeadline } from '@/lib/types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const [deadlines, setDeadlines] = useState<TrialDeadline[]>([]);
  const [showDeadlineDropdown, setShowDeadlineDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const allDeadlines = getCachedDeadlines();
      setDeadlines(allDeadlines);
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDeadlineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const isAdmin =
    user.role === 'admin' ||
    user.userType === 'super_admin' ||
    user.userType === 'administration' ||
    user.userType === 'system_administrator' ||
    hasPermission(user, 'manage_users');
  const typeConfig = getUserTypeConfig(user.userType);

  const todayStr = new Date().toISOString().slice(0, 10);
  const userDeadlines = deadlines.filter((d) => {
    if (isAdmin) return d.status !== 'completed';
    return (
      (d.assignedToUserId === user.id || d.assignedToUserId === user.email || d.assignedToRole === user.userType) &&
      d.status !== 'completed'
    );
  });

  const overdueCount = userDeadlines.filter(
    (d) => d.dueDate < todayStr || d.status === 'overdue' || d.status === 'escalated'
  ).length;
  const pendingCount = userDeadlines.length;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Leaf className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Ayurvedic <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">CTMS</span>
                </span>
                <p className="text-[10px] text-slate-400 -mt-1 hidden sm:block">AYUSH Clinical Trial Management</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1 ml-4 flex-wrap">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Homepage</span>
              </Link>

              <Link
                href="/trials"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname.startsWith('/trials')
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span>Trial Proposals</span>
              </Link>

              <Link
                href="/centres"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname.startsWith('/centres')
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Centres</span>
              </Link>

              <Link
                href="/drugs"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname.startsWith('/drugs')
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Pill className="w-4 h-4 text-emerald-400" />
                <span>Drug Module</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">AYUSH</span>
              </Link>

              {hasPermission(user, 'view_safety_reports') && (
                <Link
                  href="/pharmacovigilance"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    pathname.startsWith('/pharmacovigilance')
                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <HeartPulse className="w-4 h-4 text-rose-400" />
                  <span>Pharmacovigilance</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Admin Panel</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Temp Cache</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Approval & Certificate Deadlines Notification Button (Issue 7) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDeadlineDropdown((prev) => !prev)}
                className={`relative p-2 rounded-xl border transition-all flex items-center justify-center ${
                  overdueCount > 0
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                    : pendingCount > 0
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Approval & Certificate Deadlines"
              >
                <Clock className="w-4 h-4" />
                {pendingCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white shadow-sm ${
                      overdueCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  >
                    {overdueCount > 0 ? overdueCount : pendingCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showDeadlineDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Approval &amp; Certificate Deadlines
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {pendingCount} Pending{overdueCount > 0 ? ` (${overdueCount} Overdue)` : ''}
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {userDeadlines.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No pending approval or certificate deadlines.</p>
                    ) : (
                      userDeadlines.map((d) => {
                        const isOverdue = d.dueDate < todayStr || d.status === 'overdue' || d.status === 'escalated';
                        return (
                          <div
                            key={d.id}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                              isOverdue
                                ? 'bg-rose-950/30 border-rose-600/40'
                                : 'bg-slate-800/60 border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-white leading-tight">{d.title}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                  isOverdue
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isOverdue ? 'Overdue' : `Due ${d.dueDate}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Trial: <strong className="text-slate-200">{d.trialId}</strong></span>
                              <span>Assigned: <strong className="text-slate-200">{d.assignedToName}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                      <Link
                        href="/admin"
                        onClick={() => setShowDeadlineDropdown(false)}
                        className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Manage All Deadlines in Admin Panel</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {user.fullName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeConfig.badgeBg} ${typeConfig.badgeText} ${typeConfig.badgeBorder}`}
                  >
                    {typeConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
