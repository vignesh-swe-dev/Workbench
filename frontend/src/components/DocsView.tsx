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
                    <tr className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#2563EB] font-medium">memberships</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563]">&#123; organizationId: 1, userId: 1 &#125; [unique]</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">Fast RBAC checks & tenant membership</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#2563EB] font-medium">projects</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563]">&#123; organizationId: 1, key: 1 &#125; [unique]</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">Ensures project keys are distinct per workspace</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#2563EB] font-medium">tasks</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563]">&#123; organizationId: 1, projectId: 1, status: 1, position: 1 &#125;</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">Optimizes Kanban column queries & drag reorders</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#2563EB] font-medium">notifications</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563]">&#123; organizationId: 1, userId: 1, read: 1, createdAt: -1 &#125;</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">Instant unread count & user inbox queries</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabPanel>

        <TabPanel tabId="security" activeId={section}>
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Multi-Tenant Security & Concurrency Control
                </h2>
                <p className="text-[13px] text-[#4B5563] mt-1 leading-relaxed">
                  Strict boundaries enforce enterprise authorization standards at both HTTP transport and storage layers.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">Server-Side Authorization Boundary</div>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-relaxed">
                      The frontend never dictates user privileges. All mutations pass through <code className="font-mono text-[12px] px-1 py-0.5 bg-white border border-[#E1E4E8] rounded text-[#1F2937]">requireRolePermission</code> gate middleware with zero bypass paths.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">Optimistic Concurrency Control (OCC)</div>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-relaxed">
                      Tasks maintain an integer <code className="font-mono text-[12px] px-1 py-0.5 bg-white border border-[#E1E4E8] rounded text-[#1F2937]">version</code> counter. When concurrent edits collide, the server responds with HTTP 409 Conflict, alerting the client and preventing silent data overwrites.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">Directed Acyclic Graph (DAG) Cycle Prevention</div>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-relaxed">
                      Task dependencies execute depth-first search (DFS) cycle checks prior to insertion to prevent circular prerequisites.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">GitHub Webhook HMAC SHA-256 Verification</div>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-relaxed">
                      Webhooks compare cryptographic signature digests against the raw request body before processing events.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabPanel>

        <TabPanel tabId="api" activeId={section}>
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  RESTful API Endpoints (/api/v1)
                </h2>
                <p className="text-[13px] text-[#4B5563] mt-1 leading-relaxed">
                  Predictable, resource-oriented endpoints with JSON response payloads and standard HTTP status codes.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/v1/auth/me', desc: 'Current user, role & workspaces', color: 'text-[#2563EB] bg-[#EFF6FF]' },
                  { method: 'GET', path: '/api/v1/organizations/:orgId/projects', desc: 'List projects for active workspace', color: 'text-[#2563EB] bg-[#EFF6FF]' },
                  { method: 'POST', path: '/api/v1/projects/:projectId/tasks', desc: 'Create task with dependency validation', color: 'text-[#059669] bg-[#ECFDF5]' },
                  { method: 'PATCH', path: '/api/v1/tasks/:taskId', desc: 'Update status with optimistic concurrency (OCC)', color: 'text-[#D97706] bg-[#FFFBEB]' },
                  { method: 'POST', path: '/api/v1/integrations/github/webhook', desc: 'HMAC SHA-256 verified event ingest', color: 'text-[#059669] bg-[#ECFDF5]' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-[6px] border border-[#E5E7EB] flex items-center justify-between text-[13px] font-mono hover:border-[#D1D5DB] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${item.color}`}>
                        {item.method}
                      </span>
                      <span className="text-[#111827]">{item.path}</span>
                    </div>
                    <span className="text-[12px] text-[#6B7280] font-sans hidden sm:inline">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabPanel>

        <TabPanel tabId="deployment" activeId={section}>
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Production Deployment & Containerization
                </h2>
                <p className="text-[13px] text-[#4B5563] mt-1 leading-relaxed">
                  ForgeFlow is production-ready and can be deployed with Docker Compose containing persistent store, cache, and WebSocket containers.
                </p>
              </div>

              <pre className="p-4 bg-[#F6F8FA] border border-[#E1E4E8] rounded-[6px] text-[12px] font-mono text-[#1F2937] overflow-x-auto leading-relaxed">
{`# Run locally with Docker Compose:
docker-compose up -d

# Execute automated test suite:
npm run test

# Build production frontend:
npm run build

# Start production server:
npm start`}
              </pre>
            </div>
          </Card>
        </TabPanel>
      </div>
    </div>
  );
}
