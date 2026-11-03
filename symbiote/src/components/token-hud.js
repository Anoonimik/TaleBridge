// --- TaleBridge Active Token HUD Component ---

(function() {
    class TokenHud {
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

            // Setup Auto-Inspect state
            const savedAuto = localStorage.getItem('tb_auto_inspect') === 'true';
            window.TBState.set('autoInspect', savedAuto);
            if (this.btnAutoInspect) {
                if (savedAuto) this.btnAutoInspect.classList.add('active');
                this.btnAutoInspect.onclick = () => {
                    const current = window.TBState.get('autoInspect');
                    const next = !current;
                    window.TBState.set('autoInspect', next);
                    localStorage.setItem('tb_auto_inspect', next);
                    this.btnAutoInspect.classList.toggle('active', next);
                    this.btnAutoInspect.textContent = next ? 'Авто: ВКЛ' : 'Авто: ВЫКЛ';
                };
                this.btnAutoInspect.textContent = savedAuto ? 'Авто: ВКЛ' : 'Авто: ВЫКЛ';
            }

            // React to activeToken changes
            window.TBState.on('activeToken', (token) => this.render(token));
        }

        matchRosterCharacter(token) {
            if (!token) return null;
            const roster = window.TBState.get('roster') || [];
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

        render(token) {
            if (!this.container) return;

            if (!token) {
                this.container.style.display = 'none';
                this.lastTokenId = null;
                return;
            }

            const matched = this.matchRosterCharacter(token);
            this.container.style.display = 'block';

            // 1. Name & Badge
            const displayName = matched ? matched.name : token.name;
            this.nameEl.textContent = displayName;
            this.badgeEl.textContent = matched ? matched.category : 'Токен на столе';

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
                        window.TBLogger.log(`Привязка токена «${token.name}» к открытой в Obsidian заметке...`, 'out');
                        window.TBNetwork.send('LINK_CREATURE_REQUEST', token);
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
                            window.TBApi.rollDice(att.hit, `${matched.name}: ${att.name} (Попадание)`);
                        } else if (att.dmg) {
                            window.TBApi.rollDice(att.dmg, `${matched.name}: ${att.name} (Урон)`);
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
                const isAuto = window.TBState.get('autoInspect');
                if (isAuto && matched) {
                    if (window.TBNoteViewer) {
                        window.TBNoteViewer.openNote(matched.path || matched.name);
                    }
                }
            }
        }
    }

    window.TBTokenHud = new TokenHud();
})();
