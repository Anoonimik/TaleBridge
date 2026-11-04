// --- FSD: Pages Layer - GM Screen Page ---

(function() {
    class GmScreenPage {
        init() {
            this.setupTabNavigation();

            // Initialize GM widgets
            if (window.TBWidgetStoryTracker) window.TBWidgetStoryTracker.init();
            if (window.TBWidgetCharacterRoster) window.TBWidgetCharacterRoster.init();
            if (window.TBWidgetCombatTracker) window.TBWidgetCombatTracker.init('combatTrackerContainer');
            if (window.TBWidgetNoteViewer) window.TBWidgetNoteViewer.init();
            if (window.TBWidgetToolsPanel) window.TBWidgetToolsPanel.init();

            // Initialize GM Broadcast in Tools tab
            if (window.TBFeatureBroadcastMedia) {
                window.TBFeatureBroadcastMedia.init('gmBroadcastBox');
            }
        }

        setupTabNavigation() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    const target = document.getElementById(btn.dataset.tab);
                    if (target) target.classList.add('active');
                });
            });
        }
    }

    const instance = new GmScreenPage();
    window.TBPageGmScreen = instance;
    window.TBPages = window.TBPages || {};
    window.TBPages.gmScreen = instance;
})();
