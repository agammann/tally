import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Only random, explicitly named test containers/volumes and fictional data are used.
const suffix = randomBytes(6).toString('hex');
const oldName = `tally-pg-rehearsal-${suffix}-old`;
const newName = `tally-pg-rehearsal-${suffix}-new`;
const oldVolume = `${oldName}-data`;
const newVolume = `${newName}-data`;
const password = randomBytes(24).toString('hex');
const prisma = resolve('node_modules/prisma/build/index.js');

function run(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: null, maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.toString().trim() || `exit ${result.status}`;
    throw new Error(`${program} failed: ${detail}`);
  }
  return result.stdout;
}
const docker = (...args) => run('docker', args);
const sql = (name, input) => run('docker', ['exec', '-i', name, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'tally', '-d', 'tally', '-At'], { input }).toString().trim();
async function ready(name) {
  for (let i = 0; i < 90; i++) {
    // The image's temporary initialization server accepts local sockets and then
    // shuts down. Wait for the final server's TCP listener instead.
    const result = spawnSync('docker', ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'tally', '-d', 'tally'], { stdio: 'ignore' });
    if (result.status === 0) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} did not become ready`);
}
function port(name) {
  const value = docker('port', name, '5432/tcp').toString().trim();
  const match = value.match(/^127\.0\.0\.1:(\d+)$/);
  if (!match) throw new Error('Expected a loopback-only database port');
  return match[1];
}
function migrate(name, command) {
  const env = { ...process.env, DATABASE_URL: `postgresql://tally:${password}@127.0.0.1:${port(name)}/tally?schema=public` };
  run(process.execPath, [prisma, 'migrate', command], { env });
}
function start(name, volume, image, mountPath, pgdata) {
  docker('run', '-d', '--name', name, '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=tally', '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=tally', '-e', `PGDATA=${pgdata}`, '-v', `${volume}:${mountPath}`, image);
}
const snapshot = `SELECT (SELECT count(*) FROM "User") || ':' || (SELECT count(*) FROM "Project") || ':' || (SELECT count(*) FROM "Event") || ':' || (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL);`;

try {
  start(oldName, oldVolume, 'postgres:17.9-alpine', '/var/lib/postgresql/data', '/var/lib/postgresql/data');
  await ready(oldName);
  migrate(oldName, 'deploy');
  sql(oldName, `INSERT INTO "User" (id,name,email,"updatedAt") VALUES ('fixture-owner','Fictional owner','owner@example.invalid',now());
INSERT INTO "Project" (id,"ownerId",name,"ingestionId","workflowName") VALUES ('fixture-project','fixture-owner','Fictional project','fixture-ingest','fixture-flow');
INSERT INTO "Event" ("projectId","eventId","schemaVersion",kind,environment,source,"clientAt") VALUES ('fixture-project','fixture-event',1,'start','test','fixture',now());`);
  const before = sql(oldName, snapshot);
  assert.equal(before, '1:1:1:2');
  // Model a quiesced application: dump after the final write and retain the old volume.
  const dump = run('docker', ['exec', oldName, 'pg_dump', '-U', 'tally', '-d', 'tally', '-Fc']);
  docker('stop', oldName);
  start(newName, newVolume, 'postgres:18.4-alpine', '/var/lib/postgresql', '/var/lib/postgresql/18/docker');
  await ready(newName);
  run('docker', ['exec', '-i', newName, 'pg_restore', '--exit-on-error', '--no-owner', '-U', 'tally', '-d', 'tally'], { input: dump });
  assert.equal(sql(newName, snapshot), before);
  migrate(newName, 'status');
  sql(newName, `INSERT INTO "Event" ("projectId","eventId","schemaVersion",kind,environment,source,"clientAt") VALUES ('fixture-project','after-cutover',1,'start','test','fixture',now());`);
  assert.equal(sql(newName, snapshot), '1:1:2:2');
  docker('stop', newName);
  docker('start', oldName);
  await ready(oldName);
  assert.equal(sql(oldName, snapshot), before);
  migrate(oldName, 'status');
  console.log('PASS: PostgreSQL 17 dump restored to 18, migrations remained current, and the retained 17 volume supported rollback. Writes after cutover do not exist on the old volume.');
} finally {
  for (const name of [oldName, newName]) spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
  for (const volume of [oldVolume, newVolume]) spawnSync('docker', ['volume', 'rm', volume], { stdio: 'ignore' });
}
