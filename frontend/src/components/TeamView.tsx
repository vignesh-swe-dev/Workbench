import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import {
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Check,
} from 'lucide-react';
import type { Membership, Invitation, Role, User } from '../shared/types.ts';
import { hasPermission, canManageRole } from '../shared/permissions.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Badge } from '../ui/Badge.tsx';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';

const ROLE_BADGE_VARIANTS: Record<Role, 'default' | 'brand' | 'success' | 'warning'> = {
  owner: 'brand',
  admin: 'brand',
  member: 'default',
  guest: 'default',
};

export function TeamView() {
  const {
    organization,
    membershipRole,
    user: currentUser,
    setIsInviteMemberOpen,
    addToast,
  } = useApp();

  const [members, setMembers] = useState<(Membership & { user?: User })[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  const canInvite = hasPermission(membershipRole, 'members:invite');
  const canUpdateRole = hasPermission(membershipRole, 'members:update_role');
  const canRemove = hasPermission(membershipRole, 'members:remove');

  const loadData = async () => {
    if (!organization) return;
    try {
      setLoading(true);
      const [mList, iList] = await Promise.all([
        api.getMembers(organization.id),
        api.getInvitations(organization.id),
      ]);
      setMembers(mList);
      setInvitations(iList);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organization]);

  const handleRoleChange = async (targetUserId: string, targetCurrentRole: Role, newRole: Role) => {
    if (!organization || !canManageRole(membershipRole, targetCurrentRole, newRole)) {
      addToast('error', 'You do not have permission to perform this role transition');
      return;
    }

    try {
      await api.updateMemberRole(organization.id, targetUserId, newRole);
      addToast('success', 'Member role updated');
      await loadData();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!organization || !confirm(`Remove ${targetName} from ${organization.name}?`)) return;

    try {
      await api.removeMember(organization.id, targetUserId);
      addToast('success', `Removed ${targetName}`);
      await loadData();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      <div className="max-w-[1100px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
              Team Directory & Access Control
            </h1>
            <p className="text-[14px] text-[#4B5563] mt-1">
              Role-Based Access Control (RBAC) enforced across workspace resources and operations.
            </p>
          </div>

          {canInvite && (
            <Button
              variant="primary"
              size="sm"
              ripple={true}
              onClick={() => setIsInviteMemberOpen(true)}
            >
              <UserPlus size={14} strokeWidth={1.5} className="shrink-0" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>

        {/* Members Directory */}
        <Card padded={false} className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280]">
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">Workspace Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{members.map(m => <div key={m.id} className="p-4 border rounded-lg">{m.name} - {m.role}</div>)}</div>
    </div>
  );
}
