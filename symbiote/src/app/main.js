// --- FSD: App Layer - Main Application Bootstrap & Composition Root ---

(function() {
    function bootstrap() {
        // 1. Initialize Logger in Tools tab
        window.TBLogger?.init('logContainer');
        window.TBLogger?.log('TaleBridge (FSD Architecture) запускается...', 'sys');

        // 2. Initialize Shared Clipboard & Context Menu
        if (window.TBClipboard) {
            window.TBClipboard.init();
        }

        // 3. Initialize Global Widgets (Header, Token HUD, Cinema Overlay)
        if (window.TBWidgetAppHeader) {
            window.TBWidgetAppHeader.init();
        }
        if (window.TBWidgetTokenHud) {
            window.TBWidgetTokenHud.init();
        }
        if (window.TBWidgetCinemaOverlay) {
            window.TBWidgetCinemaOverlay.init('cinemaOverlay');
        }

        // 4. Initialize Pages (GM Screen and Player Screen)
        if (window.TBPageGmScreen) {
            window.TBPageGmScreen.init();
        }
        if (window.TBPagePlayerScreen) {
            window.TBPagePlayerScreen.init();
        }

        // 5. Connect WebSocket Client to Obsidian Host
        if (window.TBNetwork) {
            window.TBNetwork.connect();
        }

        window.TBLogger?.log('Все FSD-слои (Shared, Entities, Features, Widgets, Pages, App) успешно инициализированы', 'sys');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
