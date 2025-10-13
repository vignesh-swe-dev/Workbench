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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Version (e.g. v2.5.0) *"
                  required
                  placeholder="v2.5.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
                <Input
                  label="Title *"
                  required
                  placeholder="e.g. Real-Time Telemetry & Scaling"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Input
                  label="Target Date *"
                  type="date"
                  required
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                />
              </div>

              <Textarea
                label="Description"
                rows={2}
                placeholder="Summary of architectural goals in this release candidate..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Save Milestone
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Releases List */}
        <div className="space-y-4">
          {releases.map((rel) => {
            const isReleased = rel.status === 'released';
            const linkedTasks = tasks.filter((t) => t.releaseId === rel.id || rel.linkedTaskIds.includes(t.id));
            const completedCount = linkedTasks.filter((t) => t.status === 'done').length;
            const progress = linkedTasks.length > 0 ? Math.round((completedCount / linkedTasks.length) * 100) : 0;

            return (
              <Card key={rel.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[12px] font-semibold text-[#111827] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px]">
                        {rel.version}
                      </span>
                      <h2 className="text-[15px] font-semibold text-[#111827]">{rel.title}</h2>
                      <Badge variant={isReleased ? 'success' : rel.status === 'in_progress' ? 'warning' : 'default'}>
                        <span className="capitalize">{rel.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    {rel.description && (
                      <p className="text-[13px] text-[#4B5563] leading-relaxed pt-1">{rel.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReleased && canManageReleases && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkReleased(rel.id)}
                      >
                        <CheckCircle2 size={14} strokeWidth={1.5} className="text-[#059669]" />
                        <span>Publish Release</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 bg-[#F9FAFB] p-3.5 rounded-[6px] border border-[#E5E7EB]">
                  <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} strokeWidth={1.5} className="text-[#9CA3AF]" />
                      <span>
                        Target Date: <strong className="text-[#111827]">{new Date(rel.targetDate).toLocaleDateString()}</strong>
                      </span>
                      {rel.releasedAt && (
                        <span className="text-[#059669] ml-2">
                          (Shipped on {new Date(rel.releasedAt).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                    <span>
                      {completedCount} of {linkedTasks.length} tasks completed ({progress}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isReleased ? 'bg-[#059669]' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Release Notes */}
                {rel.releaseNotes && (
                  <div className="p-3 bg-[#F6F8FA] rounded-[6px] border border-[#E1E4E8]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                      <FileText size={13} strokeWidth={1.5} className="text-[#2563EB]" />
                      <span>Release Notes</span>
                    </div>
                    <pre className="text-[12px] text-[#374151] font-sans whitespace-pre-wrap leading-relaxed">
                      {rel.releaseNotes}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })}

          {releases.length === 0 && (
            <div className="p-12 text-center text-[#9CA3AF] text-[13px] border border-dashed border-[#E5E7EB] rounded-[8px] bg-white">
              No releases planned yet for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
