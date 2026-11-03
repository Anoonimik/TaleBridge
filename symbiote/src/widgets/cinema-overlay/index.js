// --- FSD: Widgets Layer - Cinema Overlay Widget ---

(function() {
    class CinemaOverlayWidget {
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

            // Stop any existing playback before opening new media
            this.stopAllMedia();

            const type = (handout.type || handout.mediaType || 'text').toLowerCase();
            const title = handout.title || 'Послание от Мастера';
            const desc = handout.description || handout.content || '';
            const url = handout.url || '';
            const escape = window.TBTextUtils?.escapeHtml || (s => s);
            const model = window.TBClueModel;

            let contentHtml = '';

            if (type === 'image' || type === 'картинка' || type === 'арт') {
                const src = model ? model.resolveMediaUrl(url) : url;
                contentHtml = `
                    <div class="handout-image-wrapper">
                        <img src="${src}" alt="${escape(title)}" class="handout-img" onerror="this.src=''; this.alt='Не удалось загрузить изображение';" />
                        ${desc ? `<div class="handout-caption">${escape(desc)}</div>` : ''}
                    </div>
                `;
            } else if (type === 'video' || type === 'видео') {
                const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                if (ytMatch) {
                    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&enablejsapi=1`;
                    contentHtml = `
                        <div class="handout-video-wrapper">
                            <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="handout-iframe"></iframe>
                            ${desc ? `<div class="handout-caption">${escape(desc)}</div>` : ''}
                        </div>
                    `;
                } else {
                    const src = model ? model.resolveMediaUrl(url) : url;
                    contentHtml = `
                        <div class="handout-video-wrapper">
                            <video src="${src}" controls autoplay loop class="handout-video"></video>
                            ${desc ? `<div class="handout-caption">${escape(desc)}</div>` : ''}
                        </div>
                    `;
                }
            } else {
                // Parchment Manuscript / Text Note
                const manuscriptHtml = model ? model.formatManuscriptText(desc || url) : `<p>${escape(desc || url)}</p>`;
                contentHtml = `
                    <div class="handout-parchment-scroll">
                        <div class="parchment-inner">
                            <div class="parchment-seal">~ ~ ~</div>
                            <div class="parchment-body">${manuscriptHtml}</div>
                        </div>
                    </div>
                `;
            }

            const clues = window.TBState?.get('cluesArchive') || [];
            const existingClue = clues.find(c => c.id === handout.id || (c.url && c.url === handout.url) || (c.title === handout.title && c.content === handout.content));
            const isAlreadyInClues = !!existingClue;
            const clueIdToDelete = existingClue ? existingClue.id : handout.id;
            const typeLabel = model ? model.getTypeLabel(type) : type;

            this.overlay.innerHTML = `
                <div class="cinema-backdrop"></div>
                <div class="cinema-dialog">
                    <div class="cinema-header">
                        <div class="cinema-badge-box">
                            <span class="cinema-badge ${type}">${typeLabel}</span>
                            <span class="cinema-title">${escape(title)}</span>
                        </div>
                        <div class="cinema-header-actions">
                            ${isAlreadyInClues ? `
                                <button id="btnDeleteFromClues" class="btn-cinema-action danger" title="Удалить эту улику из личного архива">
                                    Удалить из архива
                                </button>
                            ` : `
                                <button id="btnSaveToClues" class="btn-cinema-action" title="Сохранить в личный архив улик">
                                    В архив улик
                                </button>
                            `}
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
                    window.TBState?.addClue(handout);
                    btnSaveClues.textContent = 'Сохранено в улики';
                    btnSaveClues.classList.add('saved');
                    setTimeout(() => {
                        btnSaveClues.textContent = 'В архив улик';
                        btnSaveClues.classList.remove('saved');
                    }, 2000);
                });
            }

            const btnDeleteClue = this.overlay.querySelector('#btnDeleteFromClues');
            if (btnDeleteClue) {
                btnDeleteClue.addEventListener('click', () => {
                    window.TBState?.removeClue(clueIdToDelete);
                    this.hide();
                    if (window.TBFeatureArchiveClues) {
                        window.TBFeatureArchiveClues.renderArchive('playerCluesBox');
                    }
                });
            }
        }

        /**
         * Silences, freezes and detaches all active video/audio/iframes
         */
        stopAllMedia() {
            if (!this.overlay) return;

            // 1. Immediately pause and unload HTML5 video tags
            this.overlay.querySelectorAll('video').forEach(video => {
                try {
                    video.pause();
                    video.currentTime = 0;
                    video.removeAttribute('src');
                    video.load();
                } catch (_) {}
            });

            // 2. Immediately pause and unload HTML5 audio tags
            this.overlay.querySelectorAll('audio').forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.removeAttribute('src');
                    audio.load();
                } catch (_) {}
            });

            // 3. Command YouTube / external iframes to stop playback and blank src
            this.overlay.querySelectorAll('iframe').forEach(iframe => {
                try {
                    iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    iframe.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                } catch (_) {}
                try {
                    iframe.src = 'about:blank';
                } catch (_) {}
            });
        }

        hide() {
            if (this.overlay) {
                // Instantly silence all audio and pause media
                this.stopAllMedia();

                this.overlay.classList.remove('visible');
                setTimeout(() => {
                    if (this.overlay) {
                        this.overlay.style.display = 'none';
                        this.overlay.innerHTML = '';
                    }
                }, 200);
            }
        }

        // Backward compatibility method
        renderCluesArchive(containerId) {
            if (window.TBFeatureArchiveClues) {
                window.TBFeatureArchiveClues.renderArchive(containerId);
            }
        }
    }

    const instance = new CinemaOverlayWidget();
    window.TBWidgetCinemaOverlay = instance;
    // Backward compatibility with legacy component
    window.TBMediaHandout = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.cinemaOverlay = instance;
})();
