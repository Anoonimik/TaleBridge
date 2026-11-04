import React from 'react';
import { useCombatStore } from '../../store/useCombatStore';
import { useRosterStore } from '../../store/useRosterStore';

export const PlayerCombatHud = () => {
  const { active: combatActive, round, turnIndex, combatants } = useCombatStore();
  const { playerCharacterName } = useRosterStore();

  if (!combatActive || combatants.length === 0) return null;

  const currentCombatant = combatants[turnIndex];
  const isMyTurn = currentCombatant && currentCombatant.name.toLowerCase() === playerCharacterName.toLowerCase();

  return (
    <div className={`player-combat-hud ${isMyTurn ? 'my-turn-active' : ''}`}>
      <div className="player-combat-header">
        <div className="player-combat-title">
          <span className="combat-active-dot"></span>
          <strong>БОЙ: РАУНД {round}</strong>
        </div>
        <div className={`player-turn-status-banner ${isMyTurn ? 'is-me' : ''}`}>
          {isMyTurn ? (
            <span className="my-turn-alert">СЕЙЧАС ВАШ ХОД!</span>
          ) : (
            <span>
              Ходит: <strong>{currentCombatant?.name}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="player-turn-order-scrollbox">
        <div className="player-turn-order-list">
          {combatants.map((c, idx) => {
            const isActive = idx === turnIndex;
            const isMe = c.name.toLowerCase() === playerCharacterName.toLowerCase();
            const hasActed = idx < turnIndex;

            let catClass = 'enemy';
            if (c.isPlayer || c.category === 'Игроки' || c.category === 'Игрок') catClass = 'player';
            else if (c.category === 'Союзники' || c.category === 'Союзник') catClass = 'ally';
            else if (c.category === 'Нейтрал' || c.category === 'Нейтралы' || c.category === 'Нейтральный') catClass = 'neutral';

            return (
              <div
                key={c.id}
                className={`player-turn-order-row ${isActive ? 'is-active-turn' : ''} ${isMe ? 'is-me' : ''} ${hasActed ? 'acted' : ''}`}
              >
                <span className="turn-order-num">#{idx + 1}</span>
                <div className="turn-order-name-box">
                  <span className="turn-order-name" title={c.name}>
                    {c.name}
                  </span>
                  {isMe && <span className="turn-order-badge-me">ВЫ</span>}
                  <span className={`turn-order-cat-tag ${catClass}`}>
                    {c.category || 'Враг'}
                  </span>
                </div>

                <span className="turn-order-init" title="Инициатива">
                  [{c.initiative ?? '—'}]
                </span>

                {isActive ? (
                  <span className="turn-order-state-pill">
                    <span className="turn-pulse-dot" style={{ width: 6, height: 6 }}></span>
                    ХОДИТ
                  </span>
                ) : hasActed ? (
                  <span style={{ fontSize: '8.5px', color: '#64748b' }}>(ходил)</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
