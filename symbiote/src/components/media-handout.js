// --- TaleBridge Media Handout & Cinema Showcase Component ---

(function() {
    class MediaHandout {
        constructor() {
            this.overlay = null;
            this.currentHandout = null;
        }

        init(overlayId = 'cinemaOverlay') {
            this.overlay = document.getElementById(overlayId);
            if (!this.overlay) {
                this.createOverlayDom();
            }
        }

        createOverlayDom() {
            this.overlay = document.createElement('div');
            this.overlay.id = 'cinemaOverlay';
            this.overlay.className = 'cinema-overlay';
            this.overlay.style.display = 'none';
            document.body.appendChild(this.overlay);
        }

        show(handout) {
            if (!handout || (!handout.url && !handout.content && !handout.title)) return;
            this.currentHandout = handout;
            if (!this.overlay) this.init();

            const type = (handout.type || handout.mediaType || 'text').toLowerCase();
            const title = handout.title || 'Послание от Мастера';
            const desc = handout.description || handout.content || '';
            const url = handout.url || '';

            let contentHtml = '';

            if (type === 'image' || type === 'картинка' || type === 'арт') {
                const src = this.resolveMediaUrl(url);
                contentHtml = `
                    <div class="handout-image-wrapper">
                        <img src="${src}" alt="${this.escapeHtml(title)}" class="handout-img" onerror="this.src=''; this.alt='Не удалось загрузить изображение';" />
                        ${desc ? `<div class="handout-caption">${this.escapeHtml(desc)}</div>` : ''}
                    </div>
                `;
            } else if (type === 'video' || type === 'видео') {
                const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                if (ytMatch) {
                    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
                    contentHtml = `
                        <div class="handout-video-wrapper">
                            <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="handout-iframe"></iframe>
                            ${desc ? `<div class="handout-caption">${this.escapeHtml(desc)}</div>` : ''}
                        </div>
                    `;
                } else {
                    const src = this.resolveMediaUrl(url);
                    contentHtml = `
                        <div class="handout-video-wrapper">
                            <video src="${src}" controls autoplay loop class="handout-video"></video>
                            ${desc ? `<div class="handout-caption">${this.escapeHtml(desc)}</div>` : ''}
                        </div>
                    `;
                }
            } else {
                // Parchment Manuscript / Text Note
                contentHtml = `
                    <div class="handout-parchment-scroll">
                        <div class="parchment-inner">
                            <div class="parchment-seal">~ ~ ~</div>
                            <div class="parchment-body">${this.formatManuscriptText(desc || url)}</div>
                        </div>
                    </div>
                `;
            }

            this.overlay.innerHTML = `
                <div class="cinema-backdrop"></div>
                <div class="cinema-dialog">
                    <div class="cinema-header">
                        <div class="cinema-badge-box">
                            <span class="cinema-badge ${type}">${this.getTypeLabel(type)}</span>
                            <span class="cinema-title">${this.escapeHtml(title)}</span>
                        </div>
                        <div class="cinema-header-actions">
                            <button id="btnSaveToClues" class="btn-cinema-action" title="Сохранить в личный архив улик">
                                В архив улик
                            </button>
                            <button id="btnCloseCinema" class="btn-cinema-close" title="Закрыть окно">✕</button>
                        </div>
                    </div>
                    <div class="cinema-content-body">
                        ${contentHtml}
                    </div>
                    <div class="cinema-footer">
                        <button id="btnFooterDismiss" class="btn-cinema-dismiss">Свернуть (✕)</button>
                    </div>
                </div>
            `;

            this.overlay.style.display = 'flex';
            this.overlay.classList.add('visible');

            // Bind overlay buttons
            const btnClose = this.overlay.querySelector('#btnCloseCinema');
            const btnFooter = this.overlay.querySelector('#btnFooterDismiss');
            const backdrop = this.overlay.querySelector('.cinema-backdrop');

            const closeHandler = () => this.hide();
            if (btnClose) btnClose.addEventListener('click', closeHandler);
            if (btnFooter) btnFooter.addEventListener('click', closeHandler);
            if (backdrop) backdrop.addEventListener('click', closeHandler);

            const btnSaveClues = this.overlay.querySelector('#btnSaveToClues');
            if (btnSaveClues) {
                btnSaveClues.addEventListener('click', () => {
                    window.TBState.addClue(handout);
                    btnSaveClues.textContent = 'Сохранено в улики';
                    btnSaveClues.classList.add('saved');
                    setTimeout(() => {
                        btnSaveClues.textContent = 'В архив улик';
                        btnSaveClues.classList.remove('saved');
                    }, 2000);
                });
            }
        }

        hide() {
            if (this.overlay) {
                this.overlay.classList.remove('visible');
                setTimeout(() => {
                    if (this.overlay) this.overlay.style.display = 'none';
                }, 250);
            }
        }

        renderCluesArchive(containerId = 'playerCluesBox') {
            const container = document.getElementById(containerId);
            if (!container) return;

            const clues = window.TBState.get('cluesArchive') || [];

            container.innerHTML = `
                <div class="clues-archive-header">
                    <div class="clues-title-box">
                        <span class="clues-main-title">Архив полученных улик (${clues.length})</span>
                        <span class="clues-desc">Здесь сохраняются все показанные Мастером арты, свитки и видео</span>
                    </div>
                </div>
                <div class="clues-archive-grid">
                    ${clues.length === 0 
                        ? `<div class="empty-hint">Архив пуст. Когда Мастер покажет важную улику или письмо, нажмите «В архив улик».</div>`
                        : clues.map(clue => this.renderClueCard(clue)).join('')
                    }
                </div>
            `;

            // Bind Clue Card interactions
            container.querySelectorAll('.btn-view-clue').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const clue = clues.find(c => c.id === id);
                    if (clue) this.show(clue);
                });
            });

            container.querySelectorAll('.btn-delete-clue').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    if (confirm('Удалить эту улику из архива?')) {
                        window.TBState.removeClue(id);
                        this.renderCluesArchive(containerId);
                    }
                });
            });
        }

        renderClueCard(clue) {
            const type = (clue.type || 'text').toLowerCase();
            const dateStr = clue.savedAt ? new Date(clue.savedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

            let previewThumbnail = '';
            if (type === 'image' && clue.url) {
                previewThumbnail = `<img src="${this.resolveMediaUrl(clue.url)}" class="clue-thumb-img" onerror="this.style.display='none';" />`;
            } else {
                previewThumbnail = `<div class="clue-thumb-icon">${type === 'video' ? '▶' : '■'}</div>`;
            }

            return `
                <div class="clue-card" data-id="${clue.id}">
                    <div class="clue-thumb-box">${previewThumbnail}</div>
                    <div class="clue-info-box">
                        <div class="clue-type-tag ${type}">${this.getTypeLabel(type)}</div>
                        <div class="clue-title">${this.escapeHtml(clue.title || 'Улика')}</div>
                        ${dateStr ? `<div class="clue-date">${dateStr}</div>` : ''}
                    </div>
                    <div class="clue-actions">
                        <button class="btn-view-clue" data-id="${clue.id}">Открыть</button>
                        <button class="btn-delete-clue" data-id="${clue.id}" title="Удалить">✕</button>
                    </div>
                </div>
            `;
        }

        resolveMediaUrl(url) {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                return url;
            }
            // Local vault file served via TaleBridge HTTP host
            return `http://127.0.0.1:30123/vault-file?path=${encodeURIComponent(url)}`;
        }

        getTypeLabel(type) {
            switch (type) {
                case 'image':
                case 'картинка':
                case 'арт':
                    return 'Изображение';
                case 'video':
                case 'видео':
                    return 'Видеозапись';
                default:
                    return 'Манускрипт';
            }
        }

        formatManuscriptText(text) {
            if (!text) return '';
            return text
                .split(/\r?\n\r?\n/)
                .map(para => `<p>${this.escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
                .join('');
        }

        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }

    window.TBMediaHandout = new MediaHandout();
})();