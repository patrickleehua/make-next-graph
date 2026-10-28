#!/usr/bin/env node
// Optional raw process capture, invoked explicitly by a person/agent. No graph scheduling.
import { spawnSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Keep even JSON-escaped control characters within the 4 MiB check reader limit.
const outputLimit = 256 * 1024;

export async function capture(command, args, output, { cwd = process.cwd(), timeout = 120000 } = {}) {
  const startedAt = new Date().toISOString();
  const env = { ...process.env };
  // This is a new explicit command, not the enclosing runner's internal worker.
  // Inheriting this private marker makes a nested `node --test` skip all files.
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', shell: false, timeout, maxBuffer: outputLimit });
  const clipped = (result.stdout?.length ?? 0) > outputLimit || (result.stderr?.length ?? 0) > outputLimit;
  const reason = result.error?.message ?? (result.signal ? `Terminated by ${result.signal}`
    : clipped ? 'Output capture limit exceeded' : undefined);
  const record = {
    command: [command, ...args], startedAt, finishedAt: new Date().toISOString(),
    exitCode: reason ? null : result.status,
    stdout: (result.stdout ?? '').slice(0, outputLimit), stderr: (result.stderr ?? '').slice(0, outputLimit),
    ...(reason ? { reason } : {}),
  };
  const target = path.resolve(output);
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  await rename(temp, target);
  return record;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const separator = args.indexOf('--');
  if (separator !== 1 || !args[separator + 1]) {
    process.stderr.write('Usage: node record.mjs <output.json> -- <executable> [args...]\n');
    process.exitCode = 2;
  } else {
    try {
      const record = await capture(args[2], args.slice(3), args[0]);
      process.stdout.write(record.stdout);
      process.stderr.write(record.stderr);
      if (record.reason) process.stderr.write(`${record.reason}\n`);
      process.exitCode = record.exitCode ?? 2;
    } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
  }
}
