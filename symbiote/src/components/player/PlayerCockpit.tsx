import React, { useState } from 'react';
import { Attack, InventoryItem } from '../../types';
import { useRosterStore } from '../../store/useRosterStore';
import { wsBridge } from '../../api/websocket';

export const PlayerCockpit: React.FC = () => {
  const { playerCharacterName, playerData, roster, updatePlayerAttacks } = useRosterStore();
  const [activeTab, setActiveTab] = useState<'sheet' | 'inventory' | 'clues'>('sheet');
  const [deletePrimedIdx, setDeletePrimedIdx] = useState<number | null>(null);

  // Edit / Add Action Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [actionName, setActionName] = useState('');
  const [actionHit, setActionHit] = useState('');
  const [actionDmg, setActionDmg] = useState('');
  const [actionType, setActionType] = useState('Оружие');
  const [actionDesc, setActionDesc] = useState('');

  // Fallback to roster if playerData not yet loaded
  const char = playerData || roster.find((r) => r.name.toLowerCase() === playerCharacterName.toLowerCase());

  if (!char) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="text-sm font-bold text-slate-300 mb-2">Загрузка данных персонажа...</div>
        <div className="text-xs">Персонаж: {playerCharacterName}</div>
      </div>
    );
  }

  const hp = char.hp ?? 20;
  const maxHp = char.hp_max ?? char.hp ?? 20;
  const hpPct = Math.max(0, Math.min(100, (hp / (maxHp || 1)) * 100));

  const stats = char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const getMod = (val: any) => {
    const num = parseInt(String(val || '10').replace(/\D/g, ''), 10) || 10;
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleOpenAddModal = () => {
    setModalIndex(null);
    setActionName('');
    setActionHit('+5');
    setActionDmg('1d8+3');
    setActionType('Оружие');
    setActionDesc('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (att: Attack, idx: number) => {
    setModalIndex(idx);
    setActionName(att.name);
    setActionHit(att.hit || '');
    setActionDmg(att.dmg || '');
    setActionType(att.type || 'Оружие');
    setActionDesc(att.desc || '');
    setModalOpen(true);
  };

  const handleSaveAction = () => {
    if (!actionName.trim()) return;
    const attacks = [...(char.attacks || [])];
    const newAtt: Attack = {
      name: actionName.trim(),
      hit: actionHit.trim() || undefined,
      dmg: actionDmg.trim() || undefined,
      type: actionType.trim() || undefined,
      desc: actionDesc.trim() || undefined,
    };

    if (modalIndex !== null) {
      attacks[modalIndex] = newAtt;
    } else {
      attacks.push(newAtt);
    }

    updatePlayerAttacks(attacks);
    wsBridge.updateCharacterActions(char.name, attacks);
    setModalOpen(false);
  };

  const handleDeleteAction = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || deletePrimedIdx === idx) {
      const attacks = [...(char.attacks || [])];
      attacks.splice(idx, 1);
      updatePlayerAttacks(attacks);
      wsBridge.updateCharacterActions(char.name, attacks);
      setDeletePrimedIdx(null);
      return;
    }

    setDeletePrimedIdx(idx);
    setTimeout(() => {
      setDeletePrimedIdx((curr) => (curr === idx ? null : curr));
    }, 3500);
  };

  const handleHpDelta = (delta: number) => {
    const nextHp = Math.max(0, Math.min(maxHp, hp + delta));
    wsBridge.updateCharacterParam(char.name, 'hp', nextHp);
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Player Header Identity */}
      <div className="flex items-center justify-between p-3 bg-[#131522] border border-[#252a3e] rounded-xl shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-white leading-tight">{char.name}</h2>
          <span className="text-xs font-semibold text-indigo-400">
            {char.class || 'Игрок'} • {char.category || 'Партия'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0e101a] p-1 rounded-lg border border-white/5">
          {(['sheet', 'inventory', 'clues'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                activeTab === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'sheet' ? 'Лист' : t === 'inventory' ? 'Инвентарь' : 'Улики'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'sheet' && (
        <>
          {/* Vitals Summary: HP, AC, Speed */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center p-2.5 bg-[#141726] border border-[#262c42] rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Здоровье</span>
              <span className="text-base font-extrabold text-white">
                {hp} / {maxHp}
              </span>
              <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => handleHpDelta(-1)}
                  className="px-1.5 py-0.5 bg-red-950/40 hover:bg-red-900 text-red-200 rounded text-[9.5px] font-bold cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleHpDelta(1)}
                  className="px-1.5 py-0.5 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-200 rounded text-[9.5px] font-bold cursor-pointer"
                >
                  +1
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 bg-[#141726] border border-[#262c42] rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Класс Доспеха</span>
              <span className="text-2xl font-black text-white">{char.ac || 10}</span>
              <span className="text-[10px] text-slate-400 mt-1">КД</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 bg-[#141726] border border-[#262c42] rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Скорость</span>
              <span className="text-lg font-black text-white">{char.speed || '30 фт.'}</span>
              <span className="text-[10px] text-slate-400 mt-1">Иниц: {getMod(stats.dex)}</span>
            </div>
          </div>

          {/* Ability Scores Grid */}
          <div className="bg-[#131522] border border-[#262b3e] rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Характеристики (клик для броска):
            </div>
            <div className="grid grid-cols-6 gap-1.5 text-center">
              {(
                [
                  { key: 'str', label: 'СИЛ' },
                  { key: 'dex', label: 'ЛОВ' },
                  { key: 'con', label: 'ТЕЛ' },
                  { key: 'int', label: 'ИНТ' },
                  { key: 'wis', label: 'МУД' },
                  { key: 'cha', label: 'ХАР' },
                ] as const
              ).map(({ key, label }) => {
                const val = (stats as any)[key] ?? 10;
                const mod = getMod(val);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => wsBridge.rollDice(`1d20${mod}`, `Проверка: ${char.name} (${label})`)}
                    className="flex flex-col items-center justify-center p-1.5 bg-[#1a1d2e] hover:bg-indigo-950/70 border border-[#2e344d] hover:border-indigo-500 rounded-lg transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-400">{label}</span>
                    <span className="text-sm font-extrabold text-white">{mod}</span>
                    <span className="text-[9.5px] text-slate-500">{val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions & Attacks List */}
          <div className="bg-[#131522] border border-[#262b3e] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Действия и атаки:
              </span>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition cursor-pointer"
              >
                + Добавить
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {(!char.attacks || char.attacks.length === 0) ? (
                <div className="text-xs text-slate-500 text-center py-4">Нет добавленных атак</div>
              ) : (
                char.attacks.map((att, idx) => {
                  const isPrimed = deletePrimedIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2.5 rounded-lg bg-[#181b2a] border border-[#2a2f44] hover:border-slate-600 transition"
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-white">{att.name}</strong>
                          {att.type && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-semibold">
                              {att.type}
                            </span>
                          )}
                        </div>
                        {att.desc && <div className="text-[11px] text-slate-400">{att.desc}</div>}
                        <div className="flex items-center gap-1.5 mt-1">
                          {att.hit && (
                            <button
                              type="button"
                              onClick={() => wsBridge.rollDice(att.hit!, `Атака [${char.name}]: ${att.name}`)}
                              className="px-2 py-0.5 bg-indigo-950/70 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[10.5px] font-bold border border-indigo-900/60 transition cursor-pointer"
                            >
                              Атака ({att.hit})
                            </button>
                          )}
                          {att.dmg && (
                            <button
                              type="button"
                              onClick={() => wsBridge.rollDice(att.dmg!, `Урон [${char.name}]: ${att.name}`)}
                              className="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-700 text-rose-300 hover:text-white rounded text-[10.5px] font-bold border border-rose-900/60 transition cursor-pointer"
                            >
                              Урон ({att.dmg})
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(att, idx)}
                          className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded text-[10.5px] cursor-pointer"
                          title="Редактировать"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAction(idx, e)}
                          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                            isPrimed
                              ? 'bg-red-600 text-white font-extrabold px-2'
                              : 'bg-white/5 hover:bg-red-950/50 text-slate-400 hover:text-red-400'
                          }`}
                          title="Удалить действие (кликните дважды или Shift+клик)"
                        >
                          {isPrimed ? 'Удалить?' : '✕'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Action Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-[360px] bg-[#161928] border border-[#2e354e] rounded-xl shadow-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-white/10">
              {modalIndex !== null ? 'Редактировать действие' : 'Новое действие или атака'}
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-400">Название</label>
              <input
                type="text"
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                placeholder="Например: Длинный меч"
                className="px-2.5 py-1.5 bg-[#0f111c] border border-[#2d344d] rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Бонус атаки</label>
                  <input
                    type="text"
                    value={actionHit}
                    onChange={(e) => setActionHit(e.target.value)}
                    placeholder="+5"
                    className="w-full px-2.5 py-1.5 bg-[#0f111c] border border-[#2d344d] rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Формула урона</label>
                  <input
                    type="text"
                    value={actionDmg}
                    onChange={(e) => setActionDmg(e.target.value)}
                    placeholder="1d8+3"
                    className="w-full px-2.5 py-1.5 bg-[#0f111c] border border-[#2d344d] rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="text-[11px] font-semibold text-slate-400">Описание / свойства</label>
              <textarea
                value={actionDesc}
                onChange={(e) => setActionDesc(e.target.value)}
                placeholder="Универсальное (1d10), рубящий..."
                rows={2}
                className="px-2.5 py-1.5 bg-[#0f111c] border border-[#2d344d] rounded text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#1f2334] hover:bg-[#2c3248] text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveAction}
                className="px-4 py-1.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
