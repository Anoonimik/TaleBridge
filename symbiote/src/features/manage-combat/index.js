// --- FSD: Features Layer - Manage Combat Feature ---

(function() {
    class ManageCombatFeature {
        /**
         * Starts active combat encounter
         */
        startCombat() {
            const combatants = window.TBState?.get('combatants') || [];
            if (combatants.length === 0) {
                this.populateFromRosterAndTokens();
            }
            window.TBState?.set('combatActive', true);
            window.TBState?.set('combatRound', 1);
            window.TBState?.set('combatTurnIndex', 0);
            this.syncCombatState();
            window.TBLogger?.log('Бой начат! Раунд 1', 'sys');
        }

        /**
         * Ends active combat encounter
         */
        endCombat() {
            window.TBState?.set('combatActive', false);
            this.syncCombatState();
            window.TBLogger?.log('Бой завершен', 'sys');
        }

        /**
         * Advances turn to next combatant
         */
        nextTurn() {
            const combatants = window.TBState?.get('combatants') || [];
            if (combatants.length === 0) return;

            let curIndex = window.TBState?.get('combatTurnIndex') || 0;
            let round = window.TBState?.get('combatRound') || 1;

            curIndex += 1;
            if (curIndex >= combatants.length) {
                curIndex = 0;
                round += 1;
                window.TBState?.set('combatRound', round);
                window.TBLogger?.log(`Начался Раунд ${round}`, 'sys');
            }

            window.TBState?.set('combatTurnIndex', curIndex);
            this.syncCombatState();

            const activeCombatant = combatants[curIndex];
            if (activeCombatant) {
                window.TBLogger?.log(`Ход существа: ${activeCombatant.name} (Раунд ${round})`, 'sys');
                if (activeCombatant.creatureId && window.TBApi?.gotoBookmark) {
                    window.TBApi.gotoBookmark(activeCombatant.creatureId, activeCombatant.name);
                }
            }
        }

        /**
         * Steps turn back to previous combatant
         */
        prevTurn() {
            const combatants = window.TBState?.get('combatants') || [];
            if (combatants.length === 0) return;

            let curIndex = window.TBState?.get('combatTurnIndex') || 0;
            let round = window.TBState?.get('combatRound') || 1;

            curIndex -= 1;
            if (curIndex < 0) {
                if (round > 1) {
                    round -= 1;
                    curIndex = combatants.length - 1;
                    window.TBState?.set('combatRound', round);
                } else {
                    curIndex = 0;
                }
            }

            window.TBState?.set('combatTurnIndex', curIndex);
            this.syncCombatState();
        }

        /**
         * Rolls initiative for all combatants without an initiative score,
         * or rolls for all if forceRollAll is true.
         */
        rollAllInitiative(forceRollAll = true) {
            const list = [...(window.TBState?.get('combatants') || [])];
            if (list.length === 0) return;

            list.forEach(c => {
                if (forceRollAll || typeof c.initiative !== 'number' || isNaN(c.initiative)) {
                    const dexMod = this.extractDexModifier(c);
                    const d20 = Math.floor(Math.random() * 20) + 1;
                    c.initiative = d20 + dexMod;
                }
            });

            // Sort descending: highest initiative first
            list.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

            window.TBState?.set('combatants', list);
            window.TBState?.set('combatTurnIndex', 0);
            this.syncCombatState();
            window.TBLogger?.log('Инициатива брошена для всех участников боя', 'sys');
        }

        /**
         * Extracts DEX modifier from combatant object or character model
         */
        extractDexModifier(c) {
            if (c.dexMod !== undefined) return Number(c.dexMod) || 0;
            if (c.stats && c.stats.dex) {
                const match = String(c.stats.dex).match(/([+-]?\d+)/);
                if (match) return parseInt(match[1], 10);
            }
            return 0;
        }

        /**
         * Adds a new combatant to encounter
         */
        addCombatant(data) {
            const list = [...(window.TBState?.get('combatants') || [])];
            const id = data.id || ('cmb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

            // Check if already in combat
            const existingIdx = list.findIndex(c => (c.creatureId && c.creatureId === data.creatureId) || (c.name.toLowerCase() === data.name.toLowerCase()));
            if (existingIdx >= 0) {
                list[existingIdx] = { ...list[existingIdx], ...data };
            } else {
                list.push({
                    id,
                    name: data.name || 'Существо',
                    initiative: Number(data.initiative) || 10,
                    hp: Number(data.hp ?? 10),
                    maxHp: Number(data.maxHp ?? 10),
                    ac: Number(data.ac ?? 10),
                    speed: data.speed || '30 фт.',
                    category: data.category || 'Враги',
                    conditions: Array.isArray(data.conditions) ? data.conditions : [],
                    creatureId: data.creatureId || null,
                    path: data.path || null,
                    isPlayer: Boolean(data.isPlayer || data.playable || data.category === 'Игроки')
                });
            }

            // Keep sorted
            list.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
            window.TBState?.set('combatants', list);
            this.syncCombatState();
        }

        /**
         * Removes a combatant from encounter
         */
        removeCombatant(id) {
            let list = [...(window.TBState?.get('combatants') || [])];
            list = list.filter(c => c.id !== id);
            window.TBState?.set('combatants', list);

            let turnIndex = window.TBState?.get('combatTurnIndex') || 0;
            if (turnIndex >= list.length) {
                turnIndex = Math.max(0, list.length - 1);
                window.TBState?.set('combatTurnIndex', turnIndex);
            }
            this.syncCombatState();
        }

        /**
         * Sets initiative manually for a combatant
         */
        setInitiative(id, initVal) {
            const list = [...(window.TBState?.get('combatants') || [])];
            const c = list.find(item => item.id === id);
            if (c) {
                c.initiative = Number(initVal) || 0;
                list.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
                window.TBState?.set('combatants', list);
                this.syncCombatState();
            }
        }

        /**
         * Modifies HP of combatant
         */
        applyHpDelta(id, delta) {
            const list = [...(window.TBState?.get('combatants') || [])];
            const c = list.find(item => item.id === id);
            if (c) {
                const cur = Number(c.hp) || 0;
                const max = Number(c.maxHp) || cur;
                const next = Math.max(0, Math.min(max, cur + delta));
                c.hp = next;

                // If drops to 0, auto-add unconscious if not present
                if (next === 0 && !c.conditions.includes('unconscious')) {
                    c.conditions.push('unconscious');
                } else if (next > 0 && c.conditions.includes('unconscious')) {
                    c.conditions = c.conditions.filter(cond => cond !== 'unconscious');
                }

                window.TBState?.set('combatants', list);
                this.syncCombatState();

                // If linked to active player or note, sync to Obsidian
                if (c.isPlayer && window.TBNetwork) {
                    window.TBNetwork.send('UPDATE_CHARACTER_HP', { characterName: c.name, hp: next, maxHp: max });
                }
            }
        }

        /**
         * Adds a condition to a combatant
         */
        addCondition(combatantId, conditionId) {
            const list = [...(window.TBState?.get('combatants') || [])];
            const c = list.find(item => item.id === combatantId);
            if (c) {
                if (!Array.isArray(c.conditions)) c.conditions = [];
                if (!c.conditions.includes(conditionId)) {
                    c.conditions.push(conditionId);
                    window.TBState?.set('combatants', list);
                    this.syncCombatState();

                    const condObj = this.getConditionMeta(conditionId);
                    window.TBLogger?.log(`Наложено состояние [${condObj.name}] на ${c.name}`, 'sys');
                }
            }
        }

        /**
         * Removes a condition from a combatant
         */
        removeCondition(combatantId, conditionId) {
            const list = [...(window.TBState?.get('combatants') || [])];
            const c = list.find(item => item.id === combatantId);
            if (c && Array.isArray(c.conditions)) {
                c.conditions = c.conditions.filter(cond => cond !== conditionId);
                window.TBState?.set('combatants', list);
                this.syncCombatState();

                const condObj = this.getConditionMeta(conditionId);
                window.TBLogger?.log(`Снято состояние [${condObj.name}] с ${c.name}`, 'sys');
            }
        }

        /**
         * Returns condition object by ID
         */
        getConditionMeta(id) {
            const all = window.TBConfig?.CONDITIONS_DND5E || [];
            return all.find(c => c.id === id) || { id, name: id, color: '#64748b', desc: '' };
        }

        /**
         * Clears all combatants
         */
        clearCombat() {
            window.TBState?.set('combatActive', false);
            window.TBState?.set('combatRound', 1);
            window.TBState?.set('combatTurnIndex', 0);
            window.TBState?.set('combatants', []);
            this.syncCombatState();
            window.TBLogger?.log('Трекер боя очищен', 'sys');
        }

        /**
         * Automatically populates combatants from active player heroes and selected/pinned tokens
         */
        populateFromRosterAndTokens() {
            const roster = window.TBState?.get('roster') || [];
            const heroes = roster.filter(r => r.playable || r.category === 'Игроки');
            heroes.forEach(h => {
                this.addCombatant({
                    name: h.name,
                    category: 'Игроки',
                    hp: h.hp || 20,
                    maxHp: h.hp_max || h.hp || 20,
                    ac: h.ac || 14,
                    speed: h.speed || '30 фт.',
                    isPlayer: true,
                    path: h.path || null
                });
            });
        }

        /**
         * Adds currently selected token from TaleSpire board
         */
        async addSelectedToken() {
            const token = window.TBState?.get('activeToken');
            if (!token) {
                window.TBLogger?.log('Нет выбранной миниатюры в TaleSpire', 'sys');
                return;
            }

            const roster = window.TBState?.get('roster') || [];
            const matched = roster.find(r => r.name.toLowerCase() === token.name.toLowerCase());

            this.addCombatant({
                name: token.name,
                category: matched?.category || 'Враги',
                hp: token.hp || matched?.hp || 14,
                maxHp: token.maxHp || matched?.hp_max || matched?.hp || 14,
                ac: matched?.ac || 12,
                speed: matched?.speed || '30 фт.',
                creatureId: token.id,
                path: matched?.path || null,
                isPlayer: Boolean(matched?.playable || matched?.category === 'Игроки')
            });

            window.TBLogger?.log(`Миниатюра [${token.name}] добавлена в трекер боя`, 'sys');
        }

        /**
         * Broadcasts combat state via WebSocket
         */
        syncCombatState() {
            const state = window.TBState?.getCombatState();
            if (state && window.TBNetwork) {
                window.TBNetwork.send('SYNC_COMBAT_STATE', state);
            }
        }
    }

    const instance = new ManageCombatFeature();
    window.TBFeatureManageCombat = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.manageCombat = instance;
})();
