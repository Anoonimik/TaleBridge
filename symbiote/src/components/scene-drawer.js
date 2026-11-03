// --- TaleBridge Scene Directory Drawer Component ---

(function() {
    class SceneDrawer {
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

            const scenes = window.TBState.get('scenes') || [];
            this.updateCount(scenes.length);

            if (scenes.length === 0) {
                this.listEl.innerHTML = '<div class="empty-hint">Сцены не найдены (ожидание Obsidian)...</div>';
                return;
            }

            const activeId = window.TBState.get('activeSceneId');

            // Filter scenes by user query
            const filtered = scenes.filter(sc => {
                if (!filterText) return true;
                const hay = `${sc.title} ${sc.location} ${sc.goal} ${(sc.cast || []).join(' ')}`.toLowerCase();
                return hay.includes(filterText);
            });

            if (filtered.length === 0) {
                this.listEl.innerHTML = '<div class="empty-hint">Ни одной сцены не найдено по этому запросу.</div>';
                return;
            }

            // Group scenes by session folder
            const sessionGroups = {};
            filtered.forEach(sc => {
                const sName = sc.session || 'Общий сюжет';
                if (!sessionGroups[sName]) sessionGroups[sName] = [];
                sessionGroups[sName].push(sc);
            });

            Object.keys(sessionGroups).forEach(sessionName => {
                const groupEl = document.createElement('div');
                groupEl.className = 'dir-session-group';

                const groupHeader = document.createElement('div');
                groupHeader.className = 'dir-session-header';
                groupHeader.innerHTML = `
                    <div class="dir-session-left">
                        <span class="dir-session-badge">СЕССИЯ</span>
                        <span class="dir-session-title">${sessionName}</span>
                    </div>
                    <span class="dir-session-count">${sessionGroups[sessionName].length}</span>
                `;
                groupEl.appendChild(groupHeader);

                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'dir-session-cards';

                sessionGroups[sessionName].forEach(sc => {
                    const card = document.createElement('div');
                    card.className = `scene-directory-card ${sc.id === activeId ? 'active' : ''}`;

                    const top = document.createElement('div');
                    top.className = 'dir-card-top';

                    const title = document.createElement('div');
                    title.className = 'dir-card-title';
                    title.textContent = sc.title;
                    top.appendChild(title);

                    if (sc.location) {
                        const loc = document.createElement('span');
                        loc.className = 'dir-card-location';
                        loc.textContent = sc.location;
                        top.appendChild(loc);
                    }
                    card.appendChild(top);

                    if (sc.goal) {
                        const goal = document.createElement('div');
                        goal.className = 'dir-card-goal';
                        goal.innerHTML = `<b>Цель:</b> ${sc.goal}`;
                        card.appendChild(goal);
                    }

                    if (sc.cast && sc.cast.length > 0) {
                        const castRow = document.createElement('div');
                        castRow.className = 'dir-card-cast';
                        castRow.innerHTML = `<span class="cast-label">Участники:</span> ${sc.cast.join(', ')}`;
                        card.appendChild(castRow);
                    }

                    card.addEventListener('click', () => {
                        if (this.onSelectCallback) {
                            this.onSelectCallback(sc.id);
                        }
                        this.close();
                    });

                    cardsContainer.appendChild(card);
                });

                groupEl.appendChild(cardsContainer);
                this.listEl.appendChild(groupEl);
            });
        }
    }

    window.TBSceneDrawer = new SceneDrawer();
})();
