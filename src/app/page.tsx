'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Activity,
  Shield,
  FileText,
  Users,
  FlaskConical,
  Calendar,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
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
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/50 via-slate-900 to-indigo-950/60 border border-blue-800/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Clinical Trial Workspace
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isAdmin
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}
              >
                Role: {user.role}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {user.fullName}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              You are signed into the Clinical Trial Management System ({user.email}). Here you will manage trial studies, patient recruitment, protocols, and compliance.
            </p>
          </div>

          {isAdmin ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all group"
              >
                <Shield className="w-4 h-4" />
                <span>Admin User Management</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-xs text-slate-300 max-w-xs">
              <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Authorized User Account
              </p>
              <p className="text-slate-400 text-[11px]">
                Department: {user.department || 'General Clinical Research'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trial Overview Quick Stats (Dummy CTMS Data) */}
      <div>
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Clinical Trials Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Studies</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <FlaskConical className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">12</div>
            <p className="text-xs text-slate-500 mt-1">4 Phase III, 6 Phase II, 2 Phase I</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Subjects Enrolled</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">1,420</div>
            <p className="text-xs text-emerald-400/90 mt-1">+84 enrolled this month</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Trial Sites</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">28</div>
            <p className="text-xs text-slate-500 mt-1">Across 14 medical centers</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Visits</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">36</div>
            <p className="text-xs text-amber-400/90 mt-1">Scheduled for next 7 days</p>
          </div>
        </div>
      </div>

      {/* Dummy Clinical Trial Workflows & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Studies List */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Active Clinical Protocols</h3>
              <p className="text-xs text-slate-400">Current trial studies under management</p>
            </div>
            <span className="text-xs text-blue-400 font-medium">Demo Data</span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'CT-2026-091',
                title: 'Phase III Multicenter Study for Oncology Novel Biomarker',
                sponsor: 'Novis Therapeutics',
                phase: 'Phase III',
                enrollment: '320 / 400',
                status: 'Recruiting',
              },
              {
                id: 'CT-2026-044',
                title: 'Efficacy & Safety Evaluation in Cardiovascular Intervention',
                sponsor: 'Aegis BioHealth',
                phase: 'Phase IIb',
                enrollment: '150 / 150',
                status: 'Active Follow-up',
              },
              {
                id: 'CT-2025-118',
                title: 'Immunotherapy Biomarker Response in Respiratory Conditions',
                sponsor: 'Apex Pharma',
                phase: 'Phase II',
                enrollment: '92 / 120',
                status: 'Recruiting',
              },
            ].map((study) => (
              <div
                key={study.id}
                className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-blue-400 font-bold">{study.id}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {study.phase}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {study.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{study.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Sponsor: {study.sponsor}</p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-xs text-slate-400">Enrollment</div>
                  <div className="text-sm font-bold text-white">{study.enrollment}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTMS Quick Info & System Status */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              System Status
            </h3>
            <div className="space-y-3 text-xs text-slate-300 mt-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Authentication</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Data Store</span>
                <span className="text-emerald-400 font-semibold">Cached (Supabase Ready)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Access Control</span>
                <span className="text-purple-400 font-semibold uppercase">{user.role} RBAC</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Next Step</span>
                <span className="text-blue-400 font-medium">Configure Clinical Workflows</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-900/30 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-indigo-300 mb-2">CTMS Workflow Ready</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentication and User Creation are fully configured. When you are ready to define custom trial processes, forms, or roles, we will integrate them right here!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
