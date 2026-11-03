// --- FSD: Shared Layer - Event & Terminal Logger ---

(function() {
    class Logger {
        constructor() {
            this.container = null;
        }

        init(elementId = 'logContainer') {
            this.container = document.getElementById(elementId);
        }

        log(msg, type = 'sys') {
            const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            console.log(`[TB ${time}][${type}]`, msg);

            if (!this.container) return;

            const el = document.createElement('div');
            el.className = `log-entry ${type}`;
            el.textContent = `[${time}] ${msg}`;

            this.container.appendChild(el);
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    const loggerInstance = new Logger();
    window.TBLogger = loggerInstance;
    window.TBShared = window.TBShared || {};
    window.TBShared.logger = loggerInstance;
})();
