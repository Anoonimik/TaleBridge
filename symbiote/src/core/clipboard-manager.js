// --- TaleBridge Universal Clipboard & Input Shortcut Manager ---

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

        _isEditable(el) {
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
        }

        _setupGlobalKeyboardShortcuts() {
            // Listen in capture phase so TaleSpire / child wrappers don't drop the event
            window.addEventListener('keydown', async (e) => {
                if (!e.ctrlKey && !e.metaKey) return;

                const active = document.activeElement;
                const target = this._isEditable(active) ? active : (this._isEditable(e.target) ? e.target : null);
                if (!target) return;

                const code = e.code;
                const key = e.key;

                // 1. PASTE: KeyV, 'v', 'V', 'м', 'М', keyCode 86
                const isPaste = code === 'KeyV' || key === 'v' || key === 'V' || key === 'м' || key === 'М' || e.keyCode === 86;
                if (isPaste) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.pasteToElement(target);
                    return;
                }

                // 2. SELECT ALL: KeyA, 'a', 'A', 'ф', 'Ф', keyCode 65
                const isSelectAll = code === 'KeyA' || key === 'a' || key === 'A' || key === 'ф' || key === 'Ф' || e.keyCode === 65;
                if (isSelectAll) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof target.select === 'function') {
                        target.select();
                    }
                    return;
                }

                // 3. COPY (fix for Russian layout 'с' / 'С')
                const isRussianCopy = (code === 'KeyC' || key === 'с' || key === 'С') && (key === 'с' || key === 'С');
                if (isRussianCopy) {
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const selected = target.value ? target.value.substring(start, end) : (window.getSelection ? window.getSelection().toString() : '');
                    if (selected) {
                        e.preventDefault();
                        e.stopPropagation();
                        await this.writeText(selected);
                    }
                    return;
                }

                // 4. CUT (fix for Russian layout 'ч' / 'Ч')
                const isRussianCut = (code === 'KeyX' || key === 'ч' || key === 'Ч') && (key === 'ч' || key === 'Ч');
                if (isRussianCut) {
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const selected = target.value ? target.value.substring(start, end) : '';
                    if (selected) {
                        e.preventDefault();
                        e.stopPropagation();
                        await this.writeText(selected);
                        target.setRangeText('', start, end, 'end');
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    return;
                }
            }, true);
        }

        _setupContextMenu() {
            // Build context menu element
            const menu = document.createElement('div');
            menu.className = 'tb-context-menu';
            menu.style.display = 'none';
            menu.innerHTML = `
                <div class="tb-context-menu-item" data-action="paste">
                    <span>Вставить</span>
                    <span class="shortcut">Ctrl+V</span>
                </div>
                <div class="tb-context-menu-item" data-action="copy">
                    <span>Копировать</span>
                    <span class="shortcut">Ctrl+C</span>
                </div>
                <div class="tb-context-menu-item" data-action="cut">
                    <span>Вырезать</span>
                    <span class="shortcut">Ctrl+X</span>
                </div>
                <div class="tb-context-menu-divider"></div>
                <div class="tb-context-menu-item" data-action="select-all">
                    <span>Выделить всё</span>
                    <span class="shortcut">Ctrl+A</span>
                </div>
                <div class="tb-context-menu-item" data-action="clear">
                    <span>Очистить</span>
                </div>
            `;
            document.body.appendChild(menu);
            this.contextMenuEl = menu;

            const hideMenu = () => {
                menu.style.display = 'none';
                this.activeTarget = null;
            };

            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target)) {
                    hideMenu();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideMenu();
            });

            // Handle Context Menu Item clicks
            menu.addEventListener('click', async (e) => {
                const item = e.target.closest('.tb-context-menu-item');
                if (!item || !this.activeTarget) return;

                const action = item.dataset.action;
                const target = this.activeTarget;
                hideMenu();

                target.focus();

                if (action === 'paste') {
                    await this.pasteToElement(target);
                } else if (action === 'copy') {
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const selected = target.value ? target.value.substring(start, end) : '';
                    if (selected) {
                        await this.writeText(selected);
                    }
                } else if (action === 'cut') {
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const selected = target.value ? target.value.substring(start, end) : '';
                    if (selected) {
                        await this.writeText(selected);
                        target.setRangeText('', start, end, 'end');
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (action === 'select-all') {
                    if (typeof target.select === 'function') target.select();
                } else if (action === 'clear') {
                    target.value = '';
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Listen for right-click on inputs and textareas
            window.addEventListener('contextmenu', (e) => {
                const target = e.target;
                if (!this._isEditable(target)) {
                    hideMenu();
                    return;
                }

                e.preventDefault();
                this.activeTarget = target;

                // Position within viewport bounds
                const x = Math.min(e.clientX, window.innerWidth - 180);
                const y = Math.min(e.clientY, window.innerHeight - 170);

                menu.style.left = `${Math.max(5, x)}px`;
                menu.style.top = `${Math.max(5, y)}px`;
                menu.style.display = 'block';
            });
        }

        _setupQuickPasteDelegation() {
            // Delegate clicks on any button with class .btn-paste-quick or .btn-input-paste
            document.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-paste-quick, .btn-input-paste');
                if (!btn) return;

                e.preventDefault();
                e.stopPropagation();

                let targetInput = null;
                const targetId = btn.dataset.pasteTarget || btn.dataset.target;
                if (targetId) {
                    targetInput = document.getElementById(targetId);
                }
                if (!targetInput) {
                    // Try to find an input/textarea in the same container or preceding sibling
                    const container = btn.closest('.input-group, .input-header-row, .input-with-action, .search-box');
                    if (container) {
                        targetInput = container.querySelector('input, textarea');
                    }
                }
                if (!targetInput) {
                    targetInput = btn.previousElementSibling;
                }

                if (targetInput) {
                    targetInput.focus();
                    const success = await this.pasteToElement(targetInput);
                    if (success) {
                        const originalText = btn.textContent;
                        btn.textContent = 'Вставлено!';
                        btn.classList.add('pasted');
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove('pasted');
                        }, 1200);
                    }
                }
            });
        }
    }

    window.TBClipboard = new TaleBridgeClipboardManager();
})();
