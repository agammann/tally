import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const project = `tallymigration${randomBytes(6).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const env = { ...process.env, POSTGRES_PASSWORD: password };
const temp = mkdtempSync(join(tmpdir(), 'tally-pg18-compose-'));
const ports = join(temp, 'ports.yaml');
writeFileSync(ports, 'services:\n  db:\n    ports: !override ["127.0.0.1::5432"]\n');
const base = ['compose', '-p', project, '-f', 'compose.yaml', '-f', ports];
const old = [...base, '-f', 'compose.postgres17.yaml'];
const restore = [...base, '-f', 'compose.postgres18-restore.yaml'];
function run(program, args, options = {}) {
  const result = spawnSync(program, args, { env, encoding: null, maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${program} failed: ${result.error?.message || result.stderr?.toString().trim() || result.status}`);
  return result.stdout;
}
const docker = (...args) => run('docker', args);
const compose = (prefix, ...args) => docker(...prefix, ...args);
const query = (prefix, sql) => run('docker', [...prefix, 'exec', '-T', 'db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'tally', '-d', 'tally', '-At'], { input: sql }).toString().trim();
function migration(prefix, action) {
  const mapped = compose(prefix, 'port', 'db', '5432').toString().trim();
  const match = mapped.match(/^127\.0\.0\.1:(\d+)$/);
  if (!match) throw new Error('Database must bind to loopback only');
  const testEnv = { ...env, DATABASE_URL: `postgresql://tally:${password}@127.0.0.1:${match[1]}/tally?schema=public` };
  run(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', action], { env: testEnv });
}
for (const args of [
  ['ps', '-a', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}'],
  ['volume', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.Name}}'],
  ['network', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}'],
]) if (docker(...args).toString().trim()) throw new Error('Generated test project already exists');
const snapshot = `SELECT (SELECT count(*) FROM "User") || ':' || (SELECT count(*) FROM "Project") || ':' || (SELECT count(*) FROM "Event") || ':' || (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL);`;
try {
  compose(old, 'up', '-d', '--wait', 'db');
  migration(old, 'deploy');
  query(old, `INSERT INTO "User" (id,name,email,"updatedAt") VALUES ('fixture-owner','Fictional owner','owner@example.invalid',now());
INSERT INTO "Project" (id,"ownerId",name,"ingestionId","workflowName") VALUES ('fixture-project','fixture-owner','Fictional project','fixture-ingest','fixture-flow');
INSERT INTO "Event" ("projectId","eventId","schemaVersion",kind,environment,source,"clientAt") VALUES ('fixture-project','fixture-event',1,'start','test','fixture',now());`);
  const before = query(old, snapshot);
  assert.equal(before, '1:1:1:2');
  const dump = compose(old, 'exec', '-T', 'db', 'pg_dump', '-U', 'tally', '-d', 'tally', '-Fc');
  compose(old, 'stop', 'db');
  const blocked = spawnSync('docker', [...base, 'run', '--rm', '--no-deps', 'db', 'true'], { env, encoding: 'utf8' });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Existing PostgreSQL 17 data detected/);
  compose(restore, 'up', '-d', '--wait', 'db');
  run('docker', [...restore, 'exec', '-T', 'db', 'pg_restore', '--exit-on-error', '--no-owner', '-U', 'tally', '-d', 'tally'], { input: dump });
  assert.equal(query(restore, snapshot), before);
  migration(restore, 'status');
  // An initialized or partially restored 18 volume is still blocked without a marker.
  compose(restore, 'stop', 'db');
  const interrupted = spawnSync('docker', [...base, 'run', '--rm', '--no-deps', 'db', 'true'], { env, encoding: 'utf8' });
  assert.equal(interrupted.status, 1);
  compose(restore, 'up', '-d', '--wait', 'db');
  compose(restore, 'exec', '-T', 'db', 'sh', '-c', 'printf "tally-pg18-restore-v1\\n" > /var/lib/postgresql/.tally-pg18-restored.tmp && mv /var/lib/postgresql/.tally-pg18-restored.tmp /var/lib/postgresql/.tally-pg18-restored');
  compose(restore, 'stop', 'db');
  compose(base, 'up', '-d', '--wait', 'db');
  assert.equal(query(base, snapshot), before);
  query(base, `INSERT INTO "Event" ("projectId","eventId","schemaVersion",kind,environment,source,"clientAt") VALUES ('fixture-project','after-cutover',1,'start','test','fixture',now());`);
  assert.equal(query(base, snapshot), '1:1:2:2');
  compose(base, 'stop', 'db');
  compose(old, 'up', '-d', '--wait', 'db');
  assert.equal(query(old, snapshot), before);
  migration(old, 'status');
  console.log('PASS: guarded Compose migration, restored 18 startup, and rollback to the retained 17 volume. Post-cutover writes are absent on rollback.');
} finally {
  spawnSync('docker', [...base, 'down', '--volumes', '--remove-orphans'], { env, stdio: 'ignore' });
  unlinkSync(ports);
  rmdirSync(temp);
}
