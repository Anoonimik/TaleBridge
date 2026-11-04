import React, { useState } from 'react';
import { useLogStore } from '../../store/useLogStore';
import { useAppStore } from '../../store/useAppStore';
import { wsBridge } from '../../api/websocket';

export const ToolsPanel = () => {
  const { logs, clearLogs } = useLogStore();
  const { gmDiceMode } = useAppStore();
  const [customFormula, setCustomFormula] = useState('1d20+5');

  const dice = [4, 6, 8, 10, 12, 20, 100];
  const isSecret = gmDiceMode === 'secret';

  const handleRollDie = (d: number) => {
    wsBridge.rollDice(`1d${d}`, `Бросок d${d}`, isSecret);
  };

  const handleRollCustom = (adv?: 'adv' | 'dis') => {
    let formula = customFormula.trim() || '1d20';
    let name = `Бросок: ${formula}`;
    if (adv === 'adv') name += ' (Преимущество)';
    if (adv === 'dis') name += ' (Помеха)';
    wsBridge.rollDice(formula, name, isSecret);
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Quick Dice Bar */}
      <div className="bg-[#131522] border border-[#252a3e] rounded-xl p-3 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Быстрый бросок костей [{isSecret ? 'Скрытый' : 'Открытый'}]:
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {dice.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleRollDie(d)}
              className="py-2 bg-[#1a1d2e] hover:bg-indigo-600 text-slate-200 hover:text-white border border-[#2c324b] hover:border-indigo-500 rounded-lg text-xs font-black transition cursor-pointer"
            >
              d{d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            placeholder="Формула, напр. 2d6+4"
            className="flex-1 px-2.5 py-1.5 bg-[#0f111c] border border-[#2b3147] rounded text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleRollCustom()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer"
          >
            Бросить
          </button>
          <button
            type="button"
            onClick={() => handleRollCustom('adv')}
            className="px-2 py-1.5 bg-emerald-950/50 hover:bg-emerald-800 text-emerald-300 rounded text-xs font-bold border border-emerald-800/60 cursor-pointer"
            title="С преимуществом"
          >
            ПРЕ
          </button>
          <button
            type="button"
            onClick={() => handleRollCustom('dis')}
            className="px-2 py-1.5 bg-rose-950/50 hover:bg-rose-800 text-rose-300 rounded text-xs font-bold border border-rose-800/60 cursor-pointer"
            title="С помехой"
          >
            ПОМ
          </button>
        </div>
      </div>

      {/* System Logs Console */}
      <div className="flex-1 bg-[#131522] border border-[#252a3e] rounded-xl p-3 flex flex-col gap-2 min-h-[220px]">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Журнал событий и бросков:
          </span>
          <button
            type="button"
            onClick={clearLogs}
            className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            Очистить
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-xs italic text-center my-auto">Журнал пуст</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-1.5 rounded bg-black/20 border border-white/3"
              >
                <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                <span
                  className={
                    log.type === 'roll'
                      ? 'text-indigo-300 font-semibold'
                      : log.type === 'error'
                      ? 'text-red-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
