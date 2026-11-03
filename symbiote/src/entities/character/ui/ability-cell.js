// --- FSD: Entities Layer - Character Ability Cell UI ---

(function() {
    const TBAbilityCell = {
        /**
         * Renders single ability score cell
         * @param {string} label (СИЛ, ЛОВ, etc.)
         * @param {string|number} rawVal 
         * @param {string} fullName (Сила, Ловкость, etc.)
         * @returns {string} HTML markup
         */
        render(label, rawVal, fullName) {
            const { score, modStr } = window.TBCharacterModel?.parseAbilityScore(rawVal) || { score: 10, modStr: '+0' };

            return `
                <div class="ability-score-card" data-ability="${label}" data-mod="${modStr}" data-name="${fullName}" title="Бросить проверку ${fullName} (${modStr}) в TaleSpire">
                    <span class="ability-name">${label}</span>
                    <span class="ability-mod">${modStr}</span>
                    <span class="ability-score">${score}</span>
                </div>
            `;
        }
    };

    window.TBAbilityCell = TBAbilityCell;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.abilityCell = TBAbilityCell;
})();
