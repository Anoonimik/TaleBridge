// --- FSD: Entities Layer - Character Card UI (Roster) ---

(function() {
    const TBCharacterCard = {
        /**
         * Builds interactive DOM card for a character in the GM Roster
         * @param {Object} item Character data
         * @param {Object} options
         * @returns {HTMLElement}
         */
        render(item, options = {}) {
            const card = document.createElement('div');
            card.className = 'roster-card';
            card.id = `card-${item.name.replace(/\s+/g, '_')}`;

            const header = document.createElement('div');
            header.className = 'roster-card-header';

            const titleBox = document.createElement('div');
            titleBox.className = 'roster-title-box';

            // Star Pin button
            const btnPin = document.createElement('button');
            const isPinned = window.TBState?.isPinned(item.name) || false;
            btnPin.className = `btn-pin ${isPinned ? 'pinned' : ''}`;
            btnPin.innerHTML = isPinned ? '★' : '☆';
            btnPin.title = isPinned ? 'Открепить от быстрого доступа' : 'Закрепить в быстрый доступ';
            btnPin.onclick = (e) => {
                e.stopPropagation();
                window.TBState?.togglePin(item.name);
            };

            const name = document.createElement('span');
            name.className = 'roster-name';
            name.textContent = item.name;

            const badge = document.createElement('span');
            badge.className = 'roster-badge';
            badge.textContent = item.category || 'Существо';

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
                if (options.onOpenNote) {
                    options.onOpenNote(item.path || item.name);
                } else if (window.TBNoteViewer) {
                    window.TBNoteViewer.openNote(item.path || item.name);
                }
            };

            const btnOpenObsidian = document.createElement('button');
            btnOpenObsidian.className = 'btn-open-note';
            btnOpenObsidian.textContent = 'Obsidian';
            btnOpenObsidian.title = 'Переключиться на файл в приложении Obsidian';
            btnOpenObsidian.onclick = (e) => {
                e.stopPropagation();
                window.TBNetwork?.send('OPEN_NOTE', { path: item.path, name: item.name });
            };

            btnActions.appendChild(btnOpenViewer);
            btnActions.appendChild(btnOpenObsidian);

            header.appendChild(titleBox);
            header.appendChild(btnActions);
            card.appendChild(header);

            // Meta (HP / AC / Speed)
            const meta = document.createElement('div');
            meta.className = 'roster-meta';
            meta.innerHTML = `<span>КД: <b>${item.ac || '-'}</b></span> <span>ХП: <b>${item.hp || '-'}</b></span> <span>Скорость: <b>${item.speed || '-'}</b></span>`;
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
                    const diceModeLabel = (window.TBState?.get('gmDiceMode') === 'open') ? 'Открытый' : 'Скрытый (GM)';
                    chip.title = `${att.desc || ''}\nУрон: ${att.dmg || '-'}\nБросок: ${diceModeLabel}`;

                    chip.onclick = (e) => {
                        e.stopPropagation();
                        if (att.hit) {
                            window.TBApi?.rollDice(att.hit, `${item.name}: ${att.name} (Попадание)`);
                        } else if (att.dmg) {
                            window.TBApi?.rollDice(att.dmg, `${item.name}: ${att.name} (Урон)`);
                        }
                    };

                    attacksBox.appendChild(chip);
                });

                card.appendChild(attacksBox);
            }

            // Click card background opens note in viewer
            card.onclick = () => {
                if (options.onOpenNote) {
                    options.onOpenNote(item.path || item.name);
                } else if (window.TBNoteViewer) {
                    window.TBNoteViewer.openNote(item.path || item.name);
                }
            };

            return card;
        }
    };

    window.TBCharacterCard = TBCharacterCard;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.characterCard = TBCharacterCard;
})();
