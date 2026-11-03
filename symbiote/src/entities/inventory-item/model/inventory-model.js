// --- FSD: Entities Layer - Inventory Item Model ---

(function() {
    const TBInventoryModel = {
        /**
         * Calculates total weight of all inventory items
         * @param {Array} items 
         * @returns {number}
         */
        calculateTotalWeight(items = []) {
            return (items || []).reduce((sum, it) => {
                const w = parseFloat(it.weight) || 0;
                const q = parseInt(it.quantity, 10) || 1;
                return sum + (w * q);
            }, 0);
        },

        /**
         * Calculates max carry capacity based on Strength score (D&D 5e: STR * 15 lbs = ~7.5 kg)
         * @param {number|string} strStat 
         * @returns {number}
         */
        calculateMaxCarryWeight(strStat = 14) {
            let strScore = 14;
            if (strStat) {
                const match = String(strStat).match(/(\d+)/);
                if (match) strScore = parseInt(match[1], 10) || 14;
            }
            return Math.round(strScore * 7.5);
        },

        /**
         * Determines weight class: 'normal', 'heavy', or 'overweight'
         * @param {number} totalWeight 
         * @param {number} maxWeight 
         * @returns {{percent: number, className: string}}
         */
        getWeightStatus(totalWeight, maxWeight) {
            const max = maxWeight || 1;
            const percent = Math.round((totalWeight / max) * 100);
            const className = percent > 100 ? 'overweight' : (percent > 75 ? 'heavy' : 'normal');
            return { percent, className };
        },

        /**
         * Filters inventory items by category and query
         * @param {Array} items 
         * @param {string} category 
         * @param {string} query 
         * @returns {Array}
         */
        filterItems(items = [], category = 'all', query = '') {
            const q = (query || '').toLowerCase().trim();
            const cat = (category || 'all').toLowerCase();

            return (items || []).filter(it => {
                if (cat !== 'all') {
                    const itCat = (it.category || 'Снаряжение').toLowerCase();
                    if (itCat !== cat) return false;
                }
                if (q) {
                    const n = (it.name || '').toLowerCase();
                    const d = (it.description || '').toLowerCase();
                    const c = (it.category || '').toLowerCase();
                    if (!n.includes(q) && !d.includes(q) && !c.includes(q)) return false;
                }
                return true;
            });
        }
    };

    window.TBInventoryModel = TBInventoryModel;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.inventoryModel = TBInventoryModel;
})();
