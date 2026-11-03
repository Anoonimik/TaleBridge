// --- FSD: Widgets Layer - Tools Panel Widget ---

(function() {
    class ToolsPanelWidget {
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

            if (this.headerActiveToken) {
                this.headerActiveToken.onclick = () => {
                    const token = window.TBState?.get('activeToken');
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
                window.TBLogger?.log('Синхронизация ростера из Obsidian...', 'out');
                window.TBNetwork?.send('GET_CHARACTERS', {});
            };

            const btnSyncScenes = document.getElementById('btnSyncScenes');
            if (btnSyncScenes) btnSyncScenes.onclick = () => {
                window.TBLogger?.log('Синхронизация сцен из Obsidian...', 'out');
                window.TBNetwork?.send('GET_SCENES', {});
            };

            const btnRollTest = document.getElementById('btnRollTest');
            if (btnRollTest) btnRollTest.onclick = () => {
                window.TBFeatureRollDice?.roll('1d20+5', 'Тестовая проверка d20+5');
            };

            if (this.btnLinkToObsidian) {
                this.btnLinkToObsidian.onclick = () => this.linkTokenToActiveNote();
            }

            // React to state changes
            window.TBState?.on('bookmarks', (bms) => this.renderBookmarks(bms));

            // Start polling tokens every 500ms
            setInterval(() => this.pollActiveToken(false), 500);
        }

        async pollActiveToken(forceNotify = false) {
            const tokens = await window.TBApi?.getSelectedCreatures();

            if (tokens === null) {
                if (forceNotify) {
                    window.TBLogger?.log(`TaleSpire API подключается...`, 'err');
                }
                return;
            }

            if (tokens.length === 0) {
                if (this.lastTokenId !== null) {
                    this.lastTokenId = null;
                    window.TBState?.set('activeToken', null);
                    if (this.selectedTokenName) this.selectedTokenName.textContent = 'Токен не выбран';
                    if (this.selectedTokenDetails) this.selectedTokenDetails.textContent = 'Выделите миниатюру на доске';
                    if (this.btnLinkToObsidian) this.btnLinkToObsidian.style.display = 'none';
                    if (this.headerActiveToken) this.headerActiveToken.style.display = 'none';
                }
                if (forceNotify) {
                    window.TBLogger?.log('Миниатюра не выделена. Кликните ЛКМ по существу на столе', 'err');
                }
                return;
            }

            const token = tokens[0];
            if (token.id !== this.lastTokenId || forceNotify) {
                this.lastTokenId = token.id;
                window.TBState?.set('activeToken', token);

                const hpText = token.hp ? `${token.hp.current}/${token.hp.max} HP` : 'Без HP';
                if (this.selectedTokenName) this.selectedTokenName.textContent = token.name;
                if (this.selectedTokenDetails) this.selectedTokenDetails.textContent = `ID: ${String(token.id).substring(0, 8)}... | ${hpText}`;
                if (this.btnLinkToObsidian) this.btnLinkToObsidian.style.display = 'block';

                // Update header quick pill (only for GM!)
                if (this.headerActiveToken) {
                    if (window.TBState?.get('role') === 'player') {
                        this.headerActiveToken.style.display = 'none';
                    } else {
                        this.headerActiveToken.style.display = 'flex';
                        this.headerActiveToken.textContent = `Токен: ${token.name}`;
                    }
                }

                if (forceNotify) {
                    window.TBLogger?.log(`Опрошен токен: «${token.name}» (${hpText})`, 'sys');
                }
            }
        }

        async syncBookmarks() {
            window.TBLogger?.log('Запрос закладок локаций из TaleSpire...', 'out');
            const bms = await window.TBApi?.getBookmarks();
            if (bms) {
                window.TBState?.set('bookmarks', bms);
                if (window.TBNetwork) {
                    window.TBNetwork.send('BOOKMARKS_LIST', bms);
                }
                window.TBLogger?.log(`Синхронизировано ${bms.length} закладок`, 'sys');
            } else {
                window.TBLogger?.log('Закладки не получены от TaleSpire', 'err');
            }
        }

        renderBookmarks(bms) {
            if (!this.bookmarkList) return;
            this.bookmarkList.innerHTML = '';
            const list = bms || [];
            if (this.bookmarkCount) this.bookmarkCount.textContent = list.length;

            if (list.length === 0) {
                this.bookmarkList.innerHTML = '<span class="empty-hint">Закладок на текущей доске нет</span>';
                return;
            }

            list.forEach(bm => {
                const item = document.createElement('div');
                item.className = 'bookmark-item';

                const name = document.createElement('span');
                name.className = 'bm-name';
                name.textContent = bm.name;

                const btnGo = document.createElement('button');
                btnGo.className = 'btn-bm-go';
                btnGo.textContent = 'Камера';
                btnGo.onclick = () => window.TBApi?.gotoBookmark(bm.id, bm.name);

                item.appendChild(name);
                item.appendChild(btnGo);
                this.bookmarkList.appendChild(item);
            });
        }

        linkTokenToActiveNote() {
            const token = window.TBState?.get('activeToken');
            if (!token) return;
            window.TBLogger?.log(`Запрос привязки токена «${token.name}»...`, 'out');
            window.TBNetwork?.send('LINK_CREATURE_REQUEST', token);
        }
    }

    const instance = new ToolsPanelWidget();
    window.TBWidgetToolsPanel = instance;
    // Backward compatibility with legacy component
    window.TBToolsView = instance;
    window.TBWidgets = window.TBWidgets || {};
    window.TBWidgets.toolsPanel = instance;
})();
