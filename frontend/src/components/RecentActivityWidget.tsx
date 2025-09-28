import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
  Rocket,
  GitPullRequest,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import type { ActivityLog } from '../shared/types.ts';
import { Card } from '../ui/Card.tsx';

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getActivityIcon(action: string) {
  if (action.includes('done') || action.includes('completed') || action === 'github:pr_merged') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />;
  }
  if (action.includes('comment')) {
    return <MessageSquare className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />;
  }
  if (action.includes('member') || action.includes('role')) {
    return <UserPlus className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 mt-0.5" />;
  }
  if (action.includes('release')) {
    return <Rocket className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />;
  }
  if (action.includes('github') || action.includes('pr')) {
    return <GitPullRequest className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />;
  }
  if (action.includes('created')) {
    return <PlusCircle className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />;
  }
  return <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />;
}

export function RecentActivityWidget({ maxItems = 4 }: { maxItems?: number }) {
  const {
    activities,
    projects,
    currentProject,
    setCurrentProject,
    setSelectedTaskId,
    setIsActivityDrawerOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const handleActivityClick = (act: ActivityLog) => {
    if (act.taskId) {
      if (act.projectId && currentProject?.id !== act.projectId) {
        const proj = projects.find((p) => p.id === act.projectId);
        if (proj) setCurrentProject(proj);
      }
      setSelectedTaskId(act.taskId);
      setIsMobileMenuOpen(false);
    } else if (act.projectId && currentProject?.id !== act.projectId) {
      const proj = projects.find((p) => p.id === act.projectId);
      if (proj) {
        setCurrentProject(proj);
        setIsMobileMenuOpen(false);
      }
    }
  };

  const displayed = activities.slice(0, maxItems);

  return (
    <Card className="space-y-3">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#059669]" />
          <h3 className="text-[13px] font-semibold text-[#111827]">
            Recent Workspace Activity
          </h3>
        </div>

        <button
          onClick={() => setIsActivityDrawerOpen(true)}
          className="text-[12px] text-[#2563EB] hover:underline font-medium flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ExternalLink size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Activity Items */}
      <div className="divide-y divide-[#E5E7EB]">
        {displayed.map((act) => (
          <div
            key={act.id}
            onClick={() => handleActivityClick(act)}
            className="py-2.5 flex items-start gap-2.5 hover:bg-[#F9FAFB] rounded-[4px] px-1 cursor-pointer transition-colors"
          >
            {getActivityIcon(act.action)}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#111827] leading-snug line-clamp-1">
                {act.details}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mt-0.5">
                <span>{act.actorName}</span>
                <span>·</span>
                <span>{formatRelativeTime(act.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}

        {displayed.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[#9CA3AF]">
            No recent activity recorded.
          </p>
        )}
      </div>
    </Card>
  );
}
