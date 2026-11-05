import React from 'react';
import { formatInlineText } from '../../../shared/lib/format-text';
import { taleSpireDriver } from '../../../shared/api/talespire';

interface NoteMarkdownBodyProps {
  markdown: string;
  characterName: string;
}

export const NoteMarkdownBody: React.FC<NoteMarkdownBodyProps> = ({ markdown, characterName }) => {
  if (!markdown) return null;

  const rawLines = markdown.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const onRoll = (formula: string, label: string) => {
    taleSpireDriver.rollDice(formula, `${characterName}: ${label}`);
  };

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(' ').trim();
    paragraphBuffer = [];
    if (!text) return;

    elements.push(
      <p key={key} className="m-0 leading-relaxed text-slate-300">
        {formatInlineText(text, onRoll)}
      </p>,
    );
  };

  const flushTable = (key: string) => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((line, idx) => {
        elements.push(
          <p key={`${key}-fallback-${idx}`} className="m-0 leading-relaxed text-slate-300">
            {formatInlineText(line, onRoll)}
          </p>,
        );
      });
      tableBuffer = [];
      return;
    }

    const rows = tableBuffer
      .filter((l) => !/^\|[\s\-:]+\|$/.test(l.replace(/\s/g, '')))
      .map((l) =>
        l
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim()),
      );

    tableBuffer = [];
    if (rows.length === 0) return;

    const [headerRow, ...bodyRows] = rows;

    elements.push(
      <div key={key} className="overflow-x-auto my-1 rounded border border-[#262a3d]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#141622] border-b border-[#262a3d]">
              {headerRow.map((cell, cIdx) => (
                <th
                  key={cIdx}
                  className="px-2 py-1.5 font-bold text-amber-300 uppercase text-[10px]"
                >
                  {formatInlineText(cell, onRoll)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`border-b border-[#1f2233] ${
                  rIdx % 2 === 0 ? 'bg-[#10111a]' : 'bg-[#141622]'
                }`}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-2 py-1 text-slate-200">
                    {formatInlineText(cell, onRoll)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Table lines
    if (line.startsWith('|') && line.endsWith('|')) {
      flushParagraph(`p-${i}`);
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable(`table-${i}`);
    }

    // Empty line
    if (!line) {
      flushParagraph(`p-${i}`);
      continue;
    }

    // Task item (- [ ] or - [x])
    const taskMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      flushParagraph(`p-${i}`);
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const itemText = taskMatch[2].trim();
      elements.push(
        <div
          key={`task-${i}`}
          className="flex items-start gap-2 py-0.5 pl-1 text-xs text-slate-200"
        >
          <span
            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border ${
              isChecked
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#141622] text-slate-500 border-[#262a3d]'
            }`}
          >
            {isChecked ? '✓' : ''}
          </span>
          <span className={`flex-1 ${isChecked ? 'text-slate-300' : 'text-slate-400'}`}>
            {formatInlineText(itemText, onRoll)}
          </span>
        </div>,
      );
      continue;
    }

    // Bullet list item (- ... or * ... or • ...)
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph(`p-${i}`);
      elements.push(
        <div
          key={`bullet-${i}`}
          className="flex items-start gap-2 py-0.5 pl-1 text-xs text-slate-200"
        >
          <span className="text-amber-400 text-xs shrink-0 font-bold mt-0.5">•</span>
          <span className="flex-1 leading-relaxed">
            {formatInlineText(bulletMatch[1].trim(), onRoll)}
          </span>
        </div>,
      );
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph(`p-${i}`);
      const hText = headingMatch[2].trim();
      elements.push(
        <h4
          key={`h-${i}`}
          className="text-xs uppercase font-bold text-amber-300 tracking-wider pt-2 border-b border-[#262a3d] pb-1 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span>{hText}</span>
        </h4>,
      );
      continue;
    }

    // Regular line
    paragraphBuffer.push(line);
  }

  if (tableBuffer.length > 0) flushTable(`table-end`);
  if (paragraphBuffer.length > 0) flushParagraph(`p-end`);

  return (
    <div className="bg-[#10111a] p-3.5 rounded-lg border border-[#1f2233] flex flex-col gap-2 text-xs leading-relaxed text-slate-300">
      {elements}
    </div>
  );
};
