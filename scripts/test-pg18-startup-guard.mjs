import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// Compose project and volumes are unique test resources; never uses default project.
const project = `tallyguard${randomBytes(6).toString('hex')}`;
const legacy = `${project}_tally-data`;
const target = `${project}_tally-data-pg18`;
const temp = mkdtempSync(join(tmpdir(), 'tally-pg18-guard-'));
const noPorts = join(temp, 'no-ports.yaml');
writeFileSync(noPorts, 'services:\n  db:\n    ports: !override []\n');
const base = ['compose', '-p', project, '-f', 'compose.yaml', '-f', noPorts];
const env = { ...process.env, POSTGRES_PASSWORD: 'synthetic-test-password' };
function docker(args) {
  return spawnSync('docker', args, { env, encoding: 'utf8', maxBuffer: 1024 * 1024 });
}
function expect(args, status) {
  const result = docker(args);
  if (result.error || result.status !== status) {
    throw new Error(`Unexpected Docker result ${result.status}: ${result.error?.message || result.stderr}`);
  }
  return result;
}
// Never reuse or delete any resource belonging to an existing Compose project.
for (const args of [
  ['ps', '-a', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}'],
  ['volume', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.Name}}'],
  ['network', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}'],
]) {
  if (expect(args, 0).stdout.trim()) throw new Error('Generated test project already exists');
}
try {
  // Normal startup never infers that empty volumes mean a fresh installation.
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  // The explicit fresh override starts a real server without host ports.
  const fresh = [...base, '-f', 'compose.postgres18-init.yaml'];
  expect([...fresh, 'up', '-d', '--wait', 'db'], 0);
  const version = expect([...fresh, 'exec', '-T', 'db', 'psql', '-U', 'tally', '-d', 'tally', '-At', '-c', 'SHOW server_version_num'], 0).stdout.trim();
  assert.ok(Number(version) >= 180000 && Number(version) < 190000);
  // Fresh initialization cannot run again over the now-populated target.
  expect([...fresh, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect([...fresh, 'exec', '-T', 'db', 'sh', '-c', 'printf "tally-pg18-fresh-v1\\n" > /var/lib/postgresql/.tally-pg18-restored'], 0);
  expect([...fresh, 'stop', 'db'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 0);
  // Failed inspection must fail closed instead of looking like an empty volume.
  const unreadable = expect([...base, 'run', '--rm', '--no-deps', '-e', 'PATH=/nonexistent', 'db', 'true'], 1);
  assert.match(unreadable.stderr, /Cannot inspect legacy database volume/);
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${legacy}:/test`, 'postgres:18.4-alpine', '-c', 'printf 17 > /test/PG_VERSION'], 0);
  // Legacy files block normal startup, even if an 18 volume exists.
  const blocked = expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  assert.match(blocked.stderr, /marker does not match the legacy volume state/);
  // Any legacy files block, even when PG_VERSION is missing or damaged.
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${legacy}:/test`, 'postgres:18.4-alpine', '-c', 'rm /test/PG_VERSION; printf partial > /test/legacy-file'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect([...fresh, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  // Only the explicit restore override can start a database before the marker.
  expect([...base, '-f', 'compose.postgres18-restore.yaml', 'run', '--rm', '--no-deps', 'db', 'true'], 0);
  for (const command of [
    'touch /test/.tally-pg18-restored',
    'printf invalid > /test/.tally-pg18-restored',
    'rm /test/.tally-pg18-restored; printf tally-pg18-restore-v1 > /test/other; ln -s other /test/.tally-pg18-restored',
  ]) {
    expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', command], 0);
    expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  }
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'rm /test/.tally-pg18-restored; printf "tally-pg18-restore-v1\\n" > /test/.tally-pg18-restored'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 0);
  // A valid marker cannot authorize reinitializing a missing or reset cluster.
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'mv /test/18/docker/PG_VERSION /test/18/docker/PG_VERSION.saved'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'printf 17 > /test/18/docker/PG_VERSION'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'rm /test/18/docker/PG_VERSION; ln -s PG_VERSION.saved /test/18/docker/PG_VERSION'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'rm /test/18/docker/PG_VERSION; mv /test/18/docker/PG_VERSION.saved /test/18/docker/PG_VERSION; mv /test/18/docker/global/pg_control /test/18/docker/global/pg_control.saved'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 1);
  expect(['run', '--rm', '--network', 'none', '--entrypoint', 'sh', '-v', `${target}:/test`, 'postgres:18.4-alpine', '-c', 'mv /test/18/docker/global/pg_control.saved /test/18/docker/global/pg_control'], 0);
  expect([...base, 'run', '--rm', '--no-deps', 'db', 'true'], 0);
  console.log('PASS: explicit fresh initialization, populated-target refusal, legacy inspection, restore override, and cluster/marker guards.');
} finally {
  // The project name was generated above; only its test resources are removed.
  docker([...base, 'down', '--volumes', '--remove-orphans']);
  unlinkSync(noPorts);
  rmdirSync(temp);
}
