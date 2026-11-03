// --- FSD: Pages Layer - Player Screen Page ---

(function() {
    class PlayerScreenPage {
        init() {
            // Initialize Player Cockpit widget
            if (window.TBWidgetPlayerCockpit) {
                window.TBWidgetPlayerCockpit.init('playerContainer');
            }
        }
    }

    const instance = new PlayerScreenPage();
    window.TBPagePlayerScreen = instance;
    window.TBPages = window.TBPages || {};
    window.TBPages.playerScreen = instance;
})();
