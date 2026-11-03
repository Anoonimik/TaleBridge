// --- TaleBridge Core Reactive State Store ---

(function() {
    class StateStore {
        constructor() {
            let savedPinned = [];
            try {
                savedPinned = JSON.parse(localStorage.getItem('tb_pinned_chars') || '[]');
            } catch (e) {}

            this.state = {
                connected: false,
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
            }
            this.notify(key, val);
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
