// --- FSD: Widgets Layer - Player Cockpit Widget ---

(function() {
    class PlayerCockpitWidget {
        constructor() {
            this.container = null;
            this.activeSubTab = 'character'; // 'character' | 'inventory' | 'notes' | 'clues'
        }

        init(containerId = 'playerContainer') {
            this.container = document.getElementById(containerId);

            // Default to player mode if not yet authenticated as GM in this session
            if (!window.TBFeatureGmAuth?.isAuthenticated()) {
                window.TBState?.setRole('player');
            }

            this.setupStateListeners();
            this.applyCurrentRole();
        }

        getPlayableCharacters() {
            const roster = window.TBState?.get('roster') || [];
            return window.TBCharacterModel?.getPlayableCharacters(roster) || [];
        }

        setupStateListeners() {
            window.TBState?.on('role', (role) => {
                this.applyCurrentRole();
            });

            window.TBState?.on('playerData', (data) => {
                if (window.TBState?.get('role') === 'player') {
                    this.render(data);
                }
            });

            window.TBState?.on('roster', () => {
                if (window.TBState?.get('role') === 'player') {
                    this.updateCharacterSelector();
                }
            });

            window.TBState?.on('cluesArchive', (clues) => {
                const cluesBtn = this.container?.querySelector('.player-subtab-btn[data-subtab="clues"]');
                if (cluesBtn) {
                    cluesBtn.textContent = `Улики (${(clues || []).length})`;
                }
            });
        }

        applyCurrentRole() {
            const role = window.TBState?.get('role') || 'gm';
            const btnToggle = document.getElementById('btnRoleToggle');
            const gmTabs = document.querySelector('.tabs');
            const gmContents = document.querySelectorAll('.tab-content');
            const tokenHud = document.getElementById('activeTokenHud');
            const brandSub = document.querySelector('.brand-sub');
            const btnAuto = document.getElementById('btnAutoInspect');
            const headerActiveToken = document.getElementById('headerActiveToken');

            // Apply body classes for CSS enforcement
            document.body.classList.toggle('mode-player', role === 'player');
            document.body.classList.toggle('mode-gm', role !== 'player');

            if (role === 'player') {
                if (btnToggle) {
                    btnToggle.textContent = 'Режим: Игрок';
                    btnToggle.className = 'btn-role-toggle mode-player';
                    btnToggle.title = 'Переключиться в режим Гейм-Мастера (требуется пароль)';
                }
                if (brandSub) brandSub.textContent = 'Player Cockpit';

                // Strictly hide GM screen elements, Token HUD & GM buttons
                if (gmTabs) gmTabs.style.display = 'none';
                gmContents.forEach(c => c.style.display = 'none');
                if (tokenHud) tokenHud.style.display = 'none';
                if (btnAuto) btnAuto.style.display = 'none';
                if (headerActiveToken) headerActiveToken.style.display = 'none';

                // Show Player container
                if (this.container) {
                    this.container.style.display = 'block';
                    const curData = window.TBState?.get('playerData');
                    const charName = window.TBState?.get('playerCharacter');
                    if (curData && curData.name === charName) {
                        this.render(curData);
                    } else if (charName) {
                        window.TBNetwork?.send('GET_PLAYER_DATA', { characterName: charName });
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
                if (btnAuto) btnAuto.style.display = 'inline-flex';

                // Clear inline style.display from tab-content so CSS .tab-content.active controls flex layout
                gmContents.forEach(c => {
                    c.style.display = '';
                });

                // Ensure currently active tab button matches active tab content
                let activeBtn = document.querySelector('.tab-btn.active');
                if (!activeBtn) {
                    activeBtn = document.querySelector('.tab-btn');
                    if (activeBtn) activeBtn.classList.add('active');
                }
                const targetId = activeBtn ? activeBtn.dataset.tab : 'tab-story';
                gmContents.forEach(c => {
                    c.classList.toggle('active', c.id === targetId);
                });

                if (tokenHud) {
                    tokenHud.style.display = window.TBState?.get('activeToken') ? 'block' : 'none';
                }

                if (this.container) {
                    this.container.style.display = 'none';
                }
            }
        }

        renderEmpty() {
            if (!this.container) return;
            const playable = this.getPlayableCharacters();
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            this.container.innerHTML = `
                <div class="player-empty-box">
                    <div class="player-select-card">
                        <h2>Выберите своего персонажа</h2>
                        <p class="select-desc">Доступные игровые персонажи:</p>
                        <div class="player-char-picker">
                            <select id="initialCharSelect" class="char-dropdown-select">
                                <option value="">-- Выберите персонажа --</option>
                                ${playable.map(c => `<option value="${escape(c.name)}">${escape(c.name)} (${c.class || 'Игрок'})</option>`).join('')}
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
                        window.TBState?.setPlayerCharacter(chosen);
                        window.TBNetwork?.send('GET_PLAYER_DATA', { characterName: chosen });
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

            const playable = this.getPlayableCharacters();
            const currentChar = window.TBState?.get('playerCharacter') || data.name;
            const activeTab = this.activeSubTab || 'character';
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            this.container.innerHTML = `
                <div class="player-cockpit">
                    <!-- Top Bar: Character Switcher & Refresh -->
                    <div class="player-nav-header">
                        <div class="char-picker-group">
                            <span class="char-label">Герой:</span>
                            <select id="playerCharSelect" class="char-dropdown-select">
                                ${playable.map(c => `
                                    <option value="${escape(c.name)}" ${c.name === currentChar ? 'selected' : ''}>
                                        ${escape(c.name)} (${c.class || 'Игрок'})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <button id="btnRefreshPlayerData" class="btn-refresh-player" title="Обновить данные из Obsidian">⟳</button>
                    </div>

                    <!-- Player Sub-Tabs -->
                    <div class="player-subtabs">
                        <button class="player-subtab-btn ${activeTab === 'character' ? 'active' : ''}" data-subtab="character">
                            Персонаж
                        </button>
                        <button class="player-subtab-btn ${activeTab === 'inventory' ? 'active' : ''}" data-subtab="inventory">
                            Инвентарь (${data.inventory?.length || 0})
                        </button>
                        <button class="player-subtab-btn ${activeTab === 'notes' ? 'active' : ''}" data-subtab="notes">
                            Заметки
                        </button>
                        <button class="player-subtab-btn ${activeTab === 'clues' ? 'active' : ''}" data-subtab="clues">
                            Улики (${(window.TBState?.get('cluesArchive') || []).length})
                        </button>
                    </div>

                    <!-- Sub-Tab Containers -->
                    <div id="pTabCharacter" class="player-tab-pane" style="display: ${activeTab === 'character' ? 'block' : 'none'};">
                        ${this.renderCharacterSheet(data)}
                    </div>
                    <div id="pTabInventory" class="player-tab-pane" style="display: ${activeTab === 'inventory' ? 'block' : 'none'};">
                        <div id="playerInventoryBox"></div>
                    </div>
                    <div id="pTabNotes" class="player-tab-pane" style="display: ${activeTab === 'notes' ? 'block' : 'none'};">
                        <div id="playerNotesBox"></div>
                    </div>
                    <div id="pTabClues" class="player-tab-pane" style="display: ${activeTab === 'clues' ? 'block' : 'none'};">
                        <div id="playerCluesBox"></div>
                    </div>
                </div>
            `;

            this.bindEvents(data);

            // Render sub-components using FSD feature slices
            if (window.TBFeatureManageInventory) {
                window.TBFeatureManageInventory.init('playerInventoryBox');
                window.TBFeatureManageInventory.render(data.inventory);
            }
            if (window.TBFeatureSaveNotes) {
                window.TBFeatureSaveNotes.init('playerNotesBox');
                window.TBFeatureSaveNotes.render(data.playerNotes);
            }
            if (window.TBFeatureArchiveClues) {
                window.TBFeatureArchiveClues.renderArchive('playerCluesBox');
            }
        }

        updateCharacterSelector() {
            const charSelect = this.container?.querySelector('#playerCharSelect');
            if (!charSelect) return;
            const playable = this.getPlayableCharacters();
            const currentChar = window.TBState?.get('playerCharacter');
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            charSelect.innerHTML = playable.map(c => `
                <option value="${escape(c.name)}" ${c.name === currentChar ? 'selected' : ''}>
                    ${escape(c.name)} (${c.class || 'Игрок'})
                </option>
            `).join('');

            if (currentChar) {
                charSelect.value = currentChar;
            }
        }

        renderCharacterSheet(data) {
            const hp = parseInt(data.hp, 10) || 20;
            const maxHp = parseInt(data.hp_max, 10) || hp;
            const hpPercent = Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)));
            const hpClass = hpPercent <= 25 ? 'critical' : (hpPercent <= 50 ? 'warning' : 'healthy');
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            const stats = data.stats || {
                str: '14 (+2)',
                dex: '14 (+2)',
                con: '14 (+2)',
                int: '10 (+0)',
                wis: '10 (+0)',
                cha: '10 (+0)'
            };

            const ability = window.TBAbilityCell;
            const attack = window.TBAttackCard;

            return `
                <div class="player-sheet-container">
                    <!-- Identity & Meta -->
                    <div class="sheet-hero-card">
                        <div class="sheet-hero-info">
                            <h2 class="sheet-hero-name">${escape(data.name)}</h2>
                            <div class="sheet-hero-tags">
                                <span class="tag-chip">${escape(data.race || 'Гуманоид')}</span>
                                <span class="tag-chip">${escape(data.class || 'Искатель')}</span>
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
                        ${ability ? ability.render('СИЛ', stats.str, 'Сила') : ''}
                        ${ability ? ability.render('ЛОВ', stats.dex, 'Ловкость') : ''}
                        ${ability ? ability.render('ТЕЛ', stats.con, 'Телосложение') : ''}
                        ${ability ? ability.render('ИНТ', stats.int, 'Интеллект') : ''}
                        ${ability ? ability.render('МУД', stats.wis, 'Мудрость') : ''}
                        ${ability ? ability.render('ХАР', stats.cha, 'Харизма') : ''}
                    </div>

                    <!-- Actions and Attacks -->
                    <div class="sheet-section-title" style="margin-top: 14px;">Действия и атаки</div>
                    <div class="sheet-attacks-list">
                        ${(!data.attacks || data.attacks.length === 0)
                            ? `<div class="empty-hint">Действия в блоках dnd-action не указаны в заметке</div>`
                            : data.attacks.map(atk => attack ? attack.render(atk) : '').join('')
                        }
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
                    if (this.activeSubTab === 'clues' && window.TBFeatureArchiveClues) {
                        window.TBFeatureArchiveClues.renderArchive('playerCluesBox');
                    }
                });
            });

            // Character selector dropdown
            const charSelect = this.container.querySelector('#playerCharSelect');
            if (charSelect) {
                charSelect.addEventListener('change', () => {
                    const chosen = charSelect.value;
                    if (chosen) {
                        window.TBState?.setPlayerCharacter(chosen);
                        window.TBNetwork?.send('GET_PLAYER_DATA', { characterName: chosen });
                    }
                });
            }

            // Refresh button
            const btnRefresh = this.container.querySelector('#btnRefreshPlayerData');
            if (btnRefresh) {
                btnRefresh.addEventListener('click', () => {
                    const charName = window.TBState?.get('playerCharacter') || data.name;
                    window.TBNetwork?.send('GET_PLAYER_DATA', { characterName: charName });
                });
            }

            // Delegate HP modification to feature
            if (window.TBFeatureApplyDamage) {
                window.TBFeatureApplyDamage.bindEvents(this.container, data);
            }

            // Roll initiative
            const btnInit = this.container.querySelector('#btnRollInit');
            if (btnInit) {
                btnInit.addEventListener('click', () => {
                    window.TBFeatureRollDice?.rollInitiative(data.name);
                });
            }

            // Roll ability checks
            this.container.querySelectorAll('.ability-score-card').forEach(card => {
                card.addEventListener('click', () => {
                    const mod = card.dataset.mod || '+0';
                    const name = card.dataset.name || 'Характеристика';
                    window.TBFeatureRollDice?.rollAbilityCheck(name, mod, data.name);
                });
            });

            // Roll attacks
            this.container.querySelectorAll('.btn-atk-roll.hit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const hit = btn.dataset.hit || '+0';
                    const name = btn.dataset.name || 'Атака';
                    window.TBFeatureRollDice?.rollAttack(hit, name, 'hit');
                });
            });

            this.container.querySelectorAll('.btn-atk-roll.dmg').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dmg = btn.dataset.dmg || '1d6';
                    const name = btn.dataset.name || 'Урон';
                    window.TBFeatureRollDice?.rollAttack(dmg, name, 'dmg');
                });
            });
        }

        updateHpDisplay(hp, maxHp) {
            if (window.TBFeatureApplyDamage) {
                window.TBFeatureApplyDamage.updateHpDisplay(hp, maxHp, this.container);
            }
        }

        capitalize(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    }

    const instance = new PlayerCockpitWidget();
    window.TBWidgetPlayerCockpit = instance;
    // Backward compatibility with legacy component
    window.TBPlayerView = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.playerCockpit = instance;
})();
