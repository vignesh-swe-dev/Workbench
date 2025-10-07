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
  const canCreate = hasPermission(membershipRole, 'tasks:create');

  const checkScroll = useCallback(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const timer = setTimeout(checkScroll, 100);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, tasks, currentProject]);

  // Translate vertical wheel scroll over board background to horizontal board scroll
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const target = e.target as HTMLElement;
      const scrollableParent = target.closest('.overflow-y-auto') as HTMLElement | null;
      if (scrollableParent && scrollableParent.scrollHeight > scrollableParent.clientHeight) {
        const isAtTop = scrollableParent.scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom = scrollableParent.scrollTop + scrollableParent.clientHeight >= scrollableParent.scrollHeight && e.deltaY > 0;
        if (!isAtTop && !isAtBottom) {
          return;
        }
      }

      if (e.deltaY !== 0) {
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollByDirection = (direction: 'left' | 'right') => {
    const el = boardContainerRef.current;
    if (!el) return;
    const scrollDistance = 320;
    el.scrollBy({
      left: direction === 'left' ? -scrollDistance : scrollDistance,
      behavior: 'smooth',
    });
  };

  const filtered = useMemo(() => tasks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.key.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q) &&
          !(t.description ?? '').toLowerCase().includes(q) &&
          !t.labels.some((l) => l.toLowerCase().includes(q))) return false;
    }
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
    return true;
  }), [tasks, searchQuery, priorityFilter, assigneeFilter]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, typeof filtered> = {
      backlog: [], todo: [], in_progress: [], in_review: [], done: [], cancelled: [],
    };
    for (const t of filtered) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [filtered]);

  const handleDrop = useCallback(async (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !canEdit) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    try {
      await api.updateTask(taskId, { status });
      await refreshTasks();
    } catch {
      addToast('error', 'Failed to move task');
    }
    setDraggedId(null);
  }, [tasks, canEdit, refreshTasks, addToast]);

  if (!currentProject) {
    return (
      <EmptyState
        icon={<div className="w-12 h-12 rounded-[6px] bg-[#F1F5F9] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]"><Plus size={20} strokeWidth={1.5} /></div>}
        title="No project selected"
        description="Select a project from the sidebar to view its board."
        className="flex-1"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map((c) => (
          <div key={c.status} className="w-64 shrink-0 space-y-2 p-2 rounded-[8px] border border-[#E5E7EB] bg-[#F4F5F7]">
            <div className="h-8 skeleton rounded-[6px]" />
            {[1,2].map(i => <SkeletonCard key={i} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E7EB] bg-white shrink-0">
        <h1 className="text-[16px] font-semibold text-[#111827] tracking-tight">
          {currentProject.name}
        </h1>

        {/* Board navigation & scroll controls */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
          {/* Scroll Prev / Next buttons */}
          <div className="flex items-center bg-[#F3F4F6] rounded-[6px] border border-[#E5E7EB] p-0.5">
            <button
              onClick={() => scrollByDirection('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll board left"
              title="Scroll left"
              className="p-1 rounded-[4px] text-[#4B5563] hover:text-[#111827] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div className="w-px h-3.5 bg-[#E5E7EB]" />
            <button
              onClick={() => scrollByDirection('right')}
              disabled={!canScrollRight}
              aria-label="Scroll board right"
              title="Scroll right"
              className="p-1 rounded-[4px] text-[#4B5563] hover:text-[#111827] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1" />
        {canCreate && (
          <Button variant="primary" size="sm" ripple={true} onClick={() => setIsCreateTaskOpen(true)}>
            <Plus size={14} strokeWidth={1.5} className="shrink-0" />
            <span>New task</span>
          </Button>
        )}
      </div>

      {/* Board wrapper with floating scroll buttons */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Floating Scroll Left Button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollByDirection('left')}
              aria-label="Scroll left"
              title="Scroll left"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-[#E5E7EB] shadow-md hover:shadow-lg hover:bg-white text-[#374151] hover:text-[#111827] flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating Scroll Right Button */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollByDirection('right')}
              aria-label="Scroll right to view Done"
              title="Scroll right to view Done & Cancelled"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-[#E5E7EB] shadow-md hover:shadow-lg hover:bg-white text-[#374151] hover:text-[#111827] flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Board scroll container */}
        <div
          ref={boardContainerRef}
          className="h-full overflow-x-auto overflow-y-hidden kanban-scroll-container scroll-smooth"
        >
          <div className="flex gap-4 p-6 h-full" style={{ minWidth: `${COLUMNS.length * 272 + 48}px` }}>
            {COLUMNS.map(({ status, label }) => (
              <Column
                key={status}
                id={`kanban-column-${status}`}
                status={status}
                label={label}
                tasks={tasksByStatus[status]}
                draggedId={draggedId}
                canEdit={canEdit}
                canCreate={canCreate}
                onDragStart={(id, e) => {
                  setDraggedId(id);
                  e.dataTransfer.setData('text/plain', id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDraggedId(null)}
                onDrop={handleDrop}
                onTaskClick={(id) => setSelectedTaskId(id)}
                onAddClick={() => setIsCreateTaskOpen(true)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
