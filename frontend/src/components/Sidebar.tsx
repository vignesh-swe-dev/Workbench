import React, { useState } from 'react';
import { useApp, ActiveTab } from '../context/AppContext.tsx';
import {
  Kanban, List, Rocket, BarChart2, Users, GitBranch, BookOpen,
  Plus, FolderOpen, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { hasPermission } from '../shared/permissions.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Tooltip } from '../ui/Tooltip.tsx';
import { Logo } from '../ui/Logo.tsx';
import { motion, AnimatePresence } from 'motion/react';

interface NavItem { tab: ActiveTab; label: string; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  { tab: 'board',     label: 'Board',        icon: <Kanban     size={16} strokeWidth={1.5} /> },
  { tab: 'list',      label: 'List',         icon: <List       size={16} strokeWidth={1.5} /> },
  { tab: 'releases',  label: 'Releases',     icon: <Rocket     size={16} strokeWidth={1.5} /> },
  { tab: 'analytics', label: 'Analytics',    icon: <BarChart2  size={16} strokeWidth={1.5} /> },
  { tab: 'members',   label: 'Team',         icon: <Users      size={16} strokeWidth={1.5} /> },
  { tab: 'github',    label: 'Integrations', icon: <GitBranch  size={16} strokeWidth={1.5} /> },
  { tab: 'docs',      label: 'Docs',         icon: <BookOpen   size={16} strokeWidth={1.5} /> },
];

export function Sidebar() {
  const {
    activeTab, setActiveTab,
    projects, currentProject, setCurrentProject,
    membershipRole, isMobileMenuOpen, setIsMobileMenuOpen,
    setIsCreateProjectOpen, organization, user, logout,
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const canCreate = hasPermission(membershipRole, 'projects:create');

  const handleTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const sidebarContent = (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className="h-full flex flex-col bg-[#F4F5F7] border-r border-[#E5E7EB] transition-[width] duration-200 overflow-hidden shrink-0 select-none"
    >
      {/* Workspace header */}
      <div className="flex items-center gap-2.5 px-3.5 h-[56px] border-b border-[#E5E7EB] bg-white shrink-0">
        <div className="w-7 h-7 rounded-[6px] bg-[#1E293B] flex items-center justify-center shrink-0 shadow-xs">
          <Logo variant="dark" size={18} showWordmark={false} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#111827] truncate leading-tight">
              {organization?.name ?? 'Workbench'}
            </p>
            <p className="text-[11px] text-[#6B7280] truncate capitalize mt-0.5">{membershipRole}</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="p-1 rounded-[4px] text-[#9CA3AF] hover:text-[#111827] hover:bg-[#E5E7EB] transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Projects */}
      <div className="px-2.5 pt-4 pb-2 shrink-0">
        {!collapsed && (
          <div className="flex items-center justify-between px-1.5 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Projects
            </span>
            {canCreate && (
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                aria-label="New project"
                className="p-0.5 rounded text-[#9CA3AF] hover:text-[#2563EB] hover:bg-white transition-colors"
              >
                <Plus size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
        <div className="space-y-0.5">
          {projects.map((proj) => {
            const isActive = currentProject?.id === proj.id;
            const btn = (
              <button
                key={proj.id}
                onClick={() => { setCurrentProject(proj); setIsMobileMenuOpen(false); }}
                className={[
                  'relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors duration-150',
                  isActive
                    ? 'bg-[#E5E7EB] text-[#111827] font-medium'
                    : 'text-[#4B5563] hover:bg-[#EAECEF] hover:text-[#111827]',
                  collapsed ? 'justify-center' : '',
                ].join(' ')}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-project-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-[#2563EB] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <FolderOpen size={14} strokeWidth={1.5} className="shrink-0 text-[#6B7280]" />
                {!collapsed && <span className="truncate flex-1 text-left">{proj.name}</span>}
                {!collapsed && (
                  <span className="font-mono text-[10px] text-[#9CA3AF] shrink-0">{proj.key}</span>
                )}
              </button>
            );
            return collapsed
              ? <Tooltip key={proj.id} content={proj.name} side="right">{btn}</Tooltip>
              : btn;
          })}
          {projects.length === 0 && !collapsed && canCreate && (
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="w-full text-left px-2.5 py-1.5 text-[12px] text-[#9CA3AF] hover:text-[#2563EB] transition-colors"
            >
              + Create first project
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-[#E5E7EB]" />

      {/* Navigation */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            Views
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.tab;
          const btn = (
            <button
              key={item.tab}
              onClick={() => handleTab(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors duration-150',
                isActive
                  ? 'bg-[#E5E7EB] text-[#111827] font-medium'
                  : 'text-[#4B5563] hover:bg-[#EAECEF] hover:text-[#111827]',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-[#2563EB] rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className={isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
          return collapsed
            ? <Tooltip key={item.tab} content={item.label} side="right">{btn}</Tooltip>
            : btn;
        })}
      </nav>

      {/* Bottom: user & collapse */}
      <div className="px-2.5 pb-3 pt-2 border-t border-[#E5E7EB] bg-white space-y-1 shrink-0">
        {user && (
          collapsed ? (
            <Tooltip content={user.name} side="right">
              <div className="flex justify-center py-1">
                <Avatar name={user.name} size="sm" />
              </div>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-[#F4F5F7] transition-colors cursor-default">
              <Avatar name={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#111827] truncate">{user.name}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{user.email}</p>
              </div>
              <Tooltip content="Log out" side="top">
                <button
                  onClick={logout}
                  aria-label="Log out"
                  className="p-1.5 rounded-[6px] text-[#9CA3AF] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <LogOut size={15} strokeWidth={1.5} />
                </button>
              </Tooltip>
            </div>
          )
        )}

        {collapsed && (
          <Tooltip content="Log out" side="right">
            <button
              onClick={logout}
              aria-label="Log out"
              className="w-full flex justify-center p-2 rounded-[6px] text-[#9CA3AF] hover:bg-[#F4F5F7] hover:text-[#111827] transition-colors"
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </Tooltip>
        )}

        {/* Expand button when collapsed */}
        {collapsed && (
          <Tooltip content="Expand sidebar" side="right">
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="w-full flex justify-center p-2 rounded-[6px] text-[#9CA3AF] hover:bg-[#F4F5F7] hover:text-[#111827] transition-colors"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile: absolute drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop: static */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>
    </>
  );
}
