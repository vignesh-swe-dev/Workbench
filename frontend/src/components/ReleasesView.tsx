import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  Rocket,
  Plus,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';
import type { Release } from '../shared/types.ts';
import { hasPermission } from '../shared/permissions.ts';
import { Badge } from '../ui/Badge.tsx';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Input, Textarea } from '../ui/Input.tsx';

export function ReleasesView() {
  const {
    organization,
    currentProject,
    tasks,
    membershipRole,
    addToast,
  } = useApp();

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const canManageReleases = hasPermission(membershipRole, 'releases:create');

  const loadReleases = async () => {
    if (!organization) return;
    try {
      setLoading(true);
      const list = await api.getReleases(organization.id, currentProject?.id);
      setReleases(list);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load releases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, [organization, currentProject]);

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newTitle.trim() || !newTargetDate || !organization || !currentProject) {
      addToast('error', 'Please fill in required fields');
      return;
    }

    try {
      await api.createRelease(organization.id, {
        projectId: currentProject.id,
        version: newVersion.trim(),
        title: newTitle.trim(),
        targetDate: newTargetDate,
        description: newDescription.trim(),
        linkedTaskIds: [],
        status: 'planned',
      });
      addToast('success', `Release ${newVersion} created`);
      setIsCreateOpen(false);
      setNewVersion('');
      setNewTitle('');
      setNewTargetDate('');
      setNewDescription('');
      await loadReleases();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to create release');
    }
  };

  const handleMarkReleased = async (releaseId: string) => {
    try {
      await api.updateRelease(releaseId, { status: 'released' });
      addToast('success', 'Release published to production');
      await loadReleases();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update release');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="max-w-[1100px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
              Release Management & Milestones
            </h1>
            <p className="text-[14px] text-[#4B5563] mt-1">
              Track planned release milestones, scope delivery, and changelogs for {currentProject?.name || 'Workspace'}.
            </p>
          </div>

          {canManageReleases && (
            <Button
              variant="primary"
              size="sm"
              ripple={true}
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={14} strokeWidth={1.5} className="shrink-0" />
              <span>Create Release</span>
            </Button>
          )}
        </div>

        {/* Create Release Inline Card */}
        {isCreateOpen && (
          <Card className="border-[#2563EB]/40 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <span className="text-[13px] font-semibold text-[#111827]">New Release Milestone</span>
              <button onClick={() => setIsCreateOpen(false)} className="text-[12px] text-[#6B7280] hover:text-[#111827]">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateRelease} className="space-y-4 pt-3">
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">Releases & Changelog</h2>
      <div className="space-y-3">{releases.map(r => <div key={r.id} className="p-4 border rounded-lg">{r.title} ({r.version})</div>)}</div>
    </div>
  );
}
