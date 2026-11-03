// --- FSD: Widgets Layer - Character Roster Widget ---

(function() {
    class CharacterRosterWidget {
        constructor() {
            this.container = null;
            this.pinnedBar = null;
            this.charSearch = null;
            this.activeFilter = 'all';
        }

        init() {
            this.container = document.getElementById('characterRoster');
            this.pinnedBar = document.getElementById('pinnedBar');
            this.charSearch = document.getElementById('charSearch');

            // Search input
            if (this.charSearch) {
                this.charSearch.addEventListener('input', (e) => {
                    window.TBState?.set('searchCharQuery', e.target.value.toLowerCase().trim());
                    this.renderRoster();
                });
            }

            // Filter pills
            document.querySelectorAll('.filter-pills .pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    this.activeFilter = pill.dataset.filter;
                    this.renderRoster();
                });
            });

            // React to state changes
            window.TBState?.on('roster', () => {
                this.renderPinned();
                this.renderRoster();
            });

            window.TBState?.on('pinnedChars', () => {
                this.renderPinned();
                this.renderRoster();
            });

            window.TBState?.on('activeToken', (token) => {
                if (token && token.name) {
                    this.highlightByTokenName(token.name);
                }
            });
        }

        renderPinned() {
            if (!this.pinnedBar) return;
            this.pinnedBar.innerHTML = '';

            const pinned = window.TBState?.get('pinnedChars') || [];
            const roster = window.TBState?.get('roster') || [];

            if (pinned.length === 0) {
                this.pinnedBar.style.display = 'none';
                return;
            }

            this.pinnedBar.style.display = 'flex';

            pinned.forEach(name => {
                const found = roster.find(r => r.name.toLowerCase() === name.toLowerCase());
                const chip = document.createElement('div');
                chip.className = 'pinned-chip';

                const hpLabel = found && found.hp !== '-' ? ` (${found.hp} HP)` : '';
                chip.innerHTML = `<span class="pinned-star">★</span><span>${name}${hpLabel}</span>`;
                chip.onclick = () => this.focusCharacter(name);

                this.pinnedBar.appendChild(chip);
            });
        }

        renderRoster() {
            if (!this.container) return;
            const prevScroll = this.container.scrollTop;
            this.container.innerHTML = '';

            const roster = window.TBState?.get('roster') || [];
            const query = window.TBState?.get('searchCharQuery') || '';
            const filter = this.activeFilter;

            const filtered = roster.filter(c => {
                if (filter === 'pinned') {
                    return window.TBState?.isPinned(c.name);
                }
                if (filter !== 'all' && c.category !== filter) return false;
                if (query && !c.name.toLowerCase().includes(query)) return false;
                return true;
            });

            if (filtered.length === 0) {
                this.container.innerHTML = '<div class="empty-hint">Персонажи не найдены</div>';
                return;
            }

            filtered.forEach(item => {
                const cardEl = window.TBCharacterCard?.render(item, {
                    onOpenNote: (path) => {
                        if (window.TBNoteViewer) window.TBNoteViewer.openNote(path);
                    }
                });
                if (cardEl) this.container.appendChild(cardEl);
            });

            if (prevScroll > 0) {
                this.container.scrollTop = prevScroll;
            }
        }

        focusCharacter(charName) {
            // Switch to characters tab
            const tabBtn = document.querySelector('[data-tab="tab-characters"]');
            if (tabBtn) tabBtn.click();

            // Clear search query
            if (this.charSearch) {
                this.charSearch.value = '';
                window.TBState?.set('searchCharQuery', '');
            }

            // Reset filter to 'all'
            this.activeFilter = 'all';
            document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
            const allPill = document.querySelector('.filter-pills .pill[data-filter="all"]');
            if (allPill) allPill.classList.add('active');

            this.renderRoster();

            setTimeout(() => {
                const targetCard = document.getElementById(`card-${charName.replace(/\s+/g, '_')}`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetCard.classList.add('highlight-pulse');
                    setTimeout(() => targetCard.classList.remove('highlight-pulse'), 1200);
                }
            }, 60);
        }

        highlightByTokenName(tokenName) {
            if (!tokenName) return;
            const roster = window.TBState?.get('roster') || [];
            const clean = tokenName.trim().toLowerCase();

            const found = roster.find(r => 
                r.name.toLowerCase() === clean || 
                (r.talespire_name && r.talespire_name.toLowerCase() === clean) ||
                clean.includes(r.name.toLowerCase()) ||
                r.name.toLowerCase().includes(clean)
            );

            if (found) {
                const targetCard = document.getElementById(`card-${found.name.replace(/\s+/g, '_')}`);
                if (targetCard) {
                    targetCard.classList.add('token-selected');
                    setTimeout(() => targetCard.classList.remove('token-selected'), 2000);
                }
            }
        }
    }

    const instance = new CharacterRosterWidget();
    window.TBWidgetCharacterRoster = instance;
    // Backward compatibility with legacy component
    window.TBRosterView = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.characterRoster = instance;
})();
