import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input, Select } from '../ui/Input.tsx';

export function GitHubSimulatorView() {
  const { tasks, refreshTasks, addToast, organization } = useApp();
  const [selectedTaskKey, setSelectedTaskKey] = useState(tasks[0]?.key || 'CORE-2');
  const [eventType, setEventType] = useState<'pr_opened' | 'pr_merged'>('pr_opened');
  const [prNumber, setPrNumber] = useState(214);
  const [prTitle, setPrTitle] = useState('feat(core): implement optimistic locking and Redis invalidation');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.simulateGitHub(eventType, selectedTaskKey, prNumber, prTitle);
      setLastResponse({
        timestamp: new Date().toLocaleTimeString(),
        status: res.success ? '200 OK' : 'Failed',
        message: res.message,
        payloadSent: {
          action: eventType === 'pr_opened' ? 'opened' : 'closed',
          pull_request: {
            number: prNumber,
            title: prTitle,
            state: eventType === 'pr_opened' ? 'open' : 'closed',
            merged: eventType === 'pr_merged',
            head: { ref: `feature/${selectedTaskKey.toLowerCase()}-lock` },
          },
          repository: { full_name: 'acme/forgeflow' },
        },
      });

      if (res.success) {
        addToast('success', res.message);
        await refreshTasks();
      } else {
        addToast('error', res.message);
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="max-w-[1100px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-[#E5E7EB]">
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
            GitHub Webhook Integration & Interactive Simulator
          </h1>
          <p className="text-[14px] text-[#4B5563] mt-1 leading-relaxed">
            ForgeFlow synchronizes with GitHub webhooks using raw body HMAC SHA-256 signatures, automatically moving tasks to In Review on Pull Request opening and Done on PR merge.
          </p>
        </div>

        {/* Webhook Endpoint Info Box */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} strokeWidth={1.5} className="text-[#059669]" />
              <h2 className="text-[14px] font-semibold text-[#111827]">Production Webhook Endpoint</h2>
            </div>
            <span className="text-[11px] font-mono bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 rounded-[4px] border border-[#A7F3D0]">
              HMAC SHA-256 Verified
            </span>
          </div>

          <div className="bg-[#F6F8FA] p-3 rounded-[6px] border border-[#E1E4E8] flex items-center justify-between text-[12px] font-mono text-[#1F2937]">
            <span className="text-[#2563EB] font-bold">POST</span>
            <span className="text-[#4B5563] truncate mx-2">/api/v1/integrations/github/webhook</span>
            <span className="text-[11px] text-[#6B7280]">Secret: forgeflow_secret</span>
          </div>
        </Card>

        {/* Interactive Simulator Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h2 className="text-[14px] font-semibold text-[#111827]">
              Interactive Webhook Trigger
            </h2>
            <span className="text-[12px] text-[#6B7280]">Simulate real GitHub event deliveries</span>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Target Task Key"
                value={selectedTaskKey}
                onChange={(e) => setSelectedTaskKey(e.target.value)}
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.key}>
                    [{t.key}] {t.title.slice(0, 36)}... ({t.status})
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">GitHub Integration Simulator</h2>
      <div className="border rounded-lg p-4 text-sm">Branches and pull requests mock environment.</div>
    </div>
  );
}
