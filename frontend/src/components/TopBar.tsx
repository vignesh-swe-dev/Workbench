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
                {!searchQuery && (
                  <p className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">
                    Type a task name, key, project or member...
                  </p>
                )}
                {searchQuery && !isSearching && !hasResults && (
                  <p className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">No results for "{searchQuery}"</p>
                )}

                {searchResults.tasks.length > 0 && (
                  <div>
                    <p className="px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Tasks</p>
                    {searchResults.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          const proj = { id: task.projectId } as any;
                          setCurrentProject(proj);
                          setSelectedTaskId(task.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-[#F9FAFB] transition-colors"
                      >
                        <CheckSquare size={14} strokeWidth={1.5} className="text-[#9CA3AF] shrink-0" />
                        <span className="task-key text-[#9CA3AF] shrink-0">{task.key}</span>
                        <span className="text-[13px] text-[#111827] truncate flex-1 text-left">{task.title}</span>
                        <span className="text-[11px] text-[#6B7280] shrink-0">{task.projectName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.projects.length > 0 && (
                  <div>
                    <p className="px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Projects</p>
                    {searchResults.projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => { setCurrentProject(proj as any); setIsSearchOpen(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-[#F9FAFB] transition-colors"
                      >
                        <FolderOpen size={14} strokeWidth={1.5} className="text-[#9CA3AF] shrink-0" />
                        <span className="text-[13px] text-[#111827] truncate flex-1 text-left">{proj.name}</span>
                        <span className="task-key text-[#9CA3AF]">{proj.key}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.members.length > 0 && (
                  <div>
                    <p className="px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Members</p>
                    {searchResults.members.map((m) => m.user && (
                      <div key={m.membershipId} className="flex items-center gap-3 px-3.5 py-2">
                        <Avatar name={m.user.name} size="xs" />
                        <span className="text-[13px] text-[#111827] truncate flex-1">{m.user.name}</span>
                        <span className="text-[11px] text-[#6B7280] capitalize">{m.role}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-3.5 py-2 border-t border-[#E5E7EB] flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                  <CornerDownLeft size={11} strokeWidth={1.5} /> to select · Esc to close
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary New Task Button with subtle ripple & hover lift */}
      <Button
        variant="primary"
        size="sm"
        ripple={true}
        onClick={() => setIsCreateTaskOpen(true)}
        className="hidden sm:inline-flex"
      >
        <Plus size={14} strokeWidth={2} className="shrink-0" />
        <span>New Task</span>
      </Button>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <IconButton
          label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          variant="ghost"
          size="sm"
          onClick={() => setIsNotifOpen((v) => !v)}
          className="relative"
        >
          <Bell size={16} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full" />
          )}
        </IconButton>

        <AnimatePresence>
          {isNotifOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg overflow-hidden z-50"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                <h3 className="text-[13px] font-semibold text-[#111827]">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[12px] text-[#2563EB] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">No notifications</p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`w-full text-left px-4 py-3 border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors ${!n.read ? 'bg-[#EFF6FF]/60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />}
                        <div className={!n.read ? '' : 'ml-3.5'}>
                          <p className="text-[12px] font-medium text-[#111827]">{n.title}</p>
                          <p className="text-[12px] text-[#4B5563] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[11px] text-[#9CA3AF] mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User avatar */}
      {user && <Avatar name={user.name} size="sm" />}
    </header>
  );
}
