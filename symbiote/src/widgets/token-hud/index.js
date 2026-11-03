// --- FSD: Widgets Layer - Token HUD Widget ---

(function() {
    class TokenHudWidget {
        constructor() {
            this.container = null;
            this.lastTokenId = null;
        }

        init() {
            this.container = document.getElementById('activeTokenHud');
            this.nameEl = document.getElementById('hudTokenName');
            this.badgeEl = document.getElementById('hudTokenBadge');
            this.hpTextEl = document.getElementById('hudHpText');
            this.hpFillEl = document.getElementById('hudHpBarFill');
            this.metaStatsEl = document.getElementById('hudMetaStats');
            this.attacksBoxEl = document.getElementById('hudAttacksBox');
            this.btnViewNote = document.getElementById('btnHudViewNote');
            this.btnViewCard = document.getElementById('btnHudViewCard');
            this.btnLinkNote = document.getElementById('btnHudLinkNote');
            this.btnAutoInspect = document.getElementById('btnAutoInspect');

            // React to activeToken changes
            window.TBState?.on('activeToken', (token) => this.render(token));

            // React to role changes (strictly hide token HUD & auto-inspect in player mode)
            window.TBState?.on('role', (role) => {
                if (role === 'player') {
                    if (this.container) this.container.style.display = 'none';
                    if (this.btnAutoInspect) this.btnAutoInspect.style.display = 'none';
                } else {
                    if (this.btnAutoInspect) this.btnAutoInspect.style.display = 'inline-flex';
                    this.render(window.TBState?.get('activeToken'));
                }
            });
        }

        render(token) {
            if (!this.container) return;

            // Never show Token HUD in Player mode!
            if (window.TBState?.get('role') === 'player') {
                this.container.style.display = 'none';
                return;
            }

            if (!token) {
                this.container.style.display = 'none';
                this.lastTokenId = null;
                return;
            }

            const roster = window.TBState?.get('roster') || [];
            const matched = window.TBCharacterModel?.matchRosterCharacter(token, roster);
            this.container.style.display = 'block';

            // 1. Name & Badge
            const displayName = matched ? matched.name : token.name;
            this.nameEl.textContent = displayName;
            this.badgeEl.textContent = matched ? (matched.category || 'NPC') : 'Токен на столе';

            // 2. HP Bar
            if (token.hp && typeof token.hp.current === 'number' && typeof token.hp.max === 'number' && token.hp.max > 0) {
                const cur = token.hp.current;
                const max = token.hp.max;
                this.hpTextEl.textContent = `${cur}/${max} HP`;
                const pct = Math.max(0, Math.min(100, (cur / max) * 100));
                this.hpFillEl.style.width = `${pct}%`;

                this.hpFillEl.className = 'hud-hp-bar-fill';
                if (pct <= 25) {
                    this.hpFillEl.classList.add('danger');
                } else if (pct <= 50) {
                    this.hpFillEl.classList.add('warn');
                }
            } else if (matched && matched.hp && matched.hp !== '-') {
                this.hpTextEl.textContent = `${matched.hp} HP`;
                this.hpFillEl.style.width = '100%';
                this.hpFillEl.className = 'hud-hp-bar-fill';
            } else {
                this.hpTextEl.textContent = 'Без HP';
                this.hpFillEl.style.width = '0%';
            }

            // 3. Meta Stats (AC, Speed)
            if (matched) {
                const ac = matched.ac && matched.ac !== '-' ? `КД: <b>${matched.ac}</b>` : '';
                const spd = matched.speed && matched.speed !== '-' ? `Скорость: <b>${matched.speed}</b>` : '';
                const parts = [ac, spd].filter(Boolean);
                this.metaStatsEl.innerHTML = parts.join(' • ') || 'Статблок в базе Obsidian';
            } else {
                this.metaStatsEl.innerHTML = 'Токен не привязан к заметке';
            }

            // 4. Action Buttons
            if (matched) {
                this.btnViewNote.style.display = 'inline-flex';
                this.btnViewNote.onclick = () => {
                    if (window.TBNoteViewer) {
                        window.TBNoteViewer.openNote(matched.path || matched.name);
                    }
                };

                this.btnViewCard.style.display = 'inline-flex';
                this.btnViewCard.onclick = () => {
                    if (window.TBRosterView) {
                        window.TBRosterView.focusCharacter(matched.name);
                    }
                };

                if (this.btnLinkNote) this.btnLinkNote.style.display = 'none';
            } else {
                this.btnViewNote.style.display = 'none';
                this.btnViewCard.style.display = 'none';
                if (this.btnLinkNote) {
                    this.btnLinkNote.style.display = 'inline-flex';
                    this.btnLinkNote.onclick = () => {
                        window.TBLogger?.log(`Привязка токена «${token.name}» к открытой в Obsidian заметке...`, 'out');
                        window.TBNetwork?.send('LINK_CREATURE_REQUEST', token);
                    };
                }
            }

            // 5. Attacks
            if (matched && matched.attacks && matched.attacks.length > 0) {
                this.attacksBoxEl.style.display = 'flex';
                this.attacksBoxEl.innerHTML = '';

                matched.attacks.forEach(att => {
                    const chip = document.createElement('button');
                    chip.className = 'hud-attack-chip';
                    const hitLabel = att.hit ? ` (${att.hit})` : '';
                    chip.textContent = `${att.name}${hitLabel}`;
                    chip.title = `${att.desc || ''}\nУрон: ${att.dmg || '-'}`;

                    chip.onclick = (e) => {
                        e.stopPropagation();
                        if (att.hit) {
                            window.TBApi?.rollDice(att.hit, `${matched.name}: ${att.name} (Попадание)`);
                        } else if (att.dmg) {
                            window.TBApi?.rollDice(att.dmg, `${matched.name}: ${att.name} (Урон)`);
                        }
                    };

                    this.attacksBoxEl.appendChild(chip);
                });
            } else {
                this.attacksBoxEl.style.display = 'none';
            }

            // 6. Auto-Inspect behavior
            if (token.id !== this.lastTokenId) {
                this.lastTokenId = token.id;
                const isAuto = window.TBState?.get('autoInspect');
                if (isAuto && matched) {
                    if (window.TBNoteViewer) {
                        window.TBNoteViewer.openNote(matched.path || matched.name);
                    }
                }
            }
        }
    }

    const instance = new TokenHudWidget();
    window.TBWidgetTokenHud = instance;
    // Backward compatibility with legacy component
    window.TBTokenHud = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.tokenHud = instance;
})();
