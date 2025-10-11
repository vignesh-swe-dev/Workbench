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
                  in_review: 'bg-[#4F46E5]',
                  done: 'bg-[#059669]',
                  cancelled: 'bg-[#DC2626]',
                };
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-[12px] text-[#4B5563]">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-mono text-[#111827] font-medium">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${statusColors[status] || 'bg-[#2563EB]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Priority Breakdown */}
          <Card className="space-y-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">
              Tasks by Priority
            </h2>
            <div className="space-y-3">
              {Object.entries(data.priorityBreakdown).map(([priority, count]) => {
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                const prioColors: Record<string, string> = {
                  urgent: 'bg-[#DC2626]',
                  high: 'bg-[#EA580C]',
                  medium: 'bg-[#D97706]',
                  low: 'bg-[#9CA3AF]',
                };
                return (
                  <div key={priority} className="space-y-1">
                    <div className="flex justify-between text-[12px] text-[#4B5563]">
                      <span className="capitalize">{priority}</span>
                      <span className="font-mono text-[#111827] font-medium">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${prioColors[priority] || 'bg-[#2563EB]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Assignee Workload & Velocity */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={1.5} className="text-[#2563EB]" />
            <h2 className="text-[14px] font-semibold text-[#111827]">
              Team Workload & Throughput
            </h2>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {data.assigneeWorkload.map((w) => {
              const compPct = w.taskCount > 0 ? Math.round((w.completedCount / w.taskCount) * 100) : 0;
              return (
                <div key={w.userId} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={w.userName} size="sm" />
                    <div>
                      <div className="text-[13px] font-medium text-[#111827]">{w.userName}</div>
                      <div className="text-[11px] text-[#6B7280]">
                        {w.completedCount} of {w.taskCount} tasks completed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-48">
                    <div className="flex-1 h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all"
                        style={{ width: `${compPct}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-mono font-medium text-[#111827] w-10 text-right">
                      {compPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Real-time Recent Activity Widget */}
        <RecentActivityWidget maxItems={6} />
      </div>
    </div>
  );
}
