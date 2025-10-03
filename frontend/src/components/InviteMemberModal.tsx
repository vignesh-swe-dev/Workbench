import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { UserPlus } from 'lucide-react';
import type { Role } from '../shared/types.ts';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';

export function InviteMemberModal() {
  const {
    isInviteMemberOpen,
    setIsInviteMemberOpen,
    organization,
    addToast,
  } = useApp();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [submitting, setSubmitting] = useState(false);

  if (!organization) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      addToast('error', 'Valid email address required');
      return;
    }

    try {
      setSubmitting(true);
      await api.inviteMember(organization.id, email.trim(), role);
      addToast('success', `Invitation sent to ${email} as ${role.toUpperCase()}`);
      setIsInviteMemberOpen(false);
      setEmail('');
      setRole('member');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isInviteMemberOpen}
      onClose={() => setIsInviteMemberOpen(false)}
      title={`Invite Team Member`}
      description={`Invite a colleague to join ${organization.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          label="Email Address *"
          type="email"
          required
          autoFocus
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Select
          label="Organization Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="member">Member — Can manage assigned projects, tasks, and comments</option>
          <option value="admin">Admin — Can manage members, projects, and workspace settings</option>
          <option value="guest">Guest — Read-only viewer with restricted comment permissions</option>
        </Select>

        <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[12px] text-[#4B5563] leading-relaxed">
          Invitations are delivered asynchronously with single-use authentication tokens valid for 7 days.
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsInviteMemberOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
