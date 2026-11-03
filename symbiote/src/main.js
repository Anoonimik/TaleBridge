// --- TaleBridge Main Application Orchestrator ---

(function() {
    function init() {
        // 1. Initialize Logger
        window.TBLogger.init('logContainer');
        window.TBLogger.log('TaleBridge GM Screen v0.6.1 запускается...', 'sys');

        // 2. Setup Status Badge Reactivity
        const statusBadge = document.getElementById('statusBadge');
        const statusText = document.getElementById('statusText');

        window.TBState.on('connected', (connected) => {
            if (connected) {
                statusBadge.classList.add('connected');
                statusText.textContent = 'Obsidian: В сети';
            } else {
                statusBadge.classList.remove('connected');
                statusText.textContent = 'Obsidian: Поиск...';
            }
        });

        // 3. Setup Scale / Compact Mode Toggle
        const btnScaleToggle = document.getElementById('btnScaleToggle');
        if (btnScaleToggle) {
            const savedCompact = localStorage.getItem('tb_compact_mode') === 'true';
            if (savedCompact) {
                document.body.classList.add('compact-mode');
                btnScaleToggle.textContent = 'Масштаб: 85%';
            }

            btnScaleToggle.addEventListener('click', () => {
                const isCompact = document.body.classList.toggle('compact-mode');
                localStorage.setItem('tb_compact_mode', isCompact);
                btnScaleToggle.textContent = isCompact ? 'Масштаб: 85%' : 'Масштаб: 100%';
            });
        }

        // 4. Setup Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.tab);
                if (target) target.classList.add('active');
            });
        });

        // 5. Initialize Components & Screen Views
        if (window.TBClipboard) window.TBClipboard.init();
        window.TBTokenHud.init();
        window.TBStoryView.init();
        window.TBRosterView.init();
        window.TBNoteViewer.init();
        window.TBToolsView.init();

        // 6. Initialize Player Cockpit & Media Handout
        if (window.TBMediaHandout) window.TBMediaHandout.init('cinemaOverlay');
        if (window.TBBroadcastView) window.TBBroadcastView.init('gmBroadcastBox');
        if (window.TBPlayerView) window.TBPlayerView.init('playerContainer');

        // 7. Connect WebSocket Client to Obsidian Host
        window.TBNetwork.connect();

        window.TBLogger.log('Все GM-модули, Player Cockpit и Cinema Handout готовы', 'sys');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
