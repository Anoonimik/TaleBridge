// --- TaleBridge TaleSpire Engine API Wrapper ---

(function() {
    class TaleSpireBridge {
        constructor() {
            this.isInitialized = false;
        }

        isReady() {
            return typeof window.TS !== 'undefined' && window.TS !== null;
        }

        cleanFormula(rawFormula) {
            if (!rawFormula) return '1d20';
            const str = String(rawFormula).trim();
            // Match standard dice: e.g. 1d20, 2d6+3, 1d8-1, d20
            const match = str.match(/\b\d*d\d+(?:\s*[+-]\s*\d+)?\b/i);
            if (match) {
                return match[0].replace(/\s+/g, '');
            }
            // If standalone modifier like +5 or -2 -> convert to 1d20+5
            if (/^[+-]\s*\d+$/.test(str)) {
                return `1d20${str.replace(/\s+/g, '')}`;
            }
            return str;
        }

        async rollDice(formula, name = 'Бросок') {
            const clean = this.cleanFormula(formula);
            window.TBLogger.log(`Запуск кубов: ${clean} (${name})`, 'out');

            if (!this.isReady() || !window.TS.dice || !window.TS.dice.putDiceInTray) {
                window.TBLogger.log(`Запрос броска в TaleSpire через Obsidian: ${clean}`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_ROLL', { formula: clean, name });
                }
                return;
            }

            try {
                let descriptors = null;

                // 1. Convert formula to rollDescriptors using TaleSpire's native parser
                if (typeof window.TS.dice.makeRollDescriptors === 'function') {
                    descriptors = await window.TS.dice.makeRollDescriptors(clean);
                }

                // If makeRollDescriptors returned non-array, fallback to single descriptor
                if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
                    descriptors = [{ name: name, roll: clean }];
                } else {
                    descriptors.forEach(d => {
                        if (name) d.name = name;
                    });
                }

                // 2. Put descriptors directly into TaleSpire's 3D physics tray
                window.TBLogger.log(`Бросок отправлен в лоток TaleSpire: ${clean}`, 'sys');
                await window.TS.dice.putDiceInTray(descriptors, true);
            } catch (err) {
                window.TBLogger.log(`Ошибка TS.dice.putDiceInTray: ${err.message}`, 'err');
                console.error('TaleSpire putDiceInTray error:', err);
            }
        }

        async getSelectedCreatures() {
            if (!this.isReady() || !window.TS.creatures || !window.TS.creatures.getSelectedCreatures) {
                return null;
            }

            try {
                const selected = await window.TS.creatures.getSelectedCreatures();
                if (!selected || selected.length === 0) {
                    return [];
                }

                const firstItem = selected[0];
                const infos = await window.TS.creatures.getMoreInfo([firstItem]);
                const creatureInfo = Array.isArray(infos) ? infos[0] : infos;

                if (!creatureInfo || creatureInfo.cause) {
                    return [];
                }

                const id = creatureInfo.id || (typeof firstItem === 'object' ? firstItem.id : firstItem);
                const name = creatureInfo.name || 'Миниатюра';
                const hp = creatureInfo.hp;
                const position = creatureInfo.position;

                return [{ id, name, hp, position }];
            } catch (e) {
                console.error('getSelectedCreatures error:', e);
                return [];
            }
        }

        async getBookmarks() {
            if (!this.isReady() || !window.TS.bookmarks || !window.TS.bookmarks.getBookmarksInThisBoard) {
                return null;
            }

            try {
                const raw = await window.TS.bookmarks.getBookmarksInThisBoard();
                if (raw && Array.isArray(raw)) {
                    return raw.map(b => ({
                        id: b.id || b,
                        name: b.name || 'Локация'
                    }));
                }
                return [];
            } catch (e) {
                console.error('getBookmarks error:', e);
                return [];
            }
        }

        async gotoBookmark(id, name) {
            const label = name || id || 'Локация';
            window.TBLogger.log(`Камера: поиск «${label}»...`, 'out');

            if (!this.isReady() || !window.TS.bookmarks || !window.TS.bookmarks.gotoBookmark) {
                window.TBLogger.log(`Запрос камеры в TaleSpire через Obsidian: ${label}`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_GOTO_BOOKMARK', { id, name: label });
                }
                return;
            }

            try {
                let targetId = id;
                let bookmarks = window.TBState.get('bookmarks') || [];

                // Refresh live bookmarks from TaleSpire board
                if (bookmarks.length === 0 || !targetId) {
                    const fresh = await this.getBookmarks();
                    if (fresh && fresh.length > 0) {
                        bookmarks = fresh;
                        window.TBState.set('bookmarks', fresh);
                    }
                }

                if (!targetId && name) {
                    const clean = name.toLowerCase().replace(/^(камера|локация|сцена\s*\d+[:.]?)\s*:?\s*/i, '').trim();

                    // 1. Exact match
                    let found = bookmarks.find(b => b.name.toLowerCase() === clean);

                    // 2. Substring match
                    if (!found) {
                        found = bookmarks.find(b => 
                            b.name.toLowerCase().includes(clean) || 
                            clean.includes(b.name.toLowerCase())
                        );
                    }

                    // 3. Match by significant individual words (>3 chars)
                    if (!found) {
                        const words = clean.split(/[\s,«»—\-#.]+/i).filter(w => w.length > 3);
                        found = bookmarks.find(b => words.some(w => b.name.toLowerCase().includes(w)));
                    }

                    if (found) {
                        targetId = found.id;
                        name = found.name;
                    }
                }

                if (targetId) {
                    await window.TS.bookmarks.gotoBookmark(targetId);
                    window.TBLogger.log(`Камера направлена к «${name || targetId}»`, 'sys');
                } else {
                    window.TBLogger.log(`Маркер «${label}» не найден на доске. Поставьте Marker Block и назовите его «${label}» (или дважды кликните ПКМ по фигурке в игре)`, 'err');
                }
            } catch (e) {
                window.TBLogger.log(`Ошибка камеры: ${e.message}`, 'err');
            }
        }

        async sendChatMessage(message, creatureId = null) {
            if (!message) return;
            const cleanText = String(message).trim();
            window.TBLogger.log(`Отправка в чат: "${cleanText.substring(0, 40)}..."`, 'out');

            if (!this.isReady() || !window.TS.chat || !window.TS.chat.send) {
                window.TBLogger.log(`Запрос чата через Obsidian Host: ${cleanText.substring(0, 30)}...`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_CHAT_MESSAGE', { message: cleanText, creatureId });
                }
                return;
            }

            try {
                // TaleSpire chat message limit is 400 chars. Split into chunks if necessary
                const chunks = [];
                for (let i = 0; i < cleanText.length; i += 380) {
                    chunks.push(cleanText.substring(i, i + 380));
                }

                for (const chunk of chunks) {
                    if (creatureId && window.TS.chat.sendAsCreature) {
                        await window.TS.chat.sendAsCreature(chunk, creatureId, "board");
                    } else {
                        await window.TS.chat.send(chunk, "board");
                    }
                }
                window.TBLogger.log('Сообщение отправлено в чат TaleSpire', 'sys');
            } catch (err) {
                window.TBLogger.log(`Ошибка отправки в чат: ${err.message}`, 'err');
                console.error('TaleSpire chat error:', err);
            }
        }

        async getClientMode() {
            if (!this.isReady() || !window.TS.clients || !window.TS.clients.whoAmI) {
                return 'gm';
            }
            try {
                const me = await window.TS.clients.whoAmI();
                const info = await window.TS.clients.getMoreInfo([me.id]);
                return info[0]?.clientMode || 'gm';
            } catch (e) {
                return 'gm';
            }
        }
    }

    window.TBApi = new TaleSpireBridge();

    // TaleSpire Engine Subscriptions Hooks
    window.onStateChangeEvent = async function(msg) {
        if (msg && msg.kind === 'hasInitialized') {
            window.TBLogger.log('TaleSpire Engine сообщил: hasInitialized (API готово)', 'sys');
            window.TBState.set('tsReady', true);

            const bms = await window.TBApi.getBookmarks();
            if (bms) {
                window.TBState.set('bookmarks', bms);
                if (window.TBNetwork) window.TBNetwork.send('BOOKMARKS_LIST', bms);
            }
        }
    };

    window.handleRollResults = function(rollResults) {
        if (rollResults) {
            let total = 0;
            if (rollResults.results && Array.isArray(rollResults.results)) {
                total = rollResults.results.reduce((sum, r) => sum + (r.value || 0), 0);
            }
            if (window.TBNetwork) {
                window.TBNetwork.send('DICE_RESULT', {
                    total: total || rollResults.kind || 'Завершен',
                    name: 'Бросок',
                    raw: rollResults
                });
            }
        }
    };

    window.handleCreatureStateChange = function(event) {
        if (window.TBToolsView) {
            window.TBToolsView.pollActiveToken(false);
        }
    };

    window.handleVisibilityEvent = function(visibility) {
        console.log('Visibility event:', visibility);
    };
})();
