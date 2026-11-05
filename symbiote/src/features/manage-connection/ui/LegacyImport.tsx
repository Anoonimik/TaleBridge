import { useState } from 'react';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { wsBridge } from '../../../shared/api/websocket';
import { useRosterStore } from '../../../shared/lib/useRosterStore';
import { legacyCharacterState, exportRecoveryData } from '../../../shared/lib/legacy-recovery';
import type { Character } from '../../../shared/types';
const labels: Record<string, string> = {
  skills: 'Навыки',
  temp_hp: 'Временные ХП',
  inspiration: 'Вдохновение',
  deathSaves: 'Спасброски от смерти',
  hitDice: 'Кости хитов',
  spellcastingAbility: 'Заклинательная характеристика',
  spellSlots: 'Ячейки заклинаний',
  spells: 'Заклинания',
  resources: 'Ресурсы',
  savingThrowsProficient: 'Владение спасбросками',
  currency: 'Кошелек',
};
export function LegacyImport() {
  const character = useRosterStore((s) => s.playerData);
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const legacy = character ? legacyCharacterState(character.name) : null;
  const apply = async () => {
    if (!character?.id || !legacy) return;
    setBusy(true);
    try {
      await wsBridge.request(
        'UPDATE_CHARACTER_STATE',
        {
          characterId: character.id,
          state: Object.fromEntries(selected.map((key) => [key, legacy[key]])),
        },
        { expectedRevision: character.revision },
      );
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка переноса');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 border-t border-slate-600 pt-3">
      <button
        type="button"
        className="underline text-left cursor-pointer hover:text-indigo-300 transition-colors"
        onClick={exportRecoveryData}
      >
        Скачать резервную копию локальных данных
      </button>
      {legacy && (
        <button
          type="button"
          className="underline text-left cursor-pointer hover:text-indigo-300 transition-colors"
          onClick={() => {
            setSelected([]);
            setError('');
            setOpen(true);
          }}
        >
          Восстановить старые данные персонажа
        </button>
      )}
      <ModalShell
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Восстановление: ${character?.name || ''}`}
        maxWidthClass="max-w-2xl"
      >
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          <p>
            Старая копия не содержит ID кампании. Сверьте персонажа и отметьте только данные для
            переноса. Отмеченные поля заменят серверные значения после проверки версии.
          </p>
          {Object.entries(legacy || {}).map(([key, value]) => (
            <label
              key={key}
              className="border border-slate-600 rounded p-2 cursor-pointer hover:bg-slate-800/40 transition-colors"
            >
              <span className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={selected.includes(key)}
                  className="cursor-pointer"
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, key] : selected.filter((k) => k !== key),
                    )
                  }
                />
                {labels[key] || key}
              </span>
              <span className="block text-slate-300 break-words">
                Старая копия: {JSON.stringify(value)}
              </span>
              <span className="block text-slate-400 break-words">
                Сервер: {JSON.stringify(character?.[key as keyof Character])}
              </span>
            </label>
          ))}
          <p role="alert" className="text-amber-300">
            {error}
          </p>
          <button
            type="button"
            disabled={busy || !selected.length}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            onClick={() => {
              void apply();
            }}
          >
            Перенести выбранные данные
          </button>
        </div>
      </ModalShell>
    </div>
  );
}
