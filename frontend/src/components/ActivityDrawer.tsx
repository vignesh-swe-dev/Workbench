import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
  Rocket,
  GitPullRequest,
  PlusCircle,
  FolderGit2,
} from 'lucide-react';
import type { ActivityLog } from '../shared/types.ts';
import { SlideOver } from '../ui/SlideOver.tsx';
import { Badge } from '../ui/Badge.tsx';

function formatFullTime(dateString: string): string {
  const d = new Date(dateString);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getActivityBadge(action: string) {
  if (action.includes('done') || action.includes('completed') || action === 'github:pr_merged') {
    return {
      icon: <CheckCircle2 className="w-4 h-4 text-[#059669]" />,
      variant: 'success' as const,
      label: 'Completed',
    };
  }
  if (action.includes('comment')) {
    return {
      icon: <MessageSquare className="w-4 h-4 text-[#2563EB]" />,
      variant: 'info' as const,
      label: 'Comment',
    };
  }
  if (action.includes('member') || action.includes('role')) {
    return {
      icon: <UserPlus className="w-4 h-4 text-[#7C3AED]" />,
      variant: 'default' as const,
      label: 'Team',
    };
  }
  if (action.includes('release')) {
    return {
      icon: <Rocket className="w-4 h-4 text-[#059669]" />,
      variant: 'success' as const,
      label: 'Release',
    };
  }
  if (action.includes('github') || action.includes('pr')) {
    return {
      icon: <GitPullRequest className="w-4 h-4 text-[#2563EB]" />,
      variant: 'info' as const,
      label: 'GitHub',
    };
  }
  if (action.includes('created')) {
    return {
      icon: <PlusCircle className="w-4 h-4 text-[#2563EB]" />,
      variant: 'brand' as const,
      label: 'Created',
    };
  }
  return {
    icon: <Clock className="w-4 h-4 text-[#D97706]" />,
    variant: 'warning' as const,
    label: 'Updated',
  };
}

export function ActivityDrawer() {
  const {
    isActivityDrawerOpen,
    setIsActivityDrawerOpen,
    activities,
    projects,
    currentProject,
    setCurrentProject,
    setSelectedTaskId,
  } = useApp();

  const [projectFilter, setProjectFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = activities.filter((act) => {
    if (projectFilter !== 'all' && act.projectId !== projectFilter) return false;
    if (actionFilter !== 'all') {
      if (actionFilter === 'tasks' && !act.action.includes('task')) return false;
      if (actionFilter === 'comments' && !act.action.includes('comment')) return false;
      if (actionFilter === 'team' && !act.action.includes('member')) return false;
      if (actionFilter === 'releases' && !act.action.includes('release')) return false;
      if (actionFilter === 'github' && !act.action.includes('github')) return false;
    }
    return true;
  });

  const handleItemClick = (act: ActivityLog) => {
    if (act.taskId) {
      if (act.projectId && currentProject?.id !== act.projectId) {
        const proj = projects.find((p) => p.id === act.projectId);
        if (proj) setCurrentProject(proj);
      }
      setSelectedTaskId(act.taskId);
      setIsActivityDrawerOpen(false);
    } else if (act.projectId && currentProject?.id !== act.projectId) {
      const proj = projects.find((p) => p.id === act.projectId);
      if (proj) {
        setCurrentProject(proj);
        setIsActivityDrawerOpen(false);
      }
    }
  };

  return (
    <SlideOver
      open={isActivityDrawerOpen}
      onClose={() => setIsActivityDrawerOpen(false)}
      title="Workspace Activity Stream"
      description={`${filtered.length} recent system and collaboration events.`}
      width="md"
    >
      <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Filter controls */}
        <div className="p-3 border-b border-[#E5E7EB] bg-white flex items-center gap-2.5 shrink-0">
          <div className="flex-1">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[6px] px-2.5 py-1.5 text-[12px] text-[#374151] hover:border-[#D1D5DB] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[6px] px-2.5 py-1.5 text-[12px] text-[#374151] hover:border-[#D1D5DB] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">All Action Types</option>
              <option value="tasks">Tasks & Status</option>
              <option value="comments">Comments</option>
              <option value="team">Members & Roles</option>
              <option value="releases">Releases</option>
              <option value="github">GitHub PRs</option>
            </select>
          </div>
        </div>

        {/* Activity Stream Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-[13px] text-[#9CA3AF] py-12 text-center">
              No matching activity events found
            </div>
          ) : (
            filtered.map((act) => {
              const meta = getActivityBadge(act.action);
              const proj = projects.find((p) => p.id === act.projectId);
              const hasTask = Boolean(act.taskId);

              return (
                <div
                  key={act.id}
                  onClick={() => handleItemClick(act)}
                  className={`p-3.5 rounded-[8px] border bg-white border-[#E5E7EB] transition-all shadow-xs ${
                    hasTask
                      ? 'hover:border-[#D1D5DB] hover:shadow-sm cursor-pointer'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{meta.icon}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[13px] font-medium text-[#111827]">
                            {act.actorName}
                          </span>
                          <Badge variant={meta.variant} size="sm">
                            {meta.label}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] font-mono shrink-0">
                          {formatFullTime(act.createdAt)}
                        </span>
                      </div>

                      <p className="text-[13px] text-[#4B5563] leading-relaxed">{act.details}</p>

                      {proj && (
                        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-[#F3F4F6] text-[11px] text-[#6B7280]">
                          <FolderGit2 size={13} strokeWidth={1.5} className="text-[#9CA3AF]" />
                          <span>{proj.name}</span>
                          <span className="font-mono text-[#9CA3AF]">[{proj.key}]</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SlideOver>
  );
}
