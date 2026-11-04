// --- FSD: Widgets Layer - Player Combat HUD Widget ---

(function() {
    class PlayerCombatHudWidget {
        constructor() {
            this.container = null;
            this.isCollapsed = false;
            try {
                this.isCollapsed = localStorage.getItem('tb_player_combat_collapsed') === 'true';
            } catch (e) {
                this.isCollapsed = false;
            }
        }

        init(containerId = 'playerCombatHudBox') {
            this.container = document.getElementById(containerId);
            if (!this.container) return;

            const reRender = () => this.render();

            window.TBState?.on('combatState', reRender);
            window.TBState?.on('combatActive', reRender);
            window.TBState?.on('combatRound', reRender);
            window.TBState?.on('combatTurnIndex', reRender);
            window.TBState?.on('combatants', reRender);
            window.TBState?.on('playerData', reRender);
            window.TBState?.on('playerCharacter', reRender);

            this.render();
        }

        render() {
            if (!this.container || !document.body.contains(this.container)) {
                this.container = document.getElementById('playerCombatHudBox');
            }
            if (!this.container) return;

            const combatActive = window.TBState?.get('combatActive') || false;
            const combatants = window.TBState?.get('combatants') || [];

            // If combat is not active or empty, hide the modular combat HUD
            if (!combatActive || combatants.length === 0) {
                this.container.style.display = 'none';
                this.container.innerHTML = '';
                return;
            }

            this.container.style.display = 'block';

            const round = window.TBState?.get('combatRound') || 1;
            const turnIndex = window.TBState?.get('combatTurnIndex') || 0;
            const activeCombatant = combatants[turnIndex] || null;

            const curPlayerData = window.TBState?.get('playerData');
            const curCharName = window.TBState?.get('playerCharacter') || curPlayerData?.name || '';

            const myCombatant = combatants.find(c => c.name && c.name.toLowerCase() === curCharName.toLowerCase());
            const isMyTurn = activeCombatant && myCombatant && (activeCombatant.id === myCombatant.id || activeCombatant.name.toLowerCase() === curCharName.toLowerCase());

            // Calculate turns until player's turn
            let turnStatusHtml = '';
            let pillClass = 'waiting';
            if (isMyTurn) {
                pillClass = 'your-turn';
                turnStatusHtml = `
                    <span class="turn-pulse-dot"></span>
                    <span>ВАШ ХОД! (Вы ходите прямо сейчас)</span>
                `;
            } else if (myCombatant) {
                const myIndex = combatants.findIndex(c => c.id === myCombatant.id);
                if (myIndex > turnIndex) {
                    const diff = myIndex - turnIndex;
                    if (diff === 1) {
                        pillClass = 'next-turn';
                        turnStatusHtml = `<span>Ваш ход следующий!</span> (ходит: <b>${this.escape(activeCombatant?.name || '')}</b>)`;
                    } else {
                        turnStatusHtml = `<span>Ваш ход через ${diff} хода</span> (ходит: <b>${this.escape(activeCombatant?.name || '')}</b>)`;
                    }
                } else if (myIndex < turnIndex) {
                    turnStatusHtml = `<span>Ход завершен в этом раунде</span> (ходит: <b>${this.escape(activeCombatant?.name || '')}</b>)`;
                } else {
                    turnStatusHtml = `<span>Ходит: <b>${this.escape(activeCombatant?.name || '')}</b></span>`;
                }
            } else {
                turnStatusHtml = `<span>Ходит: <b>${this.escape(activeCombatant?.name || '')}</b></span>`;
            }

            // Player's personal HP & conditions
            const playerHp = myCombatant ? Number(myCombatant.hp) : (curPlayerData ? Number(curPlayerData.hp) : 0);
            const playerMaxHp = myCombatant ? Number(myCombatant.maxHp) : (curPlayerData ? Number(curPlayerData.maxHp || curPlayerData.hp) : 1);
            const hpPct = Math.max(0, Math.min(100, Math.round((playerHp / (playerMaxHp || 1)) * 100)));

            const myConditions = myCombatant?.conditions || [];

            this.container.innerHTML = `
                <div class="player-combat-hud-card ${isMyTurn ? 'is-my-turn' : ''}">
                    <!-- Top Header -->
                    <div class="player-combat-hud-header">
                        <div class="player-combat-hud-left">
                            <span class="player-combat-round-badge">Раунд ${round}</span>
                            <div class="player-turn-state-pill ${pillClass}">
                                ${turnStatusHtml}
                            </div>
                        </div>
                        <div class="player-combat-hud-right">
                            ${isMyTurn ? `
                                <button id="btnPlayerFinishTurn" class="btn-player-finish-turn" title="Завершить свой ход и передать инициативу следующему">Завершить ход ▸</button>
                            ` : ''}
                            <button id="btnToggleHudCollapse" class="btn-toggle-hud-collapse" title="${this.isCollapsed ? 'Развернуть детали боя' : 'Свернуть детали боя'}">
                                ${this.isCollapsed ? '+ Очередь ходов' : '− Свернуть'}
                            </button>
                        </div>
                    </div>

                    <!-- Expandable Body -->
                    <div class="player-combat-hud-body" style="display: ${this.isCollapsed ? 'none' : 'flex'};">
                        <!-- Player's Personal Status Card -->
                        <div class="player-combat-status-card">
                            <div class="player-status-row">
                                <span class="player-status-title">Ваш статус в бою (${this.escape(curCharName || 'Герой')}):</span>
                                <span class="player-status-meta">
                                    ${myCombatant ? `Инициатива: <b>${myCombatant.initiative ?? '—'}</b>` : ''}
                                    • Здоровье: <b>${playerHp}/${playerMaxHp} HP</b> (${hpPct}%)
                                </span>
                            </div>

                            ${myConditions.length > 0 ? `
                                <div class="player-hud-conditions-list">
                                    ${myConditions.map(condId => {
                                        const meta = window.TBFeatureManageCombat?.getConditionMeta(condId) || { name: condId, color: '#64748b', desc: '' };
                                        return `
                                            <div class="player-hud-condition-entry" style="--cond-color: ${meta.color};">
                                                <span class="player-hud-condition-chip" style="background: ${meta.color}25; border-color: ${meta.color}; color: ${meta.color};">
                                                    ${this.escape(meta.name)}
                                                </span>
                                                <span class="player-hud-condition-desc">${this.escape(meta.desc || 'Активное состояние')}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `
                                <div class="player-healthy-hint">В строю (нет активных дебаффов)</div>
                            `}
                        </div>

                        <!-- Turn Order Queue -->
                        <div class="player-turn-order-section">
                            <div class="player-turn-order-header">
                                <span>Порядок ходов (${combatants.length} участников):</span>
                                <span style="font-size: 9px; color: var(--text-muted);">Текущий ход: № ${turnIndex + 1}</span>
                            </div>
                            <div class="player-turn-order-list">
                                ${combatants.map((c, idx) => {
                                    const isActive = idx === turnIndex;
                                    const isMe = myCombatant && (c.id === myCombatant.id || c.name.toLowerCase() === curCharName.toLowerCase());
                                    const hasActed = idx < turnIndex;

                                    let catClass = 'enemy';
                                    if (c.isPlayer || c.category === 'Игроки' || c.category === 'Игрок') catClass = 'player';
                                    else if (c.category === 'Союзники' || c.category === 'Союзник') catClass = 'ally';
                                    else if (c.category === 'Нейтрал' || c.category === 'Нейтралы' || c.category === 'Нейтральный') catClass = 'neutral';

                                    const conditions = Array.isArray(c.conditions) ? c.conditions : [];

                                    return `
                                        <div class="player-turn-order-row ${isActive ? 'is-active-turn' : ''} ${isMe ? 'is-me' : ''} ${hasActed ? 'acted' : ''}">
                                            <span class="turn-order-num">#${idx + 1}</span>
                                            <div class="turn-order-name-box">
                                                <span class="turn-order-name" title="${this.escape(c.name)}">${this.escape(c.name)}</span>
                                                ${isMe ? '<span class="turn-order-badge-me">ВЫ</span>' : ''}
                                                <span class="turn-order-cat-tag ${catClass}">${this.escape(c.category || 'Враг')}</span>
                                            </div>

                                            <span class="turn-order-init" title="Инициатива">[${c.initiative ?? '—'}]</span>

                                            ${isActive ? `
                                                <span class="turn-order-state-pill">
                                                    <span class="turn-pulse-dot" style="width: 6px; height: 6px;"></span>
                                                    ХОДИТ
                                                </span>
                                            ` : (hasActed ? '<span style="font-size: 8.5px; color: #64748b;">(ходил)</span>' : '')}

                                            ${conditions.length > 0 ? `
                                                <div class="turn-order-conds">
                                                    ${conditions.map(condId => {
                                                        const meta = window.TBFeatureManageCombat?.getConditionMeta(condId) || { name: condId, color: '#64748b', desc: '' };
                                                        return `
                                                            <span class="turn-mini-cond-chip" style="background: ${meta.color}25; border-color: ${meta.color}; color: ${meta.color};" title="${this.escape(meta.name)}: ${this.escape(meta.desc || '')}">
                                                                ${this.escape(meta.name)}
                                                            </span>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Bind finish turn action
            const btnFinish = this.container.querySelector('#btnPlayerFinishTurn');
            if (btnFinish) {
                btnFinish.onclick = () => {
                    window.TBFeatureManageCombat?.nextTurn();
                };
            }

            // Bind toggle collapse
            const btnToggle = this.container.querySelector('#btnToggleHudCollapse');
            if (btnToggle) {
                btnToggle.onclick = () => {
                    this.isCollapsed = !this.isCollapsed;
                    try {
                        localStorage.setItem('tb_player_combat_collapsed', this.isCollapsed);
                    } catch (e) {}
                    this.render();
                };
            }
        }

        escape(str) {
            return window.TBTextUtils?.escapeHtml ? window.TBTextUtils.escapeHtml(str) : String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
        }
    }

    const instance = new PlayerCombatHudWidget();
    window.TBWidgetPlayerCombatHud = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.playerCombatHud = instance;
})();
