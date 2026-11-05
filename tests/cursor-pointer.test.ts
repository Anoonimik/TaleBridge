import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (/\.(tsx|jsx)$/.test(file)) results.push(full);
  });
  return results;
}

test('base index.css defines global cursor pointer and disabled cursor rules', () => {
  const css = fs.readFileSync('symbiote/src/app/index.css', 'utf8');
  assert.ok(css.includes('cursor: pointer'), 'index.css must define cursor: pointer');
  assert.ok(css.includes('cursor: not-allowed'), 'index.css must define cursor: not-allowed for disabled states');
});

test('all buttons, selects, and interactive checkboxes in symbiote define cursor-pointer', () => {
  const files = walk('symbiote/src');
  const missing: string[] = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    let i = 0;
    while (i < content.length) {
      if (content[i] === '<' && /[a-zA-Z]/.test(content[i + 1] || '')) {
        const tagStart = i;
        i++;
        let tagName = '';
        while (i < content.length && /[a-zA-Z0-9_.-]/.test(content[i])) {
          tagName += content[i];
          i++;
        }

        let braceDepth = 0;
        let inQuote: string | null = null;
        let tagEnd = -1;

        while (i < content.length) {
          const c = content[i];
          if (inQuote) {
            if (c === inQuote && content[i - 1] !== '\\') inQuote = null;
          } else {
            if (c === '"' || c === "'" || c === '`') inQuote = c;
            else if (c === '{') braceDepth++;
            else if (c === '}') braceDepth = Math.max(0, braceDepth - 1);
            else if (c === '>' && braceDepth === 0) {
              tagEnd = i;
              break;
            }
          }
          i++;
        }

        if (tagEnd !== -1) {
          const tagText = content.slice(tagStart, tagEnd + 1);
          const lineNum = content.slice(0, tagStart).split('\n').length;
          const hasCursor =
            /\bcursor-(pointer|not-allowed|move|grab|grabbing|default|text)\b/.test(tagText) ||
            /cursor\s*:\s*pointer/.test(tagText);

          if (tagName === 'button' && !hasCursor) {
            missing.push(`[BUTTON] ${file}:${lineNum}`);
          } else if (tagName === 'select' && !hasCursor) {
            missing.push(`[SELECT] ${file}:${lineNum}`);
          } else if (
            tagName === 'input' &&
            /type=["'](checkbox|radio)["']/.test(tagText) &&
            !hasCursor
          ) {
            missing.push(`[CHECKBOX/RADIO] ${file}:${lineNum}`);
          } else if (tagName !== 'button' && /\bonClick\b/.test(tagText) && !hasCursor) {
            const isBackdrop =
              /fixed inset-0/.test(tagText) || /stopPropagation/.test(tagText);
            if (!isBackdrop) {
              missing.push(`[INTERACTIVE ${tagName}] ${file}:${lineNum}`);
            }
          }
        }
      } else {
        i++;
      }
    }
  });

  assert.deepEqual(missing, [], `Interactive elements missing cursor pointer: \n${missing.join('\n')}`);
});
