// --- TaleBridge WebSocket Client (Obsidian Communication) ---

(function() {
    class WebSocketClient {
        constructor(port = 30123) {
            this.port = port;
            this.url = `ws://127.0.0.1:${port}`;
            this.ws = null;
            this.reconnectTimer = null;
        }

        connect() {
            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                return;
            }

            try {
                this.ws = new WebSocket(this.url);

                this.ws.onopen = async () => {
                    window.TBLogger.log('Подключено к Obsidian Host', 'sys');
                    window.TBState.set('connected', true);

                    const mode = await window.TBApi.getClientMode();
                    this.send('HANDSHAKE', { clientMode: mode });

                    this.send('GET_CHARACTERS', {});
                    this.send('GET_SCENES', {});
                    this.send('GET_BOOKMARKS', {});
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (err) {
                        window.TBLogger.log(`Ошибка парсинга: ${event.data}`, 'err');
                    }
                };

                this.ws.onclose = () => {
                    window.TBState.set('connected', false);
                    window.TBLogger.log('Связь с Obsidian разорвана. Переподключение...', 'sys');
                    this.scheduleReconnect();
                };

                this.ws.onerror = () => {
                    window.TBState.set('connected', false);
                };
            } catch (e) {
                window.TBState.set('connected', false);
                this.scheduleReconnect();
            }
        }

        scheduleReconnect() {
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, 2000);
        }

        send(type, payload = {}) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            const message = { type, payload, timestamp: Date.now() };
            this.ws.send(JSON.stringify(message));
            if (type !== 'GET_CHARACTERS' && type !== 'GET_SCENES' && type !== 'GET_BOOKMARKS' && type !== 'GET_NOTE') {
                window.TBLogger.log(`→ ${type}`, 'out');
            }
        }

        async handleMessage(data) {
            const { type, payload } = data;

            if (type !== 'CHARACTERS_LIST' && type !== 'SCENES_LIST' && type !== 'NOTE_CONTENT' && type !== 'PLAYER_DATA') {
                window.TBLogger.log(`← ${type}: ${JSON.stringify(payload || {})}`, 'in');
            }

            switch (type) {
                case 'PING':
                    this.send('PONG', { receivedAt: Date.now() });
                    break;

                case 'HANDSHAKE_ACK':
                    window.TBLogger.log(`Obsidian Vault: "${payload.vault}" на связи`, 'sys');
                    // If player character is configured, request player data immediately
                    const savedChar = window.TBState.get('playerCharacter');
                    if (savedChar) {
                        this.send('GET_PLAYER_DATA', { characterName: savedChar });
                    }
                    this.send('GET_CURRENT_HANDOUT', {});
                    break;

                case 'CHARACTERS_LIST':
                    window.TBState.set('roster', payload || []);
                    window.TBLogger.log(`Загружено ${payload?.length || 0} персонажей/существ`, 'sys');
                    // If player character not yet set, default to first player character
                    if (!window.TBState.get('playerCharacter') && payload && payload.length > 0) {
                        const firstPlayer = payload.find(c => c.category === 'Игроки') || payload[0];
                        if (firstPlayer) {
                            window.TBState.setPlayerCharacter(firstPlayer.name);
                            this.send('GET_PLAYER_DATA', { characterName: firstPlayer.name });
                        }
                    }
                    break;

                case 'SCENES_LIST':
                    window.TBState.set('scenes', payload || []);
                    window.TBLogger.log(`Загружено ${payload?.length || 0} сюжетных сцен`, 'sys');
                    break;

                case 'PLAYER_DATA':
                    if (payload && !payload.error) {
                        window.TBState.set('playerData', payload);
                        if (window.TBPlayerView) {
                            window.TBPlayerView.render(payload);
                        }
                    }
                    break;

                case 'INVENTORY_UPDATED':
                    if (payload && payload.characterName === window.TBState.get('playerCharacter')) {
                        const curData = window.TBState.get('playerData');
                        if (curData) {
                            curData.inventory = payload.items;
                            window.TBState.set('playerData', { ...curData });
                        }
                        if (window.TBPlayerInventory) {
                            window.TBPlayerInventory.render(payload.items);
                        }
                    }
                    break;

                case 'PLAYER_NOTES_UPDATED':
                    if (window.TBPlayerNotes) {
                        window.TBPlayerNotes.onSaved();
                    }
                    break;

                case 'CHARACTER_HP_UPDATED':
                    if (payload && payload.characterName === window.TBState.get('playerCharacter')) {
                        const cur = window.TBState.get('playerData');
                        if (cur) {
                            cur.hp = payload.hp;
                            if (payload.maxHp) cur.hp_max = payload.maxHp;
                            window.TBState.set('playerData', { ...cur });
                        }
                        if (window.TBPlayerView) {
                            window.TBPlayerView.updateHpDisplay(payload.hp, payload.maxHp || cur?.hp_max);
                        }
                    }
                    break;

                case 'MEDIA_HANDOUT':
                    window.TBState.set('activeHandout', payload);
                    if (window.TBMediaHandout) {
                        window.TBMediaHandout.show(payload);
                    }
                    break;

                case 'DISMISS_HANDOUT':
                    window.TBState.set('activeHandout', null);
                    if (window.TBMediaHandout) {
                        window.TBMediaHandout.hide();
                    }
                    break;

                case 'VAULT_IMAGES_LIST':
                    window.TBState.set('vaultImages', payload || []);
                    if (window.TBBroadcastView) {
                        window.TBBroadcastView.updateVaultImages(payload || []);
                    }
                    break;

                case 'NOTE_CONTENT':
                    if (window.TBNoteViewer) {
                        window.TBNoteViewer.render(payload);
                    }
                    break;

                case 'NOTE_ERROR':
                    window.TBLogger.log(payload?.message || 'Ошибка загрузки заметки', 'err');
                    break;

                case 'BOOKMARKS_LIST':
                    if (payload && Array.isArray(payload)) {
                        window.TBState.set('bookmarks', payload);
                    }
                    break;

                case 'ROLL_DICE':
                    await window.TBApi.rollDice(payload.formula || '1d20', payload.name || 'Бросок');
                    break;

                case 'GOTO_BOOKMARK':
                    await window.TBApi.gotoBookmark(payload.id, payload.name);
                    break;

                case 'CHAT_MESSAGE':
                    await window.TBApi.sendChatMessage(payload.message, payload.creatureId);
                    break;

                case 'LINK_SUCCESS':
                    window.TBLogger.log(`Заметка "${payload.noteName}" привязана к токену`, 'sys');
                    break;

                default:
                    window.TBLogger.log(`Неизвестная команда: ${type}`, 'sys');
            }
        }
    }

    window.TBNetwork = new WebSocketClient();
})();
