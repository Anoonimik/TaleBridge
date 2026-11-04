// --- FSD: Shared Layer - WebSocket Client (Obsidian Communication) ---

(function() {
    const defaultPort = window.TBConfig?.WS_PORT || 30123;

    class WebSocketClient {
        constructor(port = defaultPort) {
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
                    window.TBLogger?.log('Подключено к Obsidian Host', 'sys');
                    window.TBState?.set('connected', true);

                    const mode = await window.TBApi?.getClientMode();
                    this.send('HANDSHAKE', { clientMode: mode });

                    this.send('GET_CHARACTERS', {});
                    this.send('GET_SCENES', {});
                    this.send('GET_BOOKMARKS', {});
                    this.send('GET_VAULT_IMAGES', {});
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (err) {
                        window.TBLogger?.log(`Ошибка парсинга: ${event.data}`, 'err');
                    }
                };

                this.ws.onclose = () => {
                    window.TBState?.set('connected', false);
                    window.TBLogger?.log('Связь с Obsidian разорвана. Переподключение...', 'sys');
                    this.scheduleReconnect();
                };

                this.ws.onerror = () => {
                    window.TBState?.set('connected', false);
                };
            } catch (e) {
                window.TBState?.set('connected', false);
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
                window.TBLogger?.log(`→ ${type}`, 'out');
            }
        }

        async handleMessage(data) {
            const { type, payload } = data;

            if (type !== 'CHARACTERS_LIST' && type !== 'SCENES_LIST' && type !== 'NOTE_CONTENT' && type !== 'PLAYER_DATA') {
                window.TBLogger?.log(`← ${type}: ${JSON.stringify(payload || {})}`, 'in');
            }

            switch (type) {
                case 'PING':
                    this.send('PONG', { receivedAt: Date.now() });
                    break;

                case 'HANDSHAKE_ACK':
                    window.TBLogger?.log(`Obsidian Vault: "${payload.vault}" на связи`, 'sys');
                    if (payload && payload.gmPin !== undefined) {
                        window.TBState?.set('gmPin', payload.gmPin);
                    }
                    this.send('GET_CURRENT_HANDOUT', {});
                    break;

                case 'CONFIG_UPDATE':
                    if (payload && payload.gmPin !== undefined) {
                        window.TBState?.set('gmPin', payload.gmPin);
                    }
                    break;

                case 'CHARACTERS_LIST': {
                    const list = payload || [];
                    window.TBState?.set('roster', list);
                    window.TBLogger?.log(`Загружено ${list.length} персонажей/существ`, 'sys');

                    const playable = window.TBCharacterModel?.getPlayableCharacters(list) || [];
                    let curChar = window.TBState?.get('playerCharacter');

                    // ONLY select first character if no character has been selected yet
                    if (!curChar && playable.length > 0) {
                        curChar = playable[0].name;
                        window.TBState?.setPlayerCharacter(curChar);
                    }

                    // Request initial player data only if no data has been loaded yet
                    const curData = window.TBState?.get('playerData');
                    if (!curData || !curData.name) {
                        if (curChar) {
                            this.send('GET_PLAYER_DATA', { characterName: curChar });
                        }
                    }
                    break;
                }

                case 'SCENES_LIST':
                    window.TBState?.set('scenes', payload || []);
                    window.TBLogger?.log(`Загружено ${payload?.length || 0} сюжетных сцен`, 'sys');
                    break;

                case 'PLAYER_DATA':
                    if (payload && !payload.error) {
                        window.TBState?.set('playerData', payload);
                    }
                    break;

                case 'INVENTORY_UPDATED':
                    if (payload && payload.characterName === window.TBState?.get('playerCharacter')) {
                        const curData = window.TBState?.get('playerData');
                        if (curData) {
                            curData.inventory = payload.items;
                            window.TBState?.set('playerData', { ...curData });
                        }
                        if (window.TBPlayerInventory) {
                            window.TBPlayerInventory.render(payload.items);
                        } else if (window.TBFeatures?.manageInventory) {
                            window.TBFeatures.manageInventory.render(payload.items);
                        }
                    }
                    break;

                case 'PLAYER_NOTES_UPDATED':
                    if (window.TBPlayerNotes) {
                        window.TBPlayerNotes.onSaved();
                    } else if (window.TBFeatures?.saveNotes) {
                        window.TBFeatures.saveNotes.onSaved();
                    }
                    break;

                case 'CHARACTER_HP_UPDATED':
                    if (payload && payload.characterName) {
                        // 1. Update character in roster cache
                        const roster = window.TBState?.get('roster') || [];
                        const targetChar = roster.find(r => r.name === payload.characterName || (r.name && payload.characterName.includes(r.name)));
                        if (targetChar) {
                            targetChar.hp = payload.hp;
                            if (payload.maxHp) targetChar.hp_max = payload.maxHp;
                        }

                        // 2. If it's the active player character, update HP display smoothly without full re-render
                        const curChar = window.TBState?.get('playerCharacter');
                        const isCurrent = curChar && (
                            payload.characterName === curChar ||
                            payload.characterName.includes(curChar) ||
                            curChar.includes(payload.characterName)
                        );
                        if (isCurrent) {
                            const cur = window.TBState?.get('playerData');
                            if (cur) {
                                cur.hp = payload.hp;
                                if (payload.maxHp) cur.hp_max = payload.maxHp;
                            }
                            if (window.TBPlayerView) {
                                window.TBPlayerView.updateHpDisplay(payload.hp, payload.maxHp || cur?.hp_max);
                            } else if (window.TBFeatures?.applyDamage) {
                                window.TBFeatures.applyDamage.updateHpDisplay(payload.hp, payload.maxHp || cur?.hp_max);
                            }
                        }
                    }
                    break;

                case 'MEDIA_HANDOUT':
                    window.TBState?.set('activeHandout', payload);
                    if (window.TBMediaHandout) {
                        window.TBMediaHandout.show(payload);
                    } else if (window.TBWidgets?.cinemaOverlay) {
                        window.TBWidgets.cinemaOverlay.show(payload);
                    }
                    break;

                case 'DISMISS_HANDOUT':
                    window.TBState?.set('activeHandout', null);
                    if (window.TBMediaHandout) {
                        window.TBMediaHandout.hide();
                    } else if (window.TBWidgets?.cinemaOverlay) {
                        window.TBWidgets.cinemaOverlay.hide();
                    }
                    break;

                case 'VAULT_IMAGES_LIST':
                    window.TBState?.set('vaultImages', payload || []);
                    if (window.TBBroadcastView) {
                        window.TBBroadcastView.updateVaultImages(payload || []);
                    } else if (window.TBFeatures?.broadcastMedia) {
                        window.TBFeatures.broadcastMedia.updateVaultImages(payload || []);
                    }
                    break;

                case 'NOTE_CONTENT':
                    if (window.TBNoteViewer) {
                        window.TBNoteViewer.render(payload);
                    } else if (window.TBWidgets?.noteViewer) {
                        window.TBWidgets.noteViewer.render(payload);
                    }
                    break;

                case 'NOTE_ERROR':
                    window.TBLogger?.log(payload?.message || 'Ошибка загрузки заметки', 'err');
                    break;

                case 'BOOKMARKS_LIST':
                    if (payload && Array.isArray(payload)) {
                        window.TBState?.set('bookmarks', payload);
                    }
                    break;

                case 'ROLL_DICE':
                    await window.TBApi?.rollDice(payload.formula || '1d20', payload.name || 'Бросок', payload.isGmOnly ?? true);
                    break;

                case 'GOTO_BOOKMARK':
                    await window.TBApi?.gotoBookmark(payload.id, payload.name);
                    break;

                case 'CHAT_MESSAGE':
                    await window.TBApi?.sendChatMessage(payload.message, payload.creatureId);
                    break;

                case 'LINK_SUCCESS':
                    window.TBLogger?.log(`Заметка "${payload.noteName}" привязана к токену`, 'sys');
                    break;

                default:
                    window.TBLogger?.log(`Неизвестная команда: ${type}`, 'sys');
            }
        }
    }

    const networkInstance = new WebSocketClient();
    window.TBNetwork = networkInstance;
    window.TBShared = window.TBShared || {};
    window.TBShared.network = networkInstance;
})();
