// --- FSD: Shared Layer - TaleSpire Engine API Driver ---

(function() {
    class TaleSpireDriver {
        constructor() {
            this.isInitialized = false;
            this.pendingRollResolvers = new Map();
            this.latestPendingRoll = null;
        }

        isReady() {
            return typeof window.TS !== 'undefined' && window.TS !== null;
        }

        cleanFormula(rawFormula) {
            if (!rawFormula) return '1d20';
            const str = String(rawFormula).trim();
            const match = str.match(/\b\d*d\d+(?:\s*[+-]\s*\d+)?\b/i);
            if (match) {
                return match[0].replace(/\s+/g, '');
            }
            if (/^[+-]\s*\d+$/.test(str)) {
                return `1d20${str.replace(/\s+/g, '')}`;
            }
            return str;
        }

        parseRollResults(rollResults) {
            if (!rollResults) return null;

            if (typeof rollResults.total === 'number') return rollResults.total;
            if (typeof rollResults.value === 'number') return rollResults.value;

            if (Array.isArray(rollResults.results) && rollResults.results.length > 0) {
                return rollResults.results.reduce((sum, r) => {
                    const v = typeof r === 'number' ? r : (r && typeof r.value === 'number' ? r.value : 0);
                    return sum + v;
                }, 0);
            }

            const groups = rollResults.resultsGroups || rollResults.resultsGroup;
            if (Array.isArray(groups) && groups.length > 0) {
                let sum = 0;
                let foundAny = false;
                for (const g of groups) {
                    if (typeof g.total === 'number') {
                        sum += g.total;
                        foundAny = true;
                    } else if (typeof g.value === 'number') {
                        sum += g.value;
                        foundAny = true;
                    } else if (Array.isArray(g.results)) {
                        for (const r of g.results) {
                            const v = typeof r === 'number' ? r : (r && typeof r.value === 'number' ? r.value : 0);
                            sum += v;
                            foundAny = true;
                        }
                    } else if (Array.isArray(g.operands)) {
                        for (const op of g.operands) {
                            const v = typeof op === 'number' ? op : (op && typeof op.value === 'number' ? op.value : 0);
                            sum += v;
                            foundAny = true;
                        }
                    }
                }
                if (foundAny) return sum;
            }

            return null;
        }

        async rollDice(formula, name = 'Бросок', isGmOnly = null) {
            const clean = this.cleanFormula(formula);

            // Determine visibility:
            // - If explicitly passed as boolean, use it.
            // - Otherwise, based on role: 'player' -> false (open roll), 'gm' -> true (hidden GM roll).
            let isSecret = true;
            if (typeof isGmOnly === 'boolean') {
                isSecret = isGmOnly;
            } else {
                const currentRole = window.TBState?.get('role') || 'gm';
                isSecret = (currentRole !== 'player');
            }

            const trayLabel = isSecret ? 'GM-лоток (скрытый)' : 'общий лоток (открытый)';
            window.TBLogger?.log(`Запуск кубов [${trayLabel}]: ${clean} (${name})`, 'out');

            if (!this.isReady() || !window.TS.dice || !window.TS.dice.putDiceInTray) {
                window.TBLogger?.log(`Запрос броска в TaleSpire через Obsidian: ${clean}`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_ROLL', { formula: clean, name, isGmOnly: isSecret });
                }
                return;
            }

            try {
                let descriptors = null;

                if (typeof window.TS.dice.makeRollDescriptors === 'function') {
                    descriptors = await window.TS.dice.makeRollDescriptors(clean);
                }

                if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
                    descriptors = [{ name: name, roll: clean }];
                } else {
                    descriptors.forEach(d => {
                        if (name) d.name = name;
                    });
                }

                window.TBLogger?.log(`Бросок отправлен в лоток TaleSpire [${trayLabel}]: ${clean}`, 'sys');
                const rollId = await window.TS.dice.putDiceInTray(descriptors, isSecret);
                return rollId;
            } catch (err) {
                window.TBLogger?.log(`Ошибка TS.dice.putDiceInTray: ${err.message}`, 'err');
                console.error('TaleSpire putDiceInTray error:', err);
            }
        }

        async rollAndWait(formula, name = 'Бросок', isGmOnly = null, timeoutMs = 25000) {
            const clean = this.cleanFormula(formula);

            let isSecret = true;
            if (typeof isGmOnly === 'boolean') {
                isSecret = isGmOnly;
            } else {
                const currentRole = window.TBState?.get('role') || 'gm';
                isSecret = (currentRole !== 'player');
            }

            const trayLabel = isSecret ? 'GM-лоток (скрытый)' : 'общий лоток (открытый)';
            window.TBLogger?.log(`Запуск ожидаемого броска [${trayLabel}]: ${clean} (${name})`, 'out');

            if (!this.isReady() || !window.TS.dice || !window.TS.dice.putDiceInTray) {
                window.TBLogger?.log(`Запрос броска в TaleSpire через Obsidian: ${clean}`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_ROLL', { formula: clean, name, isGmOnly: isSecret });
                }
                // Simulate physical roll delay outside TaleSpire
                await new Promise(res => setTimeout(res, 1800));
                let fallbackVal = Math.floor(Math.random() * 20) + 1;
                const matchD = clean.match(/d(\d+)/i);
                if (matchD) {
                    const sides = parseInt(matchD[1], 10) || 20;
                    fallbackVal = Math.floor(Math.random() * sides) + 1;
                }
                return { total: fallbackVal, simulated: true };
            }

            try {
                let descriptors = null;
                if (typeof window.TS.dice.makeRollDescriptors === 'function') {
                    descriptors = await window.TS.dice.makeRollDescriptors(clean);
                }

                if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
                    descriptors = [{ name: name, roll: clean }];
                } else {
                    descriptors.forEach(d => {
                        if (name) d.name = name;
                    });
                }

                window.TBLogger?.log(`Бросок отправлен в лоток TaleSpire [${trayLabel}]: ${clean}. Ожидание кубика...`, 'sys');
                const rollId = await window.TS.dice.putDiceInTray(descriptors, isSecret);

                return await new Promise((resolve) => {
                    let timer = null;

                    const resolver = (rollResults) => {
                        if (timer) clearTimeout(timer);
                        let total = this.parseRollResults(rollResults);
                        if (total === null || isNaN(total)) {
                            total = Math.floor(Math.random() * 20) + 1;
                        }
                        resolve({ total, rollResults, rollId });
                    };

                    timer = setTimeout(() => {
                        if (rollId && this.pendingRollResolvers.has(String(rollId))) {
                            this.pendingRollResolvers.delete(String(rollId));
                        }
                        if (this.latestPendingRoll === resolver) {
                            this.latestPendingRoll = null;
                        }
                        const fallback = Math.floor(Math.random() * 20) + 1;
                        window.TBLogger?.log(`Таймаут ожидания физического кубика (${timeoutMs}мс). Результат: ${fallback}`, 'sys');
                        resolve({ total: fallback, timeout: true });
                    }, timeoutMs);

                    if (rollId) {
                        this.pendingRollResolvers.set(String(rollId), resolver);
                    }
                    this.latestPendingRoll = resolver;
                });
            } catch (err) {
                window.TBLogger?.log(`Ошибка TS.dice.putDiceInTray: ${err.message}`, 'err');
                console.error('TaleSpire rollAndWait error:', err);
                return { total: Math.floor(Math.random() * 20) + 1, error: err.message };
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
            window.TBLogger?.log(`Камера: поиск «${label}»...`, 'out');

            if (!this.isReady() || !window.TS.bookmarks || !window.TS.bookmarks.gotoBookmark) {
                window.TBLogger?.log(`Запрос камеры в TaleSpire через Obsidian: ${label}`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_GOTO_BOOKMARK', { id, name: label });
                }
                return;
            }

            try {
                let targetId = id;
                let bookmarks = window.TBState.get('bookmarks') || [];

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
                    window.TBLogger?.log(`Камера направлена к «${name || targetId}»`, 'sys');
                } else {
                    window.TBLogger?.log(`Маркер «${label}» не найден на доске. Поставьте Marker Block и назовите его «${label}» (или дважды кликните ПКМ по фигурке в игре)`, 'err');
                }
            } catch (e) {
                window.TBLogger?.log(`Ошибка камеры: ${e.message}`, 'err');
            }
        }

        async sendChatMessage(message, creatureId = null) {
            if (!message) return;
            const cleanText = String(message).trim();
            window.TBLogger?.log(`Отправка в чат: "${cleanText.substring(0, 40)}..."`, 'out');

            if (!this.isReady() || !window.TS.chat || !window.TS.chat.send) {
                window.TBLogger?.log(`Запрос чата через Obsidian Host: ${cleanText.substring(0, 30)}...`, 'out');
                if (window.TBNetwork) {
                    window.TBNetwork.send('REQUEST_CHAT_MESSAGE', { message: cleanText, creatureId });
                }
                return;
            }

            try {
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
                window.TBLogger?.log('Сообщение отправлено в чат TaleSpire', 'sys');
            } catch (err) {
                window.TBLogger?.log(`Ошибка отправки в чат: ${err.message}`, 'err');
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

    const driverInstance = new TaleSpireDriver();
    window.TBApi = driverInstance;
    window.TBShared = window.TBShared || {};
    window.TBShared.talespire = driverInstance;

    // TaleSpire Engine Subscriptions Hooks (global entry points mandated by manifest.json)
    window.onStateChangeEvent = async function(msg) {
        if (msg && msg.kind === 'hasInitialized') {
            window.TBLogger?.log('TaleSpire Engine сообщил: hasInitialized (API готово)', 'sys');
            window.TBState?.set('tsReady', true);

            const bms = await window.TBApi.getBookmarks();
            if (bms) {
                window.TBState?.set('bookmarks', bms);
                if (window.TBNetwork) window.TBNetwork.send('BOOKMARKS_LIST', bms);
            }
        }
    };

    window.handleRollResults = function(rollResults) {
        if (!rollResults) return;

        const total = driverInstance.parseRollResults(rollResults);
        const rollId = rollResults.rollId || rollResults.id;

        let resolver = null;
        if (rollId && driverInstance.pendingRollResolvers.has(String(rollId))) {
            resolver = driverInstance.pendingRollResolvers.get(String(rollId));
            driverInstance.pendingRollResolvers.delete(String(rollId));
        } else if (driverInstance.latestPendingRoll) {
            resolver = driverInstance.latestPendingRoll;
            driverInstance.latestPendingRoll = null;
        }

        if (resolver) {
            try {
                resolver(rollResults);
            } catch (e) {
                console.error('Error invoking roll resolver:', e);
            }
        }

        const displayTotal = total !== null ? total : (rollResults.kind || 'Завершен');
        window.TBLogger?.log(`Кубик в лотке TaleSpire остановился: результат [${displayTotal}]`, 'sys');

        if (window.TBNetwork) {
            window.TBNetwork.send('DICE_RESULT', {
                total: displayTotal,
                name: 'Бросок',
                raw: rollResults
            });
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
