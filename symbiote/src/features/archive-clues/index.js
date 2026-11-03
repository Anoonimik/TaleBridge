// --- FSD: Features Layer - Archive Clues Feature ---

(function() {
    class ArchiveCluesFeature {
        /**
         * Renders player's clues archive grid inside container
         * @param {string} containerId 
         */
        renderArchive(containerId = 'playerCluesBox') {
            const container = document.getElementById(containerId);
            if (!container) return;

            const clues = window.TBState?.get('cluesArchive') || [];

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
                        : clues.map(clue => window.TBClueCard?.render(clue) || '').join('')
                    }
                </div>
            `;

            // Bind Clue Card interactions
            container.querySelectorAll('.btn-view-clue').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const clue = clues.find(c => c.id === id);
                    if (clue) {
                        if (window.TBMediaHandout) window.TBMediaHandout.show(clue);
                        else if (window.TBWidgets?.cinemaOverlay) window.TBWidgets.cinemaOverlay.show(clue);
                    }
                });
            });

            // 2-Step Inline Delete (Shift+Click or click -> "Удалить?" with 3.5s timeout)
            container.querySelectorAll('.btn-delete-clue').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    if (!id) return;

                    if (e.shiftKey || btn.dataset.primed === 'true') {
                        if (btn._resetTimer) clearTimeout(btn._resetTimer);
                        window.TBState?.removeClue(id);
                        this.renderArchive(containerId);
                        return;
                    }

                    // Reset any previously primed buttons
                    container.querySelectorAll('.btn-delete-clue[data-primed="true"]').forEach(other => {
                        if (other._resetTimer) clearTimeout(other._resetTimer);
                        other.dataset.primed = 'false';
                        other.classList.remove('confirm-delete');
                        other.textContent = '✕';
                        other.title = 'Удалить';
                    });

                    btn.dataset.primed = 'true';
                    btn.classList.add('confirm-delete');
                    btn.textContent = 'Удалить?';
                    btn.title = 'Нажмите ещё раз для подтверждения';

                    btn._resetTimer = setTimeout(() => {
                        btn.dataset.primed = 'false';
                        btn.classList.remove('confirm-delete');
                        btn.textContent = '✕';
                        btn.title = 'Удалить';
                    }, 3500);
                });
            });
        }
    }

    const instance = new ArchiveCluesFeature();
    window.TBFeatureArchiveClues = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.archiveClues = instance;
})();
