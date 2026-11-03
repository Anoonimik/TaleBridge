// --- TaleBridge Player Personal Notes Component ---

(function() {
    class PlayerNotes {
        constructor() {
            this.container = null;
            this.saveTimer = null;
            this.isDirty = false;
        }

        init(containerId = 'playerNotesBox') {
            this.container = document.getElementById(containerId);
        }

        render(notesText) {
            if (!this.container) return;

            const charName = window.TBState.get('playerCharacter') || 'Персонаж';
            const notes = notesText !== undefined ? notesText : (window.TBState.get('playerData')?.playerNotes || '');

            this.container.innerHTML = `
                <div class="player-notes-card">
                    <div class="notes-header">
                        <div class="notes-title-box">
                            <span class="notes-main-title">Личный журнал: ${this.escapeHtml(charName)}</span>
                            <span class="notes-desc">Заметки синхронизируются с Obsidian в секцию «Заметки игрока»</span>
                        </div>
                        <div id="notesSaveBadge" class="notes-save-badge saved">
                            <span class="save-dot"></span>
                            <span id="notesSaveText">Сохранено</span>
                        </div>
                    </div>
                    <div class="notes-toolbar">
                        <button type="button" class="btn-notes-tool" data-action="bullet">• Список</button>
                        <button type="button" class="btn-notes-tool" data-action="bold"><b>B</b> Жирный</button>
                        <button type="button" class="btn-notes-tool" data-action="quote">" Цитата</button>
                        <button type="button" class="btn-notes-tool" data-action="crystal">Кристалл Резонанса</button>
                        <button type="button" class="btn-notes-tool secondary" id="btnNotesForceSave">Сохранить сейчас</button>
                    </div>
                    <div class="notes-editor-box">
                        <textarea id="playerNotesArea" class="player-notes-textarea" placeholder="Записывайте сюда улики, пароли, имена NPC, договорённости и догадки о побеге...">${this.escapeHtml(notes)}</textarea>
                    </div>
                </div>
            `;

            this.bindEvents();
        }

        bindEvents() {
            const textarea = this.container.querySelector('#playerNotesArea');
            if (!textarea) return;

            textarea.addEventListener('input', () => {
                this.markDirty();
                if (this.saveTimer) clearTimeout(this.saveTimer);
                this.saveTimer = setTimeout(() => {
                    this.saveNotes(textarea.value);
                }, 800);
            });

            // Force Save button
            const btnForce = this.container.querySelector('#btnNotesForceSave');
            if (btnForce) {
                btnForce.addEventListener('click', () => {
                    if (this.saveTimer) clearTimeout(this.saveTimer);
                    this.saveNotes(textarea.value);
                });
            }

            // Toolbar action buttons
            this.container.querySelectorAll('.btn-notes-tool[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const val = textarea.value;

                    let insert = '';
                    if (action === 'bullet') {
                        insert = '\n- ';
                    } else if (action === 'bold') {
                        const sel = val.slice(start, end) || 'важное';
                        insert = `**${sel}**`;
                    } else if (action === 'quote') {
                        insert = '\n> ';
                    } else if (action === 'crystal') {
                        insert = 'Кристалл Резонанса';
                    }

                    textarea.value = val.slice(0, start) + insert + val.slice(end);
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = start + insert.length;

                    this.markDirty();
                    if (this.saveTimer) clearTimeout(this.saveTimer);
                    this.saveTimer = setTimeout(() => {
                        this.saveNotes(textarea.value);
                    }, 800);
                });
            });
        }

        markDirty() {
            this.isDirty = true;
            const badge = this.container.querySelector('#notesSaveBadge');
            const text = this.container.querySelector('#notesSaveText');
            if (badge) {
                badge.className = 'notes-save-badge saving';
            }
            if (text) {
                text.textContent = 'Сохранение...';
            }
        }

        saveNotes(text) {
            const charName = window.TBState.get('playerCharacter');
            if (!charName) return;

            const pData = window.TBState.get('playerData');
            if (pData) {
                pData.playerNotes = text;
            }

            window.TBNetwork.send('UPDATE_PLAYER_NOTES', {
                characterName: charName,
                notes: text
            });

            this.onSaved();
        }

        onSaved() {
            this.isDirty = false;
            const badge = this.container?.querySelector('#notesSaveBadge');
            const text = this.container?.querySelector('#notesSaveText');
            if (badge) {
                badge.className = 'notes-save-badge saved';
            }
            if (text) {
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                text.textContent = `Сохранено в ${timeStr}`;
            }
        }

        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }

    window.TBPlayerNotes = new PlayerNotes();
})();