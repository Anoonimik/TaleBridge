import React, { useState, useEffect, useRef } from 'react';
import { useRosterStore, wsBridge } from '../../shared';

export const PlayerNotesEditor = () => {
  const { playerData, playerCharacterName, setPlayerData } = useRosterStore();
  const [notes, setNotes] = useState(playerData?.playerNotes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [savedTime, setSavedTime] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (playerData?.playerNotes !== undefined) {
      setNotes(playerData.playerNotes);
    }
  }, [playerData?.playerNotes]);

  const saveToObsidian = (text: string) => {
    if (!playerCharacterName) return;

    if (playerData) {
      setPlayerData({ ...playerData, playerNotes: text });
    }

    wsBridge.send('UPDATE_PLAYER_NOTES', {
      characterName: playerCharacterName,
      notes: text,
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setSavedTime(timeStr);
    setSaveStatus('saved');
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    setSaveStatus('saving');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveToObsidian(text);
    }, 800);
  };

  const handleToolInsert = (action: 'bullet' | 'bold' | 'quote' | 'crystal') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;

    let insert = '';
    if (action === 'bullet') insert = '\n- ';
    else if (action === 'bold') {
      const sel = val.slice(start, end) || 'важное';
      insert = `**${sel}**`;
    } else if (action === 'quote') insert = '\n> ';
    else if (action === 'crystal') insert = 'Кристалл Резонанса';

    const updated = val.slice(0, start) + insert + val.slice(end);
    setNotes(updated);
    setSaveStatus('saving');

    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + insert.length;
    }, 0);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveToObsidian(updated);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-2">
      <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Личный журнал: <span className="text-amber-400">{playerCharacterName || 'Герой'}</span>
          </h3>
          <p className="text-xs text-slate-400 m-0">
            Заметки синхронизируются с секцией «Заметки игрока» в Obsidian
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className={saveStatus === 'saving' ? 'text-amber-400' : 'text-slate-400'}>
            {saveStatus === 'saving' ? 'Сохранение...' : savedTime ? `Сохранено в ${savedTime}` : 'Сохранено'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[#10111a] p-1 rounded border border-[#1f2233] overflow-x-auto scrollbar-thin shrink-0">
        <button
          type="button"
          className="px-2.5 py-1 rounded text-xs bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] cursor-pointer"
          onClick={() => handleToolInsert('bullet')}
        >
          • Список
        </button>
        <button
          type="button"
          className="px-2.5 py-1 rounded text-xs bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] cursor-pointer font-bold"
          onClick={() => handleToolInsert('bold')}
        >
          B Жирный
        </button>
        <button
          type="button"
          className="px-2.5 py-1 rounded text-xs bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] cursor-pointer italic"
          onClick={() => handleToolInsert('quote')}
        >
          " Цитата
        </button>
        <button
          type="button"
          className="px-2.5 py-1 rounded text-xs bg-[#1a1d2d] hover:bg-[#25293d] text-indigo-300 border border-indigo-500/20 cursor-pointer"
          onClick={() => handleToolInsert('crystal')}
        >
          Кристалл
        </button>

        <div className="flex-1" />

        <button
          type="button"
          className="px-2.5 py-1 rounded text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 cursor-pointer font-medium"
          onClick={() => saveToObsidian(notes)}
        >
          Сохранить сейчас
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-[#141622] rounded-lg border border-[#262a3d] p-2 flex flex-col">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={handleChange}
          placeholder="Записывайте сюда улики, пароли, имена NPC, договорённости и догадки..."
          className="w-full h-full bg-transparent resize-none focus:outline-none text-xs text-slate-200 leading-relaxed font-sans placeholder-slate-500 scrollbar-thin"
        />
      </div>
    </div>
  );
};
