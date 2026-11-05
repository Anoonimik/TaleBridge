import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useRosterStore } from '../../entities/character/model/store';
import { ClueCard } from '../../entities/clue/ui/ClueCard';

export const CluesArchive = () => {
  const { cluesArchive, removeClue } = useRosterStore(
    useShallow((s) => ({ cluesArchive: s.cluesArchive, removeClue: s.removeClue })),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-3">
      <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Архив полученных улик ({cluesArchive.length})
          </h3>
          <p className="text-xs text-slate-400 m-0">
            Полученные материалы сохраняются автоматически. Удаление действует только у вас на этом
            устройстве.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 scrollbar-thin">
        {cluesArchive.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-sm">
            Архив пуст. Во время показа материала нажмите «Сохранить у себя», чтобы добавить его
            сюда.
          </div>
        ) : (
          cluesArchive.map((clue) => <ClueCard key={clue.id} clue={clue} onDelete={removeClue} />)
        )}
      </div>
    </div>
  );
};
