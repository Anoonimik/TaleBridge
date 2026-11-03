// --- FSD: Entities Layer - Clue Card UI ---

(function() {
    const TBClueCard = {
        /**
         * Renders HTML markup for a clue card in player's clues archive
         * @param {Object} clue 
         * @returns {string} HTML markup
         */
        render(clue) {
            const escape = window.TBTextUtils?.escapeHtml || (s => s);
            const model = window.TBClueModel;
            const type = (clue.type || 'text').toLowerCase();
            const dateStr = clue.savedAt 
                ? new Date(clue.savedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                : '';

            let previewThumbnail = '';
            if (type === 'image' && clue.url) {
                const resolved = model ? model.resolveMediaUrl(clue.url) : clue.url;
                previewThumbnail = `<img src="${resolved}" class="clue-thumb-img" onerror="this.style.display='none';" />`;
            } else {
                previewThumbnail = `<div class="clue-thumb-icon">${type === 'video' ? '▶' : '■'}</div>`;
            }

            const typeLabel = model ? model.getTypeLabel(type) : type;

            return `
                <div class="clue-card" data-id="${clue.id}">
                    <div class="clue-thumb-box">${previewThumbnail}</div>
                    <div class="clue-info-box">
                        <div class="clue-type-tag ${type}">${typeLabel}</div>
                        <div class="clue-title">${escape(clue.title || 'Улика')}</div>
                        ${dateStr ? `<div class="clue-date">${dateStr}</div>` : ''}
                    </div>
                    <div class="clue-actions">
                        <button class="btn-view-clue" data-id="${clue.id}">Открыть</button>
                        <button class="btn-delete-clue" data-id="${clue.id}" title="Удалить">✕</button>
                    </div>
                </div>
            `;
        }
    };

    window.TBClueCard = TBClueCard;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.clueCard = TBClueCard;
})();
