// --- FSD: Widgets Layer - Combat Tracker Widget ---

(function() {
    class CombatTrackerWidget {
        constructor() {
            this.container = null;
            this.activeConditionPickerTarget = null;
        }

        init(containerId = 'combatTrackerContainer') {
            this.container = document.getElementById(containerId);
            if (!this.container) return;

            window.TBState?.on('combatState', () => this.render());
            window.TBState?.on('combatants', () => this.render());
            window.TBState?.on('combatRound', () => this.render());
            window.TBState?.on('combatTurnIndex', () => this.render());
            window.TBState?.on('combatActive', () => this.render());

            this.setupKeyboardHotkeys();
            this.render();
        }

        setupKeyboardHotkeys() {
            if (this._hotkeysBound) return;
            this._hotkeysBound = true;

            document.addEventListener('keydown', (e) => {
                // Ignore when user is typing in an input or textarea
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                    return;
                }

                // Hotkeys only apply in GM mode when Combat tab is active and combat is running
                const role = window.TBState?.get('role') || 'gm';
                if (role !== 'gm') return;

                const combatTab = document.getElementById('tab-combat');
                if (!combatTab || !combatTab.classList.contains('active')) return;

                const combatActive = window.TBState?.get('combatActive');
                if (!combatActive) return;

                const turnIndex = window.TBState?.get('combatTurnIndex') || 0;
                const combatants = window.TBState?.get('combatants') || [];
                const cur = combatants[turnIndex];
                if (!cur) return;

                // Numbers 1-9 trigger attacks of the currently active creature
                const num = parseInt(e.key, 10);
                if (num >= 1 && num <= 9) {
                    let attacks = Array.isArray(cur.attacks) ? cur.attacks : [];
                    if (attacks.length === 0) {
                        const roster = window.TBState?.get('roster') || [];
                        const matched = roster.find(r => r.name && r.name.toLowerCase() === (cur.name || '').toLowerCase());
                        if (matched?.attacks) attacks = matched.attacks;
                    }
                    const atk = attacks[num - 1];
                    if (atk) {
                        e.preventDefault();
                        if (e.shiftKey && atk.dmg) {
                            window.TBFeatureRollDice?.rollAttack(atk.dmg, `${cur.name}: ${atk.name}`, 'dmg', null);
                        } else if (atk.hit) {
                            window.TBFeatureRollDice?.rollAttack(atk.hit, `${cur.name}: ${atk.name}`, 'hit', null);
                        } else if (atk.dmg) {
                            window.TBFeatureRollDice?.rollAttack(atk.dmg, `${cur.name}: ${atk.name}`, 'dmg', null);
                        }
                    }
                }
            });
        }

        render() {
            if (!this.container) return;

            const combatActive = window.TBState?.get('combatActive') || false;
            const round = window.TBState?.get('combatRound') || 1;
            const turnIndex = window.TBState?.get('combatTurnIndex') || 0;
            const combatants = window.TBState?.get('combatants') || [];

            // Update Tab Badge
            const tabBadge = document.getElementById('combatBadge');
            if (tabBadge) {
                if (combatActive) {
                    tabBadge.style.display = 'inline-block';
                    tabBadge.textContent = `R${round}`;
                    tabBadge.className = 'combat-badge active';
                } else {
                    tabBadge.style.display = 'none';
                }
            }

            const activeCombatant = combatants[turnIndex] || null;

            this.container.innerHTML = `
                <div class="combat-header-bar">
                    <div class="combat-status-box">
                        <div class="combat-status-pill ${combatActive ? 'active' : ''}">
                            <span class="combat-dot"></span>
                            <span class="combat-status-text">${combatActive ? `Раунд ${round}` : 'Вне боя'}</span>
                        </div>
                        ${combatActive && activeCombatant ? `
                            <div class="combat-current-turn-label">
                                Ход: <b>${this.escape(activeCombatant.name)}</b>
                            </div>
                        ` : ''}
                    </div>

                    <div class="combat-nav-controls">
                        ${combatActive ? `
                            <button id="btnCombatPrevTurn" class="btn-combat-action" title="Предыдущий ход">◂ Назад</button>
                            <button id="btnCombatNextTurn" class="btn-combat-action primary" title="Следующий ход">След. ход ▸</button>
                            <button id="btnCombatToggle" class="btn-combat-action danger" title="Завершить бой">Завершить бой</button>
                        ` : `
                            <button id="btnCombatToggle" class="btn-combat-action success" title="Начать бой">Начать бой</button>
                        `}
                    </div>
                </div>

                <div class="combat-quick-tools-bar">
                    <button id="btnCombatAddToken" class="btn-combat-tool" title="Добавить выбранную миниатюру на доске TaleSpire">
                        + Выбранный токен
                    </button>
                    <button id="btnCombatAddRoster" class="btn-combat-tool" title="Добавить персонажа из ростера">
                        + Из ростера ▾
                    </button>
                    <button id="btnCombatRollAll" class="btn-combat-tool" title="Автоматически бросить d20+ЛОВ всем участникам">
                        Бросить всем d20
                    </button>
                    <button id="btnCombatClear" class="btn-combat-tool muted" title="Очистить всех участников">
                        Очистить
                    </button>
                </div>

                <!-- Dropdown selector for roster adding -->
                <div id="combatRosterDropdown" class="combat-roster-dropdown" style="display: none;">
                    <div class="combat-roster-dropdown-header">
                        <span>Выберите персонажа:</span>
                        <button id="btnCloseRosterDropdown" class="btn-close-dropdown">✕</button>
                    </div>
                    <div id="combatRosterList" class="combat-roster-list"></div>
                </div>

                <div class="combatants-container">
                    ${combatants.length === 0 ? `
                        <div class="combat-empty-hint">
                            <div class="empty-title">Бой не сформирован</div>
                            <div class="empty-sub">Добавьте персонажей или выберите миниатюру в TaleSpire и нажмите «+ Выбранный токен»</div>
                            <div class="empty-actions">
                                <button id="btnCombatAutoFill" class="btn-combat-autofill">Заполнить игроками из партии</button>
                            </div>
                        </div>
                    ` : `
                        <div class="combatants-list">
                            ${combatants.map((c, idx) => this.renderCombatantCard(c, idx, turnIndex, combatActive)).join('')}
                        </div>
                    `}
                </div>

                <!-- Floating Conditions Picker Modal -->
                <div id="conditionsPickerModal" class="conditions-picker-modal" style="display: none;"></div>
            `;

            this.bindEvents(combatants, combatActive);
        }

        renderCombatantCard(c, index, currentTurnIndex, isCombatActive) {
            const isTurn = isCombatActive && (index === currentTurnIndex);
            const conditions = Array.isArray(c.conditions) ? c.conditions : [];
            const hp = Number(c.hp ?? 10);
            const maxHp = Number(c.maxHp ?? 10);
            const hpPct = Math.max(0, Math.min(100, (hp / (maxHp || 1)) * 100));

            let hpClass = 'high';
            if (hpPct <= 25) hpClass = 'critical';
            else if (hpPct <= 50) hpClass = 'medium';

            const category = c.category || (c.isPlayer ? 'Игроки' : 'Враги');
            let catClass = 'enemy';
            if (c.isPlayer || category === 'Игроки') catClass = 'player';
            else if (category === 'Союзники') catClass = 'ally';

            const dexMod = window.TBFeatureManageCombat?.extractDexModifier(c) || 0;
            const modStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

            // Resolve attacks for combatant (from c.attacks or fallback to roster / playerData)
            let attacks = Array.isArray(c.attacks) ? c.attacks : [];
            if (attacks.length === 0) {
                const roster = window.TBState?.get('roster') || [];
                const matched = roster.find(r => r.name && r.name.toLowerCase() === (c.name || '').toLowerCase());
                if (matched?.attacks && matched.attacks.length > 0) {
                    attacks = matched.attacks;
                    c.attacks = attacks;
                }
            }
            if (attacks.length === 0 && (c.isPlayer || category === 'Игроки')) {
                const curPlayer = window.TBState?.get('playerData');
                if (curPlayer && curPlayer.name && curPlayer.name.toLowerCase() === (c.name || '').toLowerCase() && curPlayer.attacks) {
                    attacks = curPlayer.attacks;
                    c.attacks = attacks;
                }
            }

            return `
                <div class="combatant-card ${isTurn ? 'is-current-turn' : ''} ${catClass}" data-id="${c.id}">
                    <div class="combatant-init-box">
                        ${isTurn ? '<div class="turn-indicator-badge">ХОД</div>' : ''}
                        <input type="number" class="combatant-init-input" value="${c.initiative ?? 10}" data-id="${c.id}" title="Инициатива: d20 ${modStr} ЛОВ (кликните для изменения)" />
                        <button class="btn-re-roll-init" data-id="${c.id}" title="Перебросить инициативу (d20 ${modStr} ЛОВ)">d20</button>
                    </div>

                    <div class="combatant-main-info">
                        <div class="combatant-top-row">
                            <span class="combatant-name" title="${this.escape(c.name)}">${this.escape(c.name)}</span>
                            <span class="combatant-cat-badge ${catClass}">${this.escape(category)}</span>
                            <span class="combatant-ac-badge" title="Класс доспеха">КД: ${c.ac || 10}</span>
                            ${c.speed ? `<span class="combatant-speed-badge" title="Скорость">${c.speed}</span>` : ''}
                        </div>

                        <div class="combatant-hp-row">
                            <div class="combatant-hp-bar-bg">
                                <div class="combatant-hp-bar-fill ${hpClass}" style="width: ${hpPct}%;"></div>
                            </div>
                            <span class="combatant-hp-text">${hp} / ${maxHp} HP</span>
                            <div class="combatant-hp-actions">
                                <button class="btn-hp-delta dmg" data-id="${c.id}" data-delta="-5" title="Нанести 5 урона">-5</button>
                                <button class="btn-hp-delta dmg" data-id="${c.id}" data-delta="-1" title="Нанести 1 урон">-1</button>
                                <button class="btn-hp-delta heal" data-id="${c.id}" data-delta="1" title="Восстановить 1 ХП">+1</button>
                                <button class="btn-hp-delta heal" data-id="${c.id}" data-delta="5" title="Восстановить 5 ХП">+5</button>
                            </div>
                        </div>

                        ${attacks.length > 0 ? `
                            <div class="combatant-attacks-row">
                                <span class="combatant-attacks-label">Атаки:</span>
                                <div class="combatant-attacks-list">
                                    ${attacks.map((att, atkIdx) => {
                                        const diceMode = window.TBState?.get('gmDiceMode') === 'open' ? 'Открытый' : 'Скрытый (GM)';
                                        return `
                                            <div class="combat-atk-unit ${isTurn ? 'active-turn-atk' : ''}" title="${this.escape(att.desc || att.name)}">
                                                ${isTurn ? `<span class="combat-atk-hotkey" title="Горячая клавиша: ${atkIdx + 1} (Атака), Shift+${atkIdx + 1} (Урон)">${atkIdx + 1}</span>` : ''}
                                                <span class="combat-atk-name">${this.escape(att.name)}</span>
                                                ${att.hit ? `
                                                    <button type="button" class="btn-combat-atk hit" data-char="${this.escape(c.name)}" data-name="${this.escape(att.name)}" data-formula="${att.hit}" title="Бросок атаки: 1d20${att.hit.startsWith('+') || att.hit.startsWith('-') ? att.hit : '+' + att.hit} [${diceMode}]${isTurn ? ` (Клавиша: ${atkIdx + 1})` : ''}">
                                                        Атк ${this.escape(att.hit)}
                                                    </button>
                                                ` : ''}
                                                ${att.dmg ? `
                                                    <button type="button" class="btn-combat-atk dmg" data-char="${this.escape(c.name)}" data-name="${this.escape(att.name)}" data-formula="${att.dmg}" title="Бросок урона: ${att.dmg} [${diceMode}]${isTurn ? ` (Клавиша: Shift+${atkIdx + 1})` : ''}">
                                                        Урон ${this.escape(att.dmg)}
                                                    </button>
                                                ` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="combatant-conditions-row">
                            <div class="conditions-block-header">
                                <span class="conditions-label">Дебаффы / Состояния (${conditions.length}):</span>
                                <button class="btn-add-condition" data-id="${c.id}" title="Наложить состояние D&D 5e">+ Добавить</button>
                            </div>
                            ${conditions.length > 0 ? `
                                <div class="conditions-details-list">
                                    ${conditions.map(condId => {
                                        const meta = window.TBFeatureManageCombat?.getConditionMeta(condId) || { name: condId, color: '#64748b', desc: '' };
                                        return `
                                            <div class="condition-detail-entry" style="--cond-color: ${meta.color};">
                                                <span class="condition-chip" style="background: ${meta.color}25; border-color: ${meta.color}; color: ${meta.color};">
                                                    ${this.escape(meta.name)}
                                                    <button class="btn-remove-cond" data-id="${c.id}" data-cond="${condId}" title="Снять ${this.escape(meta.name)}">✕</button>
                                                </span>
                                                <span class="condition-desc-text">${this.escape(meta.desc || '')}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="combatant-quick-actions">
                        ${c.creatureId ? `
                            <button class="btn-combatant-action camera" data-id="${c.id}" title="Сфокусировать камеру на миниатюре">Камера</button>
                        ` : ''}
                        ${c.path || c.name ? `
                            <button class="btn-combatant-action note" data-path="${c.path || c.name}" title="Открыть заметку существа">Заметка</button>
                        ` : ''}
                        <button class="btn-combatant-action remove" data-id="${c.id}" title="Удалить из боя">✕</button>
                    </div>
                </div>
            `;
        }

        bindEvents(combatants, combatActive) {
            if (!this.container) return;

            // Combat Toggle (Start / End)
            const btnToggle = this.container.querySelector('#btnCombatToggle');
            if (btnToggle) {
                btnToggle.onclick = () => {
                    if (combatActive) {
                        window.TBFeatureManageCombat?.endCombat();
                    } else {
                        window.TBFeatureManageCombat?.startCombat();
                    }
                };
            }

            // Next / Prev Turn
            const btnNext = this.container.querySelector('#btnCombatNextTurn');
            if (btnNext) {
                btnNext.onclick = () => window.TBFeatureManageCombat?.nextTurn();
            }

            const btnPrev = this.container.querySelector('#btnCombatPrevTurn');
            if (btnPrev) {
                btnPrev.onclick = () => window.TBFeatureManageCombat?.prevTurn();
            }

            // Quick Tool Buttons
            const btnAddToken = this.container.querySelector('#btnCombatAddToken');
            if (btnAddToken) {
                btnAddToken.onclick = () => window.TBFeatureManageCombat?.addSelectedToken();
            }

            const btnRollAll = this.container.querySelector('#btnCombatRollAll');
            if (btnRollAll) {
                btnRollAll.onclick = () => window.TBFeatureManageCombat?.rollAllInitiative(true);
            }

            const btnClear = this.container.querySelector('#btnCombatClear');
            if (btnClear) {
                btnClear.onclick = (e) => {
                    e.stopPropagation();
                    if (e.shiftKey || btnClear.dataset.primed === 'true') {
                        if (btnClear._resetTimer) clearTimeout(btnClear._resetTimer);
                        btnClear.dataset.primed = 'false';
                        btnClear.textContent = 'Очистить';
                        btnClear.classList.remove('danger');
                        window.TBFeatureManageCombat?.clearCombat();
                        return;
                    }

                    btnClear.dataset.primed = 'true';
                    btnClear.textContent = 'Точно очистить?';
                    btnClear.classList.add('danger');

                    if (btnClear._resetTimer) clearTimeout(btnClear._resetTimer);
                    btnClear._resetTimer = setTimeout(() => {
                        btnClear.dataset.primed = 'false';
                        btnClear.textContent = 'Очистить';
                        btnClear.classList.remove('danger');
                    }, 3500);
                };
            }

            const btnAutoFill = this.container.querySelector('#btnCombatAutoFill');
            if (btnAutoFill) {
                btnAutoFill.onclick = () => window.TBFeatureManageCombat?.populateFromRosterAndTokens();
            }

            // Add from Roster Dropdown
            const btnAddRoster = this.container.querySelector('#btnCombatAddRoster');
            const dropdown = this.container.querySelector('#combatRosterDropdown');
            const rosterListEl = this.container.querySelector('#combatRosterList');
            const btnCloseDropdown = this.container.querySelector('#btnCloseRosterDropdown');

            if (btnAddRoster && dropdown && rosterListEl) {
                btnAddRoster.onclick = (e) => {
                    e.stopPropagation();
                    const isVisible = dropdown.style.display !== 'none';
                    if (isVisible) {
                        dropdown.style.display = 'none';
                    } else {
                        this.renderRosterDropdown(rosterListEl, dropdown);
                        dropdown.style.display = 'block';
                    }
                };

                if (btnCloseDropdown) {
                    btnCloseDropdown.onclick = () => { dropdown.style.display = 'none'; };
                }
            }

            // Combatant Actions (Initiative Input, HP Delta, Conditions, Remove)
            this.container.querySelectorAll('.combatant-init-input').forEach(input => {
                input.onchange = () => {
                    const id = input.dataset.id;
                    const val = parseInt(input.value, 10);
                    if (!isNaN(val)) {
                        window.TBFeatureManageCombat?.setInitiative(id, val);
                    }
                };
            });

            this.container.querySelectorAll('.btn-re-roll-init').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const c = combatants.find(item => item.id === id);
                    if (c) {
                        const dexMod = window.TBFeatureManageCombat?.extractDexModifier(c) || 0;
                        const d20 = Math.floor(Math.random() * 20) + 1;
                        const total = d20 + dexMod;
                        const modStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
                        window.TBFeatureManageCombat?.setInitiative(id, total);
                        window.TBLogger?.log(`Переброс инициативы [${c.name}]: ${total} (d20: ${d20}, ЛОВ: ${modStr})`, 'sys');
                    }
                };
            });

            this.container.querySelectorAll('.btn-hp-delta').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const delta = parseInt(btn.dataset.delta, 10) || 0;
                    window.TBFeatureManageCombat?.applyHpDelta(id, delta);
                };
            });

            this.container.querySelectorAll('.btn-remove-cond').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const cond = btn.dataset.cond;
                    window.TBFeatureManageCombat?.removeCondition(id, cond);
                };
            });

            this.container.querySelectorAll('.btn-add-condition').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    this.openConditionsPicker(id);
                };
            });

            // Attack Action Buttons (Hit and Damage Rolls)
            this.container.querySelectorAll('.btn-combat-atk.hit').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const charName = btn.dataset.char || 'Существо';
                    const atkName = btn.dataset.name || 'Атака';
                    const hit = btn.dataset.formula || '+0';
                    window.TBFeatureRollDice?.rollAttack(hit, `${charName}: ${atkName}`, 'hit', null);
                };
            });

            this.container.querySelectorAll('.btn-combat-atk.dmg').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const charName = btn.dataset.char || 'Существо';
                    const atkName = btn.dataset.name || 'Атака';
                    const dmg = btn.dataset.formula || '1d6';
                    window.TBFeatureRollDice?.rollAttack(dmg, `${charName}: ${atkName}`, 'dmg', null);
                };
            });

            this.container.querySelectorAll('.btn-combatant-action.camera').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const c = combatants.find(item => item.id === id);
                    if (c && c.creatureId && window.TBApi?.gotoBookmark) {
                        window.TBApi.gotoBookmark(c.creatureId, c.name);
                    }
                };
            });

            this.container.querySelectorAll('.btn-combatant-action.note').forEach(btn => {
                btn.onclick = () => {
                    const path = btn.dataset.path;
                    if (path && window.TBNoteViewer) {
                        window.TBNoteViewer.openNote(path);
                    }
                };
            });

            this.container.querySelectorAll('.btn-combatant-action.remove').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    window.TBFeatureManageCombat?.removeCombatant(id);
                };
            });
        }

        renderRosterDropdown(container, dropdown) {
            const roster = window.TBState?.get('roster') || [];
            if (roster.length === 0) {
                container.innerHTML = '<div class="empty-hint">Ростер пуст. Синхронизируйте заметки в Obsidian.</div>';
                return;
            }

            container.innerHTML = roster.map(r => `
                <div class="roster-dropdown-item" data-name="${this.escape(r.name)}">
                    <span class="dropdown-item-name">${this.escape(r.name)}</span>
                    <span class="dropdown-item-meta">${r.category || 'Существо'} • КД ${r.ac || 10} • ${r.hp || 10} HP</span>
                </div>
            `).join('');

            container.querySelectorAll('.roster-dropdown-item').forEach(item => {
                item.onclick = () => {
                    const name = item.dataset.name;
                    const found = roster.find(r => r.name === name);
                    if (found) {
                        window.TBFeatureManageCombat?.addCombatant({
                            name: found.name,
                            category: found.category || 'Враги',
                            hp: found.hp || 10,
                            maxHp: found.hp_max || found.hp || 10,
                            ac: found.ac || 10,
                            speed: found.speed || '30 фт.',
                            path: found.path || null,
                            isPlayer: Boolean(found.playable || found.category === 'Игроки')
                        });
                        dropdown.style.display = 'none';
                    }
                };
            });
        }

        openConditionsPicker(combatantId) {
            const modal = this.container.querySelector('#conditionsPickerModal');
            if (!modal) return;

            const combatants = window.TBState?.get('combatants') || [];
            const c = combatants.find(item => item.id === combatantId);
            if (!c) return;

            const allConditions = window.TBConfig?.CONDITIONS_DND5E || [];
            const activeConditions = Array.isArray(c.conditions) ? c.conditions : [];

            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="conditions-picker-backdrop"></div>
                <div class="conditions-picker-card">
                    <div class="conditions-picker-header">
                        <div class="picker-title">Состояния: <b>${this.escape(c.name)}</b></div>
                        <button id="btnCloseConditionsPicker" class="btn-close-picker">✕</button>
                    </div>
                    <div class="conditions-picker-grid">
                        ${allConditions.map(cond => {
                            const isActive = activeConditions.includes(cond.id);
                            return `
                                <div class="condition-picker-item ${isActive ? 'active' : ''}" data-cond="${cond.id}" style="--cond-color: ${cond.color};">
                                    <div class="cond-item-title">
                                        <span class="cond-dot" style="background: ${cond.color};"></span>
                                        <b>${this.escape(cond.name)}</b>
                                        ${isActive ? '<span class="cond-check">✓</span>' : ''}
                                    </div>
                                    <div class="cond-item-desc">${this.escape(cond.desc)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            const closeBtn = modal.querySelector('#btnCloseConditionsPicker');
            const backdrop = modal.querySelector('.conditions-picker-backdrop');
            const close = () => { modal.style.display = 'none'; };

            if (closeBtn) closeBtn.onclick = close;
            if (backdrop) backdrop.onclick = close;

            modal.querySelectorAll('.condition-picker-item').forEach(item => {
                item.onclick = () => {
                    const condId = item.dataset.cond;
                    if (activeConditions.includes(condId)) {
                        window.TBFeatureManageCombat?.removeCondition(combatantId, condId);
                    } else {
                        window.TBFeatureManageCombat?.addCondition(combatantId, condId);
                    }
                    this.openConditionsPicker(combatantId); // refresh active states
                };
            });
        }

        escape(str) {
            return window.TBTextUtils?.escapeHtml ? window.TBTextUtils.escapeHtml(str) : String(str || '');
        }
    }

    const instance = new CombatTrackerWidget();
    window.TBWidgetCombatTracker = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.combatTracker = instance;
})();
