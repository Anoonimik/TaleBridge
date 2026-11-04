// --- FSD: Entities Layer - Character Attack Card UI ---

(function() {
    const TBAttackCard = {
        /**
         * Renders attack action card for player sheet or bestiary
         * @param {Object} atk 
         * @param {Object} [options]
         * @param {boolean} [options.canManage]
         * @param {number} [options.index]
         * @returns {string} HTML markup
         */
        render(atk, options = {}) {
            const escape = window.TBTextUtils?.escapeHtml || (s => s);
            const canManage = options.canManage ?? false;
            const index = options.index !== undefined ? options.index : '';

            return `
                <div class="sheet-attack-card" data-index="${index}">
                    <div class="atk-title-row">
                        <div class="atk-title-left">
                            <strong class="atk-name">${escape(atk.name || 'Атака')}</strong>
                            ${atk.type ? `<span class="atk-type-badge">${escape(atk.type)}</span>` : ''}
                        </div>
                        ${canManage ? `
                            <div class="atk-card-actions">
                                <button class="btn-atk-manage edit" data-index="${index}" title="Редактировать действие">✎</button>
                                <button class="btn-atk-manage delete" data-index="${index}" title="Удалить действие">✕</button>
                            </div>
                        ` : ''}
                    </div>
                    ${atk.desc ? `<div class="atk-desc">${escape(atk.desc)}</div>` : ''}
                    <div class="atk-button-row">
                        ${atk.hit ? `
                            <button class="btn-atk-roll hit" data-hit="${atk.hit}" data-name="${escape(atk.name)}">
                                Атака (${atk.hit})
                            </button>
                        ` : ''}
                        ${atk.dmg ? `
                            <button class="btn-atk-roll dmg" data-dmg="${atk.dmg}" data-name="${escape(atk.name)}">
                                Урон (${atk.dmg})
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    };

    window.TBAttackCard = TBAttackCard;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.attackCard = TBAttackCard;
})();
