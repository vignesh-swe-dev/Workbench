import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setUnauthorizedHandler, type AuthResponse } from '../lib/api.ts';
import { getSocket, disconnectSocket } from '../lib/socket.ts';
import type {
  User,
  Organization,
  Project,
  Task,
  Notification,
  ActivityLog,
  PresenceUser,
  Role,
} from '../shared/types.ts';

export type ActiveTab = 'board' | 'list' | 'analytics' | 'releases' | 'members' | 'github' | 'docs';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AppContextType {
  authStatus: AuthStatus;
  user: User | null;
  organization: Organization | null;
  membershipRole: Role;
  availableOrganizations: Organization[];
  projects: (Project & { lead?: User })[];
  currentProject: (Project & { lead?: User }) | null;
  tasks: (Task & { assignee?: User; reporter?: User })[];
  notifications: Notification[];
  activities: ActivityLog[];
  unreadCount: number;
  presenceUsers: PresenceUser[];
  activeTab: ActiveTab;
  selectedTaskId: string | null;
  isCreateTaskOpen: boolean;
  isCreateProjectOpen: boolean;
  isInviteMemberOpen: boolean;
  isCreateReleaseOpen: boolean;
  isMobileMenuOpen: boolean;
  isActivityDrawerOpen: boolean;
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  loading: boolean;
  toasts: Toast[];

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentProject: (proj: (Project & { lead?: User }) | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setIsCreateTaskOpen: (open: boolean) => void;
  setIsCreateProjectOpen: (open: boolean) => void;
  setIsInviteMemberOpen: (open: boolean) => void;
  setIsCreateReleaseOpen: (open: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsActivityDrawerOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (s: string) => void;
  setPriorityFilter: (p: string) => void;
  setAssigneeFilter: (a: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; workspaceName: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membershipRole, setMembershipRole] = useState<Role>('member');
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<(Project & { lead?: User })[]>([]);
  const [currentProject, setCurrentProject] = useState<(Project & { lead?: User }) | null>(null);
  const [tasks, setTasks] = useState<(Task & { assignee?: User; reporter?: User })[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const resetWorkspaceState = useCallback(() => {
    setUser(null);
    setOrganization(null);
    setMembershipRole('member');
    setAvailableOrganizations([]);
    setProjects([]);
    setCurrentProject(null);
    setTasks([]);
    setNotifications([]);
    setActivities([]);
    setPresenceUsers([]);
    setSelectedTaskId(null);
    setActiveTab('board');
  }, []);

  const loadWorkspace = useCallback(async (org: Organization | null) => {
    if (org) {
      const [projList, actList] = await Promise.all([api.getProjects(org.id), api.getActivity(org.id)]);
      setProjects(projList);
      setActivities(actList);
      setCurrentProject(projList.length > 0 ? projList[0] : null);
    } else {
      setProjects([]);
      setActivities([]);
      setCurrentProject(null);
    }
    setNotifications(await api.getNotifications());
  }, []);

  const applyAuth = useCallback(
    async (me: AuthResponse) => {
      setUser(me.user);
      setOrganization(me.organization);
      setMembershipRole(me.membershipRole);
      setAvailableOrganizations(me.availableOrganizations);
      setAuthStatus('authenticated');
      try {
        await loadWorkspace(me.organization);
      } catch (err: any) {
        console.error('[App] Failed to load data:', err);
        addToast('error', err?.message || 'Failed to load workspace data');
      }
    },
    [loadWorkspace, addToast]
  );

  // On first load, check whether a valid session cookie exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.getMe();
        if (!cancelled) await applyAuth(me);
      } catch {
        if (!cancelled) setAuthStatus('unauthenticated');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyAuth]);

  // Any 401 from the API sends the user back to the login page
  useEffect(() => {
    setUnauthorizedHandler(() => {
      disconnectSocket();
      resetWorkspaceState();
      setAuthStatus('unauthenticated');
    });
    return () => setUnauthorizedHandler(null);
  }, [resetWorkspaceState]);

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await api.login({ email, password });
      await applyAuth(me);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (data: { name: string; email: string; password: string; workspaceName: string }) => {
      const me = await api.register(data);
      await applyAuth(me);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // cookie may already be gone; continue
    }
    disconnectSocket();
    resetWorkspaceState();
    setAuthStatus('unauthenticated');
  }, [resetWorkspaceState]);

  const refreshActivities = useCallback(async () => {
    if (!organization) return;
    try {
      const actList = await api.getActivity(organization.id);
      setActivities(actList);
    } catch (err: any) {
      console.error('[App] Failed to refresh activities:', err);
    }
  }, [organization]);

  // Fetch tasks when project changes
  const refreshTasks = useCallback(async () => {
    if (!currentProject) return;
    try {
      const taskList = await api.getTasks(currentProject.id);
      setTasks(taskList);
    } catch (err: any) {
      console.error('[App] Failed to refresh tasks:', err);
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      refreshTasks();
    } else {
      setTasks([]);
    }
  }, [currentProject, refreshTasks]);

  const refreshProjects = useCallback(async () => {
    if (!organization) return;
    try {
      const projList = await api.getProjects(organization.id);
      setProjects(projList);
      if (currentProject) {
        const updatedCurrent = projList.find((p) => p.id === currentProject.id);
        if (updatedCurrent) setCurrentProject(updatedCurrent);
      }
    } catch (err: any) {
      console.error('[App] Failed to refresh projects:', err);
    }
  }, [organization, currentProject]);

  const refreshNotifications = useCallback(async () => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('[App] Failed to refresh notifications:', err);
    }
  }, []);

  // Socket.IO Room Management & Listeners
  useEffect(() => {
    if (!user || !organization) return;
    const socket = getSocket();

    socket.emit('join:org', { orgId: organization.id });

    if (currentProject) {
      socket.emit('join:project', {
        projectId: currentProject.id,
        taskId: selectedTaskId || undefined,
      });
    }

    const handleTaskCreated = (newTask: Task) => {
      if (currentProject && newTask.projectId === currentProject.id) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [...prev, newTask];
        });
        addToast('info', `New task created: ${newTask.key}`);
      }
    };

    const handleTaskUpdated = (updatedTask: Task) => {
      if (currentProject && updatedTask.projectId === currentProject.id) {
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
      }
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    };

    const handlePresenceSync = (users: PresenceUser[]) => {
      setPresenceUsers(users);
    };

    const handleActivityCreated = (newActivity: ActivityLog) => {
      setActivities((prev) => [newActivity, ...prev.filter((a) => a.id !== newActivity.id)].slice(0, 50));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('presence:sync', handlePresenceSync);
    socket.on('activity:created', handleActivityCreated);

    const userNotifHandler = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      addToast('info', `${notif.title}: ${notif.message}`);
    };

    socket.on(`notification:${user.id}`, userNotifHandler);

    return () => {
      if (currentProject) {
        socket.emit('leave:project', { projectId: currentProject.id });
      }
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('presence:sync', handlePresenceSync);
      socket.off('activity:created', handleActivityCreated);
      socket.off(`notification:${user.id}`, userNotifHandler);
    };
  }, [user, organization, currentProject, selectedTaskId, addToast]);

  const switchOrganization = async (orgId: string) => {
    try {
      const me = await api.switchOrganization(orgId);
      await applyAuth(me);
      addToast('success', `Switched to ${me.organization?.name ?? 'workspace'}`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to switch workspace');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      addToast('success', 'All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        authStatus,
        user,
        organization,
        membershipRole,
        availableOrganizations,
        projects,
        currentProject,
        tasks,
        notifications,
        activities,
        unreadCount,
        presenceUsers,
        activeTab,
        selectedTaskId,
        isCreateTaskOpen,
        isCreateProjectOpen,
        isInviteMemberOpen,
        isCreateReleaseOpen,
        isMobileMenuOpen,
        isActivityDrawerOpen,
        searchQuery,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        loading,
        toasts,
        setActiveTab,
        setCurrentProject,
        setSelectedTaskId,
        setIsCreateTaskOpen,
        setIsCreateProjectOpen,
        setIsInviteMemberOpen,
        setIsCreateReleaseOpen,
        setIsMobileMenuOpen,
        setIsActivityDrawerOpen,
        setSearchQuery,
        setStatusFilter,
        setPriorityFilter,
        setAssigneeFilter,
        login,
        register,
        logout,
        switchOrganization,
        refreshTasks,
        refreshProjects,
        refreshNotifications,
        refreshActivities,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
