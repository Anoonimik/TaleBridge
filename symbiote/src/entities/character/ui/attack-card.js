// --- FSD: Entities Layer - Character Attack Card UI ---

(function() {
    const TBAttackCard = {
        /**
         * Renders attack action card for player sheet or bestiary
         * @param {Object} atk 
         * @returns {string} HTML markup
         */
        render(atk) {
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            return `
                <div class="sheet-attack-card">
                    <div class="atk-title-row">
                        <strong class="atk-name">${escape(atk.name || 'Атака')}</strong>
                        ${atk.type ? `<span class="atk-type-badge">${escape(atk.type)}</span>` : ''}
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
