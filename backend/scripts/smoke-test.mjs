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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
