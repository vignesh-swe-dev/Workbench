import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, canManageRole, ROLE_PERMISSIONS } from './permissions.ts';
import { wouldCreateDependencyCycle, areDependenciesSatisfied } from './dependencies.ts';
import { createProjectSchema, createTaskSchema } from './validation.ts';

test('RBAC: Owner has full operational permissions', () => {
  assert.equal(hasPermission('owner', 'org:delete'), true);
  assert.equal(hasPermission('owner', 'org:transfer_ownership'), true);
  assert.equal(hasPermission('owner', 'projects:create'), true);
  assert.equal(hasPermission('owner', 'tasks:delete'), true);
});

test('RBAC: Admin cannot delete organization or transfer ownership', () => {
  assert.equal(hasPermission('admin', 'org:update'), true);
  assert.equal(hasPermission('admin', 'members:invite'), true);
  assert.equal(hasPermission('admin', 'org:delete'), false);
  assert.equal(hasPermission('admin', 'org:transfer_ownership'), false);
});

test('RBAC: Member cannot invite members or delete projects', () => {
  assert.equal(hasPermission('member', 'tasks:create'), true);
  assert.equal(hasPermission('member', 'tasks:update'), true);
  assert.equal(hasPermission('member', 'projects:delete'), false);
  assert.equal(hasPermission('member', 'members:invite'), false);
});

test('RBAC: Guest has restricted view & comment access only', () => {
  assert.equal(hasPermission('guest', 'tasks:view'), true);
  assert.equal(hasPermission('guest', 'comments:create'), true);
  assert.equal(hasPermission('guest', 'tasks:create'), false);
  assert.equal(hasPermission('guest', 'projects:create'), false);
  assert.equal(hasPermission('guest', 'tasks:update'), false);
});

test('RBAC: canManageRole correctly prevents privilege escalation', () => {
  // Owner can demote admin to member
  assert.equal(canManageRole('owner', 'admin', 'member'), true);
  // Admin cannot promote member to admin
  assert.equal(canManageRole('admin', 'member', 'admin'), false);
  // Admin cannot modify owner
  assert.equal(canManageRole('admin', 'owner', 'member'), false);
  // Member cannot manage any roles
  assert.equal(canManageRole('member', 'guest', 'member'), false);
});

test('Dependency Cycle Detection: detects direct self-dependency', () => {
  const tasks = [{ id: 'task-1', dependencies: [] }];
  assert.equal(wouldCreateDependencyCycle(tasks, 'task-1', 'task-1'), true);
});

test('Dependency Cycle Detection: detects 2-node cycle (A -> B -> A)', () => {
  // task-2 already depends on task-1
  const tasks = [
    { id: 'task-1', dependencies: [] },
    { id: 'task-2', dependencies: ['task-1'] },
  ];
  // Now task-1 attempts to depend on task-2
  assert.equal(wouldCreateDependencyCycle(tasks, 'task-1', 'task-2'), true);
});

test('Dependency Cycle Detection: detects 3-node cycle (A -> B -> C -> A)', () => {
  // task-3 depends on task-2; task-2 depends on task-1
  const tasks = [
    { id: 'task-1', dependencies: [] },
    { id: 'task-2', dependencies: ['task-1'] },
    { id: 'task-3', dependencies: ['task-2'] },
  ];
  // Now task-1 attempts to depend on task-3
  assert.equal(wouldCreateDependencyCycle(tasks, 'task-1', 'task-3'), true);
});

test('Dependency Cycle Detection: allows valid DAG (Directed Acyclic Graph)', () => {
  // task-3 depends on task-2 and task-1
  const tasks = [
    { id: 'task-1', dependencies: [] },
    { id: 'task-2', dependencies: ['task-1'] },
    { id: 'task-3', dependencies: ['task-1'] },
  ];
  // task-3 adding task-2 as dependency is valid (Diamond structure)
  assert.equal(wouldCreateDependencyCycle(tasks, 'task-3', 'task-2'), false);
});

test('Dependencies Satisfaction: correctly flags incomplete prerequisites', () => {
  const taskMap = new Map([
    ['dep-1', { status: 'done' }],
    ['dep-2', { status: 'in_progress' }],
  ]);

  const result1 = areDependenciesSatisfied(['dep-1'], taskMap);
  assert.equal(result1.satisfied, true);
  assert.equal(result1.blockingTaskIds.length, 0);

  const result2 = areDependenciesSatisfied(['dep-1', 'dep-2'], taskMap);
  assert.equal(result2.satisfied, false);
  assert.deepEqual(result2.blockingTaskIds, ['dep-2']);
});

test('Validation: Project Key validation requires uppercase alphanumeric', () => {
  const valid = createProjectSchema.safeParse({
    name: 'Core Platform',
    key: 'CORE',
    leadId: 'user-1',
  });
  assert.equal(valid.success, true);

  const invalid = createProjectSchema.safeParse({
    name: 'Core Platform',
    key: 'core-platform!',
    leadId: 'user-1',
  });
  assert.equal(invalid.success, false);
});
