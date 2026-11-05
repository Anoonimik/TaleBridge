import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

// Local packaging checks based on the official Manifest v1 documentation:
// https://symbiote-docs.talespire.com/manifest_doc_v1.html
// TaleSpire remains the authoritative parser.
export async function validateSymbiote(root) {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.manifestVersion !== 1 || typeof manifest.name !== 'string' ||
      !manifest.name.trim() || manifest.name.length > 80)
    throw new Error('Invalid Symbiote manifest version or name');
  if (manifest.about && Object.hasOwn(manifest.about, 'website')) {
    const url = new URL(manifest.about.website);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.'))
      throw new Error('Symbiote website must be a complete HTTP(S) URL');
  }
  for (const file of [manifest.entryPoint, manifest.descriptionFilePath].filter((v) => v !== undefined)) {
    if (typeof file !== 'string' || !file.startsWith('/') || file.includes('\\'))
      throw new Error('Expected a Symbiote-root-relative file path');
    const target = path.resolve(root, `.${file}`);
    if (!target.startsWith(path.resolve(root) + path.sep))
      throw new Error('Symbiote file escapes its root');
    await access(target);
  }
  return manifest;
}
