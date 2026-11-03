// --- FSD: Entities Layer - Clue Model ---

(function() {
    const TBClueModel = {
        /**
         * Resolves media URL: web link or local Obsidian vault link via HTTP host
         * @param {string} url 
         * @returns {string}
         */
        resolveMediaUrl(url) {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                return url;
            }
            const host = window.TBConfig?.HTTP_HOST || 'http://127.0.0.1:30123';
            return `${host}/vault-file?path=${encodeURIComponent(url)}`;
        },

        /**
         * Returns human-readable Russian label for media type
         * @param {string} type 
         * @returns {string}
         */
        getTypeLabel(type) {
            switch ((type || '').toLowerCase()) {
                case 'image':
                case 'картинка':
                case 'арт':
                    return 'Изображение';
                case 'video':
                case 'видео':
                    return 'Видеозапись';
                default:
                    return 'Манускрипт';
            }
        },

        /**
         * Formats manuscript multiline text into paragraphs
         * @param {string} text 
         * @returns {string} HTML markup
         */
        formatManuscriptText(text) {
            if (!text) return '';
            const escape = window.TBTextUtils?.escapeHtml || (s => s);
            return text
                .split(/\r?\n\r?\n/)
                .map(para => `<p>${escape(para).replace(/\n/g, '<br/>')}</p>`)
                .join('');
        }
    };

    window.TBClueModel = TBClueModel;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.clueModel = TBClueModel;
})();
