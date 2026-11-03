// --- TaleBridge Story View Controller (Non-Linear Narrative Cockpit) ---

(function() {
    class StoryView {
        constructor() {
            this.container = null;
            this.activeTitleDisplay = null;
            this.btnOpenDrawer = null;
            this.btnHistoryBack = null;
            this.btnReload = null;
            this.bodyEl = null;
            this.modeBtns = [];
            this.currentFilter = 'all'; // 'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches'
            this.history = []; // Non-linear navigation history stack
            this.isEmergencyNudgeVisible = false;
        }

        init() {
            this.container = document.getElementById('tab-story');
            this.activeTitleDisplay = document.getElementById('activeSceneTitleDisplay');
            this.btnOpenDrawer = document.getElementById('btnOpenSceneDirectory');
            this.btnHistoryBack = document.getElementById('btnSceneHistoryBack');
            this.btnReload = document.getElementById('btnReloadScenes');
            this.bodyEl = document.getElementById('sceneBody');
            this.modeBtns = document.querySelectorAll('.scene-mode-btn');

            // Initialize Modular Scene Drawer Component
            if (window.TBSceneDrawer) {
                window.TBSceneDrawer.init({
                    onSelectScene: (sceneId) => this.selectScene(sceneId, false)
                });
            }

            // Open Scene Directory Drawer
            if (this.btnOpenDrawer) {
                this.btnOpenDrawer.addEventListener('click', () => {
                    if (window.TBSceneDrawer) {
                        window.TBSceneDrawer.toggle();
                    }
                });
            }

            // Non-linear History Back Navigation
            if (this.btnHistoryBack) {
                this.btnHistoryBack.addEventListener('click', () => this.historyBack());
            }

            // Refresh from Obsidian
            if (this.btnReload) {
                this.btnReload.addEventListener('click', () => {
                    if (window.TBLogger) {
                        window.TBLogger.log('Запрос свежих сцен из Obsidian...', 'out');
                    }
                    if (window.TBNetwork) {
                        window.TBNetwork.send('GET_SCENES', {});
                    }
                });
            }

            // Quick View Filter Mode Pills
            this.modeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode || 'all';
                    this.setFilter(mode);
                });
            });

            // Global Keyboard Shortcuts (1..5 for tabs, Esc to close drawer)
            this._registerKeyboardShortcuts();

            // Subscribe to scenes updates from Obsidian
            if (window.TBState) {
                window.TBState.on('scenes', (scenes) => {
                    if (window.TBSceneDrawer) {
                        window.TBSceneDrawer.updateCount(scenes ? scenes.length : 0);
                    }
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
                // If user is typing in an input or textarea, ignore hotkeys
                if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                    if (e.key === 'Escape' && window.TBSceneDrawer && window.TBSceneDrawer.isOpen()) {
                        window.TBSceneDrawer.close();
                    }
                    return;
                }

                // Close drawer on Escape
                if (e.key === 'Escape') {
                    if (window.TBSceneDrawer && window.TBSceneDrawer.isOpen()) {
                        window.TBSceneDrawer.close();
                        return;
                    }
                }

                // Hotkeys only apply if Story tab is currently active
                const storyTab = document.getElementById('tab-story');
                if (!storyTab || !storyTab.classList.contains('active')) {
                    return;
                }

                // Do not switch tabs when directory drawer is opened
                if (window.TBSceneDrawer && window.TBSceneDrawer.isOpen()) {
                    return;
                }

                const filterModes = ['all', 'readAloud', 'roleplay', 'mechanics', 'branches'];
                let keyNum = -1;

                if (e.code && e.code.startsWith('Digit')) {
                    keyNum = parseInt(e.code.replace('Digit', ''), 10);
                } else if (e.code && e.code.startsWith('Numpad')) {
                    keyNum = parseInt(e.code.replace('Numpad', ''), 10);
                } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
                    keyNum = parseInt(e.key, 10);
                }

                if (keyNum >= 1 && keyNum <= 5) {
                    e.preventDefault();
                    const targetMode = filterModes[keyNum - 1];
                    if (targetMode) {
                        this.setFilter(targetMode);
                    }
                }
            });
        }

        selectScene(sceneId, isHistoryNavigation = false) {
            const scenes = window.TBState.get('scenes') || [];
            const currentId = window.TBState.get('activeSceneId');

            if (!isHistoryNavigation && currentId && currentId !== sceneId) {
                this.history.push(currentId);
            }

            if (this.btnHistoryBack) {
                this.btnHistoryBack.disabled = (this.history.length === 0);
            }

            window.TBState.set('activeSceneId', sceneId);
            this.isEmergencyNudgeVisible = false;

            const scene = scenes.find(s => s.id === sceneId);
            this.updateHeaderTitle(scene);
            this.renderScene(sceneId);
        }

        historyBack() {
            if (this.history.length === 0) return;
            const prevId = this.history.pop();
            this.selectScene(prevId, true);
        }

        updateHeaderTitle(scene) {
            if (!this.activeTitleDisplay) return;
            if (scene) {
                const sess = scene.session ? `[${scene.session.split(' - ')[0]}] ` : '';
                const loc = scene.location ? ` • ${scene.location}` : '';
                this.activeTitleDisplay.textContent = `${sess}${scene.title}${loc}`;
                this.activeTitleDisplay.title = `${scene.session ? scene.session + ' — ' : ''}${scene.title}${loc}`;
            } else {
                this.activeTitleDisplay.textContent = 'Выберите сцену из каталога';
            }
        }

        setFilter(filterMode) {
            this.currentFilter = filterMode;
            this.modeBtns.forEach(b => {
                if (b.dataset.mode === filterMode) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            const activeId = window.TBState.get('activeSceneId');
            if (activeId) {
                this.renderScene(activeId);
            }
        }

        renderScene(sceneId) {
            if (!this.bodyEl) return;
            const scenes = window.TBState.get('scenes') || [];
            const scene = scenes.find(s => s.id === sceneId);

            if (!scene) {
                this.bodyEl.innerHTML = '<div class="empty-hint">Выберите сцену из каталога</div>';
                return;
            }

            this.bodyEl.innerHTML = '';

            const renderer = window.TBSceneCardRenderer;
            if (!renderer) {
                this.bodyEl.innerHTML = '<div class="empty-hint">Ошибка загрузки компонентов рендеринга</div>';
                return;
            }

            // 1. Context Header Card (Always visible)
            const headerCard = renderer.renderContextHeader(scene, {
                isEmergencyNudgeVisible: this.isEmergencyNudgeVisible,
                onToggleNudge: (forceState) => {
                    this.isEmergencyNudgeVisible = (typeof forceState === 'boolean') ? forceState : !this.isEmergencyNudgeVisible;
                    const banner = document.getElementById('emergencyNudgeBanner');
                    if (banner) {
                        banner.style.display = this.isEmergencyNudgeVisible ? 'flex' : 'none';
                        if (this.isEmergencyNudgeVisible) {
                            banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                    const nb = headerCard.querySelector('.nudge-btn');
                    if (nb) nb.classList.toggle('active', this.isEmergencyNudgeVisible);
                },
                onSelectCharacter: (charName) => {
                    const charTabBtn = document.querySelector('.tab-btn[data-tab="tab-characters"]');
                    if (charTabBtn) charTabBtn.click();
                    if (window.TBRosterView) {
                        setTimeout(() => window.TBRosterView.focusCharacter(charName), 50);
                    }
                }
            });
            this.bodyEl.appendChild(headerCard);

            // 2. Filter-based Section Cards
            const filter = this.currentFilter;

            // Card 1: Read-Aloud & Senses
            if (filter === 'all' || filter === 'readAloud') {
                if (scene.readAloud || scene.sensory) {
                    this.bodyEl.appendChild(renderer.renderReadAloudCard(scene));
                }
            }

            // Card 2: Roleplay Dossier & Dialogue Cues
            if (filter === 'all' || filter === 'roleplay') {
                const hasPersonas = scene.personas && scene.personas.length > 0;
                const hasDialogues = scene.dialogues && scene.dialogues.length > 0;
                if (hasPersonas || hasDialogues) {
                    this.bodyEl.appendChild(renderer.renderRoleplayCard(scene));
                }
            }

            // Card 3: Skill Checks & Combat Mechanics
            if (filter === 'all' || filter === 'mechanics') {
                const hasClues = scene.clues && scene.clues.length > 0;
                const hasMechanics = scene.mechanics && scene.mechanics.length > 0;
                if (hasClues || hasMechanics) {
                    this.bodyEl.appendChild(renderer.renderMechanicsCard(scene));
                }
            }

            // Card 4: Story Vectors, Non-Linear Branches & Emergency Nudge
            if (filter === 'all' || filter === 'branches') {
                this.bodyEl.appendChild(renderer.renderBranchesCard(scene, scenes, {
                    onSelectScene: (targetId) => this.selectScene(targetId, false)
                }));
            }
        }
    }

    window.TBStoryView = new StoryView();
})();
