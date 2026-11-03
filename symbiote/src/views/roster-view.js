// --- TaleBridge Roster View Controller (Characters & Bestiary) ---

(function() {
    class RosterView {
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
                    window.TBState.set('searchCharQuery', e.target.value.toLowerCase().trim());
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
            window.TBState.on('roster', () => {
                this.renderPinned();
                this.renderRoster();
            });

            window.TBState.on('pinnedChars', () => {
                this.renderPinned();
                this.renderRoster();
            });

            window.TBState.on('activeToken', (token) => {
                if (token && token.name) {
                    this.highlightByTokenName(token.name);
                }
            });
        }

        renderPinned() {
            if (!this.pinnedBar) return;
            this.pinnedBar.innerHTML = '';

            const pinned = window.TBState.get('pinnedChars') || [];
            const roster = window.TBState.get('roster') || [];

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

                // Left click focuses character
                chip.onclick = () => this.focusCharacter(name);

                this.pinnedBar.appendChild(chip);
            });
        }

        renderRoster() {
            if (!this.container) return;
            const prevScroll = this.container.scrollTop;
            this.container.innerHTML = '';

            const roster = window.TBState.get('roster') || [];
            const query = window.TBState.get('searchCharQuery') || '';
            const filter = this.activeFilter;

            const filtered = roster.filter(c => {
                if (filter === 'pinned') {
                    return window.TBState.isPinned(c.name);
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
                this.container.appendChild(this.buildCard(item));
            });

            if (prevScroll > 0) {
                this.container.scrollTop = prevScroll;
            }
        }

        buildCard(item) {
            const card = document.createElement('div');
            card.className = 'roster-card';
            card.id = `card-${item.name.replace(/\s+/g, '_')}`;

            const header = document.createElement('div');
            header.className = 'roster-card-header';

            const titleBox = document.createElement('div');
            titleBox.className = 'roster-title-box';

            // Star Pin button
            const btnPin = document.createElement('button');
            const isPinned = window.TBState.isPinned(item.name);
            btnPin.className = `btn-pin ${isPinned ? 'pinned' : ''}`;
            btnPin.innerHTML = isPinned ? '★' : '☆';
            btnPin.title = isPinned ? 'Открепить от быстрого доступа' : 'Закрепить в быстрый доступ';
            btnPin.onclick = (e) => {
                e.stopPropagation();
                window.TBState.togglePin(item.name);
            };

            const name = document.createElement('span');
            name.className = 'roster-name';
            name.textContent = item.name;

            const badge = document.createElement('span');
            badge.className = 'roster-badge';
            badge.textContent = item.category;

            titleBox.appendChild(btnPin);
            titleBox.appendChild(name);
            titleBox.appendChild(badge);

            const btnActions = document.createElement('div');
            btnActions.style.display = 'flex';
            btnActions.style.gap = '4px';

            const btnOpenViewer = document.createElement('button');
            btnOpenViewer.className = 'btn-open-viewer';
            btnOpenViewer.textContent = 'Заметка';
            btnOpenViewer.title = 'Открыть текст заметки прямо в окне TaleSpire';
            btnOpenViewer.onclick = (e) => {
                e.stopPropagation();
                if (window.TBNoteViewer) {
                    window.TBNoteViewer.openNote(item.path || item.name);
                }
            };

            const btnOpenObsidian = document.createElement('button');
            btnOpenObsidian.className = 'btn-open-note';
            btnOpenObsidian.textContent = 'Obsidian';
            btnOpenObsidian.title = 'Переключиться на файл в приложении Obsidian';
            btnOpenObsidian.onclick = (e) => {
                e.stopPropagation();
                window.TBNetwork.send('OPEN_NOTE', { path: item.path, name: item.name });
            };

            btnActions.appendChild(btnOpenViewer);
            btnActions.appendChild(btnOpenObsidian);

            header.appendChild(titleBox);
            header.appendChild(btnActions);
            card.appendChild(header);

            // Meta (HP / AC / Speed)
            const meta = document.createElement('div');
            meta.className = 'roster-meta';
            meta.innerHTML = `<span>КД: <b>${item.ac}</b></span> <span>ХП: <b>${item.hp}</b></span> <span>Скорость: <b>${item.speed}</b></span>`;
            card.appendChild(meta);

            // Attacks list
            if (item.attacks && item.attacks.length > 0) {
                const attacksBox = document.createElement('div');
                attacksBox.className = 'roster-attacks';

                item.attacks.forEach(att => {
                    const chip = document.createElement('button');
                    chip.className = 'attack-chip';
                    const hitLabel = att.hit ? ` (${att.hit})` : '';
                    chip.textContent = `${att.name}${hitLabel}`;
                    chip.title = `${att.desc || ''}\nУрон: ${att.dmg || '-'}`;

                    chip.onclick = (e) => {
                        e.stopPropagation();
                        if (att.hit) {
                            window.TBApi.rollDice(att.hit, `${item.name}: ${att.name} (Попадание)`);
                        } else if (att.dmg) {
                            window.TBApi.rollDice(att.dmg, `${item.name}: ${att.name} (Урон)`);
                        }
                    };

                    attacksBox.appendChild(chip);
                });

                card.appendChild(attacksBox);
            }

            // Click card background opens note in viewer
            card.onclick = () => {
                if (window.TBNoteViewer) {
                    window.TBNoteViewer.openNote(item.path || item.name);
                }
            };

            return card;
        }

        focusCharacter(charName) {
            // Switch to characters tab
            const tabBtn = document.querySelector('[data-tab="tab-characters"]');
            if (tabBtn) tabBtn.click();

            // Clear search query
            if (this.charSearch) {
                this.charSearch.value = '';
                window.TBState.set('searchCharQuery', '');
            }

            // Reset filter to 'all'
            this.activeFilter = 'all';
            document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
            const allPill = document.querySelector('.filter-pills .pill[data-filter="all"]');
            if (allPill) allPill.classList.add('active');

            this.renderRoster();

            // Find and highlight element
            setTimeout(() => {
                const clean = charName.replace(/\s+/g, '_');
                const card = document.getElementById(`card-${clean}`);
                if (card) {
                    document.querySelectorAll('.roster-card').forEach(c => c.classList.remove('focused'));
                    card.classList.add('focused');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 60);
        }

        highlightByTokenName(tokenName) {
            const clean = tokenName.trim().toLowerCase();
            const card = Array.from(document.querySelectorAll('.roster-card')).find(c => {
                const nameEl = c.querySelector('.roster-name');
                return nameEl && (
                    nameEl.textContent.trim().toLowerCase().includes(clean) ||
                    clean.includes(nameEl.textContent.trim().toLowerCase())
                );
            });
            if (card) {
                document.querySelectorAll('.roster-card').forEach(c => c.classList.remove('focused'));
                card.classList.add('focused');
            }
        }
    }

    window.TBRosterView = new RosterView();
})();
