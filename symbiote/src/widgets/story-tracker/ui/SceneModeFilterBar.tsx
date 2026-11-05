import React from 'react';

export type StoryMode = 'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches';

interface SceneModeFilterBarProps {
  mode: StoryMode;
  onSetMode: (mode: StoryMode) => void;
}

const MODES: { id: StoryMode; num: string; label: string }[] = [
  { id: 'all', num: '1', label: 'Все' },
  { id: 'readAloud', num: '2', label: 'Зачитка' },
  { id: 'roleplay', num: '3', label: 'Отыгрыш' },
  { id: 'mechanics', num: '4', label: 'Проверки' },
  { id: 'branches', num: '5', label: 'Развилки' },
];

export const SceneModeFilterBar: React.FC<SceneModeFilterBarProps> = ({ mode, onSetMode }) => {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#10111a] border-b border-[#1f2233] overflow-x-auto scrollbar-thin shrink-0">
      {MODES.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border flex items-center gap-1.5 whitespace-nowrap ${
            mode === tab.id
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-[#141622] text-slate-400 border-[#262a3d] hover:text-slate-200 hover:bg-[#1a1d2d]'
          }`}
          onClick={() => onSetMode(tab.id)}
        >
          <span className="text-[10px] font-mono opacity-60">[{tab.num}]</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
