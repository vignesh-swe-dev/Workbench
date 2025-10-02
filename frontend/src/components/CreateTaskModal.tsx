import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { TaskStatus, TaskPriority, User } from '../shared/types.ts';
import { Modal } from '../ui/Modal.tsx';
import { Input, Textarea, Select } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';

export function CreateTaskModal() {
  const {
    isCreateTaskOpen,
    setIsCreateTaskOpen,
    currentProject,
    refreshTasks,
    addToast,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateTaskOpen) {
      api.getUsers().then(setUsers).catch(console.error);
    }
  }, [isCreateTaskOpen]);

  if (!currentProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('error', 'Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      await api.createTask(currentProject.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || undefined,
        labels,
        estimatedEffort: estimatedEffort !== '' ? Number(estimatedEffort) : undefined,
        dueDate: dueDate || undefined,
        dependencies: [],
      });

      addToast('success', 'Task created successfully');
      await refreshTasks();
      setIsCreateTaskOpen(false);
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setAssigneeId('');
      setLabelsInput('');
      setEstimatedEffort('');
      setDueDate('');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isCreateTaskOpen}
      onClose={() => setIsCreateTaskOpen(false)}
      title="Create New Task"
      description={`Add task to project ${currentProject.name} (${currentProject.key}).`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          label="Title *"
          required
          autoFocus
          placeholder="e.g. Implement mTLS connection between auth and billing service"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>

          <Input
            label="Story Points"
            type="number"
            min={0}
            max={50}
            placeholder="e.g. 5"
            value={estimatedEffort}
            onChange={(e) => setEstimatedEffort(e.target.value ? Number(e.target.value) : '')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Input
            label="Labels (comma-separated)"
            placeholder="backend, api, security"
            value={labelsInput}
            onChange={(e) => setLabelsInput(e.target.value)}
          />
        </div>

        <Textarea
          label="Description"
          rows={3}
          placeholder="Context, specifications, and acceptance criteria..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateTaskOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
