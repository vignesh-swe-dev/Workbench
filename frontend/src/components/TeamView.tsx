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
              Active Members ({members.length})
            </span>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {members.map((m) => {
              const u = m.user;
              const isCurrent = currentUser?.id === m.userId;
              const isOwner = m.role === 'owner';
              const canModifyThisMember = canManageRole(membershipRole, m.role, 'member');

              return (
                <div key={m.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={u?.name || 'Member'} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#111827]">{u?.name || 'Workspace Member'}</span>
                        {isCurrent && (
                          <span className="text-[11px] text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.2 rounded border border-[#BFDBFE]">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#6B7280]">{u?.email}</div>
                      {u?.title && <div className="text-[11px] text-[#9CA3AF] mt-0.5">{u.title}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Dropdown */}
                    {canUpdateRole && !isOwner && canModifyThisMember ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, m.role, e.target.value as Role)}
                        className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] bg-white border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                      </select>
                    ) : (
                      <Badge variant={ROLE_BADGE_VARIANTS[m.role]}>
                        <span className="capitalize">{m.role}</span>
                      </Badge>
                    )}

                    {canRemove && !isOwner && !isCurrent && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, u?.name || 'member')}
                        className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-[4px] transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card padded={false} className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Pending Invitations ({invitations.length})
              </span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {invitations.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2.5">
                    <Mail size={15} strokeWidth={1.5} className="text-[#6B7280]" />
                    <div>
                      <span className="font-medium text-[#111827]">{inv.email}</span>
                      <div className="text-[11px] text-[#6B7280]">
                        Invited as <span className="capitalize font-medium text-[#374151]">{inv.role}</span> · Expires in 7 days
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning">{inv.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* RBAC Permission Matrix Reference */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} strokeWidth={1.5} className="text-[#2563EB]" />
              <h2 className="text-[14px] font-semibold text-[#111827]">
                Role-Based Access Control (RBAC) Permissions Matrix
              </h2>
            </div>

            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[6px]">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] uppercase font-semibold text-[#6B7280]">
                    <th className="py-2.5 px-3.5">Permission / Capability</th>
                    <th className="py-2.5 px-3.5 text-center">Owner</th>
                    <th className="py-2.5 px-3.5 text-center">Admin</th>
                    <th className="py-2.5 px-3.5 text-center">Member</th>
                    <th className="py-2.5 px-3.5 text-center">Guest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                  {[
                    { cap: 'Transfer Ownership & Delete Org', roles: [true, false, false, false] },
                    { cap: 'Invite Members & Assign Roles', roles: [true, true, false, false] },
                    { cap: 'Create & Archive Projects', roles: [true, true, true, false] },
                    { cap: 'Create & Edit Tasks / Releases', roles: [true, true, true, false] },
                    { cap: 'View Projects & Add Comments', roles: [true, true, true, true] },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-[#111827]">{row.cap}</td>
                      {row.roles.map((granted, rIdx) => (
                        <td key={rIdx} className="py-2.5 px-3.5 text-center">
                          {granted ? (
                            <span className="text-[#059669] font-bold">✓</span>
                          ) : (
                            <span className="text-[#D1D5DB] font-normal">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
