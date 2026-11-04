// --- FSD: Widgets Layer - App Header Widget ---

(function() {
    class AppHeaderWidget {
        init() {
            this.btnRoleToggle = document.getElementById('btnRoleToggle');
            this.btnAutoInspect = document.getElementById('btnAutoInspect');
            this.btnScaleToggle = document.getElementById('btnScaleToggle');
            this.statusBadge = document.getElementById('statusBadge');
            this.statusText = document.getElementById('statusText');

            this.setupConnectionStatus();
            this.setupScaleToggle();
            this.setupAutoInspect();
            this.setupGmDiceMode();
            this.setupRoleToggle();
        }

        setupConnectionStatus() {
            window.TBState?.on('connected', (connected) => {
                if (this.statusBadge && this.statusText) {
                    if (connected) {
                        this.statusBadge.classList.add('connected');
                        this.statusText.textContent = 'Obsidian: В сети';
                    } else {
                        this.statusBadge.classList.remove('connected');
                        this.statusText.textContent = 'Obsidian: Поиск...';
                    }
                }
            });
        }

        setupScaleToggle() {
            if (!this.btnScaleToggle) return;
            const key = window.TBConfig?.STORAGE_KEYS?.COMPACT_MODE || 'tb_compact_mode';
            const savedCompact = localStorage.getItem(key) === 'true';

            if (savedCompact) {
                document.body.classList.add('compact-mode');
                this.btnScaleToggle.textContent = 'Масштаб: 85%';
            }

            this.btnScaleToggle.addEventListener('click', () => {
                const isCompact = document.body.classList.toggle('compact-mode');
                localStorage.setItem(key, isCompact);
                this.btnScaleToggle.textContent = isCompact ? 'Масштаб: 85%' : 'Масштаб: 100%';
            });
        }

        setupAutoInspect() {
            if (!this.btnAutoInspect) return;
            const key = window.TBConfig?.STORAGE_KEYS?.AUTO_INSPECT || 'tb_auto_inspect';
            const savedAuto = localStorage.getItem(key) === 'true';

            window.TBState?.set('autoInspect', savedAuto);
            if (savedAuto) this.btnAutoInspect.classList.add('active');
            this.btnAutoInspect.textContent = savedAuto ? 'Авто: ВКЛ' : 'Авто: ВЫКЛ';

            this.btnAutoInspect.addEventListener('click', () => {
                const current = window.TBState?.get('autoInspect');
                const next = !current;
                window.TBState?.set('autoInspect', next);
                localStorage.setItem(key, next);
                this.btnAutoInspect.classList.toggle('active', next);
                this.btnAutoInspect.textContent = next ? 'Авто: ВКЛ' : 'Авто: ВЫКЛ';
            });
        }

        setupGmDiceMode() {
            this.btnGmDiceMode = document.getElementById('btnGmDiceMode');
            if (!this.btnGmDiceMode) return;

            const updateButton = (mode) => {
                const isOpen = mode === 'open';
                this.btnGmDiceMode.classList.toggle('open', isOpen);
                this.btnGmDiceMode.classList.toggle('secret', !isOpen);
                this.btnGmDiceMode.textContent = isOpen ? 'Броски: Общие' : 'Броски: GM';
                this.btnGmDiceMode.title = isOpen
                    ? 'Броски Мастера: Общие (видны всем в общем лотке стола). Нажмите для переключения в GM-лоток'
                    : 'Броски Мастера: Скрытые (видны только вам в GM-лотке). Нажмите для переключения в общие';
            };

            const initialMode = window.TBState?.get('gmDiceMode') || 'secret';
            updateButton(initialMode);

            this.btnGmDiceMode.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                const current = window.TBState?.get('gmDiceMode') || 'secret';
                const next = (current === 'open') ? 'secret' : 'open';
                if (window.TBState) {
                    window.TBState.set('gmDiceMode', next);
                } else {
                    localStorage.setItem('tb_gm_dice_mode', next);
                }
                updateButton(next);
                window.TBLogger?.log(`Режим бросков мастера: ${next === 'open' ? 'Общие (открытый лоток стола)' : 'Скрытые (GM-лоток)'}`, 'sys');
            };

            window.TBState?.on('gmDiceMode', (mode) => {
                updateButton(mode);
            });
        }

        setupRoleToggle() {
            if (!this.btnRoleToggle) return;

            this.btnRoleToggle.addEventListener('click', async () => {
                const currentRole = window.TBState?.get('role') || 'gm';
                if (currentRole === 'player') {
                    // Switching to GM mode requires PIN verification
                    const ok = await window.TBFeatureGmAuth?.requestGmPassword();
                    if (ok) {
                        window.TBState?.setRole('gm');
                    }
                } else {
                    // Switching to Player mode
                    window.TBFeatureGmAuth?.logout();
                    window.TBState?.setRole('player');
                }
            });
        }
    }

    const instance = new AppHeaderWidget();
    window.TBWidgetAppHeader = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.appHeader = instance;
})();
