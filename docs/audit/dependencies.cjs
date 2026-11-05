// Sends only public package names/versions from the lockfile to the npm advisory API.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'symbiote/package-lock.json'), 'utf8'));
const packages = {};
const mismatches = [];
for (const [location, data] of Object.entries(lock.packages)) {
  if (!location || !data.version) continue;
  const name = data.name || location.split('node_modules/').pop();
  packages[name] = [...new Set([...(packages[name] || []), data.version])];
  const installed = path.join(root, 'symbiote', location, 'package.json');
  if (fs.existsSync(installed)) {
    const actual = JSON.parse(fs.readFileSync(installed, 'utf8')).version;
    if (actual !== data.version) mismatches.push({ name, locked: data.version, installed: actual });
  }
}
(async () => {
  try {
    const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(packages), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const advisories = await response.json();
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), packageNames: Object.keys(packages).length, installedVersionMismatches: mismatches, advisories }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ packageNames: Object.keys(packages).length, installedVersionMismatches: mismatches, error: error.message }, null, 2));
    process.exitCode = 1;
  }
})();
