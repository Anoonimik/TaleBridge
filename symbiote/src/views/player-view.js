// --- TaleBridge Player Cockpit Screen View & Role Manager ---

(function() {
    class PlayerView {
        constructor() {
            this.container = null;
            this.activeSubTab = 'character'; // 'character' | 'inventory' | 'notes' | 'clues'
        }

        init(containerId = 'playerContainer') {
            this.container = document.getElementById(containerId);
            this.setupRoleToggle();
            this.setupStateListeners();
            this.applyCurrentRole();
        }

        setupRoleToggle() {
            const btnToggle = document.getElementById('btnRoleToggle');
            if (!btnToggle) return;

            btnToggle.addEventListener('click', () => {
                const currentRole = window.TBState.get('role');
                const nextRole = currentRole === 'gm' ? 'player' : 'gm';
                window.TBState.setRole(nextRole);
                this.applyCurrentRole();
            });
        }

        setupStateListeners() {
            window.TBState.on('role', (role) => {
                this.applyCurrentRole();
            });

            window.TBState.on('playerData', (data) => {
                if (window.TBState.get('role') === 'player') {
                    this.render(data);
                }
            });

            window.TBState.on('roster', () => {
                if (window.TBState.get('role') === 'player') {
                    this.updateCharacterSelector();
                }
            });
        }

        applyCurrentRole() {
            const role = window.TBState.get('role') || 'gm';
            const btnToggle = document.getElementById('btnRoleToggle');
            const gmTabs = document.querySelector('.tabs');
            const gmContents = document.querySelectorAll('.tab-content');
            const tokenHud = document.getElementById('activeTokenHud');
            const brandSub = document.querySelector('.brand-sub');

            if (role === 'player') {
                if (btnToggle) {
                    btnToggle.textContent = 'Режим: Игрок';
                    btnToggle.className = 'btn-role-toggle mode-player';
                    btnToggle.title = 'Переключиться в режим Гейм-Мастера';
                }
                if (brandSub) brandSub.textContent = 'Player Cockpit';

                // Hide GM screens & Token HUD
                if (gmTabs) gmTabs.style.display = 'none';
                gmContents.forEach(c => c.style.display = 'none');
                if (tokenHud) tokenHud.style.display = 'none';

                // Show Player container
                if (this.container) {
                    this.container.style.display = 'block';
                    const curData = window.TBState.get('playerData');
                    const charName = window.TBState.get('playerCharacter');
                    if (curData && curData.name === charName) {
                        this.render(curData);
                    } else if (charName) {
                        window.TBNetwork.send('GET_PLAYER_DATA', { characterName: charName });
                    } else {
                        this.renderEmpty();
                    }
                }
            } else {
                // GM Mode
                if (btnToggle) {
                    btnToggle.textContent = 'Режим: Мастер';
                    btnToggle.className = 'btn-role-toggle mode-gm';
                    btnToggle.title = 'Переключиться в интерфейс Игрока';
                }
                if (brandSub) brandSub.textContent = 'GM Screen';

                if (gmTabs) gmTabs.style.display = 'flex';
                const activeTabBtn = document.querySelector('.tab-btn.active');
                const targetId = activeTabBtn ? activeTabBtn.dataset.tab : 'tab-story';
                gmContents.forEach(c => {
                    c.style.display = (c.id === targetId) ? 'block' : 'none';
                });

                if (this.container) {
                    this.container.style.display = 'none';
                }
            }
        }

        renderEmpty() {
            if (!this.container) return;
            const roster = window.TBState.get('roster') || [];
            this.container.innerHTML = `
                <div class="player-empty-box">
                    <div class="player-select-card">
                        <h2>Выберите своего персонажа</h2>
                        <p class="select-desc">Для загрузки статов, инвентаря и личного журнала выберите своего героя:</p>
                        <div class="player-char-picker">
                            <select id="initialCharSelect" class="char-dropdown-select">
                                <option value="">-- Выберите персонажа --</option>
                                ${roster.map(c => `<option value="${this.escapeHtml(c.name)}">${this.escapeHtml(c.name)} [${c.category}]</option>`).join('')}
                            </select>
                            <button id="btnConfirmInitialChar" class="btn-primary" style="margin-top: 10px;">Войти в игру</button>
                        </div>
                    </div>
                </div>
            `;

            const select = this.container.querySelector('#initialCharSelect');
            const btn = this.container.querySelector('#btnConfirmInitialChar');
            if (btn && select) {
                btn.addEventListener('click', () => {
                    const chosen = select.value;
                    if (chosen) {
                        window.TBState.setPlayerCharacter(chosen);
                        window.TBNetwork.send('GET_PLAYER_DATA', { characterName: chosen });
                    }
                });
            }
        }

        render(data) {
            if (!this.container) return;
            if (!data || data.error) {
                this.renderEmpty();
                return;
            }

            const roster = window.TBState.get('roster') || [];
            const currentChar = window.TBState.get('playerCharacter') || data.name;

            this.container.innerHTML = `
                <div class="player-cockpit">
                    <!-- Top Bar: Character Switcher & Refresh -->
                    <div class="player-nav-header">
                        <div class="char-picker-group">
                            <span class="char-label">Герой:</span>
                            <select id="playerCharSelect" class="char-dropdown-select">
                                ${roster.map(c => `
                                    <option value="${this.escapeHtml(c.name)}" ${c.name === currentChar ? 'selected' : ''}>
                                        ${this.escapeHtml(c.name)} (${c.class || c.category})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <button id="btnRefreshPlayerData" class="btn-refresh-player" title="Обновить данные из Obsidian">⟳</button>
                    </div>

                    <!-- Player Sub-Tabs -->
                    <div class="player-subtabs">
                        <button class="player-subtab-btn ${this.activeSubTab === 'character' ? 'active' : ''}" data-subtab="character">
                            Персонаж
                        </button>
                        <button class="player-subtab-btn ${this.activeSubTab === 'inventory' ? 'active' : ''}" data-subtab="inventory">
                            Инвентарь (${data.inventory?.length || 0})
                        </button>
                        <button class="player-subtab-btn ${this.activeSubTab === 'notes' ? 'active' : ''}" data-subtab="notes">
                            Заметки
                        </button>
                        <button class="player-subtab-btn ${this.activeSubTab === 'clues' ? 'active' : ''}" data-subtab="clues">
                            Улики (${(window.TBState.get('cluesArchive') || []).length})
                        </button>
                    </div>

                    <!-- Sub-Tab Containers -->
                    <div id="pTabCharacter" class="player-tab-pane" style="display: ${this.activeSubTab === 'character' ? 'block' : 'none'};">
                        ${this.renderCharacterSheet(data)}
                    </div>
                    <div id="pTabInventory" class="player-tab-pane" style="display: ${this.activeSubTab === 'inventory' ? 'block' : 'none'};">
                        <div id="playerInventoryBox"></div>
                    </div>
                    <div id="pTabNotes" class="player-tab-pane" style="display: ${this.activeSubTab === 'notes' ? 'block' : 'none'};">
                        <div id="playerNotesBox"></div>
                    </div>
                    <div id="pTabClues" class="player-tab-pane" style="display: ${this.activeSubTab === 'clues' ? 'block' : 'none'};">
                        <div id="playerCluesBox"></div>
                    </div>
                </div>
            `;

            this.bindEvents(data);

            // Render sub-components
            if (window.TBPlayerInventory) {
                window.TBPlayerInventory.init('playerInventoryBox');
                window.TBPlayerInventory.render(data.inventory);
            }
            if (window.TBPlayerNotes) {
                window.TBPlayerNotes.init('playerNotesBox');
                window.TBPlayerNotes.render(data.playerNotes);
            }
            if (window.TBMediaHandout) {
                window.TBMediaHandout.renderCluesArchive('playerCluesBox');
            }
        }

        renderCharacterSheet(data) {
            const hp = parseInt(data.hp, 10) || 20;
            const maxHp = parseInt(data.hp_max, 10) || hp;
            const hpPercent = Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)));
            const hpClass = hpPercent <= 25 ? 'critical' : (hpPercent <= 50 ? 'warning' : 'healthy');

            const stats = data.stats || {
                str: '14 (+2)',
                dex: '14 (+2)',
                con: '14 (+2)',
                int: '10 (+0)',
                wis: '10 (+0)',
                cha: '10 (+0)'
            };

            return `
                <div class="player-sheet-container">
                    <!-- Identity & Meta -->
                    <div class="sheet-hero-card">
                        <div class="sheet-hero-info">
                            <h2 class="sheet-hero-name">${this.escapeHtml(data.name)}</h2>
                            <div class="sheet-hero-tags">
                                <span class="tag-chip">${this.escapeHtml(data.race || 'Гуманоид')}</span>
                                <span class="tag-chip">${this.escapeHtml(data.class || 'Искатель')}</span>
                                ${data.level ? `<span class="tag-chip level">Ур. ${data.level}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Interactive Health Bar -->
                    <div class="sheet-stat-card hp-card">
                        <div class="hp-row">
                            <div class="hp-text-group">
                                <span class="stat-label">Здоровье (ХП)</span>
                                <span class="hp-digits"><strong id="playerHpCur">${hp}</strong> / ${maxHp}</span>
                            </div>
                            <div class="hp-quick-buttons">
                                <button class="btn-hp-mod minus" data-mod="-5">-5</button>
                                <button class="btn-hp-mod minus" data-mod="-1">-1</button>
                                <button class="btn-hp-mod plus" data-mod="1">+1</button>
                                <button class="btn-hp-mod plus" data-mod="5">+5</button>
                            </div>
                        </div>
                        <div class="hp-bar-bg">
                            <div id="playerHpBarFill" class="hp-bar-fill ${hpClass}" style="width: ${hpPercent}%;"></div>
                        </div>
                        <div class="hp-custom-input-row">
                            <input type="number" id="hpCustomVal" placeholder="Кол-во" min="1" value="5" class="hp-num-input" />
                            <button id="btnHpDamage" class="btn-hp-action dmg">Урон</button>
                            <button id="btnHpHeal" class="btn-hp-action heal">Лечение</button>
                        </div>
                    </div>

                    <!-- Core Defenses & Vitals (AC, Speed, Initiative) -->
                    <div class="sheet-defense-grid">
                        <div class="defense-badge ac">
                            <span class="def-num">${data.ac || 10}</span>
                            <span class="def-label">Класс Доспеха (КД)</span>
                        </div>
                        <div class="defense-badge speed">
                            <span class="def-num">${data.speed || '9 м'}</span>
                            <span class="def-label">Скорость</span>
                        </div>
                        <div class="defense-badge init" id="btnRollInit" title="Нажмите для броска инициативы в TaleSpire">
                            <span class="def-num">1d20</span>
                            <span class="def-label">Инициатива</span>
                        </div>
                    </div>

                    <!-- Ability Scores (Click to roll in TaleSpire) -->
                    <div class="sheet-section-title">Характеристики (клик для броска)</div>
                    <div class="ability-scores-grid">
                        ${this.renderAbilityCell('СИЛ', stats.str, 'Сила')}
                        ${this.renderAbilityCell('ЛОВ', stats.dex, 'Ловкость')}
                        ${this.renderAbilityCell('ТЕЛ', stats.con, 'Телосложение')}
                        ${this.renderAbilityCell('ИНТ', stats.int, 'Интеллект')}
                        ${this.renderAbilityCell('МУД', stats.wis, 'Мудрость')}
                        ${this.renderAbilityCell('ХАР', stats.cha, 'Харизма')}
                    </div>

                    <!-- Attacks & Spells -->
                    <div class="sheet-section-title" style="margin-top: 14px;">Действия и атаки</div>
                    <div class="sheet-attacks-list">
                        ${(!data.attacks || data.attacks.length === 0)
                            ? `<div class="empty-hint">Действия в блоках dnd-action не указаны в заметке</div>`
                            : data.attacks.map(atk => this.renderAttackCard(atk)).join('')
                        }
                    </div>
                </div>
            `;
        }

        renderAbilityCell(label, rawVal, fullName) {
            let score = 10;
            let modStr = '+0';

            if (rawVal) {
                const sMatch = String(rawVal).match(/^(\d+)/);
                if (sMatch) score = parseInt(sMatch[1], 10);
                const mMatch = String(rawVal).match(/\(([+-]?\d+)\)/);
                if (mMatch) {
                    modStr = mMatch[1].startsWith('+') || mMatch[1].startsWith('-') ? mMatch[1] : `+${mMatch[1]}`;
                } else {
                    const mod = Math.floor((score - 10) / 2);
                    modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                }
            }

            return `
                <div class="ability-score-card" data-ability="${label}" data-mod="${modStr}" data-name="${fullName}" title="Бросить проверку ${fullName} (${modStr}) в TaleSpire">
                    <span class="ability-name">${label}</span>
                    <span class="ability-mod">${modStr}</span>
                    <span class="ability-score">${score}</span>
                </div>
            `;
        }

        renderAttackCard(atk) {
            return `
                <div class="sheet-attack-card">
                    <div class="atk-title-row">
                        <strong class="atk-name">${this.escapeHtml(atk.name || 'Атака')}</strong>
                        ${atk.type ? `<span class="atk-type-badge">${this.escapeHtml(atk.type)}</span>` : ''}
                    </div>
                    ${atk.desc ? `<div class="atk-desc">${this.escapeHtml(atk.desc)}</div>` : ''}
                    <div class="atk-button-row">
                        ${atk.hit ? `
                            <button class="btn-atk-roll hit" data-hit="${atk.hit}" data-name="${this.escapeHtml(atk.name)}">
                                Атака (${atk.hit})
                            </button>
                        ` : ''}
                        ${atk.dmg ? `
                            <button class="btn-atk-roll dmg" data-dmg="${atk.dmg}" data-name="${this.escapeHtml(atk.name)}">
                                Урон (${atk.dmg})
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        bindEvents(data) {
            // Sub-tabs switcher
            this.container.querySelectorAll('.player-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.container.querySelectorAll('.player-subtab-btn').forEach(b => b.classList.remove('active'));
                    this.container.querySelectorAll('.player-tab-pane').forEach(p => p.style.display = 'none');

                    btn.classList.add('active');
                    this.activeSubTab = btn.dataset.subtab;
                    const pane = this.container.querySelector(`#pTab${this.capitalize(this.activeSubTab)}`);
                    if (pane) pane.style.display = 'block';

                    // Re-render clues if switching to clues tab
                    if (this.activeSubTab === 'clues' && window.TBMediaHandout) {
                        window.TBMediaHandout.renderCluesArchive('playerCluesBox');
                    }
                });
            });

            // Character selector dropdown
            const charSelect = this.container.querySelector('#playerCharSelect');
            if (charSelect) {
                charSelect.addEventListener('change', () => {
                    const chosen = charSelect.value;
                    if (chosen) {
                        window.TBState.setPlayerCharacter(chosen);
                        window.TBNetwork.send('GET_PLAYER_DATA', { characterName: chosen });
                    }
                });
            }

            // Refresh button
            const btnRefresh = this.container.querySelector('#btnRefreshPlayerData');
            if (btnRefresh) {
                btnRefresh.addEventListener('click', () => {
                    const charName = window.TBState.get('playerCharacter') || data.name;
                    window.TBNetwork.send('GET_PLAYER_DATA', { characterName: charName });
                });
            }

            // Health modifications
            this.container.querySelectorAll('.btn-hp-mod').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseInt(btn.dataset.mod, 10) || 0;
                    this.modifyHp(data, delta);
                });
            });

            const btnDmg = this.container.querySelector('#btnHpDamage');
            const btnHeal = this.container.querySelector('#btnHpHeal');
            const customInput = this.container.querySelector('#hpCustomVal');

            if (btnDmg && customInput) {
                btnDmg.addEventListener('click', () => {
                    const val = parseInt(customInput.value, 10) || 0;
                    if (val > 0) this.modifyHp(data, -val);
                });
            }
            if (btnHeal && customInput) {
                btnHeal.addEventListener('click', () => {
                    const val = parseInt(customInput.value, 10) || 0;
                    if (val > 0) this.modifyHp(data, val);
                });
            }

            // Roll initiative
            const btnInit = this.container.querySelector('#btnRollInit');
            if (btnInit) {
                btnInit.addEventListener('click', () => {
                    window.TBApi.rollDice('1d20', `Инициатива (${data.name})`);
                });
            }

            // Roll ability checks
            this.container.querySelectorAll('.ability-score-card').forEach(card => {
                card.addEventListener('click', () => {
                    const mod = card.dataset.mod || '+0';
                    const name = card.dataset.name || 'Характеристика';
                    const formula = `1d20${mod.startsWith('+') || mod.startsWith('-') ? mod : '+' + mod}`;
                    window.TBApi.rollDice(formula, `${name} (${data.name})`);
                });
            });

            // Roll attacks
            this.container.querySelectorAll('.btn-atk-roll.hit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const hit = btn.dataset.hit || '+0';
                    const name = btn.dataset.name || 'Атака';
                    const formula = `1d20${hit.startsWith('+') || hit.startsWith('-') ? hit : '+' + hit}`;
                    window.TBApi.rollDice(formula, `${name} - Атака`);
                });
            });

            this.container.querySelectorAll('.btn-atk-roll.dmg').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dmg = btn.dataset.dmg || '1d6';
                    const name = btn.dataset.name || 'Урон';
                    window.TBApi.rollDice(dmg, `${name} - Урон`);
                });
            });
        }

        modifyHp(data, delta) {
            let cur = parseInt(data.hp, 10) || 20;
            const max = parseInt(data.hp_max, 10) || cur;
            cur = Math.min(max, Math.max(0, cur + delta));

            data.hp = cur;
            this.updateHpDisplay(cur, max);

            window.TBNetwork.send('UPDATE_CHARACTER_HP', {
                characterName: data.name,
                hp: cur,
                maxHp: max
            });
        }

        updateHpDisplay(hp, maxHp) {
            const digits = this.container?.querySelector('#playerHpCur');
            const barFill = this.container?.querySelector('#playerHpBarFill');
            if (digits) digits.textContent = hp;

            const m = maxHp || 20;
            const pct = Math.min(100, Math.max(0, Math.round((hp / m) * 100)));
            if (barFill) {
                barFill.style.width = `${pct}%`;
                barFill.className = `hp-bar-fill ${pct <= 25 ? 'critical' : (pct <= 50 ? 'warning' : 'healthy')}`;
            }
        }

        updateCharacterSelector() {
            const charSelect = this.container?.querySelector('#playerCharSelect');
            if (!charSelect) return;
            const roster = window.TBState.get('roster') || [];
            const currentChar = window.TBState.get('playerCharacter');

            charSelect.innerHTML = roster.map(c => `
                <option value="${this.escapeHtml(c.name)}" ${c.name === currentChar ? 'selected' : ''}>
                    ${this.escapeHtml(c.name)} (${c.class || c.category})
                </option>
            `).join('');
        }

        capitalize(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }

    window.TBPlayerView = new PlayerView();
})();