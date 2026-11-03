// --- TaleBridge Core Reactive State Store ---

(function() {
    class StateStore {
        constructor() {
            let savedPinned = [];
            let savedClues = [];
            try {
                savedPinned = JSON.parse(localStorage.getItem('tb_pinned_chars') || '[]');
            } catch (e) {}

            try {
                savedClues = JSON.parse(localStorage.getItem('tb_clues_archive') || '[]');
            } catch (e) {}

            const savedRole = localStorage.getItem('tb_user_role') || 'gm';
            const savedPlayerChar = localStorage.getItem('tb_player_char') || '';

            this.state = {
                connected: false,
                role: savedRole, // 'gm' | 'player'
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
                    localStorage.setItem('tb_pinned_chars', JSON.stringify(val));
                } catch (e) {}
            } else if (key === 'role') {
                try {
                    localStorage.setItem('tb_user_role', val);
                } catch (e) {}
            } else if (key === 'playerCharacter') {
                try {
                    localStorage.setItem('tb_player_char', val);
                } catch (e) {}
            } else if (key === 'cluesArchive') {
                try {
                    localStorage.setItem('tb_clues_archive', JSON.stringify(val));
                } catch (e) {}
            }
            this.notify(key, val);
        }

        setRole(role) {
            this.set('role', role);
        }

        setPlayerCharacter(name) {
            this.set('playerCharacter', name);
        }

        addClue(clue) {
            const list = [...(this.get('cluesArchive') || [])];
            // Check if clue with same title/url already exists
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

    window.TBState = new StateStore();
})();
