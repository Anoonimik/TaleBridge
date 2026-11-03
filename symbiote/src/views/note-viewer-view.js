// --- TaleBridge Note Viewer Controller (In-Game Obsidian Reader) ---

(function() {
    class NoteViewer {
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
                        window.TBNetwork.send('OPEN_IN_OBSIDIAN', {
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
                        const matchedScene = this._findMatchingScene(target, scenes);
                        if (matchedScene && window.TBStoryView) {
                            // Switch to Story tab and focus the scene
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

        _findMatchingScene(target, allScenes = []) {
            if (!target) return null;
            if (window.TBSceneCardRenderer && window.TBSceneCardRenderer.findMatchingScene) {
                return window.TBSceneCardRenderer.findMatchingScene(target, allScenes);
            }
            const cleanTarget = target.split('#')[0].toLowerCase().trim();
            const targetNum = target.match(/(?:сцена|scene)\s*(\d+)/i)?.[1];
            for (const s of allScenes) {
                const sNum = (s.title + ' ' + (s.file || '')).match(/(?:сцена|scene)\s*(\d+)/i)?.[1];
                if (targetNum && sNum && targetNum === sNum) return s;
                if (s.file && s.file.toLowerCase().includes(cleanTarget)) return s;
                if (s.title && s.title.toLowerCase().includes(cleanTarget)) return s;
            }
            return null;
        }

        openNote(targetPathOrName) {
            // Save current to history for back navigation
            if (this.currentNote) {
                this.history.push(this.currentNote);
            }

            // Switch to Note tab
            this.activateNoteTab();

            const displayName = targetPathOrName.replace(/^.*[\\\/]/, '').replace(/\.md$/, '');
            if (this.titleEl) this.titleEl.textContent = displayName;
            if (this.container) {
                this.container.scrollTop = 0;
                this.container.innerHTML = '<div class="empty-hint">Загрузка заметки из Obsidian...</div>';
            }

            window.TBNetwork.send('GET_NOTE', {
                path: targetPathOrName.includes('/') || targetPathOrName.includes('\\') ? targetPathOrName : null,
                name: displayName
            });
        }

        activateNoteTab() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            const noteTabBtn = document.querySelector('[data-tab="tab-note"]');
            const noteTab = document.getElementById('tab-note');

            if (noteTabBtn) noteTabBtn.classList.add('active');
            if (noteTab) noteTab.classList.add('active');
        }

        goBack() {
            if (this.history.length > 0) {
                const prev = this.history.pop();
                this.render(prev);
            } else {
                const charTabBtn = document.querySelector('[data-tab="tab-characters"]');
                if (charTabBtn) charTabBtn.click();
            }
        }

        render(noteData) {
            this.currentNote = noteData;
            if (this.titleEl) {
                this.titleEl.textContent = noteData.name || noteData.title || 'Заметка';
            }
            if (!this.container) return;

            this.container.scrollTop = 0;
            const html = this.parseMarkdown(noteData.content || '', noteData.frontmatter);
            this.container.innerHTML = html;

            // Wire roll buttons inside the rendered note
            this.container.querySelectorAll('.tb-roll-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const formula = btn.dataset.formula;
                    const label = btn.dataset.label || 'Бросок';
                    window.TBApi.rollDice(formula, label);
                };
            });

            // Wire camera buttons inside the rendered note
            this.container.querySelectorAll('.tb-camera-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const location = btn.dataset.location;
                    window.TBApi.gotoBookmark(null, location);
                };
            });
        }

        parseMarkdown(raw, frontmatter) {
            // 1. Remove YAML frontmatter from top of content
            let md = raw.replace(/^---[\s\S]*?---\s*/, '');

            // 2. Strip AI emojis
            const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE0F}\u{200D}]/ug;
            md = md.replace(emojiRegex, '');

            // 3. Clean up LaTeX math formulas
            md = md
                .replace(/\\rightarrow/g, '→')
                .replace(/\$([^\$\n]+)\$/g, (match, expr) => {
                    return expr.replace(/\\text\{([^}]+)\}/g, '$1').trim();
                });

            // 4. Meta Banner
            let metaBanner = '';
            if (frontmatter && (frontmatter.hp || frontmatter.ac || frontmatter.speed || frontmatter.race || frontmatter.class)) {
                metaBanner = `<div class="note-meta-banner">
                    ${frontmatter.race || frontmatter.class ? `<span><b>${[frontmatter.race, frontmatter.class].filter(Boolean).join(' • ')}</b></span>` : ''}
                    ${frontmatter.ac ? `<span>КД: <b>${frontmatter.ac}</b></span>` : ''}
                    ${frontmatter.hp ? `<span>ХП: <b>${frontmatter.hp}</b></span>` : ''}
                    ${frontmatter.speed ? `<span>Скорость: <b>${frontmatter.speed}</b></span>` : ''}
                    ${frontmatter.status ? `<span>Статус: <b>${frontmatter.status}</b></span>` : ''}
                </div>`;
            }

            // 5. Interactive dnd-action codeblocks
            md = md.replace(/```dnd-action\s*([\s\S]*?)```/g, (match, block) => {
                const name = block.match(/name:\s*(.*)/i)?.[1]?.trim() || 'Действие';
                const hit = block.match(/hit:\s*(.*)/i)?.[1]?.trim() || '';
                const dmg = block.match(/dmg:\s*(.*)/i)?.[1]?.trim() || '';
                const type = block.match(/type:\s*(.*)/i)?.[1]?.trim() || '';
                const desc = block.match(/desc:\s*(.*)/i)?.[1]?.trim() || '';

                let hitBtn = '';
                if (hit) {
                    const f = hit.startsWith('+') || hit.startsWith('-') ? `1d20${hit}` : `1d20+${hit}`;
                    hitBtn = `<button class="tb-roll-btn hit" data-formula="${f}" data-label="${name} (Попадание)">Попадание ${hit}</button>`;
                }

                let dmgBtn = '';
                if (dmg) {
                    dmgBtn = `<button class="tb-roll-btn dmg" data-formula="${dmg}" data-label="${name} (Урон)">Урон ${dmg} ${type}</button>`;
                }

                return `<div class="note-action-card">
                    <div class="note-action-title">${name}</div>
                    <div class="note-action-buttons">${hitBtn}${dmgBtn}</div>
                    ${desc ? `<div class="note-action-desc">${desc}</div>` : ''}
                </div>`;
            });

            // 6. Inline dice tags: [dice:1d20+2|Инициатива]
            md = md.replace(/\[(?:dice|roll):([^\]]+)\]/gi, (match, content) => {
                const [formula, ...rest] = content.split('|');
                const label = rest.join('|') || formula;
                return `<button class="tb-roll-btn inline" data-formula="${formula}" data-label="${label}">${label} (${formula})</button>`;
            });

            // 7. Inline camera tags: [camera:Тронный зал]
            md = md.replace(/\[camera:([^\]]+)\]/gi, (match, loc) => {
                const cleanLoc = loc.trim();
                return `<button class="tb-camera-btn inline" data-location="${cleanLoc}">Камера: ${cleanLoc}</button>`;
            });

            // 8. Robust Obsidian Callouts (matches multiline and blank blockquote lines)
            md = md.replace(/^>\s*\[!(\w+)\]\s*([^\n]*)\r?\n((?:^>.*(?:\r?\n|$))*)/gm, (match, type, title, body) => {
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
                </div>`;
            });

            // 9. Obsidian Wiki Links: [[Target|Label]] or [[Target]]
            md = md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label) => {
                const cleanTarget = target.split('#')[0].trim();
                const display = label ? label.trim() : target.trim();
                return `<a href="#" class="wiki-link" data-target="${cleanTarget}">${display}</a>`;
            });

            // 10. Markdown Tables (auto-strips empty pipes and handles headers)
            md = md.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match, tableBlock) => {
                const lines = tableBlock.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length < 2) return tableBlock;

                let rows = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\|?\s*[-:]+[-| :]*\|?$/.test(line)) {
                        continue;
                    }
                    const cells = line.split('|').slice(1, -1).map(c => c.trim());
                    // Skip empty rows like | | | | | | |
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
                tableHtml += '</tbody></table>';
                return tableHtml;
            });

            // 11. Headers & Text Formatting
            md = md.replace(/^### (.*$)/gim, '<div class="note-h3">$1</div>');
            md = md.replace(/^## (.*$)/gim, '<div class="note-h2">$1</div>');
            md = md.replace(/^# (.*$)/gim, '<div class="note-h1">$1</div>');
            md = md.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
            md = md.replace(/\*([^*]+)\*/gim, '<i>$1</i>');
            md = md.replace(/_([^_]+)_/gim, '<i>$1</i>');
            md = md.replace(/`([^`]+)`/gim, '<span class="note-math">$1</span>');

            // 12. Nested & Top-Level Lists
            md = md.replace(/^(?: {2,4}|\t)[-*]\s*(.*$)/gm, '<div class="note-li sub">• $1</div>');
            md = md.replace(/^[-*]\s*(.*$)/gm, '<div class="note-li">• $1</div>');
            md = md.replace(/^(\d+)\.\s*(.*$)/gm, '<div class="note-li num"><span class="num-badge">$1.</span> $2</div>');

            return metaBanner + md;
        }
    }

    window.TBNoteViewer = new NoteViewer();
})();
