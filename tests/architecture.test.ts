import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
test('source dependencies have no relative import cycles and adapters do not import stores', () => {
  const files: string[] = [];
  function walk(p: string) {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(ts|tsx)$/.test(f)) files.push(path.resolve(f));
    }
  }
  for (const p of ['symbiote/src', 'obsidian-plugin/src', 'packages']) walk(p);
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8'),
      deps: string[] = [];
    for (const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(path.dirname(file), m[1]);
      const dependency = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(
        existsSync,
      );
      if (dependency) deps.push(dependency);
    }
    graph.set(file, deps);
    if (file.includes(path.join('shared', 'api')))
      assert.ok(
        !/from\s*['"][^'"]*(?:Store|\/model\/store)/.test(text),
        'Adapter depends on application store: ' + file,
      );
  }
  const done = new Set<string>(),
    stack: string[] = [],
    cycles: string[][] = [];
  function visit(file: string) {
    const index = stack.indexOf(file);
    if (index >= 0) {
      cycles.push([...stack.slice(index), file]);
      return;
    }
    if (done.has(file)) return;
    stack.push(file);
    for (const dependency of graph.get(file) || []) visit(dependency);
    stack.pop();
    done.add(file);
  }
  for (const file of graph.keys()) visit(file);
  assert.deepEqual(cycles, []);
});
