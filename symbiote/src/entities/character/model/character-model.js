// --- FSD: Entities Layer - Character Model ---

(function() {
    const TBCharacterModel = {
        /**
         * Returns canonical playable characters list with permanent anchors for 'Артём' and 'Пачка Глицина'
         * @param {Array} roster 
         * @returns {Array}
         */
        getPlayableCharacters(roster = []) {
            const list = roster || [];
            const playable = list.filter(c => 
                c.playable === true || 
                c.category === 'Игроки' || 
                c.name === 'Артём' || 
                c.name.includes('Глицин') || 
                (c.tags && (Array.isArray(c.tags) ? c.tags : [c.tags]).some(t => String(t).match(/игрок|player|pc/i)))
            );

            // If the vault has playable characters, return them directly
            if (playable.length > 0) {
                return playable;
            }

            // Fallback demo defaults only if vault has no playable characters loaded yet
            return [
                { name: 'Артём', class: 'Воин / Плут', category: 'Игроки', playable: true },
                { name: 'Пачка Глицина', class: 'Варвар (Берсерк)', category: 'Игроки', playable: true }
            ];
        },

        /**
         * Parses ability score string and returns score number and signed modifier string
         * @param {string|number} rawVal 
         * @returns {{score: number, modStr: string}}
         */
        parseAbilityScore(rawVal) {
            let score = 10;
            let modStr = '+0';

            if (rawVal) {
                const sMatch = String(rawVal).match(/^(\d+)/);
                if (sMatch) score = parseInt(sMatch[1], 10);
                const mMatch = String(rawVal).match(/\(([+-]?\d+)\)/);
                if (mMatch) {
                    modStr = mMatch[1].startsWith('+') || mMatch[1].startsWith('-') ? mMatch[1] : `+${mMatch[1]}`;
                } else {
                    const mod = Math.floor((score - 10) / 2);
                    modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                }
            }

            return { score, modStr };
        },

        /**
         * Matches TaleSpire miniature token to Obsidian roster character
         * @param {Object} token 
         * @param {Array} roster 
         * @returns {Object|null}
         */
        matchRosterCharacter(token, roster = []) {
            if (!token || !roster) return null;
            const tId = token.id;
            const tName = (token.name || '').trim().toLowerCase();

            // 1. By exact talespire_id
            if (tId) {
                const byId = roster.find(r => r.talespire_id && r.talespire_id === tId);
                if (byId) return byId;
            }

            if (!tName) return null;

            // 2. By exact talespire_name
            const byTsName = roster.find(r => r.talespire_name && r.talespire_name.toLowerCase() === tName);
            if (byTsName) return byTsName;

            // 3. By exact name
            const byName = roster.find(r => r.name.toLowerCase() === tName);
            if (byName) return byName;

            // 4. Substring in either direction
            const bySub = roster.find(r => 
                r.name.toLowerCase().includes(tName) || 
                tName.includes(r.name.toLowerCase())
            );
            if (bySub) return bySub;

            // 5. Significant words (e.g. "Алира" in "Алира Стерн", "Био-Голем" in "Безмозглый Био-Голем")
            const words = tName.split(/[\s,«»—\-#.]+/i).filter(w => w.length > 3);
            if (words.length > 0) {
                const byWord = roster.find(r => words.some(w => r.name.toLowerCase().includes(w)));
                if (byWord) return byWord;
            }

            return null;
        }
    };

    window.TBCharacterModel = TBCharacterModel;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.characterModel = TBCharacterModel;
})();
