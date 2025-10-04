import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  Calendar, Tag, User, GitPullRequest, Link2,
  Trash2, Send, Clock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { SlideOver } from '../ui/SlideOver.tsx';
import { Badge, getStatusVariant, getPriorityVariant, getStatusLabel } from '../ui/Badge.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Button } from '../ui/Button.tsx';
import { Select } from '../ui/Input.tsx';
import { Textarea } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { SkeletonText } from '../ui/Skeleton.tsx';
import { hasPermission } from '../shared/permissions.ts';
import type { Task, Comment, ActivityLog } from '../shared/types.ts';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_OPTIONS = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'done',        label: 'Done' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
];

function isOverdue(dueDate?: string) {
  return !!dueDate && new Date(dueDate) < new Date();
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TaskDetailModal() {
  const {
    selectedTaskId, setSelectedTaskId,
    tasks, membershipRole, user, organization,
    refreshTasks, addToast,
  } = useApp();

  const task = tasks.find((t) => t.id === selectedTaskId) as (Task & { assignee?: any; reporter?: any }) | undefined;

  const [comments, setComments]   = useState<(Comment & { author?: any })[]>([]);
  const [activity, setActivity]   = useState<ActivityLog[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [activeSection, setActiveSection] = useState<'comments' | 'activity'>('comments');

  const canEdit   = hasPermission(membershipRole, 'tasks:update');
  const canDelete = hasPermission(membershipRole, 'tasks:delete');
  const canComment = hasPermission(membershipRole, 'comments:create');

  const loadDetails = useCallback(async () => {
    if (!selectedTaskId) return;
    setLoadingDetails(true);
    try {
      const [c, a] = await Promise.all([
        api.getComments(selectedTaskId),
        organization ? api.getActivity(organization.id, undefined, selectedTaskId) : Promise.resolve([]),
      ]);
      setComments(c);
      setActivity(a);
    } catch { /* ignore */ }
    finally { setLoadingDetails(false); }
  }, [selectedTaskId, organization]);

  useEffect(() => {
    if (selectedTaskId) {
      setCommentText('');
      loadDetails();
    }
  }, [selectedTaskId, loadDetails]);

  const handleStatusChange = async (status: string) => {
    if (!task || !canEdit) return;
    try {
      await api.updateTask(task.id, { status: status as any });
      await refreshTasks();
    } catch { addToast('error', 'Failed to update status'); }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!task || !canEdit) return;
    try {
      await api.updateTask(task.id, { priority: priority as any });
      await refreshTasks();
    } catch { addToast('error', 'Failed to update priority'); }
  };

  const handleComment = async () => {
    if (!task || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.createComment(task.id, commentText.trim());
      setCommentText('');
      await loadDetails();
    } catch { addToast('error', 'Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      setSelectedTaskId(null);
      await refreshTasks();
      addToast('success', `${task.key} deleted`);
    } catch { addToast('error', 'Failed to delete task'); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  const overdue = isOverdue(task?.dueDate) && task?.status !== 'done' && task?.status !== 'cancelled';

  return (
    <>
      <SlideOver
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        width="md"
      >
        {task ? (
          <div className="flex flex-col h-full">
            {/* Task key + status + priority */}
            <div className="px-5 py-4 border-b border-[var(--border)] shrink-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="task-key text-[var(--text-faint)]">{task.key}</span>
                <Badge variant={getStatusVariant(task.status)} size="sm">{getStatusLabel(task.status)}</Badge>
                <Badge variant={getPriorityVariant(task.priority)} size="sm" dot>{task.priority}</Badge>
                {overdue && (
                  <Badge variant="danger" size="sm">
                    <AlertCircle size={10} strokeWidth={2} className="mr-0.5" />Overdue
                  </Badge>
                )}
              </div>
              <h2 className="text-[16px] font-semibold text-[var(--text)] tracking-tight leading-snug">
                {task.title}
              </h2>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Metadata grid */}
              <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-[var(--border)] text-[13px]">
                {/* Status */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Status</p>
                  {canEdit ? (
                    <Select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="h-8 text-[12px]"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : (
                    <Badge variant={getStatusVariant(task.status)} size="sm">{getStatusLabel(task.status)}</Badge>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Priority</p>
                  {canEdit ? (
                    <Select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="h-8 text-[12px]"
                    >
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : (
                    <Badge variant={getPriorityVariant(task.priority)} size="sm" dot>{task.priority}</Badge>
                  )}
                </div>

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task?.title || "Task Details"}>
      <div className="p-4 text-sm text-muted-foreground">{task?.description || "No description"}</div>
    </Modal>
  );
}
