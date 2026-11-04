// --- FSD: Shared Layer - Reactive State Store ---

(function() {
    const keys = window.TBConfig?.STORAGE_KEYS || {
        ROLE: 'tb_user_role',
        PLAYER_CHAR: 'tb_player_char',
        PINNED_CHARS: 'tb_pinned_chars',
        CLUES_ARCHIVE: 'tb_clues_archive'
    };

    class StateStore {
        constructor() {
            let savedPinned = [];
            let savedClues = [];
            try {
                savedPinned = JSON.parse(localStorage.getItem(keys.PINNED_CHARS) || '[]');
            } catch (e) {}

            try {
                savedClues = JSON.parse(localStorage.getItem(keys.CLUES_ARCHIVE) || '[]');
            } catch (e) {}

            const savedRole = localStorage.getItem(keys.ROLE) || 'gm';
            const savedPlayerChar = localStorage.getItem(keys.PLAYER_CHAR) || '';
            const savedGmDiceMode = localStorage.getItem(keys.GM_DICE_MODE || 'tb_gm_dice_mode') || 'secret';

            this.state = {
                connected: false,
                role: savedRole, // 'gm' | 'player'
                gmDiceMode: savedGmDiceMode, // 'secret' (GM tray) | 'open' (Public tray)
                playerCharacter: savedPlayerChar,
                playerData: null,
                playerTab: 'character', // 'character' | 'inventory' | 'notes' | 'clues'
                cluesArchive: savedClues,
                activeHandout: null,
                vaultImages: [],
                activeToken: null,
                bookmarks: [],
                roster: [],
                scenes: [],
                activeSceneId: null,
                pinnedChars: savedPinned,
                searchCharQuery: '',
                activeCharFilter: 'all',
                autoInspect: false,
                tsReady: false
            };
            this.listeners = {};
        }

        get(key) {
            return this.state[key];
        }

        set(key, val) {
            this.state[key] = val;
            if (key === 'pinnedChars') {
                try {
                    localStorage.setItem(keys.PINNED_CHARS, JSON.stringify(val));
                } catch (e) {}
            } else if (key === 'role') {
                try {
                    localStorage.setItem(keys.ROLE, val);
                } catch (e) {}
            } else if (key === 'playerCharacter') {
                try {
                    localStorage.setItem(keys.PLAYER_CHAR, val);
                } catch (e) {}
            } else if (key === 'cluesArchive') {
                try {
                    localStorage.setItem(keys.CLUES_ARCHIVE, JSON.stringify(val));
                } catch (e) {}
            } else if (key === 'gmDiceMode') {
                try {
                    localStorage.setItem(keys.GM_DICE_MODE || 'tb_gm_dice_mode', val);
                } catch (e) {}
            }
            this.notify(key, val);
        }

        setRole(role) {
            this.set('role', role);
        }

        setGmDiceMode(mode) {
            this.set('gmDiceMode', mode);
        }

        setPlayerCharacter(name) {
            this.set('playerCharacter', name);
        }

        addClue(clue) {
            const list = [...(this.get('cluesArchive') || [])];
            const existingIdx = list.findIndex(c => (c.id && c.id === clue.id) || (c.title === clue.title && c.url === clue.url));
            if (existingIdx >= 0) {
                list[existingIdx] = { ...list[existingIdx], ...clue, savedAt: Date.now() };
            } else {
                list.unshift({
                    id: clue.id || ('clue_' + Math.random().toString(36).substring(2, 9)),
                    type: clue.type || clue.mediaType || 'text',
                    title: clue.title || 'Улика',
                    url: clue.url || '',
                    content: clue.content || '',
                    savedAt: Date.now()
                });
            }
            this.set('cluesArchive', list);
        }

        removeClue(clueId) {
            const list = (this.get('cluesArchive') || []).filter(c => c.id !== clueId);
            this.set('cluesArchive', list);
        }

        togglePin(charName) {
            const list = [...this.get('pinnedChars')];
            const idx = list.indexOf(charName);
            if (idx >= 0) {
                list.splice(idx, 1);
            } else {
                list.push(charName);
            }
            this.set('pinnedChars', list);
        }

        isPinned(charName) {
            return (this.state.pinnedChars || []).includes(charName);
        }

        on(key, callback) {
            if (!this.listeners[key]) {
                this.listeners[key] = [];
            }
            this.listeners[key].push(callback);
        }

        notify(key, val) {
            if (this.listeners[key]) {
                this.listeners[key].forEach(cb => {
                    try {
                        cb(val);
                    } catch (e) {
                        console.error(`State listener error for ${key}:`, e);
                    }
                });
            }
        }
    }

    const stateInstance = new StateStore();
    window.TBState = stateInstance;
    window.TBShared = window.TBShared || {};
    window.TBShared.store = stateInstance;
})();
