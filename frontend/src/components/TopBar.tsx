import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  Bell, Search, Menu, X, CheckSquare, FolderOpen,
  CornerDownLeft, Loader2, Plus,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar.tsx';
import { Button, IconButton } from '../ui/Button.tsx';
import type { Task, Project, User, Role } from '../shared/types.ts';
import { motion, AnimatePresence } from 'motion/react';

interface SearchResults {
  tasks: (Task & { projectName: string; projectKey: string; assignee?: User })[];
  projects: Project[];
  members: { membershipId: string; role: Role; user?: User }[];
}

export function TopBar() {
  const {
    user, organization, currentProject, activeTab,
    notifications, unreadCount,
    setCurrentProject, setSelectedTaskId, setActiveTab,
    setIsMobileMenuOpen,
    markNotificationAsRead, markAllNotificationsAsRead,
    setIsCreateTaskOpen,
    tasks, projects,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({ tasks: [], projects: [], members: [] });

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K or 'k' to open search, 'c' to open new task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key.toLowerCase() === 'k' && !isSearchOpen && !isInput)) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
      }
      if (e.key === 'c' && !isSearchOpen && !isInput) {
        e.preventDefault();
        setIsCreateTaskOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isSearchOpen, setIsCreateTaskOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search across tasks and projects
  const searchTimer = useRef<any>(null);
  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setSearchResults({ tasks: [], projects: [], members: [] });
      return;
    }
    searchTimer.current = setTimeout(() => {
      const lower = q.trim().toLowerCase();
      const matchedTasks = tasks
        .filter((t) => t.key.toLowerCase().includes(lower) || t.title.toLowerCase().includes(lower))
        .map((t) => ({ ...t, projectName: currentProject?.name ?? '', projectKey: currentProject?.key ?? '' }))
        .slice(0, 6);
      const matchedProjects = projects
        .filter((p) => p.name.toLowerCase().includes(lower) || p.key.toLowerCase().includes(lower))
        .slice(0, 4);
      setSearchResults({ tasks: matchedTasks, projects: matchedProjects, members: [] });
    }, 150);
  }, [tasks, projects, currentProject]);

  // Breadcrumbs
  const crumbs: string[] = [organization?.name ?? '', currentProject?.name ?? ''].filter(Boolean);
  const tabLabel: Record<string, string> = {
    board: 'Board', list: 'List', releases: 'Releases',
    analytics: 'Analytics', members: 'Team', github: 'Integrations', docs: 'Docs',
  };

  const hasResults = searchResults.tasks.length > 0 || searchResults.projects.length > 0 || searchResults.members.length > 0;

  return (
    <header className="h-[56px] shrink-0 flex items-center gap-3 px-4 bg-white border-b border-[#E5E7EB] z-20">
      {/* Mobile menu toggle */}
      <IconButton
        label="Open menu"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu size={16} strokeWidth={1.5} />
      </IconButton>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0 flex-1">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb}>
            {i > 0 && <span className="text-[#9CA3AF]">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-[#111827] font-medium truncate' : 'text-[#6B7280] truncate'}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
        {crumbs.length > 0 && tabLabel[activeTab] && (
          <>
            <span className="text-[#9CA3AF]">/</span>
            <span className="text-[#6B7280]">{tabLabel[activeTab]}</span>
          </>
        )}
      </nav>

      {/* Search trigger */}
      <div ref={searchRef} className="relative">
        <button
          onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] text-[#6B7280] hover:border-[#D1D5DB] hover:bg-white transition-all min-w-[220px]"
          aria-label="Search (K)"
        >
          <Search size={14} strokeWidth={1.5} className="text-[#9CA3AF]" />
          <span className="flex-1 text-left text-[13px]">Search workspace...</span>
          <kbd className="text-[10px] bg-white border border-[#E5E7EB] text-[#6B7280] px-1.5 py-0.5 rounded-[4px] font-mono">K</kbd>
        </button>
        <IconButton label="Search" variant="ghost" size="sm" className="sm:hidden" onClick={() => setIsSearchOpen(true)}>
          <Search size={16} strokeWidth={1.5} />
        </IconButton>

        {/* Search palette */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[500px] max-w-[90vw] bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg overflow-hidden z-50"
            >
              <div className="flex items-center gap-2.5 px-3.5 border-b border-[#E5E7EB]">
                <Search size={15} strokeWidth={1.5} className="text-[#6B7280] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks, projects, members..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="flex-1 h-11 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                  aria-label="Global search"
                />
                {isSearching
                  ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-[#9CA3AF] shrink-0" />
                  : searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults({ tasks: [], projects: [], members: [] }); }} className="text-[#9CA3AF] hover:text-[#111827]">
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  )
                }
              </div>

              <div className="max-h-80 overflow-y-auto">
  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-foreground text-sm">Workbench</h1>
      </div>
    </header>
  );
}
