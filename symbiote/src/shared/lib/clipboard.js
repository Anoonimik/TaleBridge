// --- FSD: Shared Layer - Universal Clipboard Manager ---

(function() {
    class TaleBridgeClipboardManager {
        constructor() {
            this.contextMenuEl = null;
            this.activeTarget = null;
            this.isInitialized = false;
        }

        init() {
            if (this.isInitialized) return;
            this.isInitialized = true;

            this._setupGlobalKeyboardShortcuts();
            this._setupContextMenu();
            this._setupQuickPasteDelegation();
        }

        /**
         * Reads text from system clipboard using Web API or Obsidian Host fallback
         * @returns {Promise<string>}
         */
        async readText() {
            // 1. Try modern Web Clipboard API
            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                try {
                    const text = await navigator.clipboard.readText();
                    if (typeof text === 'string' && text.length > 0) {
                        return text;
                    }
                } catch (err) {
                    // Browser permission or CEF restriction
                }
            }

            // 2. Query TaleBridge local HTTP host (backed by Electron / OS clipboard)
            try {
                const res = await fetch('http://127.0.0.1:30123/clipboard', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data.text === 'string') {
                        return data.text;
                    }
                }
            } catch (_) {}

            return '';
        }

        /**
         * Writes text to system clipboard
         * @param {string} text 
         */
        async writeText(text) {
            if (typeof text !== 'string') return;

            // 1. Try navigator.clipboard.writeText
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                try {
                    await navigator.clipboard.writeText(text);
                    return;
                } catch (_) {}
            }

            // 2. Send to local host
            try {
                await fetch('http://127.0.0.1:30123/clipboard-write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
            } catch (_) {}
        }

        /**
         * Pastes text into an input or textarea element at cursor position
         * @param {HTMLElement} target 
         * @returns {Promise<boolean>}
         */
        async pasteToElement(target) {
            if (!target) return false;
            const text = await this.readText();
            if (!text) return false;

            if (typeof target.setRangeText === 'function' && typeof target.selectionStart === 'number') {
                const start = target.selectionStart;
                const end = target.selectionEnd;
                target.setRangeText(text, start, end, 'end');
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            } else if (target.isContentEditable) {
                document.execCommand('insertText', false, text);
                return true;
            } else if ('value' in target) {
                target.value = text;
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }

        /**
         * Listens to Ctrl+V / Cmd+V globally, handles physical KeyV on Russian layouts
         */
        _setupGlobalKeyboardShortcuts() {
            window.addEventListener('keydown', async (e) => {
                const isCtrlOrCmd = e.ctrlKey || e.metaKey;
                if (!isCtrlOrCmd) return;

                // CEF sometimes doesn't fire paste on Russian layout where key is 'м' or code is 'KeyV'
                const isVKey = e.code === 'KeyV' || e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М' || e.keyCode === 86;
                if (!isVKey) return;

                const active = document.activeElement;
                if (!active) return;

                const isInput = active.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(active.type);
                const isTextarea = active.tagName === 'TEXTAREA';
                const isEditable = active.isContentEditable;

                if (isInput || isTextarea || isEditable) {
                    // Let default browser handler work if it can, but fallback if empty
                    const valBefore = active.value;
                    setTimeout(async () => {
                        if (active.value === valBefore) {
                            await this.pasteToElement(active);
                        }
                    }, 20);
                }
            }, true);
        }

        /**
         * Custom context menu for CEF inputs
         */
        _setupContextMenu() {
            let menu = document.getElementById('tbCustomContextMenu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'tbCustomContextMenu';
                menu.className = 'tb-context-menu';
                menu.style.display = 'none';
                menu.innerHTML = `
                    <div class="context-item" data-action="paste">Вставить (Ctrl+V)</div>
                    <div class="context-item" data-action="copy">Копировать (Ctrl+C)</div>
                    <div class="context-item" data-action="clear">Очистить</div>
                `;
                document.body.appendChild(menu);
            }
            this.contextMenuEl = menu;

            document.addEventListener('contextmenu', (e) => {
                const target = e.target.closest('input, textarea, [contenteditable="true"]');
                if (target) {
                    e.preventDefault();
                    this.activeTarget = target;
                    this._showContextMenu(e.clientX, e.clientY);
                } else {
                    this._hideContextMenu();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#tbCustomContextMenu')) {
                    this._hideContextMenu();
                }
            });

            menu.addEventListener('click', async (e) => {
                const item = e.target.closest('.context-item');
                if (!item || !this.activeTarget) return;
                const action = item.dataset.action;

                if (action === 'paste') {
                    await this.pasteToElement(this.activeTarget);
                } else if (action === 'copy') {
                    const sel = window.getSelection().toString() || this.activeTarget.value || '';
                    if (sel) await this.writeText(sel);
                } else if (action === 'clear') {
                    this.activeTarget.value = '';
                    this.activeTarget.dispatchEvent(new Event('input', { bubbles: true }));
                }

                this._hideContextMenu();
            });
        }

        _showContextMenu(x, y) {
            if (!this.contextMenuEl) return;
            const w = 180;
            const h = 100;
            const maxX = window.innerWidth - w - 10;
            const maxY = window.innerHeight - h - 10;

            this.contextMenuEl.style.left = `${Math.min(x, maxX)}px`;
            this.contextMenuEl.style.top = `${Math.min(y, maxY)}px`;
            this.contextMenuEl.style.display = 'block';
        }

        _hideContextMenu() {
            if (this.contextMenuEl) {
                this.contextMenuEl.style.display = 'none';
            }
        }

        /**
         * Quick paste button delegation (`.btn-paste-quick[data-paste-target="id"]`)
         */
        _setupQuickPasteDelegation() {
            document.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-paste-quick');
                if (!btn) return;
                e.preventDefault();

                const targetId = btn.dataset.pasteTarget;
                const target = targetId ? document.getElementById(targetId) : btn.previousElementSibling;
                if (target) {
                    const ok = await this.pasteToElement(target);
                    if (ok) {
                        const original = btn.textContent;
                        btn.textContent = 'Вставлено!';
                        btn.classList.add('paste-success');
                        setTimeout(() => {
                            btn.textContent = original;
                            btn.classList.remove('paste-success');
                        }, 1200);
                    }
                }
            });
        }
    }

    const clipboardInstance = new TaleBridgeClipboardManager();
    window.TBClipboard = clipboardInstance;
    window.TBShared = window.TBShared || {};
    window.TBShared.clipboard = clipboardInstance;
})();
