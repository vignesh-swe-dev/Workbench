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

                {/* Assignee */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Assignee</p>
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.assignee.name} size="xs" />
                      <span className="text-[13px] text-[var(--text)]">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-[var(--text-faint)]">Unassigned</span>
                  )}
                </div>

                {/* Due date */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Due date</p>
                  <span className={`flex items-center gap-1 text-[13px] ${overdue ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
                    <Clock size={12} strokeWidth={1.5} />
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                {/* Reporter */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Reporter</p>
                  {task.reporter ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.reporter.name} size="xs" />
                      <span className="text-[13px] text-[var(--text)]">{task.reporter.name}</span>
                    </div>
                  ) : <span className="text-[var(--text-faint)]">—</span>}
                </div>

                {/* Effort */}
                {task.estimatedEffort != null && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Effort</p>
                    <span className="text-[13px] text-[var(--text)]">{task.estimatedEffort} pts</span>
                  </div>
                )}
              </div>

              {/* Labels */}
              {task.labels.length > 0 && (
                <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap gap-1.5">
                  {task.labels.map((l) => (
                    <Badge key={l} variant="default" size="sm">
                      <Tag size={10} strokeWidth={1.5} className="mr-0.5" />{l}
                    </Badge>
                  ))}
                </div>
              )}

              {/* GitHub PR */}
              {task.githubPrUrl && (
                <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[13px]">
                  <GitPullRequest size={13} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                  <a
                    href={task.githubPrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand)] hover:underline"
                  >
                    PR #{task.githubPrNumber}
                  </a>
                  <Badge
                    variant={task.githubPrState === 'merged' ? 'success' : task.githubPrState === 'closed' ? 'danger' : 'info'}
                    size="sm"
                  >
                    {task.githubPrState}
                  </Badge>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div className="px-5 py-4 border-b border-[var(--border)]">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Description</p>
                  <p className="text-[13px] text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Comments / Activity tabs */}
              <div className="px-5 pt-4">
                <div className="flex items-center gap-4 border-b border-[var(--border)] mb-3">
                  {(['comments', 'activity'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSection(s)}
                      className={[
                        'pb-2 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors',
                        activeSection === s
                          ? 'border-[var(--brand)] text-[var(--brand)]'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
                      ].join(' ')}
                    >
                      {s}
                      {s === 'comments' && comments.length > 0 && (
                        <span className="ml-1 text-[11px] bg-[var(--surface-2)] text-[var(--text-faint)] rounded-full px-1.5">{comments.length}</span>
                      )}
                    </button>
                  ))}
                </div>

                {loadingDetails ? (
                  <div className="space-y-3 pb-4"><SkeletonText lines={4} /></div>
                ) : activeSection === 'comments' ? (
                  <div className="space-y-4 pb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar name={c.author?.name ?? '?'} size="xs" className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[12px] font-medium text-[var(--text)]">{c.author?.name ?? 'Unknown'}</span>
                            <span className="text-[11px] text-[var(--text-faint)]">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-[13px] text-[var(--text)] bg-[var(--surface-2)] rounded-[var(--radius-sm)] px-3 py-2 leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-[13px] text-[var(--text-faint)]">No comments yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-[12px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-2)] mt-1.5 shrink-0" />
                        <div>
                          <span className="font-medium text-[var(--text)]">{a.actorName}</span>
                          <span className="text-[var(--text-muted)]"> {a.details}</span>
                          <span className="text-[var(--text-faint)] ml-1">· {timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {activity.length === 0 && (
                      <p className="text-[13px] text-[var(--text-faint)]">No activity yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment input + actions footer */}
            <div className="px-5 py-4 border-t border-[var(--border)] space-y-3 shrink-0 bg-[var(--surface)]">
              {canComment && (
                <div className="flex gap-2">
                  {user && <Avatar name={user.name} size="xs" className="shrink-0 mt-1" />}
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      rows={2}
                      className="flex-1 text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-faint)] resize-none focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-colors"
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(); }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleComment}
                      loading={submitting}
                      disabled={!commentText.trim()}
                      className="self-end"
                    >
                      <Send size={13} strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              )}
              {canDelete && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                    <Trash2 size={13} strokeWidth={1.5} />
                    Delete task
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[var(--text-faint)]">Task not found</p>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete task"
        description={`This will permanently delete ${task?.key}. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        variant="danger"
      />
    </>
  );
}
