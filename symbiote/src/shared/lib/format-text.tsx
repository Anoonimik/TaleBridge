import React from 'react';

/**
 * Parses inline markdown:
 * - Wiki-links: [[Page|Label]] -> Label, [[Page]] -> Page
 * - Bold: **text** -> <strong>text</strong>
 * - Italic: *text* or _text_ -> <em>text</em>
 * - Code: `code` -> <code>code</code>
 */
export const formatInlineText = (text: string): React.ReactNode => {
  if (!text) return '';

  // Step 1: Clean wiki-links [[Target|Label]] -> Label, [[Target]] -> Target
  const cleanWiki = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    return (label || target).trim();
  });

  // Step 2: Split by bold **...**
  const boldParts = cleanWiki.split(/(\*\*[^*]+\*\*)/g);

  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      const content = bPart.slice(2, -2);
      return (
        <strong key={`b-${bIdx}`} className="font-semibold text-slate-100">
          {content}
        </strong>
      );
    }

    // Step 3: Split by italic _..._ or *...*
    const italicParts = bPart.split(/(_[^_]+_|\*[^*]+\*)/g);
    return italicParts.map((iPart, iIdx) => {
      if ((iPart.startsWith('_') && iPart.endsWith('_')) || (iPart.startsWith('*') && iPart.endsWith('*'))) {
        const content = iPart.slice(1, -1);
        return (
          <em key={`i-${bIdx}-${iIdx}`} className="italic text-slate-200">
            {content}
          </em>
        );
      }

      return iPart;
    });
  });
};
