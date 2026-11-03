// --- TaleBridge GM Media Broadcast Control Panel ---

(function() {
    class MediaBroadcastView {
        constructor() {
            this.container = null;
            this.activeType = 'image'; // 'image' | 'video' | 'text'
        }

        init(containerId = 'gmBroadcastBox') {
            this.container = document.getElementById(containerId);
            if (this.container) {
                this.render();
            }
            this.setupStoryViewHook();

            window.TBState.on('vaultImages', () => {
                this.render();
            });
            window.TBState.on('activeHandout', () => {
                this.render();
            });
        }

        render() {
            if (!this.container) return;

            const activeHandout = window.TBState.get('activeHandout');
            const vaultImages = window.TBState.get('vaultImages') || [];

            this.container.innerHTML = `
                <div class="broadcast-control-panel">
                    <div class="section-title">Вещание медиа игрокам (Handout Showcase)</div>
                    
                    ${activeHandout ? `
                        <div class="active-broadcast-banner">
                            <div class="active-badge-pulse"></div>
                            <div class="active-broadcast-info">
                                <span class="active-label">В эфире у игроков:</span>
                                <strong class="active-title">${this.escapeHtml(activeHandout.title || 'Медиа')}</strong>
                                <span class="active-type">(${activeHandout.type || 'текст'})</span>
                            </div>
                            <button id="btnDismissActiveBroadcast" class="btn-dismiss-broadcast" title="Принудительно закрыть у всех игроков">
                                Снять трансляцию
                            </button>
                        </div>
                    ` : ''}

                    <div class="broadcast-type-tabs">
                        <button class="b-type-btn ${this.activeType === 'image' ? 'active' : ''}" data-type="image">Изображение</button>
                        <button class="b-type-btn ${this.activeType === 'video' ? 'active' : ''}" data-type="video">Видео</button>
                        <button class="b-type-btn ${this.activeType === 'text' ? 'active' : ''}" data-type="text">Манускрипт</button>
                    </div>

                    <div class="broadcast-form-grid">
                        <div class="input-group">
                            <div class="input-header-row">
                                <label>Заголовок материала</label>
                                <button type="button" class="btn-paste-quick" data-paste-target="bcTitle" title="Вставить из буфера обмена">Вставить</button>
                            </div>
                            <input type="text" id="bcTitle" placeholder="Например: План Катакомб или Записка Калиокса" />
                        </div>

                        ${this.activeType === 'image' ? `
                            <div class="input-group">
                                <label>Изображение из папки public/</label>
                                <select id="bcVaultImageSelect">
                                    <option value="">-- Выберите изображение (${vaultImages.length} в public/) --</option>
                                    ${vaultImages.map(img => `<option value="${this.escapeHtml(img.path)}">${this.escapeHtml(img.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div id="bcImagePreviewBox" class="bc-image-preview-box" style="display: none;">
                                <img id="bcImagePreview" src="" alt="Предпросмотр" class="bc-preview-img" />
                            </div>
                            <div class="input-group">
                                <div class="input-header-row">
                                    <label>Или прямая веб-ссылка (URL)</label>
                                    <button type="button" class="btn-paste-quick" data-paste-target="bcUrl" title="Вставить из буфера обмена">Вставить</button>
                                </div>
                                <input type="text" id="bcUrl" placeholder="https://example.com/art.png" />
                            </div>
                        ` : ''}

                        ${this.activeType === 'video' ? `
                            <div class="input-group">
                                <div class="input-header-row">
                                    <label>Ссылка на видео (YouTube / MP4 / WebM)</label>
                                    <button type="button" class="btn-paste-quick" data-paste-target="bcUrl" title="Вставить из буфера обмена">Вставить</button>
                                </div>
                                <input type="text" id="bcUrl" placeholder="https://www.youtube.com/watch?v=... или .mp4" />
                            </div>
                        ` : ''}

                        <div class="input-group">
                            <div class="input-header-row">
                                <label>${this.activeType === 'text' ? 'Текст манускрипта / письма' : 'Подпись к материалу (опционально)'}</label>
                                <button type="button" class="btn-paste-quick" data-paste-target="bcContent" title="Вставить из буфера обмена">Вставить</button>
                            </div>
                            <textarea id="bcContent" rows="${this.activeType === 'text' ? '5' : '2'}" placeholder="${this.activeType === 'text' ? 'Введите текст послания или записки...' : 'Краткое пояснение для игроков'}"></textarea>
                        </div>
                    </div>

                    <div class="broadcast-actions-row">
                        <button id="btnSendBroadcast" class="btn-primary-broadcast">
                            Транслировать всем игрокам
                        </button>
                        <button id="btnDismissBroadcastAll" class="btn-secondary-broadcast">
                            Снять у всех
                        </button>
                    </div>
                </div>
            `;

            this.bindEvents();
        }

        bindEvents() {
            // Type tabs
            this.container.querySelectorAll('.b-type-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.activeType = btn.dataset.type;
                    this.render();
                });
            });

            // Vault image select sync with URL input and live preview
            const vaultSelect = this.container.querySelector('#bcVaultImageSelect');
            const urlInput = this.container.querySelector('#bcUrl');
            const titleInput = this.container.querySelector('#bcTitle');
            const previewBox = this.container.querySelector('#bcImagePreviewBox');
            const previewImg = this.container.querySelector('#bcImagePreview');

            const updatePreview = (val) => {
                if (val && previewBox && previewImg) {
                    const resolved = (val.startsWith('http://') || val.startsWith('https://')) 
                        ? val 
                        : `http://127.0.0.1:30123/vault-file?path=${encodeURIComponent(val)}`;
                    previewImg.src = resolved;
                    previewBox.style.display = 'block';
                } else if (previewBox) {
                    previewBox.style.display = 'none';
                }
            };

            if (vaultSelect && urlInput) {
                vaultSelect.addEventListener('change', () => {
                    if (vaultSelect.value) {
                        urlInput.value = vaultSelect.value;
                        if (titleInput && !titleInput.value) {
                            const fileName = vaultSelect.value.split(/[\\/]/).pop().replace(/\.[^/.]+$/, '');
                            titleInput.value = fileName;
                        }
                        updatePreview(vaultSelect.value);
                    } else {
                        updatePreview(urlInput.value);
                    }
                });
            }

            if (urlInput) {
                urlInput.addEventListener('input', () => {
                    updatePreview(urlInput.value);
                });
            }

            // Send broadcast
            const btnSend = this.container.querySelector('#btnSendBroadcast');
            if (btnSend) {
                btnSend.addEventListener('click', () => {
                    const title = (this.container.querySelector('#bcTitle')?.value || '').trim() || 'Послание от Мастера';
                    const url = (this.container.querySelector('#bcUrl')?.value || '').trim();
                    const content = (this.container.querySelector('#bcContent')?.value || '').trim();

                    if (this.activeType !== 'text' && !url && !content) {
                        const urlInput = this.container.querySelector('#bcUrl');
                        if (urlInput) {
                            urlInput.focus();
                            urlInput.classList.add('input-error-shake');
                            setTimeout(() => urlInput.classList.remove('input-error-shake'), 600);
                        }
                        return;
                    }

                    const payload = {
                        id: 'bc_' + Math.random().toString(36).substring(2, 9),
                        type: this.activeType,
                        title,
                        url,
                        content,
                        timestamp: Date.now()
                    };

                    window.TBState.set('activeHandout', payload);
                    window.TBNetwork.send('BROADCAST_HANDOUT', payload);
                    this.render();
                });
            }

            // Dismiss broadcast buttons
            const btnDismissActive = this.container.querySelector('#btnDismissActiveBroadcast');
            const btnDismissAll = this.container.querySelector('#btnDismissBroadcastAll');
            const dismissHandler = () => {
                window.TBState.set('activeHandout', null);
                if (window.TBMediaHandout) {
                    window.TBMediaHandout.hide();
                }
                window.TBNetwork.send('DISMISS_HANDOUT', {});
                this.render();
            };

            if (btnDismissActive) btnDismissActive.addEventListener('click', dismissHandler);
            if (btnDismissAll) btnDismissAll.addEventListener('click', dismissHandler);
        }

        updateVaultImages(images) {
            const select = this.container?.querySelector('#bcVaultImageSelect');
            if (!select) return;
            select.innerHTML = `
                <option value="">-- Выбрать из Obsidian (${images.length} файлов) --</option>
                ${images.map(img => `<option value="${this.escapeHtml(img.path)}">${this.escapeHtml(img.name)}</option>`).join('')}
            `;
        }

        setupStoryViewHook() {
            // Observer to add "Показать как свиток" button to read-aloud boxes in Story View
            const observer = new MutationObserver(() => {
                document.querySelectorAll('.read-aloud-box:not([data-bc-hooked])').forEach(box => {
                    box.setAttribute('data-bc-hooked', 'true');
                    const btn = document.createElement('button');
                    btn.className = 'btn-broadcast-quote';
                    btn.textContent = 'Транслировать свиток';
                    btn.title = 'Показать этот текст игрокам как древний свиток на экране';
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const quoteText = box.querySelector('.read-aloud-text')?.textContent || box.textContent;
                        const sceneTitle = document.getElementById('activeSceneTitleDisplay')?.textContent || 'Сюжетная зачитка';

                        const payload = {
                            id: 'bc_' + Math.random().toString(36).substring(2, 9),
                            type: 'text',
                            title: sceneTitle,
                            url: '',
                            content: quoteText.trim(),
                            timestamp: Date.now()
                        };

                        window.TBState.set('activeHandout', payload);
                        window.TBNetwork.send('BROADCAST_HANDOUT', payload);
                        if (window.TBLogger) {
                            window.TBLogger.log(`Свиток транслирован: «${sceneTitle}»`, 'out');
                        }
                    });
                    const header = box.querySelector('.read-aloud-header') || box;
                    header.appendChild(btn);
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }

    window.TBBroadcastView = new MediaBroadcastView();
})();