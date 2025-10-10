import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Layers,
  Users,
} from 'lucide-react';
import type { AnalyticsSummary } from '../shared/types.ts';
import { Card } from '../ui/Card.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RecentActivityWidget } from './RecentActivityWidget.tsx';

export function AnalyticsView() {
  const { organization, addToast } = useApp();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const loadStats = async () => {
      try {
        setLoading(true);
        const stats = await api.getAnalytics(organization.id);
        setData(stats);
      } catch (err: any) {
        addToast('error', err?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [organization, addToast]);

  if (!data) return null;

  const totalTasks = data.openTasks + data.completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((data.completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="max-w-[1100px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="pb-4 border-b border-[#E5E7EB]">
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
            Engineering Analytics & Velocity
          </h1>
          <p className="text-[14px] text-[#4B5563] mt-1">
            Real-time delivery throughput, status allocations, and workload balancing across {organization?.name}.
          </p>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between text-[12px] text-[#6B7280] mb-2">
              <span>Active Projects</span>
              <FolderGit2 size={16} strokeWidth={1.5} className="text-[#2563EB]" />
            </div>
            <div className="text-[24px] font-semibold text-[#111827] leading-tight">{data.totalProjects}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-1">Across workspace</div>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-[12px] text-[#6B7280] mb-2">
              <span>Open Tasks</span>
              <Layers size={16} strokeWidth={1.5} className="text-[#D97706]" />
            </div>
            <div className="text-[24px] font-semibold text-[#111827] leading-tight">{data.openTasks}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-1">Backlog, To Do & In Progress</div>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-[12px] text-[#6B7280] mb-2">
              <span>Completed Tasks</span>
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#059669]" />
            </div>
            <div className="text-[24px] font-semibold text-[#111827] leading-tight">{data.completedTasks}</div>
            <div className="text-[11px] text-[#059669] font-medium mt-1">
              {completionRate}% completion rate
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-[12px] text-[#6B7280] mb-2">
              <span>Overdue Tasks</span>
              <AlertTriangle size={16} strokeWidth={1.5} className="text-[#DC2626]" />
            </div>
            <div className="text-[24px] font-semibold text-[#111827] leading-tight">{data.overdueTasks}</div>
            <div className="text-[11px] text-[#DC2626] mt-1">Requires attention</div>
          </Card>
        </div>

        {/* Status & Priority Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status Breakdown */}
          <Card className="space-y-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">
              Tasks by Status
            </h2>
            <div className="space-y-3">
              {Object.entries(data.statusBreakdown).map(([status, count]) => {
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                const statusColors: Record<string, string> = {
                  backlog: 'bg-[#9CA3AF]',
                  todo: 'bg-[#6B7280]',
                  in_progress: 'bg-[#2563EB]',
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold">Analytics & Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card border rounded-lg">Tasks Completed</div>
      </div>
    </div>
  );
}
