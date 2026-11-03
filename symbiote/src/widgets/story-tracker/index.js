// --- FSD: Widgets Layer - Story Tracker Widget ---

(function() {
    class SceneDrawerSubComponent {
        constructor() {
            this.drawerEl = null;
            this.btnClose = null;
            this.searchInput = null;
            this.listEl = null;
            this.countDisplay = null;
            this.onSelectCallback = null;
        }

        init(options = {}) {
            this.drawerEl = document.getElementById('sceneDirectoryDrawer');
            this.btnClose = document.getElementById('btnCloseSceneDirectory');
            this.searchInput = document.getElementById('sceneSearchInput');
            this.listEl = document.getElementById('sceneDirectoryList');
            this.countDisplay = document.getElementById('sceneCountDisplay');
            this.onSelectCallback = options.onSelectScene || null;

            if (this.btnClose) {
                this.btnClose.addEventListener('click', () => this.close());
            }

            if (this.searchInput) {
                this.searchInput.addEventListener('input', (e) => {
                    this.render(e.target.value.trim().toLowerCase());
                });
            }
        }

        isOpen() {
            return this.drawerEl && this.drawerEl.style.display !== 'none';
        }

        open() {
            if (!this.drawerEl) return;
            this.drawerEl.style.display = 'flex';
            if (this.searchInput) {
                this.searchInput.value = '';
                this.searchInput.focus();
            }
            this.render('');
        }

        close() {
            if (!this.drawerEl) return;
            this.drawerEl.style.display = 'none';
        }

        toggle() {
            if (this.isOpen()) {
                this.close();
            } else {
                this.open();
            }
        }

        updateCount(count) {
            if (this.countDisplay) {
                this.countDisplay.textContent = count;
            }
        }

        render(filterText = '') {
            if (!this.listEl) return;
            this.listEl.innerHTML = '';

            const scenes = window.TBState?.get('scenes') || [];
            this.updateCount(scenes.length);

            if (scenes.length === 0) {
                this.listEl.innerHTML = '<div class="empty-hint">Сцены не найдены (ожидание Obsidian)...</div>';
                return;
            }

            const activeId = window.TBState?.get('activeSceneId');

            const filtered = scenes.filter(sc => {
                if (!filterText) return true;
                const hay = `${sc.title} ${sc.location} ${sc.goal} ${(sc.cast || []).join(' ')}`.toLowerCase();
                return hay.includes(filterText);
            });

            if (filtered.length === 0) {
                this.listEl.innerHTML = '<div class="empty-hint">Ни одной сцены не найдено по этому запросу.</div>';
                return;
            }

            const sessionGroups = window.TBSceneModel?.groupBySession(filtered) || {};

            Object.keys(sessionGroups).forEach(sessionName => {
                const groupEl = document.createElement('div');
                groupEl.className = 'scene-session-group';

                const gTitle = document.createElement('div');
                gTitle.className = 'scene-session-title';
                gTitle.textContent = sessionName;
                groupEl.appendChild(gTitle);

                sessionGroups[sessionName].forEach(sc => {
                    const item = document.createElement('div');
                    item.className = `scene-drawer-item ${sc.id === activeId ? 'active' : ''}`;

                    const titleRow = document.createElement('div');
                    titleRow.className = 'scene-drawer-item-title';
                    titleRow.textContent = sc.title;
                    item.appendChild(titleRow);

                    const metaRow = document.createElement('div');
                    metaRow.className = 'scene-drawer-item-meta';

                    if (sc.location) {
                        const locBadge = document.createElement('span');
                        locBadge.className = 'drawer-badge loc';
                        locBadge.textContent = sc.location;
                        metaRow.appendChild(locBadge);
                    }

                    if (sc.cast && sc.cast.length > 0) {
                        const castBadge = document.createElement('span');
                        castBadge.className = 'drawer-badge cast';
                        castBadge.textContent = `${sc.cast.length} NPC`;
                        metaRow.appendChild(castBadge);
                    }

                    item.appendChild(metaRow);

                    item.onclick = () => {
                        this.close();
                        if (this.onSelectCallback) {
                            this.onSelectCallback(sc.id);
                        }
                    };

                    groupEl.appendChild(item);
                });

                this.listEl.appendChild(groupEl);
            });
        }
    }

    class StoryTrackerWidget {
        constructor() {
            this.container = null;
            this.activeTitleDisplay = null;
            this.btnOpenDrawer = null;
            this.btnHistoryBack = null;
            this.btnReload = null;
            this.bodyEl = null;
            this.modeBtns = [];
            this.currentFilter = 'all'; // 'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches'
            this.history = [];
            this.isEmergencyNudgeVisible = false;
            this.drawer = new SceneDrawerSubComponent();
        }

        init() {
            this.container = document.getElementById('tab-story');
            this.activeTitleDisplay = document.getElementById('activeSceneTitleDisplay');
            this.btnOpenDrawer = document.getElementById('btnOpenSceneDirectory');
            this.btnHistoryBack = document.getElementById('btnSceneHistoryBack');
            this.btnReload = document.getElementById('btnReloadScenes');
            this.bodyEl = document.getElementById('sceneBody');
            this.modeBtns = document.querySelectorAll('.scene-mode-btn');

            this.drawer.init({
                onSelectScene: (sceneId) => this.selectScene(sceneId, false)
            });

            if (this.btnOpenDrawer) {
                this.btnOpenDrawer.addEventListener('click', () => {
                    this.drawer.toggle();
                });
            }

            if (this.btnHistoryBack) {
                this.btnHistoryBack.addEventListener('click', () => this.historyBack());
            }

            if (this.btnReload) {
                this.btnReload.addEventListener('click', () => {
                    window.TBLogger?.log('Запрос свежих сцен из Obsidian...', 'out');
                    window.TBNetwork?.send('GET_SCENES', {});
                });
            }

            this.modeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode || 'all';
                    this.setFilter(mode);
                });
            });

            this._registerKeyboardShortcuts();

            if (window.TBState) {
                window.TBState.on('scenes', (scenes) => {
                    this.drawer.updateCount(scenes ? scenes.length : 0);
                    const activeId = window.TBState.get('activeSceneId') || (scenes?.[0]?.id ?? null);
                    if (activeId) {
                        this.selectScene(activeId, true);
                    } else {
                        this.updateHeaderTitle(null);
                    }
                });
            }
        }

        _registerKeyboardShortcuts() {
            window.addEventListener('keydown', (e) => {
                if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                    if (e.key === 'Escape' && this.drawer.isOpen()) {
                        this.drawer.close();
                    }
                    return;
                }

                if (e.key === 'Escape') {
                    if (this.drawer.isOpen()) {
                        this.drawer.close();
                    }
                    return;
                }

                const storyTab = document.getElementById('tab-story');
                const isStoryActive = storyTab && storyTab.classList.contains('active') && window.TBState?.get('role') === 'gm';
                if (!isStoryActive) return;

                const modeMap = {
                    '1': 'all',
                    '2': 'readAloud',
                    '3': 'roleplay',
                    '4': 'mechanics',
                    '5': 'branches'
                };

                if (modeMap[e.key]) {
                    e.preventDefault();
                    this.setFilter(modeMap[e.key]);
                }
            });
        }

        selectScene(sceneId, isInitialOrReload = false) {
            const scenes = window.TBState?.get('scenes') || [];
            const scene = scenes.find(s => s.id === sceneId);
            if (!scene) return;

            const prevId = window.TBState?.get('activeSceneId');
            if (prevId && prevId !== sceneId && !isInitialOrReload) {
                this.history.push(prevId);
                this.updateHistoryButton();
            }

            window.TBState?.set('activeSceneId', sceneId);
            this.updateHeaderTitle(scene);
            this.renderScene(scene);
        }

        historyBack() {
            if (this.history.length === 0) return;
            const prevId = this.history.pop();
            this.updateHistoryButton();
            if (prevId) {
                this.selectScene(prevId, true);
            }
        }

        updateHistoryButton() {
            if (this.btnHistoryBack) {
                this.btnHistoryBack.disabled = this.history.length === 0;
            }
        }

        updateHeaderTitle(scene) {
            if (this.activeTitleDisplay) {
                this.activeTitleDisplay.textContent = scene ? scene.title : 'Сцены не загружены';
            }
        }

        setFilter(filterMode) {
            this.currentFilter = filterMode;
            this.modeBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.mode === filterMode);
            });

            const activeId = window.TBState?.get('activeSceneId');
            const scenes = window.TBState?.get('scenes') || [];
            const activeScene = scenes.find(s => s.id === activeId);
            if (activeScene) {
                this.renderScene(activeScene);
            }
        }

        renderScene(scene) {
            if (!this.bodyEl) return;
            this.bodyEl.innerHTML = '';

            const allScenes = window.TBState?.get('scenes') || [];
            const renderer = window.TBSceneCard;
            if (!renderer) return;

            const headerEl = renderer.renderContextHeader(scene, {
                isEmergencyNudgeVisible: this.isEmergencyNudgeVisible,
                onToggleNudge: (val) => {
                    this.isEmergencyNudgeVisible = typeof val === 'boolean' ? val : !this.isEmergencyNudgeVisible;
                    const b = document.getElementById('emergencyNudgeBanner');
                    if (b) b.style.display = this.isEmergencyNudgeVisible ? 'flex' : 'none';
                    const nBtn = document.querySelector('.nudge-btn');
                    if (nBtn) nBtn.classList.toggle('active', this.isEmergencyNudgeVisible);
                },
                onSelectCharacter: (charName) => {
                    if (window.TBRosterView) {
                        window.TBRosterView.focusCharacter(charName);
                    }
                }
            });
            this.bodyEl.appendChild(headerEl);

            const mode = this.currentFilter;
            const options = {
                onSelectScene: (targetId) => this.selectScene(targetId, false)
            };

            if (mode === 'all' || mode === 'readAloud') {
                if (scene.readAloud || scene.sensory) {
                    this.bodyEl.appendChild(renderer.renderReadAloudCard(scene));
                }
            }

            if (mode === 'all' || mode === 'roleplay') {
                if ((scene.personas && scene.personas.length > 0) || (scene.dialogues && scene.dialogues.length > 0)) {
                    this.bodyEl.appendChild(renderer.renderRoleplayCard(scene));
                }
            }

            if (mode === 'all' || mode === 'mechanics') {
                if ((scene.clues && scene.clues.length > 0) || (scene.mechanics && scene.mechanics.length > 0)) {
                    this.bodyEl.appendChild(renderer.renderMechanicsCard(scene));
                }
            }

            if (mode === 'all' || mode === 'branches') {
                if ((scene.branches && scene.branches.length > 0) || scene.nudge) {
                    this.bodyEl.appendChild(renderer.renderBranchesCard(scene, allScenes, options));
                }
            }

            this.bodyEl.scrollTop = 0;
        }
    }

    const instance = new StoryTrackerWidget();
    window.TBWidgetStoryTracker = instance;
    // Backward compatibility with legacy components
    window.TBStoryView = instance;
    window.TBSceneDrawer = instance.drawer;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.storyTracker = instance;
})();
