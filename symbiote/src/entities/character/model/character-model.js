// --- FSD: Entities Layer - Character Model ---

(function() {
    const TBCharacterModel = {
        /**
         * Checks if tags array/string matches any target tags with exact matching
         * @param {Array|string} tags 
         * @param {Array<string>} targetTags 
         * @returns {boolean}
         */
        hasTag(tags, targetTags) {
            if (!tags) return false;
            const tagArray = (Array.isArray(tags) ? tags : [tags]).flatMap(t => 
                String(t).toLowerCase().replace(/^#+/, '').split(/[\s,/#]+/)
            );
            const targets = targetTags.map(t => t.toLowerCase());
            return tagArray.some(t => targets.includes(t));
        },

        /**
         * Returns canonical playable characters list with permanent anchors for 'Артём' and 'Пачка Глицина'
         * @param {Array} roster 
         * @returns {Array}
         */
        getPlayableCharacters(roster = []) {
            const list = roster || [];
            const playable = list.filter(c => {
                // If explicitly non-playable, strictly exclude
                if (c.playable === false || c.is_player === false || c.pc === false) {
                    return false;
                }

                // If explicitly marked playable
                if (c.playable === true || c.is_player === true || c.pc === true) {
                    return true;
                }

                // Canonical player names
                if (c.name === 'Артём' || (typeof c.name === 'string' && c.name.includes('Глицин'))) {
                    return true;
                }

                // Check tags with exact word matching (no partial 'npc' matching 'pc')
                if (c.tags && this.hasTag(c.tags, ['игрок', 'игроки', 'player', 'players', 'pc', 'party'])) {
                    return true;
                }

                // Category assigned by plugin
                if (c.category === 'Игроки') {
                    return true;
                }

                return false;
            });

            // If the active character is known, ensure they are retained in the playable list
            const activePlayer = window.TBState?.get('playerCharacter');
            if (activePlayer && !playable.some(p => p.name === activePlayer)) {
                const foundInRoster = list.find(c => c.name === activePlayer && c.playable !== false);
                if (foundInRoster) {
                    playable.unshift(foundInRoster);
                } else if (activePlayer === 'Артём' || activePlayer.includes('Глицин')) {
                    playable.unshift({ name: activePlayer, class: 'Игрок', category: 'Игроки', playable: true });
                }
            }

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
