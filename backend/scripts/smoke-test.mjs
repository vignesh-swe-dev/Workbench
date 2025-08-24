// End-to-end check of the running API: accounts, projects, tasks, comments, releases,
// invitations, roles and workspace isolation.
//
//   Terminal 1:  npm run dev
//   Terminal 2:  npm run smoke
//
// Use a fresh/empty database. The test creates its own accounts (smoke-*@example.com).
const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';

class Client {
  cookie = '';
  async call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(';')[0];
      this.cookie = pair.endsWith('=') ? '' : pair;
    }
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
}

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS', name); }
  else { failed++; console.log('  FAIL', name, extra ?? ''); }
}

const stamp = Date.now();
const A = new Client();
const B = new Client();

let r = await A.call('POST', '/auth/register', { name: 'Smoke Alpha', email: `smoke-a-${stamp}@example.com`, password: 'password123', workspaceName: 'Smoke Alpha' });
check('register A', r.status === 201, r.data);
const org = r.data.organization.id, uid = r.data.user.id;
r = await B.call('POST', '/auth/register', { name: 'Smoke Beta', email: `smoke-b-${stamp}@example.com`, password: 'password123', workspaceName: 'Smoke Beta' });
check('register B', r.status === 201, r.data);
const buid = r.data.user.id;

console.log('Login');
r = await new Client().call('POST', '/auth/login', { email: `smoke-a-${stamp}@example.com`, password: 'wrong-password' });
check('wrong password rejected', r.status === 401);
r = await new Client().call('GET', '/auth/me');
check('no cookie = 401', r.status === 401);

console.log('Projects');
r = await A.call('POST', `/organizations/${org}/projects`, { name: 'Core Platform', key: 'CORE', leadId: uid });
check('create project', r.status === 201, r.data);
const pid = r.data.id;
r = await A.call('POST', `/organizations/${org}/projects`, { name: 'Dup', key: 'CORE', leadId: uid });
check('duplicate key rejected', r.status === 400);
r = await A.call('PATCH', `/projects/${pid}`, { description: 'Updated' });
check('update project', r.status === 200, r.data);

console.log('Tasks');
const tasks = [];
for (const [title, status] of [['First task', 'todo'], ['Second task', 'in_progress'], ['Third task', 'backlog']]) {
  r = await A.call('POST', `/projects/${pid}/tasks`, { projectId: pid, title, status, priority: 'high', assigneeId: uid });
  check('create ' + title, r.status === 201, r.data);
  tasks.push(r.data);
}
r = await A.call('PATCH', `/tasks/${tasks[0].id}`, { status: 'in_review', version: tasks[0].version });
check('move task to In Review', r.status === 200, r.data);
r = await A.call('PATCH', `/tasks/${tasks[1].id}`, { dependencies: [tasks[0].id] });
check('add dependency', r.status === 200, r.data);
r = await A.call('PATCH', `/tasks/${tasks[0].id}`, { dependencies: [tasks[1].id] });
check('circular dependency blocked', r.status >= 400);
r = await A.call('POST', `/projects/${pid}/tasks`, { projectId: pid, title: 'Bad assignee', assigneeId: buid });
check('cannot assign to non-member', r.status === 400);

console.log('Comments');
r = await A.call('POST', `/tasks/${tasks[0].id}/comments`, { content: 'Looks good' });
check('add comment', r.status === 201, r.data);
const cid = r.data?.id;
r = await A.call('DELETE', `/comments/${cid}`);
check('delete comment', r.status === 200);

console.log('Releases');
r = await A.call('POST', `/organizations/${org}/releases`, { version: 'v1.0.0', title: 'First release', targetDate: '2026-12-31', linkedTaskIds: [tasks[0].id], projectId: pid });
check('create release', r.status === 201, r.data);
r = await A.call('PATCH', `/releases/${r.data.id}`, { status: 'in_progress' });
check('update release', r.status === 200, r.data);

console.log('Team');
r = await A.call('POST', `/organizations/${org}/invitations`, { email: `smoke-b-${stamp}@example.com`, role: 'member' });
check('invite member', r.status === 201, r.data);
r = await B.call('POST', `/invitations/${r.data.token}/accept`);
check('accept invitation', r.status === 200, r.data);
r = await A.call('PATCH', `/organizations/${org}/members/${buid}`, { role: 'admin' });
check('change role', r.status === 200, r.data);
r = await B.call('POST', '/auth/switch-organization', { organizationId: org });
check('B switches to joined workspace', r.status === 200);
r = await A.call('DELETE', `/organizations/${org}/members/${buid}`);
check('remove member', r.status === 200, r.data);

console.log('Other');
for (const [name, path] of [['notifications', '/notifications'], ['activity', `/organizations/${org}/activity`], ['analytics', `/organizations/${org}/analytics`], ['search', `/organizations/${org}/search?q=First`]]) {
  r = await A.call('GET', path);
  check(name, r.status === 200, r.data);
}

console.log('Workspace isolation (B was removed, must see nothing of A)');
for (const [name, call] of [
  ['list projects', () => B.call('GET', `/organizations/${org}/projects`)],
  ['read project', () => B.call('GET', `/projects/${pid}`)],
  ['list tasks', () => B.call('GET', `/projects/${pid}/tasks`)],
  ['read task', () => B.call('GET', `/tasks/${tasks[0].id}`)],
  ['create project', () => B.call('POST', `/organizations/${org}/projects`, { name: 'Hack', key: 'HACK', leadId: buid })],
  ['create task', () => B.call('POST', `/projects/${pid}/tasks`, { projectId: pid, title: 'Hack task' })],
  ['delete task', () => B.call('DELETE', `/tasks/${tasks[0].id}`)],
  ['analytics', () => B.call('GET', `/organizations/${org}/analytics`)],
  ['members', () => B.call('GET', `/organizations/${org}/members`)],
  ['activity', () => B.call('GET', `/organizations/${org}/activity`)],
]) {
  const res = await call();
  check(`B blocked: ${name}`, res.status === 403 || res.status === 404, `got ${res.status}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
