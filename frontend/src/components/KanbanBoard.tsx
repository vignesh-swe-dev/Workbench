import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Plus, GripVertical, GitPullRequest, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, TaskStatus } from '../shared/types.ts';
import { hasPermission } from '../shared/permissions.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Badge } from '../ui/Badge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { SkeletonCard } from '../ui/Skeleton.tsx';
import { Button } from '../ui/Button.tsx';
import { motion, AnimatePresence } from 'motion/react';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'backlog',     label: 'Backlog' },
  { status: 'todo',        label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review',   label: 'In Review' },
  { status: 'done',        label: 'Done' },
  { status: 'cancelled',   label: 'Cancelled' },
];

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-[#DC2626]',
  high:   'bg-[#EA580C]',
  medium: 'bg-[#D97706]',
  low:    'bg-[#9CA3AF]',
};

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface KanbanCardProps {
  task: Task & { assignee?: any; reporter?: any };
  isDragging: boolean;
  canEdit: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({ task, isDragging, canEdit, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'done' && task.status !== 'cancelled';

  return (
    <motion.div
      layout
      draggable={canEdit}
      onDragStartCapture={onDragStart}
      onDragEndCapture={onDragEnd}
      onClick={onClick}
      style={{
        opacity: isDragging ? 0.35 : 1,
        rotate: isDragging ? '1.5deg' : '0deg',
        boxShadow: isDragging ? '0 8px 20px rgba(0, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
        cursor: canEdit ? 'grab' : 'pointer',
      }}
      className={[
        'bg-white border border-[#E5E7EB] rounded-[6px]',
        'p-3 group select-none transition-all duration-150',
        'hover:border-[#D1D5DB] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]',
      ].join(' ')}
      role="button"
      tabIndex={0}
      aria-label={`Task ${task.key}: ${task.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        {canEdit && (
          <GripVertical
            size={13}
            strokeWidth={1.5}
            className="text-[#9CA3AF] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#111827] leading-snug line-clamp-2">{task.title}</p>
        </div>
        {/* Priority dot */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 mt-1 ${PRIORITY_DOT[task.priority] ?? 'bg-[#9CA3AF]'}`}
          title={task.priority}
        />
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="task-key text-[11px] text-[#6B7280] font-mono">{task.key}</span>

        {task.labels.slice(0, 2).map((l) => (
          <Badge key={l} variant="default" size="sm">{l}</Badge>
        ))}

        <div className="flex items-center gap-1.5 ml-auto">
          {task.githubPrNumber && (
            <span title={`PR #${task.githubPrNumber}`}>
              <GitPullRequest
                size={12}
                strokeWidth={1.5}
                className={task.githubPrState === 'merged' ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}
              />
            </span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-0.5 text-[11px] ${overdue ? 'text-[#DC2626] font-medium' : 'text-[#6B7280]'}`}
              title={`Due ${formatDate(task.dueDate)}`}
            >
              {overdue && <AlertCircle size={10} strokeWidth={2} />}
              <Clock size={10} strokeWidth={1.5} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignee && (
            <Avatar name={task.assignee.name} size="xs" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ColumnProps {
  id?: string;
  status: TaskStatus;
  label: string;
  tasks: (Task & { assignee?: any; reporter?: any })[];
  draggedId: string | null;
  canEdit: boolean;
  canCreate: boolean;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (status: TaskStatus, e: React.DragEvent) => void;
  onTaskClick: (id: string) => void;
  onAddClick: () => void;
}

function Column({
  id, status, label, tasks, draggedId, canEdit, canCreate,
  onDragStart, onDragEnd, onDrop, onTaskClick, onAddClick,
}: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      id={id}
      className={[
        'flex flex-col rounded-[8px] border border-[#E5E7EB] shrink-0',
        'w-64 snap-start transition-colors duration-150 bg-[#F4F5F7]',
        isDragOver ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/30' : '',
      ].join(' ')}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(status, e); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E5E7EB] bg-white rounded-t-[8px]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#111827]">{label}</span>
          <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] rounded-full px-1.5 py-0.2">
            {tasks.length}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={onAddClick}
            aria-label={`Add task to ${label}`}
            className="p-1 rounded text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        <AnimatePresence>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isDragging={draggedId === task.id}
              canEdit={canEdit}
              onDragStart={(e) => onDragStart(task.id, e)}
              onDragEnd={onDragEnd}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 border border-dashed border-[#E5E7EB] rounded-[6px]">
            <p className="text-[12px] text-[#9CA3AF]">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const {
    tasks, currentProject, membershipRole, loading,
    setSelectedTaskId, setIsCreateTaskOpen,
    searchQuery, priorityFilter, assigneeFilter,
    refreshTasks, addToast,
  } = useApp();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const canEdit   = hasPermission(membershipRole, 'tasks:update');
  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-4 min-h-[calc(100vh-12rem)]">
        {columns.map(c => <div key={c.id} className="w-80 bg-muted/40 rounded-xl p-3 border border-border/50">{c.title}</div>)}
      </div>
    </div>
  );
}
