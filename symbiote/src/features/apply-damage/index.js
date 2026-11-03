// --- FSD: Features Layer - Apply Damage & Heal Feature ---

(function() {
    class ApplyDamageFeature {
        /**
         * Modifies character's HP by delta and syncs with Obsidian
         * @param {Object} data Character data
         * @param {number} delta 
         * @param {HTMLElement} container 
         */
        modifyHp(data, delta, container) {
            let cur = parseInt(data.hp, 10) || 20;
            const max = parseInt(data.hp_max, 10) || cur;
            cur = Math.min(max, Math.max(0, cur + delta));

            data.hp = cur;
            this.updateHpDisplay(cur, max, container);

            if (window.TBNetwork) {
                window.TBNetwork.send('UPDATE_CHARACTER_HP', {
                    characterName: data.name,
                    hp: cur,
                    maxHp: max
                });
            }
        }

        /**
         * Updates HP digits and visual progress bar without re-rendering the whole sheet
         * @param {number} hp 
         * @param {number} maxHp 
         * @param {HTMLElement} container 
         */
        updateHpDisplay(hp, maxHp, container) {
            const root = container || document.getElementById('playerContainer');
            const digits = root?.querySelector('#playerHpCur');
            const barFill = root?.querySelector('#playerHpBarFill');
            if (digits) digits.textContent = hp;

            const m = maxHp || 20;
            const pct = Math.min(100, Math.max(0, Math.round((hp / m) * 100)));
            if (barFill) {
                barFill.style.width = `${pct}%`;
                barFill.className = `hp-bar-fill ${pct <= 25 ? 'critical' : (pct <= 50 ? 'warning' : 'healthy')}`;
            }
        }

        /**
         * Binds click events to HP modify buttons (+/-5, +/-1, damage, heal)
         * @param {HTMLElement} container 
         * @param {Object} data 
         */
        bindEvents(container, data) {
            if (!container || !data) return;

            // Quick modifiers
            container.querySelectorAll('.btn-hp-mod').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseInt(btn.dataset.mod, 10) || 0;
                    this.modifyHp(data, delta, container);
                });
            });

            // Custom damage and heal buttons
            const btnDmg = container.querySelector('#btnHpDamage');
            const btnHeal = container.querySelector('#btnHpHeal');
            const customInput = container.querySelector('#hpCustomVal');

            if (btnDmg && customInput) {
                btnDmg.addEventListener('click', () => {
                    const val = parseInt(customInput.value, 10) || 0;
                    if (val > 0) this.modifyHp(data, -val, container);
                });
            }

            if (btnHeal && customInput) {
                btnHeal.addEventListener('click', () => {
                    const val = parseInt(customInput.value, 10) || 0;
                    if (val > 0) this.modifyHp(data, val, container);
                });
            }
        }
    }

    const instance = new ApplyDamageFeature();
    window.TBFeatureApplyDamage = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.applyDamage = instance;
})();
