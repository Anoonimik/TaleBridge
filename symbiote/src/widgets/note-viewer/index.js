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
            let html = '';

            if (frontmatter && Object.keys(frontmatter).length > 0) {
                const fmChips = [];
                if (frontmatter.type) fmChips.push(`Тип: <b>${frontmatter.type}</b>`);
                if (frontmatter.cr) fmChips.push(`Опасность: <b>${frontmatter.cr}</b>`);
                if (frontmatter.ac) fmChips.push(`КД: <b>${frontmatter.ac}</b>`);
                if (frontmatter.hp) fmChips.push(`ХП: <b>${frontmatter.hp}</b>`);
                if (frontmatter.speed) fmChips.push(`Скорость: <b>${frontmatter.speed}</b>`);
                if (frontmatter.location) fmChips.push(`Локация: <b>${frontmatter.location}</b>`);

                if (fmChips.length > 0) {
                    html += `<div class="note-fm-bar">${fmChips.map(c => `<span class="note-fm-chip">${c}</span>`).join('')}</div>`;
                }
            }

            let text = md.replace(/\r\n/g, '\n');
            text = text.replace(/^---[\s\S]*?---\n*/, '');

            text = text.replace(/```(?:dnd-action|action)\n([\s\S]*?)```/g, (match, body) => {
                const lines = body.trim().split('\n');
                let name = 'Действие';
                let hit = '';
                let dmg = '';
                let desc = '';

                lines.forEach(line => {
                    const l = line.trim();
                    if (l.startsWith('name:')) name = l.replace(/^name:\s*/, '');
                    else if (l.startsWith('hit:')) hit = l.replace(/^hit:\s*/, '');
                    else if (l.startsWith('dmg:')) dmg = l.replace(/^dmg:\s*/, '');
                    else if (l.startsWith('desc:')) desc = l.replace(/^desc:\s*/, '');
                    else if (!l.includes(':')) desc += (desc ? ' ' : '') + l;
                });

                const atkData = { name, hit, dmg, desc };
                const attackCard = window.TBAttackCard;
                return attackCard ? attackCard.render(atkData) : `<div class="sheet-attack-card"><b>${name}</b> ${desc}</div>`;
            });

            text = text.replace(/```[\s\S]*?```/g, (match) => {
                return `<pre class="note-code-block"><code>${window.TBTextUtils?.escapeHtml(match.replace(/```\w*\n?/, '').replace(/```$/, ''))}</code></pre>`;
            });

            text = text.replace(/^#{4,6}\s+(.*?)$/gm, '<h4 class="note-h4">$1</h4>');
            text = text.replace(/^###\s+(.*?)$/gm, '<h3 class="note-h3">$1</h3>');
            text = text.replace(/^##\s+(.*?)$/gm, '<h2 class="note-h2">$1</h2>');
            text = text.replace(/^#\s+(.*?)$/gm, '<h1 class="note-h1">$1</h1>');

            text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
            text = text.replace(/_([^_]+)_/g, '<i>$1</i>');

            text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label) => {
                const display = label ? label.trim() : target.trim();
                return `<a href="#" class="wiki-link" data-target="${target.trim()}">${display}</a>`;
            });

            text = text.replace(/\$([^$]+)\$/g, '<code class="note-math">$1</code>');
            text = text.replace(/^>\s+(.*?)$/gm, '<blockquote class="note-quote">$1</blockquote>');
            text = text.replace(/^[-*]\s+(.*?)$/gm, '<li class="note-li">$1</li>');
            text = text.replace(/(<li class="note-li">[\s\S]*?<\/li>)/g, '<ul class="note-ul">$1</ul>');
            text = text.replace(/<\/ul>\s*<ul class="note-ul">/g, '');

            const paragraphs = text.split(/\n{2,}/);
            const formattedParas = paragraphs.map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<pre')) {
                    return trimmed;
                }
                return `<p class="note-p">${trimmed.replace(/\n/g, '<br/>')}</p>`;
            });

            html += `<div class="note-body-prose">${formattedParas.join('\n')}</div>`;
            return html;
        }

        bindInteractiveElements() {
            if (!this.container) return;

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
        }
    }

    const instance = new NoteViewerWidget();
    window.TBWidgetNoteViewer = instance;
    // Backward compatibility with legacy component
    window.TBNoteViewer = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.noteViewer = instance;
})();
