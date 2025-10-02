import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { User, Role } from '../shared/types.ts';
import { Modal } from '../ui/Modal.tsx';
import { Input, Textarea, Select } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';

export function CreateProjectModal() {
  const {
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    organization,
    user,
    refreshProjects,
    projects,
    setCurrentProject,
    addToast,
  } = useApp();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({});
  const [users, setUsers] = useState<Array<User & { role: Role }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateProjectOpen && organization) {
      api
        .getMembers(organization.id)
        .then((members) => {
          const list = members.filter((m) => m.user).map((m) => ({ ...m.user!, role: m.role }));
          setUsers(list);
          if (user) setLeadId(user.id);
        })
        .catch((err) => addToast('error', err?.message || 'Could not load workspace members'));
    }
    if (!isCreateProjectOpen) {
      setErrors({});
    }
  }, [isCreateProjectOpen, user, organization]);

  if (!organization) return null;

  // Build a short key from the name. Works for any language: if the name has no English
  // letters or digits (for example Tamil), fall back to "PRJ". Always unique in the workspace.
  const suggestKey = (val: string) => {
    const words = val.trim().split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean);
    let base = '';
    if (words.length >= 2) base = words.slice(0, 3).map((w) => w[0]).join('');
    else if (words.length === 1) base = words[0].slice(0, 4);
    base = base.toUpperCase();
    if (base.length < 2) base = 'PRJ';

    const taken = new Set(projects.map((p) => p.key));
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) {
      candidate = `${base.slice(0, 8)}${n++}`;
    }
    return candidate;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setErrors((e) => ({ ...e, name: undefined }));
    if (!keyTouched) {
      setKey(val.trim() ? suggestKey(val) : '');
      setErrors((e) => ({ ...e, key: undefined }));
    }
  };

  const resetForm = () => {
    setName('');
    setKey('');
    setKeyTouched(false);
    setDescription('');
    setTargetDate('');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string; key?: string } = {};
    if (name.trim().length < 2) next.name = 'Enter a project name (at least 2 characters)';
    const cleanKey = key.trim().toUpperCase();
    if (cleanKey.length < 2) next.key = 'Key needs 2 to 10 letters or numbers, for example CORE';
    else if (!/^[A-Z0-9]+$/.test(cleanKey)) next.key = 'Use English capital letters and numbers only';
    else if (projects.some((p) => p.key === cleanKey)) next.key = `Key ${cleanKey} is already used. Choose another.`;
    setErrors(next);
    if (next.name || next.key) return;

    try {
      setSubmitting(true);
      const newProj = await api.createProject(organization.id, {
        name: name.trim(),
        key: cleanKey,
        description: description.trim(),
        leadId: leadId || user?.id || '',
        targetDate: targetDate || undefined,
      });

      addToast('success', `Project ${newProj.name} [${newProj.key}] created`);
      await refreshProjects();
      setCurrentProject(newProj);
      setIsCreateProjectOpen(false);
      resetForm();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isCreateProjectOpen}
      onClose={() => setIsCreateProjectOpen(false)}
      title="Create project"
      description={`Add a new project to ${organization.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        <Input
          label="Project Name *"
          error={errors.name}
          autoFocus
          placeholder="e.g. Core Infrastructure"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Project Key *"
            error={errors.key}
            maxLength={10}
            placeholder="e.g. INFRA"
            value={key}
            onChange={(e) => {
              setKeyTouched(true);
              setErrors((er) => ({ ...er, key: undefined }));
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
            }}
            hint="Used as prefix for tasks (e.g. INFRA-101)"
          />

          <Select
            label="Project Lead"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Target Delivery Date (Optional)"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />

        <Textarea
          label="Description (Optional)"
          rows={3}
          placeholder="Summary of goals, roadmap, and scope..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreateProjectOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
