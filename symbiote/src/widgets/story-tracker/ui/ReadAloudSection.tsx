import React from 'react';
import { formatInlineText } from '../../../shared/lib/format-text';
import { useAppStore } from '../../../shared/lib/useAppStore';
import { wsBridge } from '../../../shared/api/websocket';

interface ReadAloudSectionProps {
  sceneTitle?: string;
  readAloudItems: string[];
}

export const ReadAloudSection: React.FC<ReadAloudSectionProps> = ({
  sceneTitle,
  readAloudItems,
}) => {
  if (readAloudItems.length === 0) return null;

  const handleBroadcast = (text: string) => {
    const handout = {
      type: 'text' as const,
      url: '',
      title: sceneTitle || 'Сюжетное послание',
      description: text,
      content: text,
      active: true,
    };
    useAppStore.getState().setCinemaMedia(handout);
    wsBridge.send('BROADCAST_HANDOUT', handout);
  };

  return (
    <div className="bg-[#141622] border-l-4 border-amber-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
        Текст для зачитки игрокам:
      </div>
      {readAloudItems.map((text, idx) => (
        <div key={idx} className="flex flex-col gap-1.5 pl-3 border-l-2 border-amber-400/50">
          <blockquote className="m-0 text-sm text-amber-200/90 italic leading-relaxed">
            «{formatInlineText(text)}»
          </blockquote>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleBroadcast(text)}
              className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer font-medium transition-colors"
              title="Показать этот текст игрокам на весь экран как древний свиток"
            >
              Транслировать свиток ▸
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
