import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ChevronUp, ChevronDown, Plus, ArrowUpDown,
  AlertCircle, Filter,
} from 'lucide-react';
import { Badge, getStatusVariant, getPriorityVariant, getStatusLabel } from '../ui/Badge.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { SkeletonRow } from '../ui/Skeleton.tsx';
import { hasPermission } from '../shared/permissions.ts';
import type { Task } from '../shared/types.ts';
import { motion } from 'motion/react';

type SortKey = 'key' | 'title' | 'status' | 'priority' | 'dueDate' | 'assignee';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER   = { in_progress: 0, in_review: 1, todo: 2, backlog: 3, done: 4, cancelled: 5 };

function isOverdue(d?: string) {
  return !!d && new Date(d) < new Date();
}

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SortHeader({
  label, sortKey, current, dir, onSort,
}: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <th
      className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-[#111827] transition-colors"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {active
          ? dir === 'asc'
            ? <ChevronUp size={12} strokeWidth={2} className="text-[#2563EB]" />
            : <ChevronDown size={12} strokeWidth={2} className="text-[#2563EB]" />
          : <ArrowUpDown size={11} strokeWidth={1.5} className="opacity-30" />
        }
      </span>
    </th>
  );
}

export function TaskListView() {
  const {
    tasks, currentProject, membershipRole, loading,
    searchQuery, statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    assigneeFilter, setAssigneeFilter,
    setSelectedTaskId, setIsCreateTaskOpen,
  } = useApp();

  const [sortKey, setSortKey] = useState<SortKey>('key');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const canCreate = hasPermission(membershipRole, 'tasks:create');

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.key.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.labels.some((l) => l.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all')   list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((t) => t.priority === priorityFilter);
    if (assigneeFilter !== 'all') list = list.filter((t) => t.assigneeId === assigneeFilter);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'key':      cmp = a.key.localeCompare(b.key); break;
        case 'title':    cmp = a.title.localeCompare(b.title); break;
        case 'status':   cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'dueDate':  cmp = (a.dueDate ?? '').localeCompare(b.dueDate ?? ''); break;
        case 'assignee': cmp = ((a as any).assignee?.name ?? '').localeCompare((b as any).assignee?.name ?? ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, sortKey, sortDir]);

  if (!currentProject) {
    return (
      <EmptyState
        icon={<div className="w-12 h-12 rounded-[6px] bg-[#F1F5F9] border border-[#E5E7EB] flex items-center justify-center"><Filter size={20} strokeWidth={1.5} className="text-[#9CA3AF]" /></div>}
        title="No project selected"
        description="Select a project from the sidebar to view its tasks."
        className="flex-1"
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E7EB] bg-white shrink-0 flex-wrap">
        <h1 className="text-[16px] font-semibold text-[#111827] tracking-tight mr-1">
          {currentProject.name}
        </h1>
        <span className="text-[13px] text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px]">
          {filtered.length} tasks
        </span>
        <div className="flex-1" />

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 text-[12px] font-medium bg-white border border-[#E5E7EB] rounded-[6px] text-[#374151] hover:border-[#D1D5DB] focus:outline-none focus:border-[#2563EB]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-8 px-2.5 text-[12px] font-medium bg-white border border-[#E5E7EB] rounded-[6px] text-[#374151] hover:border-[#D1D5DB] focus:outline-none focus:border-[#2563EB]"
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {canCreate && (
          <Button variant="primary" size="sm" ripple={true} onClick={() => setIsCreateTaskOpen(true)}>
            <Plus size={14} strokeWidth={1.5} className="shrink-0" />
            <span>New task</span>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="divide-y divide-[#E5E7EB]">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center"><Plus size={18} strokeWidth={1.5} className="text-[#9CA3AF]" /></div>}
            title="No tasks found"
            description={searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? 'Try adjusting your filters.' : 'Create the first task for this project.'}
            action={canCreate ? { label: 'New task', onClick: () => setIsCreateTaskOpen(true) } : undefined}
            className="py-24"
          />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <SortHeader label="Key"      sortKey="key"      current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Title"    sortKey="title"    current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Status"   sortKey="status"   current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Priority" sortKey="priority" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Assignee" sortKey="assignee" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Due"      sortKey="dueDate"  current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white">
              {filtered.map((task, idx) => {
                const t = task as Task & { assignee?: any };
                const overdue = isOverdue(t.dueDate) && t.status !== 'done' && t.status !== 'cancelled';
                const isHovered = hoveredId === t.id;

                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.25) }}
                    className={`cursor-pointer transition-colors duration-100 ${isHovered ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedTaskId(t.id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedTaskId(t.id); }}
                    role="row"
                    aria-label={`${t.key}: ${t.title}`}
                  >
                    {/* Key */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="task-key font-mono text-[11px] text-[#6B7280]">{t.key}</span>
                    </td>
                    {/* Title */}
                    <td className="px-4 py-2.5 max-w-sm">
                      <span className="text-[#111827] font-medium truncate block">{t.title}</span>
                      {t.labels.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {t.labels.slice(0, 3).map((l) => (
                            <Badge key={l} variant="default" size="sm">{l}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={getStatusVariant(t.status)} size="sm">{getStatusLabel(t.status)}</Badge>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={getPriorityVariant(t.priority)} size="sm" dot>
                        <span className="capitalize">{t.priority}</span>
                      </Badge>
                    </td>
                    {/* Assignee */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {t.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assignee.name} size="xs" />
                          <span className="text-[#4B5563] text-[12px]">{t.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    {/* Due */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {t.dueDate ? (
                        <span className={`flex items-center gap-1 text-[12px] ${overdue ? 'text-[#DC2626] font-medium' : 'text-[#6B7280]'}`}>
                          {overdue && <AlertCircle size={11} strokeWidth={2} />}
                          {formatDate(t.dueDate)}
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    {/* Hover action */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className={`text-[12px] text-[#2563EB] font-medium transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        View →
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
