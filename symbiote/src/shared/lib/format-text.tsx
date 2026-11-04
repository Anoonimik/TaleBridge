import React from 'react';
import { taleSpireDriver } from '../api/talespire';

/**
 * Parses inline markdown and Obsidian interactive tags:
 * - Dice tags: [dice:1d8+2|Лечение Голема] -> interactive roll button
 * - Wiki-links: [[Page|Label]] -> Label, [[Page]] -> Page
 * - Bold: **text** -> <strong>text</strong>
 * - Italic: *text* or _text_ -> <em>text</em>
 */
export const formatInlineText = (
  text: string,
  onRoll?: (formula: string, label: string) => void
): React.ReactNode => {
  if (!text) return '';

  // Step 1: Clean wiki-links [[Target|Label]] -> Label, [[Target]] -> Target
  const cleanWiki = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    return (label || target).trim();
  });

  // Step 2: Split by [dice:formula|label] or [dice:formula]
  const diceParts = cleanWiki.split(/(\[dice:[^\]]+\])/g);

  return diceParts.map((dPart, dIdx) => {
    const diceMatch = dPart.match(/^\[dice:([^\]|]+)(?:\|([^\]]+))?\]$/);
    if (diceMatch) {
      const formula = diceMatch[1].trim();
      const label = (diceMatch[2] || formula).trim();

      return (
        <button
          key={`dice-${dIdx}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onRoll) {
              onRoll(formula, label);
            } else {
              taleSpireDriver.rollDice(formula, label);
            }
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold cursor-pointer transition-colors align-middle shadow-xs"
          title={`Бросить ${formula} (${label})`}
        >
          <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>{label}</span>
          {label !== formula && <span className="opacity-70 text-[10px]">({formula})</span>}
        </button>
      );
    }

    // Step 3: Split by bold **...**
    const boldParts = dPart.split(/(\*\*[^*]+\*\*)/g);

    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        const content = bPart.slice(2, -2);
        return (
          <strong key={`b-${dIdx}-${bIdx}`} className="font-semibold text-slate-100">
            {content}
          </strong>
        );
      }

      // Step 4: Split by italic _..._ or *...*
      const italicParts = bPart.split(/(_[^_]+_|\*[^*]+\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (
          (iPart.startsWith('_') && iPart.endsWith('_')) ||
          (iPart.startsWith('*') && iPart.endsWith('*'))
        ) {
          const content = iPart.slice(1, -1);
          return (
            <em key={`i-${dIdx}-${bIdx}-${iIdx}`} className="italic text-slate-200">
              {content}
            </em>
          );
        }

        return iPart;
      });
    });
  });
};
