// --- FSD: Features Layer - Roll Dice Feature ---

(function() {
    class RollDiceFeature {
        /**
         * Cleans and sanitizes raw dice formulas (e.g. "+5" -> "1d20+5")
         * @param {string} raw 
         * @returns {string}
         */
        cleanFormula(raw) {
            return window.TBApi?.cleanFormula(raw) || (raw || '1d20');
        }

        /**
         * Rolls dice formula with character/action label
         * @param {string} formula 
         * @param {string} label 
         * @param {boolean|null} isGmOnly
         */
        async roll(formula, label = 'Бросок', isGmOnly = null) {
            if (window.TBApi) {
                await window.TBApi.rollDice(formula, label, isGmOnly);
            }
        }

        /**
         * Rolls initiative for character
         * @param {string} charName 
         * @param {boolean|null} isGmOnly
         */
        async rollInitiative(charName, isGmOnly = null) {
            await this.roll('1d20', `Инициатива (${charName})`, isGmOnly);
        }

        /**
         * Rolls ability check with modifier
         * @param {string} statName 
         * @param {string} modStr 
         * @param {string} charName 
         * @param {boolean|null} isGmOnly
         */
        async rollAbilityCheck(statName, modStr, charName, isGmOnly = null) {
            const mod = modStr || '+0';
            const formula = `1d20${mod.startsWith('+') || mod.startsWith('-') ? mod : '+' + mod}`;
            await this.roll(formula, `${statName} (${charName})`, isGmOnly);
        }

        /**
         * Rolls attack roll (to hit or damage)
         * @param {string} formula 
         * @param {string} atkName 
         * @param {string} kind 'hit' | 'dmg'
         * @param {boolean|null} isGmOnly
         */
        async rollAttack(formula, atkName, kind = 'hit', isGmOnly = null) {
            if (kind === 'hit') {
                const hit = formula || '+0';
                const f = `1d20${hit.startsWith('+') || hit.startsWith('-') ? hit : '+' + hit}`;
                await this.roll(f, `${atkName} - Атака`, isGmOnly);
            } else {
                await this.roll(formula || '1d6', `${atkName} - Урон`, isGmOnly);
            }
        }
    }

    const instance = new RollDiceFeature();
    window.TBFeatureRollDice = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.rollDice = instance;
})();
