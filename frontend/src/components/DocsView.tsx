import React, { useState } from 'react';
import {
  Layers,
  Database,
  Shield,
  Code2,
  Server,
  Radio,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { Tabs, TabPanel, TabItem } from '../ui/Tabs.tsx';
import { Card, CardContent } from '../ui/Card.tsx';

type DocSection = 'architecture' | 'database' | 'security' | 'api' | 'deployment';

const DOC_TABS: TabItem[] = [
  { id: 'architecture', label: 'Architecture & Monolith' },
  { id: 'database',     label: 'Database & Indexes' },
  { id: 'security',     label: 'RBAC & Security' },
  { id: 'api',          label: 'REST API v1' },
  { id: 'deployment',   label: 'Deployment' },
];

export function DocsView() {
  const [section, setSection] = useState<DocSection>('architecture');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="max-w-[1100px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
            System Documentation & Architecture
          </h1>
          <p className="text-[14px] text-[#4B5563] mt-1">
            Technical architecture, data models, authorization boundaries, and deployment topology.
          </p>
        </div>

        {/* Underline Style Tabs with animated slider */}
        <Tabs
          items={DOC_TABS}
          activeId={section}
          onChange={(id) => setSection(id as DocSection)}
          layoutId="doc-tab-underline"
        />

        {/* Content Panels with 8px upward slide cross-fade */}
        <TabPanel tabId="architecture" activeId={section} className="space-y-6">
          {/* Architecture Overview Card */}
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Modular Monolith Architecture
                </h2>
                <p className="text-[14px] text-[#4B5563] mt-1 leading-relaxed">
                  ForgeFlow is engineered as a high-performance modular monolith. Domain logic is cleanly partitioned into dedicated modules (Auth, Organizations, Projects, Tasks, Comments, Releases, Notifications, Integrations) with strict service boundaries.
                </p>
              </div>

              {/* Clean folder tree code block */}
              <div>
                <div className="text-[12px] font-medium text-[#6B7280] mb-1.5">Project Directory Structure</div>
                <div className="p-4 bg-[#F6F8FA] border border-[#E1E4E8] rounded-[6px] font-mono text-[12px] text-[#1F2937] leading-relaxed overflow-x-auto">
                  <div className="text-[#2563EB] font-semibold">forgeflow/</div>
                  <div className="text-[#4B5563]">├── frontend/            <span className="text-[#9CA3AF]"># React 19, Vite, Tailwind CSS & Motion</span></div>
                  <div className="text-[#4B5563]">├── backend/             <span className="text-[#9CA3AF]"># Express REST API (/api/v1) & Socket.IO realtime</span></div>
                  <div className="text-[#4B5563] pl-4">├── src/api/routes.ts <span className="text-[#9CA3AF]"># REST endpoints with role gate middleware</span></div>
                  <div className="text-[#4B5563] pl-4">├── src/db/storage.ts <span className="text-[#9CA3AF]"># Persistent storage layer</span></div>
                  <div className="text-[#4B5563] pl-4">├── src/realtime/     <span className="text-[#9CA3AF]"># Scoped room authorization & presence map</span></div>
                  <div className="text-[#4B5563]">├── src/shared/          <span className="text-[#9CA3AF]"># Shared domain types, Zod schemas & RBAC logic</span></div>
                  <div className="text-[#4B5563]">└── docker-compose.yml   <span className="text-[#9CA3AF]"># Multi-container orchestration</span></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Grid with 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-[#2563EB]" strokeWidth={1.5} />
                <h3 className="text-[14px] font-semibold text-[#111827]">Real-Time Collaboration</h3>
              </div>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Socket.IO manages authenticated connections with scoped channel rooms: <code className="px-1.5 py-0.5 bg-[#F6F8FA] border border-[#E1E4E8] rounded font-mono text-[11px] text-[#1F2937]">org:&#123;orgId&#125;</code> and <code className="px-1.5 py-0.5 bg-[#F6F8FA] border border-[#E1E4E8] rounded font-mono text-[11px] text-[#1F2937]">project:&#123;projectId&#125;</code>. Real-time updates propagate across browser tabs without manual reloads.
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-[#2563EB]" strokeWidth={1.5} />
                <h3 className="text-[14px] font-semibold text-[#111827]">Background Workers & Queues</h3>
              </div>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Asynchronous workloads like invitation dispatching, notification delivery, and GitHub webhook ingestion are handled with idempotency keys and exponential backoff to guarantee reliable delivery.
              </p>
            </Card>
          </div>
        </TabPanel>

        <TabPanel tabId="database" activeId={section}>
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Multi-Tenant Schema & Compound Indexes
                </h2>
                <p className="text-[13px] text-[#4B5563] mt-1 leading-relaxed">
                  Every tenant entity is partitioned by <code className="font-mono text-[12px] px-1 py-0.5 bg-[#F6F8FA] border border-[#E1E4E8] rounded text-[#1F2937]">organizationId</code>. Compound indexes ensure zero cross-tenant query leaks and sub-5ms query resolution.
                </p>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[6px]">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] uppercase font-semibold text-[#6B7280]">
                      <th className="py-2.5 px-3.5">Collection</th>
                      <th className="py-2.5 px-3.5">Primary / Compound Indexes</th>
                      <th className="py-2.5 px-3.5">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                    <tr className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#2563EB] font-medium">organizations</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563]">&#123; slug: 1 &#125; [unique], &#123; ownerId: 1 &#125;</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">Workspace routing & tenant identification</td>
                    </tr>
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">Workbench API Documentation</h2>
      <p className="text-sm text-muted-foreground">Interactive REST and WebSocket API specification.</p>
    </div>
  );
}
