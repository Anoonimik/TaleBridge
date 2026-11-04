// --- FSD: Widgets Layer - Player Cockpit Widget ---

(function() {
    class PlayerCockpitWidget {
        constructor() {
            this.container = null;
            this.activeSubTab = 'character'; // 'character' | 'inventory' | 'notes' | 'clues'
            this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
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
                const curChar = window.TBState?.get('playerCharacter');
                if (curChar && this.container.querySelector('.player-cockpit')) {
                    return;
                }
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

            let list = [...playable];
            if (currentChar && !list.some(c => c.name === currentChar)) {
                list.unshift({ name: currentChar, class: 'Игрок', category: 'Игроки', playable: true });
            }

            charSelect.innerHTML = list.map(c => `
                <option value="${escape(c.name)}" ${c.name === currentChar ? 'selected' : ''}>
                    ${escape(c.name)} (${c.class || 'Игрок'})
                </option>
            `).join('');

            if (currentChar) {
                charSelect.value = currentChar;
            }
        }

        renderCharacterSheet(data) {
            const hp = parseInt(data.hp, 10) || 0;
            const maxHp = parseInt(data.hp_max, 10) || hp || 20;
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
            const resources = this.getResources(data);
            if (!this.deathSaves) {
                this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
            }
            const ds = this.deathSaves;

            const deathSavesHtml = `
                <div class="death-saves-card">
                    <div class="death-saves-title">БЕЗ СОЗНАНИЯ: СПАСБРОСКИ ОТ СМЕРТИ</div>
                    <div class="death-saves-rows">
                        <div class="death-save-row success">
                            <span class="death-save-label">Успехи:</span>
                            <div class="death-save-bubbles">
                                <span class="death-bubble ${(ds.successes || 0) >= 1 ? 'filled' : ''}" data-type="success" data-idx="1">●</span>
                                <span class="death-bubble ${(ds.successes || 0) >= 2 ? 'filled' : ''}" data-type="success" data-idx="2">●</span>
                                <span class="death-bubble ${(ds.successes || 0) >= 3 ? 'filled' : ''}" data-type="success" data-idx="3">●</span>
                            </div>
                        </div>
                        <div class="death-save-row failure">
                            <span class="death-save-label">Провалы:</span>
                            <div class="death-save-bubbles">
                                <span class="death-bubble ${(ds.failures || 0) >= 1 ? 'filled' : ''}" data-type="failure" data-idx="1">●</span>
                                <span class="death-bubble ${(ds.failures || 0) >= 2 ? 'filled' : ''}" data-type="failure" data-idx="2">●</span>
                                <span class="death-bubble ${(ds.failures || 0) >= 3 ? 'filled' : ''}" data-type="failure" data-idx="3">●</span>
                            </div>
                        </div>
                    </div>
                    <div class="death-save-buttons">
                        <button id="btnRollDeathSave" class="btn-death-save">🎲 Бросить спасбросок (d20)</button>
                        <button id="btnResetDeathSaves" class="btn-death-reset" title="Сбросить спасброски">Сброс</button>
                    </div>
                    ${ds.status ? `<div class="death-save-status ${ds.statusClass || ''}">${ds.status}</div>` : ''}
                </div>
            `;

            const resourceStripHtml = resources.length > 0 ? `
                <div class="sheet-resource-strip">
                    ${resources.map((res, rIdx) => `
                        <div class="resource-chip" data-r-idx="${rIdx}">
                            <span class="resource-chip-name">${escape(res.name)}</span>
                            <div class="resource-bubbles">
                                ${Array.from({ length: res.total }).map((_, bIdx) => `
                                    <span class="resource-bubble ${res.shape || 'circle'} ${bIdx < (res.total - res.used) ? '' : 'empty'}" 
                                          data-r-idx="${rIdx}" data-b-idx="${bIdx}" title="${escape(res.name)} (${res.rest === 'short' ? 'КО' : 'ДО'}): нажмите, чтобы потратить/восстановить">
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="player-sheet-container">
                    <!-- Identity & Meta -->
                    <div class="sheet-hero-card">
                        <div class="sheet-hero-info">
                            <h2 class="sheet-hero-name">${escape(data.name)}</h2>
                            <div class="sheet-hero-tags">
                                <span class="tag-chip editable" id="btnEditRace" title="Нажмите, чтобы изменить расу">${escape(data.race || 'Гуманоид')} ✎</span>
                                <span class="tag-chip editable" id="btnEditClass" title="Нажмите, чтобы изменить класс">${escape(data.class || 'Искатель')} ✎</span>
                                <span class="tag-chip level editable" id="btnEditLevel" title="Нажмите, чтобы изменить уровень">Ур. ${data.level || 1} ✎</span>
                            </div>
                        </div>
                    </div>

                    <!-- Interactive Health Bar -->
                    <div class="sheet-stat-card hp-card">
                        <div class="hp-row">
                            <div class="hp-text-group">
                                <span class="stat-label">Здоровье (ХП)</span>
                                <span class="hp-digits">
                                    <strong id="playerHpCur">${hp}</strong> / 
                                    <span id="btnEditMaxHp" class="editable-max-hp" title="Нажмите, чтобы изменить Макс. ХП">${maxHp} ✎</span>
                                </span>
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

                        ${hp === 0 ? deathSavesHtml : `
                            <div class="hp-custom-input-row">
                                <input type="number" id="hpCustomVal" placeholder="Кол-во" min="1" value="5" class="hp-num-input" />
                                <button id="btnHpDamage" class="btn-hp-action dmg">Урон</button>
                                <button id="btnHpHeal" class="btn-hp-action heal">Лечение</button>
                            </div>
                        `}

                        ${resourceStripHtml}

                        <div class="hp-rest-row">
                            <button id="btnShortRest" class="btn-rest short" title="Короткий отдых: бросить кость хитов в лоток TaleSpire и восстановить КО-ресурсы">
                                Короткий отдых
                            </button>
                            <button id="btnLongRest" class="btn-rest long" title="Долгий отдых: полностью восстановить ХП, ячейки магии и заряды">
                                Долгий отдых
                            </button>
                        </div>
                    </div>

                    <!-- Core Defenses & Vitals (AC, Speed, Initiative) -->
                    <div class="sheet-defense-grid">
                        <div class="defense-badge ac editable" id="btnEditAc" title="Нажмите для изменения КД в Obsidian">
                            <span class="def-num" id="defAcVal">${data.ac || 10}</span>
                            <span class="def-label">КД <span class="def-edit-icon">✎</span></span>
                        </div>
                        <div class="defense-badge speed editable" id="btnEditSpeed" title="Нажмите для изменения Скорости в Obsidian">
                            <span class="def-num" id="defSpeedVal">${data.speed || '9 м'}</span>
                            <span class="def-label">Скорость <span class="def-edit-icon">✎</span></span>
                        </div>
                        <div class="defense-badge init" id="btnRollInit" title="Нажмите для броска инициативы в TaleSpire">
                            <span class="def-num">1d20</span>
                            <span class="def-label">Инициатива</span>
                        </div>
                    </div>

                    <!-- Ability Scores (Click to roll in TaleSpire) -->
                    <div class="sheet-section-header">
                        <div class="sheet-section-title" style="margin: 0;">Характеристики (клик для броска)</div>
                        <button id="btnEditStats" class="btn-edit-stats" title="Редактировать значения характеристик">✎ Изменить</button>
                    </div>
                    <div class="ability-scores-grid">
                        ${ability ? ability.render('СИЛ', stats.str, 'Сила') : ''}
                        ${ability ? ability.render('ЛОВ', stats.dex, 'Ловкость') : ''}
                        ${ability ? ability.render('ТЕЛ', stats.con, 'Телосложение') : ''}
                        ${ability ? ability.render('ИНТ', stats.int, 'Интеллект') : ''}
                        ${ability ? ability.render('МУД', stats.wis, 'Мудрость') : ''}
                        ${ability ? ability.render('ХАР', stats.cha, 'Харизма') : ''}
                    </div>

                    <!-- Actions and Attacks with Add / Edit / Delete -->
                    <div class="sheet-section-header">
                        <div class="sheet-section-title" style="margin: 0;">Действия и атаки</div>
                        <button id="btnAddAction" class="btn-add-action" title="Добавить новое действие или оружие">+ Добавить</button>
                    </div>
                    <div class="sheet-attacks-list">
                        ${(!data.attacks || data.attacks.length === 0)
                            ? `<div class="empty-hint">Нет добавленных действий. Нажмите «+ Добавить», чтобы создать атаку или оружие.</div>`
                            : data.attacks.map((atk, idx) => attack ? attack.render(atk, { canManage: true, index: idx }) : '').join('')
                        }
                    </div>
                </div>
            `;
        }

        getResources(data) {
            const charName = data.name || 'Hero';
            const storageKey = `tb_res_${charName}`;
            let saved = null;
            try {
                saved = JSON.parse(localStorage.getItem(storageKey));
            } catch (e) {}

            if (saved && Array.isArray(saved) && saved.length > 0) {
                return saved;
            }

            const cls = (data.class || '').toLowerCase();
            const defaultRes = [];

            if (cls.includes('варвар')) {
                defaultRes.push({ id: 'rage', name: 'Ярость', total: 2, used: 0, rest: 'long', shape: 'square' });
            }
            if (cls.includes('воин')) {
                defaultRes.push({ id: 'second_wind', name: 'Второе дыхание', total: 1, used: 0, rest: 'short', shape: 'square' });
                defaultRes.push({ id: 'action_surge', name: 'Всплеск действий', total: 1, used: 0, rest: 'short', shape: 'square' });
            }
            if (cls.includes('чародей') || cls.includes('волшебниц') || cls.includes('маг')) {
                defaultRes.push({ id: 'spell_1', name: 'Ячейки I', total: 4, used: 0, rest: 'long', shape: 'circle' });
                defaultRes.push({ id: 'spell_2', name: 'Ячейки II', total: 2, used: 0, rest: 'long', shape: 'circle' });
            } else if (cls.includes('паладин') || cls.includes('следопыт')) {
                defaultRes.push({ id: 'spell_1', name: 'Ячейки I', total: 2, used: 0, rest: 'long', shape: 'circle' });
            }

            return defaultRes;
        }

        saveResources(charName, resList) {
            try {
                localStorage.setItem(`tb_res_${charName}`, JSON.stringify(resList));
            } catch (e) {}
        }

        toggleResource(data, rIdx, bIdx) {
            const list = this.getResources(data);
            if (!list[rIdx]) return;
            const res = list[rIdx];
            const available = res.total - res.used;
            if (bIdx < available) {
                res.used = Math.min(res.total, res.used + 1);
            } else {
                res.used = Math.max(0, res.used - 1);
            }
            this.saveResources(data.name, list);
            const charPane = this.container?.querySelector('#pTabCharacter');
            if (charPane) {
                charPane.innerHTML = this.renderCharacterSheet(data);
                this.bindSheetEvents(data);
            }
        }

        resetResources(data, restType) {
            const list = this.getResources(data);
            let changed = false;
            list.forEach(r => {
                if (restType === 'long' || r.rest === restType) {
                    r.used = 0;
                    changed = true;
                }
            });
            if (changed) {
                this.saveResources(data.name, list);
            }
        }

        handleDeathSaveRoll(data) {
            if (this.deathSaves.status === 'Стабилизирован' || this.deathSaves.status === 'Мёртв') {
                return;
            }

            window.TBFeatureRollDice?.roll('1d20', `${data.name}: Спасбросок от смерти`, false);

            const d20 = Math.floor(Math.random() * 20) + 1;
            let msg = '';

            if (d20 === 20) {
                this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
                if (window.TBFeatureApplyDamage) {
                    window.TBFeatureApplyDamage.modifyHp(data, 1, this.container);
                }
                msg = `🌟 ${data.name} выбрасывает [20] на спасброске от смерти и поднимается с 1 ХП!`;
            } else if (d20 === 1) {
                this.deathSaves.failures = Math.min(3, this.deathSaves.failures + 2);
                msg = `💀 ${data.name} выбрасывает [1] на спасброске от смерти: сразу 2 ПРОВАЛА!`;
            } else if (d20 >= 10) {
                this.deathSaves.successes = Math.min(3, this.deathSaves.successes + 1);
                msg = `🛡️ ${data.name} спасбросок от смерти [${d20}]: УСПЕХ (${this.deathSaves.successes}/3)`;
            } else {
                this.deathSaves.failures = Math.min(3, this.deathSaves.failures + 1);
                msg = `⚠️ ${data.name} спасбросок от смерти [${d20}]: ПРОВАЛ (${this.deathSaves.failures}/3)`;
            }

            if (this.deathSaves.successes >= 3) {
                this.deathSaves.status = 'Стабилизирован';
                this.deathSaves.statusClass = 'stabilized';
                msg += ` — ${data.name} стабилизирован!`;
            } else if (this.deathSaves.failures >= 3) {
                this.deathSaves.status = 'Мёртв';
                this.deathSaves.statusClass = 'dead';
                msg += ` — ${data.name} погибает (3 провала)...`;
            }

            if (window.TBApi?.sendChatMessage && msg) {
                window.TBApi.sendChatMessage(msg);
            }

            const charPane = this.container?.querySelector('#pTabCharacter');
            if (charPane) {
                charPane.innerHTML = this.renderCharacterSheet(data);
                this.bindSheetEvents(data);
            }
        }

        openActionModal(data, existingAction = null, editIndex = -1) {
            const oldModal = document.querySelector('.action-modal-overlay');
            if (oldModal) oldModal.remove();

            const isEdit = existingAction !== null && editIndex >= 0;
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'action-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="action-modal">
                    <div class="action-modal-header">
                        <h3>${isEdit ? 'Редактировать действие' : 'Новое действие / Оружие'}</h3>
                        <button class="btn-close-modal" id="btnModalClose">✕</button>
                    </div>
                    <div class="action-modal-body">
                        <div class="modal-form-group">
                            <label>Название оружия или действия *</label>
                            <input type="text" id="modalActionName" placeholder="например, Зазубренный меч +1" value="${escape(existingAction?.name || '')}" />
                        </div>
                        <div class="modal-form-row">
                            <div class="modal-form-group">
                                <label>Бонус атаки</label>
                                <input type="text" id="modalActionHit" placeholder="+5" value="${escape(existingAction?.hit || '')}" />
                            </div>
                            <div class="modal-form-group">
                                <label>Урон</label>
                                <input type="text" id="modalActionDmg" placeholder="1d8+3" value="${escape(existingAction?.dmg || '')}" />
                            </div>
                        </div>
                        <div class="modal-form-group">
                            <label>Тип урона</label>
                            <input type="text" id="modalActionType" placeholder="рубящий, колющий, огонь..." value="${escape(existingAction?.type || '')}" />
                        </div>
                        <div class="modal-form-group">
                            <label>Описание / Свойства</label>
                            <textarea id="modalActionDesc" rows="3" placeholder="Дистанция, свойства оружия, заговор...">${escape(existingAction?.desc || '')}</textarea>
                        </div>
                    </div>
                    <div class="action-modal-footer">
                        <button class="btn-rest" id="btnModalCancel" style="border: 1px solid #374151;">Отмена</button>
                        <button class="btn-primary" id="btnModalSave">Сохранить</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            const close = () => modalOverlay.remove();
            modalOverlay.querySelector('#btnModalClose').onclick = close;
            modalOverlay.querySelector('#btnModalCancel').onclick = close;
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) close();
            };

            const inputName = modalOverlay.querySelector('#modalActionName');
            inputName.focus();

            modalOverlay.querySelector('#btnModalSave').onclick = () => {
                const name = inputName.value.trim();
                if (!name) {
                    inputName.style.borderColor = '#ef4444';
                    return;
                }

                const hit = modalOverlay.querySelector('#modalActionHit').value.trim();
                const dmg = modalOverlay.querySelector('#modalActionDmg').value.trim();
                const type = modalOverlay.querySelector('#modalActionType').value.trim();
                const desc = modalOverlay.querySelector('#modalActionDesc').value.trim();

                const newAction = { name, hit, dmg, type, desc };
                data.attacks = data.attacks || [];

                if (isEdit) {
                    data.attacks[editIndex] = newAction;
                } else {
                    data.attacks.push(newAction);
                }

                close();

                if (window.TBNetwork) {
                    window.TBNetwork.send('UPDATE_CHARACTER_ACTIONS', {
                        characterName: data.name,
                        attacks: data.attacks
                    });
                }

                const charPane = this.container?.querySelector('#pTabCharacter');
                if (charPane) {
                    charPane.innerHTML = this.renderCharacterSheet(data);
                    this.bindSheetEvents(data);
                }
            };
        }

        deleteAction(data, index) {
            if (!data.attacks || index < 0 || index >= data.attacks.length) return;
            data.attacks.splice(index, 1);
            if (window.TBNetwork) {
                window.TBNetwork.send('UPDATE_CHARACTER_ACTIONS', {
                    characterName: data.name,
                    attacks: data.attacks
                });
            }
            const charPane = this.container?.querySelector('#pTabCharacter');
            if (charPane) {
                charPane.innerHTML = this.renderCharacterSheet(data);
                this.bindSheetEvents(data);
            }
        }

        openParamModal(data, paramName, paramLabel, currentVal) {
            const oldModal = document.querySelector('.action-modal-overlay');
            if (oldModal) oldModal.remove();

            const escape = window.TBTextUtils?.escapeHtml || (s => s);
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'action-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="action-modal" style="max-width: 320px;">
                    <div class="action-modal-header">
                        <h3>Изменить: ${paramLabel}</h3>
                        <button class="btn-close-modal" id="btnModalClose">✕</button>
                    </div>
                    <div class="action-modal-body">
                        <div class="modal-form-group">
                            <label>Новое значение для ${paramLabel}</label>
                            <input type="text" id="modalParamInput" value="${escape(currentVal)}" autofocus autocomplete="off" />
                        </div>
                    </div>
                    <div class="action-modal-footer">
                        <button class="btn-rest" id="btnModalCancel" style="border: 1px solid #374151;">Отмена</button>
                        <button class="btn-primary" id="btnModalSave">Сохранить</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            const input = modalOverlay.querySelector('#modalParamInput');
            input.focus();
            input.select();

            const close = () => modalOverlay.remove();
            modalOverlay.querySelector('#btnModalClose').onclick = close;
            modalOverlay.querySelector('#btnModalCancel').onclick = close;
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) close();
            };

            const save = () => {
                const val = input.value.trim();
                if (!val) {
                    input.style.borderColor = '#ef4444';
                    return;
                }
                data[paramName] = val;
                close();

                if (window.TBNetwork) {
                    window.TBNetwork.send('UPDATE_CHARACTER_PARAM', {
                        characterName: data.name,
                        param: paramName,
                        value: val
                    });
                }

                const charPane = this.container?.querySelector('#pTabCharacter');
                if (charPane) {
                    charPane.innerHTML = this.renderCharacterSheet(data);
                    this.bindSheetEvents(data);
                }
            };

            modalOverlay.querySelector('#btnModalSave').onclick = save;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') close();
            };
        }

        openStatsModal(data) {
            const oldModal = document.querySelector('.action-modal-overlay');
            if (oldModal) oldModal.remove();

            const stats = data.stats || {};
            const parseVal = (v) => {
                const m = String(v || '10').match(/^(\d+)/);
                return m ? parseInt(m[1], 10) : 10;
            };

            const strVal = parseVal(stats.str);
            const dexVal = parseVal(stats.dex);
            const conVal = parseVal(stats.con);
            const intVal = parseVal(stats.int);
            const wisVal = parseVal(stats.wis);
            const chaVal = parseVal(stats.cha);

            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'action-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="action-modal" style="max-width: 360px;">
                    <div class="action-modal-header">
                        <h3>Характеристики персонажа</h3>
                        <button class="btn-close-modal" id="btnModalClose">✕</button>
                    </div>
                    <div class="action-modal-body">
                        <div class="stats-modal-grid">
                            <div class="modal-form-group">
                                <label>Сила (СИЛ)</label>
                                <input type="number" id="statStr" value="${strVal}" min="1" max="30" />
                            </div>
                            <div class="modal-form-group">
                                <label>Ловкость (ЛОВ)</label>
                                <input type="number" id="statDex" value="${dexVal}" min="1" max="30" />
                            </div>
                            <div class="modal-form-group">
                                <label>Телосложение (ТЕЛ)</label>
                                <input type="number" id="statCon" value="${conVal}" min="1" max="30" />
                            </div>
                            <div class="modal-form-group">
                                <label>Интеллект (ИНТ)</label>
                                <input type="number" id="statInt" value="${intVal}" min="1" max="30" />
                            </div>
                            <div class="modal-form-group">
                                <label>Мудрость (МУД)</label>
                                <input type="number" id="statWis" value="${wisVal}" min="1" max="30" />
                            </div>
                            <div class="modal-form-group">
                                <label>Харизма (ХАР)</label>
                                <input type="number" id="statCha" value="${chaVal}" min="1" max="30" />
                            </div>
                        </div>
                    </div>
                    <div class="action-modal-footer">
                        <button class="btn-rest" id="btnModalCancel" style="border: 1px solid #374151;">Отмена</button>
                        <button class="btn-primary" id="btnModalSave">Сохранить</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            const close = () => modalOverlay.remove();
            modalOverlay.querySelector('#btnModalClose').onclick = close;
            modalOverlay.querySelector('#btnModalCancel').onclick = close;
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) close();
            };

            const formatScore = (num) => {
                const s = parseInt(num, 10) || 10;
                const m = Math.floor((s - 10) / 2);
                const mStr = m >= 0 ? `+${m}` : `${m}`;
                return `${s} (${mStr})`;
            };

            const save = () => {
                const newStats = {
                    str: formatScore(modalOverlay.querySelector('#statStr').value),
                    dex: formatScore(modalOverlay.querySelector('#statDex').value),
                    con: formatScore(modalOverlay.querySelector('#statCon').value),
                    int: formatScore(modalOverlay.querySelector('#statInt').value),
                    wis: formatScore(modalOverlay.querySelector('#statWis').value),
                    cha: formatScore(modalOverlay.querySelector('#statCha').value)
                };

                data.stats = newStats;
                close();

                if (window.TBNetwork) {
                    window.TBNetwork.send('UPDATE_CHARACTER_STATS', {
                        characterName: data.name,
                        stats: newStats
                    });
                }

                const charPane = this.container?.querySelector('#pTabCharacter');
                if (charPane) {
                    charPane.innerHTML = this.renderCharacterSheet(data);
                    this.bindSheetEvents(data);
                }
            };

            modalOverlay.querySelector('#btnModalSave').onclick = save;
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

            this.bindSheetEvents(data);
        }

        bindSheetEvents(data) {
            // Delegate HP modification to feature
            if (window.TBFeatureApplyDamage) {
                window.TBFeatureApplyDamage.bindEvents(this.container, data);
            }

            // Death saves buttons
            const btnDeath = this.container.querySelector('#btnRollDeathSave');
            if (btnDeath) {
                btnDeath.addEventListener('click', () => this.handleDeathSaveRoll(data));
            }

            const btnResetDeath = this.container.querySelector('#btnResetDeathSaves');
            if (btnResetDeath) {
                btnResetDeath.addEventListener('click', () => {
                    this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
                    const charPane = this.container?.querySelector('#pTabCharacter');
                    if (charPane) {
                        charPane.innerHTML = this.renderCharacterSheet(data);
                        this.bindSheetEvents(data);
                    }
                });
            }

            // Resource bubble clicks
            this.container.querySelectorAll('.resource-bubble').forEach(bubble => {
                bubble.addEventListener('click', () => {
                    const rIdx = parseInt(bubble.dataset.rIdx, 10);
                    const bIdx = parseInt(bubble.dataset.bIdx, 10);
                    this.toggleResource(data, rIdx, bIdx);
                });
            });

            // Editable parameters: AC, Speed, Max HP, Level, Race, Class, Stats
            const btnEditAc = this.container.querySelector('#btnEditAc');
            if (btnEditAc) {
                btnEditAc.onclick = () => {
                    this.openParamModal(data, 'ac', 'Класс Доспеха (КД)', data.ac || '10');
                };
            }

            const btnEditSpeed = this.container.querySelector('#btnEditSpeed');
            if (btnEditSpeed) {
                btnEditSpeed.onclick = () => {
                    this.openParamModal(data, 'speed', 'Скорость', data.speed || '9 м');
                };
            }

            const btnEditMaxHp = this.container.querySelector('#btnEditMaxHp');
            if (btnEditMaxHp) {
                btnEditMaxHp.onclick = () => {
                    this.openParamModal(data, 'hp_max', 'Максимальное здоровье (ХП)', data.hp_max || data.hp || '20');
                };
            }

            const btnEditLevel = this.container.querySelector('#btnEditLevel');
            if (btnEditLevel) {
                btnEditLevel.onclick = () => {
                    this.openParamModal(data, 'level', 'Уровень персонажа', data.level || '1');
                };
            }

            const btnEditRace = this.container.querySelector('#btnEditRace');
            if (btnEditRace) {
                btnEditRace.onclick = () => {
                    this.openParamModal(data, 'race', 'Раса персонажа', data.race || 'Гуманоид');
                };
            }

            const btnEditClass = this.container.querySelector('#btnEditClass');
            if (btnEditClass) {
                btnEditClass.onclick = () => {
                    this.openParamModal(data, 'class', 'Класс персонажа', data.class || 'Искатель');
                };
            }

            const btnEditStats = this.container.querySelector('#btnEditStats');
            if (btnEditStats) {
                btnEditStats.onclick = () => {
                    this.openStatsModal(data);
                };
            }

            // Add action button
            const btnAddAction = this.container.querySelector('#btnAddAction');
            if (btnAddAction) {
                btnAddAction.addEventListener('click', () => {
                    this.openActionModal(data);
                });
            }

            // Edit / delete action buttons
            this.container.querySelectorAll('.btn-atk-manage.edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index, 10);
                    if (data.attacks && data.attacks[idx]) {
                        this.openActionModal(data, data.attacks[idx], idx);
                    }
                });
            });

            this.container.querySelectorAll('.btn-atk-manage.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index, 10);
                    if (confirm(`Удалить действие "${data.attacks[idx]?.name || 'Атака'}"?`)) {
                        this.deleteAction(data, idx);
                    }
                });
            });

            // Long Rest button
            const btnLong = this.container.querySelector('#btnLongRest');
            if (btnLong) {
                btnLong.addEventListener('click', () => {
                    const max = parseInt(data.hp_max, 10) || parseInt(data.hp, 10) || 20;
                    const cur = parseInt(data.hp, 10) || 0;
                    const delta = max - cur;
                    if (window.TBFeatureApplyDamage && delta > 0) {
                        window.TBFeatureApplyDamage.modifyHp(data, delta, this.container);
                    }
                    this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
                    this.resetResources(data, 'long');

                    const orig = btnLong.textContent;
                    btnLong.textContent = 'Отдых завершён!';
                    btnLong.classList.add('rested');
                    setTimeout(() => {
                        btnLong.textContent = orig;
                        btnLong.classList.remove('rested');
                    }, 2000);

                    if (window.TBApi?.sendChatMessage) {
                        window.TBApi.sendChatMessage(`${data.name} завершает Долгий отдых (ХП: ${max}/${max}, ячейки и ресурсы восстановлены)`);
                    }

                    const charPane = this.container?.querySelector('#pTabCharacter');
                    if (charPane) {
                        charPane.innerHTML = this.renderCharacterSheet(data);
                        this.bindSheetEvents(data);
                    }
                });
            }

            // Short Rest button
            const btnShort = this.container.querySelector('#btnShortRest');
            if (btnShort) {
                btnShort.addEventListener('click', async () => {
                    const cls = (data.class || '').toLowerCase();
                    let die = '1d8';
                    if (cls.includes('варвар')) die = '1d12';
                    else if (cls.includes('воин') || cls.includes('паладин') || cls.includes('следопыт')) die = '1d10';
                    else if (cls.includes('чародей') || cls.includes('волшебник')) die = '1d6';

                    const stats = data.stats || {};
                    const conMod = (stats.con && String(stats.con).match(/\(([+-]?\d+)\)/)?.[1]) || '+0';
                    const formula = `${die}${conMod.startsWith('+') || conMod.startsWith('-') ? conMod : '+' + conMod}`;

                    if (window.TBFeatureRollDice) {
                        await window.TBFeatureRollDice.roll(formula, `${data.name}: Кость Хитов (Короткий отдых)`, false);
                    }
                    this.resetResources(data, 'short');

                    if (window.TBApi?.sendChatMessage) {
                        window.TBApi.sendChatMessage(`${data.name} совершает Короткий отдых и бросает Кость Хитов (${formula})`);
                    }

                    const charPane = this.container?.querySelector('#pTabCharacter');
                    if (charPane) {
                        charPane.innerHTML = this.renderCharacterSheet(data);
                        this.bindSheetEvents(data);
                    }
                });
            }

            // Roll initiative (open player roll)
            const btnInit = this.container.querySelector('#btnRollInit');
            if (btnInit) {
                btnInit.addEventListener('click', () => {
                    window.TBFeatureRollDice?.rollInitiative(data.name, false);
                });
            }

            // Roll ability checks (open player roll)
            this.container.querySelectorAll('.ability-score-card').forEach(card => {
                card.addEventListener('click', () => {
                    const mod = card.dataset.mod || '+0';
                    const name = card.dataset.name || 'Характеристика';
                    window.TBFeatureRollDice?.rollAbilityCheck(name, mod, data.name, false);
                });
            });

            // Roll attacks (open player roll)
            this.container.querySelectorAll('.btn-atk-roll.hit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const hit = btn.dataset.hit || '+0';
                    const name = btn.dataset.name || 'Атака';
                    window.TBFeatureRollDice?.rollAttack(hit, name, 'hit', false);
                });
            });

            this.container.querySelectorAll('.btn-atk-roll.dmg').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dmg = btn.dataset.dmg || '1d6';
                    const name = btn.dataset.name || 'Урон';
                    window.TBFeatureRollDice?.rollAttack(dmg, name, 'dmg', false);
                });
            });
        }

        updateHpDisplay(hp, maxHp) {
            if (window.TBFeatureApplyDamage) {
                window.TBFeatureApplyDamage.updateHpDisplay(hp, maxHp, this.container);
            }
            const data = window.TBState?.get('playerData');
            if (data) {
                const isZero = hp === 0;
                const deathCard = this.container?.querySelector('.death-saves-card');
                if ((isZero && !deathCard) || (!isZero && deathCard)) {
                    if (!isZero) {
                        this.deathSaves = { successes: 0, failures: 0, status: null, statusClass: '' };
                    }
                    data.hp = hp;
                    data.hp_max = maxHp;
                    const charPane = this.container?.querySelector('#pTabCharacter');
                    if (charPane) {
                        charPane.innerHTML = this.renderCharacterSheet(data);
                        this.bindSheetEvents(data);
                    }
                }
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
