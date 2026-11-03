// --- FSD: Widgets Layer - Note Viewer Widget ---

(function() {
    class NoteViewerWidget {
        constructor() {
            this.container = null;
            this.titleEl = null;
            this.btnBack = null;
            this.btnOpenObsidian = null;
            this.history = [];
            this.currentNote = null;
        }

        init() {
            this.container = document.getElementById('noteContentContainer');
            this.titleEl = document.getElementById('noteViewerTitle');
            this.btnBack = document.getElementById('btnNoteBack');
            this.btnOpenObsidian = document.getElementById('btnNoteInObsidian');

            if (this.btnBack) {
                this.btnBack.onclick = () => this.goBack();
            }

            if (this.btnOpenObsidian) {
                this.btnOpenObsidian.onclick = () => {
                    if (this.currentNote) {
                        window.TBNetwork?.send('OPEN_IN_OBSIDIAN', {
                            path: this.currentNote.path,
                            name: this.currentNote.name || this.currentNote.title
                        });
                    }
                };
            }

            // Click delegate for links inside rendered notes
            if (this.container) {
                this.container.addEventListener('click', (e) => {
                    const link = e.target.closest('.wiki-link');
                    if (link) {
                        e.preventDefault();
                        const target = link.dataset.target;
                        if (!target) return;

                        // Check if this link points to a Scene!
                        const scenes = window.TBState ? (window.TBState.get('scenes') || []) : [];
                        const matchedScene = window.TBSceneModel?.findMatchingScene(target, scenes);
                        if (matchedScene && window.TBStoryView) {
                            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                            const storyTabBtn = document.querySelector('[data-tab="tab-story"]');
                            const storyTab = document.getElementById('tab-story');
                            if (storyTabBtn) storyTabBtn.classList.add('active');
                            if (storyTab) storyTab.classList.add('active');
                            window.TBStoryView.selectScene(matchedScene.id, false);
                            return;
                        }

                        this.openNote(target);
                    }
                });
            }
        }

        openNote(targetPathOrName) {
            if (this.currentNote) {
                this.history.push(this.currentNote);
            }

            this.activateNoteTab();

            const displayName = targetPathOrName.replace(/^.*[\\\/]/, '').replace(/\.md$/, '');
            if (this.titleEl) this.titleEl.textContent = displayName;
            if (this.container) {
                this.container.scrollTop = 0;
                this.container.innerHTML = '<div class="empty-hint">Загрузка заметки из Obsidian...</div>';
            }

            window.TBNetwork?.send('GET_NOTE', {
                path: targetPathOrName.includes('/') || targetPathOrName.includes('\\') ? targetPathOrName : null,
                name: displayName
            });
        }

        goBack() {
            if (this.history.length === 0) return;
            const prev = this.history.pop();
            this.currentNote = prev;
            if (this.titleEl) this.titleEl.textContent = prev.title || prev.name;
            if (this.container) {
                this.container.scrollTop = 0;
                this.container.innerHTML = prev.html || '';
            }
        }

        activateNoteTab() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const noteTabBtn = document.querySelector('[data-tab="tab-note"]');
            const noteTab = document.getElementById('tab-note');
            if (noteTabBtn) noteTabBtn.classList.add('active');
            if (noteTab) noteTab.classList.add('active');
        }

        render(noteData) {
            if (!this.container) return;
            if (!noteData) {
                this.container.innerHTML = '<div class="empty-hint">Заметка не найдена</div>';
                return;
            }

            this.currentNote = {
                path: noteData.path,
                name: noteData.title || noteData.name,
                title: noteData.title || noteData.name,
                html: ''
            };

            if (this.titleEl) {
                this.titleEl.textContent = noteData.title || noteData.name || 'Безымянная заметка';
            }

            const parsedHtml = this.parseMarkdownToHtml(noteData.content || '', noteData.frontmatter);
            this.currentNote.html = parsedHtml;
            this.container.innerHTML = parsedHtml;
            this.container.scrollTop = 0;
            this.bindInteractiveElements();
        }

        parseMarkdownToHtml(md, frontmatter) {
            let metaBanner = '';
            if (frontmatter && (frontmatter.hp || frontmatter.ac || frontmatter.speed || frontmatter.race || frontmatter.class || frontmatter.level)) {
                metaBanner = `<div class="note-meta-banner">
                    ${frontmatter.race || frontmatter.class ? `<span><b>${[frontmatter.race, frontmatter.class].filter(Boolean).join(' • ')}</b></span>` : ''}
                    ${frontmatter.ac ? `<span>КД: <b>${frontmatter.ac}</b></span>` : ''}
                    ${frontmatter.hp ? `<span>ХП: <b>${frontmatter.hp}</b></span>` : ''}
                    ${frontmatter.speed ? `<span>Скорость: <b>${frontmatter.speed}</b></span>` : ''}
                    ${frontmatter.level ? `<span>Уровень: <b>${frontmatter.level}</b></span>` : ''}
                </div>`;
            }

            let text = md.replace(/\r\n/g, '\n');
            text = text.replace(/^---[\s\S]*?---\n*/, '');

            // Strip AI emojis
            const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE0F}\u{200D}]/ug;
            text = text.replace(emojiRegex, '');

            // Clean LaTeX formulas
            text = text.replace(/\\rightarrow/g, '→').replace(/\$([^\$\n]+)\$/g, (m, expr) => {
                return expr.replace(/\\text\{([^}]+)\}/g, '$1').trim();
            });

            // Action code blocks (```dnd-action or ```action)
            text = text.replace(/```(?:dnd-action|action)\n([\s\S]*?)```/g, (match, body) => {
                const lines = body.trim().split('\n');
                let name = 'Действие';
                let hit = '';
                let dmg = '';
                let desc = '';
                let type = '';

                lines.forEach(line => {
                    const l = line.trim();
                    if (l.startsWith('name:')) name = l.replace(/^name:\s*/, '');
                    else if (l.startsWith('hit:')) hit = l.replace(/^hit:\s*/, '');
                    else if (l.startsWith('dmg:')) dmg = l.replace(/^dmg:\s*/, '');
                    else if (l.startsWith('type:')) type = l.replace(/^type:\s*/, '');
                    else if (l.startsWith('desc:')) desc = l.replace(/^desc:\s*/, '');
                    else if (!l.includes(':')) desc += (desc ? ' ' : '') + l;
                });

                const atkData = { name, hit, dmg, desc, type };
                const attackCard = window.TBAttackCard;
                return attackCard ? attackCard.render(atkData) : `<div class="sheet-attack-card"><b>${name}</b> ${desc}</div>`;
            });

            // Generic code blocks
            text = text.replace(/```[\s\S]*?```/g, (match) => {
                return `<pre class="note-code-block"><code>${window.TBTextUtils?.escapeHtml(match.replace(/```\w*\n?/, '').replace(/```$/, ''))}</code></pre>`;
            });

            // Inline dice roll tags: [dice:1d20+2|Инициатива] or [dice:1d20+5]
            text = text.replace(/\[dice:([^\]|]+)(?:\|([^\]]+))?\]/gi, (match, formula, label) => {
                const cleanFormula = formula.trim();
                const displayLabel = label ? label.trim() : cleanFormula;
                return `<button class="tb-roll-btn inline" data-formula="${cleanFormula}" data-label="${displayLabel}" data-name="${displayLabel}">🎲 ${displayLabel}</button>`;
            });

            // Inline camera tags: [camera:Тронный зал]
            text = text.replace(/\[camera:([^\]]+)\]/gi, (match, loc) => {
                const cleanLoc = loc.trim();
                return `<button class="tb-camera-btn inline" data-location="${cleanLoc}">📷 Камера: ${cleanLoc}</button>`;
            });

            // Robust Obsidian Callouts (> [!info] Title)
            text = text.replace(/^>\s*\[!(\w+)\]\s*([^\n]*)\n((?:^>.*(?:\n|$))*)/gm, (match, type, title, body) => {
                let cleanBody = body.replace(/^>\s?/gm, '').trim();
                cleanBody = cleanBody
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
                    .replace(/_([^_]+)_/g, '<i>$1</i>')
                    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, target, label) => {
                        const cleanTarget = target.split('#')[0].trim();
                        return `<a href="#" class="wiki-link" data-target="${cleanTarget}">${label ? label.trim() : target.trim()}</a>`;
                    })
                    .replace(/^(?: {2,4}|\t)[-*]\s*(.*$)/gm, '<div class="note-li sub">• $1</div>')
                    .replace(/^[-*]\s*(.*$)/gm, '<div class="note-li">• $1</div>');

                return `<div class="note-callout ${type.toLowerCase()}">
                    <div class="callout-header">${title.trim() || type.toUpperCase()}</div>
                    <div class="callout-content">${cleanBody}</div>
                </div>\n\n`;
            });

            // Generic blockquotes
            text = text.replace(/^>\s*(.*$)/gm, '<blockquote class="note-quote">$1</blockquote>');
            text = text.replace(/<\/blockquote>\s*<blockquote class="note-quote">/g, '<br/>');

            // Obsidian Wiki Links: [[Target|Label]] or [[Target]]
            text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label) => {
                const cleanTarget = target.split('#')[0].trim();
                const display = label ? label.trim() : target.trim();
                return `<a href="#" class="wiki-link" data-target="${cleanTarget}">${display}</a>`;
            });

            // Markdown Tables
            text = text.replace(/((?:^\|[^\n]+\|\n?)+)/gm, (match, tableBlock) => {
                const lines = tableBlock.trim().split('\n').filter(l => l.trim().length > 0);
                if (lines.length < 2) return tableBlock;

                let rows = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\|?\s*[-:]+[-| :]*\|?$/.test(line)) {
                        continue;
                    }
                    const cells = line.split('|').slice(1, -1).map(c => c.trim());
                    if (cells.length === 0 || cells.every(c => c === '')) {
                        continue;
                    }
                    rows.push(cells);
                }

                if (rows.length === 0) return '';

                let tableHtml = '<table class="note-table"><thead><tr>';
                rows[0].forEach(cell => {
                    const clean = cell.replace(/\*\*(.*?)\*\*/g, '$1');
                    tableHtml += `<th>${clean}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';

                for (let r = 1; r < rows.length; r++) {
                    tableHtml += '<tr>';
                    rows[r].forEach(cell => {
                        const formatted = cell
                            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                            .replace(/\*([^*]+)\*/g, '<i>$1</i>')
                            .replace(/_([^_]+)_/g, '<i>$1</i>');
                        tableHtml += `<td>${formatted}</td>`;
                    });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table>\n\n';
                return tableHtml;
            });

            // Headers
            text = text.replace(/^#{4,6}\s+(.*?)$/gm, '<h4 class="note-h4">$1</h4>');
            text = text.replace(/^###\s+(.*?)$/gm, '<h3 class="note-h3">$1</h3>');
            text = text.replace(/^##\s+(.*?)$/gm, '<h2 class="note-h2">$1</h2>');
            text = text.replace(/^#\s+(.*?)$/gm, '<h1 class="note-h1">$1</h1>');

            // Text Formatting
            text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
            text = text.replace(/_([^_]+)_/g, '<i>$1</i>');
            text = text.replace(/`([^`]+)`/g, '<span class="note-math">$1</span>');

            // Lists & Task Checkboxes
            text = text.replace(/^[-*]\s*\[x\]\s*(.*$)/gim, '<div class="note-li task checked"><span class="task-box">☑</span> $1</div>');
            text = text.replace(/^[-*]\s*\[ \]\s*(.*$)/gim, '<div class="note-li task"><span class="task-box">☐</span> $1</div>');
            text = text.replace(/^(?: {2,4}|\t)[-*]\s*(.*$)/gm, '<div class="note-li sub">• $1</div>');
            text = text.replace(/^[-*]\s*(.*$)/gm, '<div class="note-li">• $1</div>');
            text = text.replace(/^(\d+)\.\s*(.*$)/gm, '<div class="note-li num"><span class="num-badge">$1.</span> $2</div>');

            // Paragraphs
            const paragraphs = text.split(/\n{2,}/);
            const formattedParas = paragraphs.map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<table') || 
                    trimmed.startsWith('<blockquote') || trimmed.startsWith('<pre')) {
                    return trimmed;
                }
                return `<p class="note-p">${trimmed.replace(/\n/g, '<br/>')}</p>`;
            });

            return metaBanner + `<div class="note-body-prose">${formattedParas.join('\n')}</div>`;
        }

        bindInteractiveElements() {
            if (!this.container) return;

            // Attack card buttons
            this.container.querySelectorAll('.btn-atk-roll.hit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const hit = btn.dataset.hit;
                    const name = btn.dataset.name;
                    window.TBFeatureRollDice?.rollAttack(hit, name, 'hit');
                });
            });

            this.container.querySelectorAll('.btn-atk-roll.dmg').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dmg = btn.dataset.dmg;
                    const name = btn.dataset.name;
                    window.TBFeatureRollDice?.rollAttack(dmg, name, 'dmg');
                });
            });

            // Inline dice roll buttons
            this.container.querySelectorAll('.tb-roll-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const formula = btn.dataset.formula;
                    const label = btn.dataset.label || btn.dataset.name || 'Бросок';
                    if (formula) {
                        window.TBFeatureRollDice?.roll(formula, label);
                    }
                });
            });

            // Inline camera buttons
            this.container.querySelectorAll('.tb-camera-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const location = btn.dataset.location;
                    if (location) {
                        window.TBApi?.gotoBookmark(null, location);
                    }
                });
            });
        }
    }

    const instance = new NoteViewerWidget();
    window.TBWidgetNoteViewer = instance;
    // Backward compatibility with legacy component
    window.TBNoteViewer = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.noteViewer = instance;
})();
