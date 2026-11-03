// --- TaleBridge Tools & Table Controller (Background Technical Utilities) ---

(function() {
    class ToolsView {
        constructor() {
            this.lastTokenId = null;
        }

        init() {
            this.selectedTokenName = document.getElementById('selectedTokenName');
            this.selectedTokenDetails = document.getElementById('selectedTokenDetails');
            this.btnLinkToObsidian = document.getElementById('btnLinkToObsidian');
            this.bookmarkList = document.getElementById('bookmarkList');
            this.bookmarkCount = document.getElementById('bookmarkCount');
            this.headerActiveToken = document.getElementById('headerActiveToken');

            // Header token pill click focuses character
            if (this.headerActiveToken) {
                this.headerActiveToken.onclick = () => {
                    const token = window.TBState.get('activeToken');
                    if (token && window.TBRosterView) {
                        window.TBRosterView.focusCharacter(token.name);
                    }
                };
            }

            // Wire action buttons
            const btnGetSelected = document.getElementById('btnGetSelected');
            if (btnGetSelected) btnGetSelected.onclick = () => this.pollActiveToken(true);

            const btnSyncBookmarks = document.getElementById('btnSyncBookmarks');
            if (btnSyncBookmarks) btnSyncBookmarks.onclick = () => this.syncBookmarks();

            const btnSyncRoster = document.getElementById('btnSyncRoster');
            if (btnSyncRoster) btnSyncRoster.onclick = () => {
                window.TBLogger.log('Синхронизация ростера из Obsidian...', 'out');
                window.TBNetwork.send('GET_CHARACTERS', {});
            };

            const btnSyncScenes = document.getElementById('btnSyncScenes');
            if (btnSyncScenes) btnSyncScenes.onclick = () => {
                window.TBLogger.log('Синхронизация сцен из Obsidian...', 'out');
                window.TBNetwork.send('GET_SCENES', {});
            };

            const btnRollTest = document.getElementById('btnRollTest');
            if (btnRollTest) btnRollTest.onclick = () => {
                window.TBApi.rollDice('1d20+5', 'Тестовая проверка d20+5');
            };

            if (this.btnLinkToObsidian) {
                this.btnLinkToObsidian.onclick = () => this.linkTokenToActiveNote();
            }

            // React to state changes
            window.TBState.on('bookmarks', (bms) => this.renderBookmarks(bms));

            // Start polling tokens every 500ms
            setInterval(() => this.pollActiveToken(false), 500);
        }

        async pollActiveToken(forceNotify = false) {
            const tokens = await window.TBApi.getSelectedCreatures();

            if (tokens === null) {
                if (forceNotify) {
                    window.TBLogger.log(`TaleSpire API подключается...`, 'err');
                }
                return;
            }

            if (tokens.length === 0) {
                if (this.lastTokenId !== null) {
                    this.lastTokenId = null;
                    window.TBState.set('activeToken', null);
                    if (this.selectedTokenName) this.selectedTokenName.textContent = 'Токен не выбран';
                    if (this.selectedTokenDetails) this.selectedTokenDetails.textContent = 'Выделите миниатюру на доске';
                    if (this.btnLinkToObsidian) this.btnLinkToObsidian.style.display = 'none';
                    if (this.headerActiveToken) this.headerActiveToken.style.display = 'none';
                }
                if (forceNotify) {
                    window.TBLogger.log('Миниатюра не выделена. Кликните ЛКМ по существу на столе', 'err');
                }
                return;
            }

            const token = tokens[0];
            if (token.id !== this.lastTokenId || forceNotify) {
                this.lastTokenId = token.id;
                window.TBState.set('activeToken', token);

                const hpText = token.hp ? `${token.hp.current}/${token.hp.max} HP` : 'Без HP';
                if (this.selectedTokenName) this.selectedTokenName.textContent = token.name;
                if (this.selectedTokenDetails) this.selectedTokenDetails.textContent = `ID: ${String(token.id).substring(0, 8)}... | ${hpText}`;
                if (this.btnLinkToObsidian) this.btnLinkToObsidian.style.display = 'block';

                // Update header quick pill (only for GM!)
                if (this.headerActiveToken) {
                    if (window.TBState.get('role') === 'player') {
                        this.headerActiveToken.style.display = 'none';
                    } else {
                        this.headerActiveToken.style.display = 'inline-flex';
                        this.headerActiveToken.innerHTML = `<span>[Токен] ${token.name}</span><b style="color:#a5b4fc">${hpText}</b>`;
                    }
                }

                window.TBLogger.log(`Выбран токен: "${token.name}"`, 'sys');
                window.TBNetwork.send('CREATURE_SELECTED', token);
            }
        }

        async syncBookmarks() {
            window.TBLogger.log('Запрос локаций у TaleSpire...', 'out');
            let bms = await window.TBApi.getBookmarks();

            if (!bms) {
                bms = [
                    { id: 'bm-1', name: 'Тронный Зал' },
                    { id: 'bm-2', name: 'Главные Ворота' },
                    { id: 'bm-3', name: 'Подвал таверны' }
                ];
            }

            window.TBState.set('bookmarks', bms);
            window.TBNetwork.send('BOOKMARKS_LIST', bms);

            if (bms.length > 0) {
                window.TBLogger.log(`Синхронизировано ${bms.length} локаций с доски`, 'sys');
            }
        }

        renderBookmarks(bms) {
            if (!this.bookmarkList) return;
            this.bookmarkList.innerHTML = '';
            const list = bms || [];
            if (this.bookmarkCount) this.bookmarkCount.textContent = list.length;

            if (list.length === 0) {
                this.bookmarkList.innerHTML = '<span class="empty-hint">Закладки не найдены</span>';
                return;
            }

            list.forEach(bm => {
                const chip = document.createElement('div');
                chip.className = 'bookmark-chip';
                chip.textContent = bm.name;
                chip.onclick = () => window.TBApi.gotoBookmark(bm.id, bm.name);
                this.bookmarkList.appendChild(chip);
            });
        }

        linkTokenToActiveNote() {
            const token = window.TBState.get('activeToken');
            if (!token) {
                window.TBLogger.log('Нет активного токена для привязки', 'err');
                return;
            }

            window.TBLogger.log(`Запрос привязки токена "${token.name}" к открытой заметке в Obsidian...`, 'out');
            window.TBNetwork.send('LINK_CREATURE_REQUEST', token);
        }
    }

    window.TBToolsView = new ToolsView();
})();
