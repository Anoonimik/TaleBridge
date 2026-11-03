// --- FSD: Shared Layer - Text & Formatting Utilities ---

(function() {
    const TBTextUtils = {
        /**
         * Formats inline markdown (bold, italic, wikilinks, math tags)
         * @param {string} text 
         * @returns {string} HTML string
         */
        formatInlineMarkdown(text) {
            if (!text) return '';
            return String(text)
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*([^*]+)\*/g, '<i>$1</i>')
                .replace(/_([^_]+)_/g, '<i>$1</i>')
                .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label) => label || target)
                .replace(/\$([^$]+)\$/g, '<code class="note-math">$1</code>');
        },

        /**
         * Formats DC / КС skill check tags into styled badge elements without double parentheses
         * @param {string} text 
         * @returns {string} HTML string
         */
        formatDcBadges(text) {
            if (!text) return '';
            let formatted = this.formatInlineMarkdown(text);
            formatted = formatted.replace(/[\(\[]\s*((?:DC|КС)\s*\d+)\s*[\)\]]/gi, '<span class="dc-badge">$1</span>');
            formatted = formatted.replace(/(?<!<span[^>]*>)((?:DC|КС)\s*\d+)(?!<\/span>)/gi, '<span class="dc-badge">$1</span>');
            return formatted;
        },

        /**
         * Copies text to system clipboard with visual button feedback
         * @param {string} text 
         * @param {HTMLElement} btnEl 
         * @param {string} feedbackText 
         * @param {string} resetText 
         * @param {number} durationMs 
         */
        copyToClipboard(text, btnEl, feedbackText = 'Скопировано', resetText = 'Скопировать', durationMs = 1500) {
            if (!text) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    if (btnEl) {
                        const original = resetText || btnEl.textContent;
                        btnEl.textContent = feedbackText;
                        setTimeout(() => {
                            btnEl.textContent = original;
                        }, durationMs);
                    }
                }).catch(err => {
                    console.error('Clipboard write error:', err);
                });
            }
        },

        /**
         * Sends message to TaleSpire in-game chat with visual button feedback
         * @param {string} text 
         * @param {HTMLElement} btnEl 
         * @param {string} feedbackText 
         * @param {string} resetText 
         * @param {number} durationMs 
         */
        sendChatMessage(text, btnEl, feedbackText = 'В чате', resetText = 'В чат игры', durationMs = 1500) {
            if (!text) return;
            if (window.TBApi && window.TBApi.sendChatMessage) {
                window.TBApi.sendChatMessage(text);
                if (btnEl) {
                    const original = resetText || btnEl.textContent;
                    btnEl.textContent = feedbackText;
                    setTimeout(() => {
                        btnEl.textContent = original;
                    }, durationMs);
                }
            }
        },

        /**
         * Escapes HTML entities
         * @param {string} text 
         * @returns {string}
         */
        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
    };

    window.TBTextUtils = TBTextUtils;
    window.TBShared = window.TBShared || {};
    window.TBShared.textUtils = TBTextUtils;
})();
