const obsidian = require('obsidian');
const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');

// =============================================================================
// SECTION 1: Lightweight Built-in RFC 6455 WebSocket Server
// =============================================================================
class SimpleWebSocketServer extends EventEmitter {
    constructor(port = 30123) {
        super();
        this.port = port;
        this.clients = new Set();
        this.server = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    app: 'TaleBridge Obsidian Host',
                    status: 'online',
                    clients: this.clients.size,
                    time: new Date().toISOString()
                }));
            });

            this.server.on('upgrade', (req, socket) => {
                const key = req.headers['sec-websocket-key'];
                if (!key) {
                    socket.destroy();
                    return;
                }

                const acceptKey = crypto
                    .createHash('sha1')
                    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
                    .digest('base64');

                const headers = [
                    'HTTP/1.1 101 Switching Protocols',
                    'Upgrade: websocket',
                    'Connection: Upgrade',
                    `Sec-WebSocket-Accept: ${acceptKey}`,
                    '\r\n'
                ];

                socket.write(headers.join('\r\n'));

                const client = { socket, id: crypto.randomUUID(), meta: {} };
                this.clients.add(client);
                this.emit('connection', client);

                let buffer = Buffer.alloc(0);

                socket.on('data', (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                    buffer = this._processBuffer(buffer, client);
                });

                socket.on('close', () => {
                    this.clients.delete(client);
                    this.emit('disconnect', client);
                });

                socket.on('error', (err) => {
                    this.clients.delete(client);
                    this.emit('error', err, client);
                });
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                this.emit('listening', this.port);
                resolve(this.port);
            }).on('error', (err) => reject(err));
        });
    }

    stop() {
        return new Promise((resolve) => {
            for (const client of this.clients) {
                try { client.socket.destroy(); } catch (e) {}
            }
            this.clients.clear();
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    broadcast(data) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        const frame = this._encodeFrame(payload);
        for (const client of this.clients) {
            try {
                client.socket.write(frame);
            } catch (e) {
                this.clients.delete(client);
            }
        }
    }

    send(client, data) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        const frame = this._encodeFrame(payload);
        try {
            client.socket.write(frame);
        } catch (e) {
            this.clients.delete(client);
        }
    }

    _encodeFrame(text) {
        const payloadBuf = Buffer.from(text, 'utf8');
        const len = payloadBuf.length;
        let header;

        if (len <= 125) {
            header = Buffer.from([0x81, len]);
        } else if (len <= 65535) {
            header = Buffer.alloc(4);
            header[0] = 0x81;
            header[1] = 126;
            header.writeUInt16BE(len, 2);
        } else {
            header = Buffer.alloc(10);
            header[0] = 0x81;
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(len), 2);
        }

        return Buffer.concat([header, payloadBuf]);
    }

    _processBuffer(buf, client) {
        while (buf.length >= 2) {
            const firstByte = buf[0];
            const secondByte = buf[1];
            const opcode = firstByte & 0x0f;
            const isMasked = (secondByte & 0x80) !== 0;
            let payloadLen = secondByte & 0x7f;
            let offset = 2;

            if (payloadLen === 126) {
                if (buf.length < 4) return buf;
                payloadLen = buf.readUInt16BE(2);
                offset = 4;
            } else if (payloadLen === 127) {
                if (buf.length < 10) return buf;
                payloadLen = Number(buf.readBigUInt64BE(2));
                offset = 10;
            }

            let mask = null;
            if (isMasked) {
                if (buf.length < offset + 4) return buf;
                mask = buf.slice(offset, offset + 4);
                offset += 4;
            }

            if (buf.length < offset + payloadLen) {
                return buf;
            }

            const rawData = buf.slice(offset, offset + payloadLen);
            buf = buf.slice(offset + payloadLen);

            if (isMasked && mask) {
                for (let i = 0; i < rawData.length; i++) {
                    rawData[i] ^= mask[i % 4];
                }
            }

            if (opcode === 1) {
                const text = rawData.toString('utf8');
                this.emit('message', text, client);
            } else if (opcode === 8) {
                client.socket.end();
                this.clients.delete(client);
                this.emit('disconnect', client);
            } else if (opcode === 9) {
                const pong = Buffer.alloc(2);
                pong[0] = 0x8a;
                pong[1] = 0x00;
                client.socket.write(pong);
            }
        }
        return buf;
    }
}

// =============================================================================
// SECTION 2: Vault Scanner (Characters, Bestiary & Scenes)
// =============================================================================
async function scanCharacters(vault, metadataCache) {
    const files = vault.getMarkdownFiles();
    const roster = [];

    for (const file of files) {
        const cache = metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) continue;

        const fm = cache.frontmatter;
        const tags = fm.tags ? (Array.isArray(fm.tags) ? fm.tags : [fm.tags]) : [];

        const isNpc = tags.some(t => String(t).match(/npc|бестиарий|персонажи|игрок|боссфайт/i)) || fm.hp || fm.ac;

        if (isNpc) {
            let attacks = [];
            try {
                const content = await vault.read(file);
                const regex = /```dnd-action\s*([\s\S]*?)```/g;
                let m;
                while ((m = regex.exec(content)) !== null) {
                    const block = m[1];
                    const aName = block.match(/name:\s*(.*)/i)?.[1]?.trim() || 'Атака';
                    const aHit = block.match(/hit:\s*(.*)/i)?.[1]?.trim() || '';
                    const aDmg = block.match(/dmg:\s*(.*)/i)?.[1]?.trim() || '';
                    const aType = block.match(/type:\s*(.*)/i)?.[1]?.trim() || '';
                    const aDesc = block.match(/desc:\s*(.*)/i)?.[1]?.trim() || '';
                    attacks.push({ name: aName, hit: aHit, dmg: aDmg, type: aType, desc: aDesc });
                }
            } catch (e) {
                console.error(`TaleBridge: Ошибка парсинга атак для ${file.path}:`, e);
            }

            let category = 'NPC';
            if (tags.some(t => String(t).match(/бестиарий|боссфайт|конструкт|стража/i))) {
                category = 'Бестиарий';
            } else if (tags.some(t => String(t).match(/игрок/i))) {
                category = 'Игроки';
            } else if (tags.some(t => String(t).match(/союзник/i))) {
                category = 'Союзники';
            } else if (tags.some(t => String(t).match(/антагонист|босс/i))) {
                category = 'Враги';
            }

            roster.push({
                name: file.basename,
                path: file.path,
                category: category,
                hp: fm.hp || '-',
                ac: fm.ac || '-',
                speed: fm.speed || '-',
                race: fm.race || '',
                class: fm.class || '',
                status: fm.status || '',
                talespire_id: fm.talespire_id || '',
                talespire_name: fm.talespire_name || '',
                attacks: attacks
            });
        }
    }

    roster.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return roster;
}

async function scanScenes(vault, metadataCache) {
    const files = vault.getMarkdownFiles().sort((a, b) => 
        a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' })
    );
    const scenes = [];

    for (const file of files) {
        // Strictly exclude templates and template folders
        const lowerPath = file.path.toLowerCase();
        const lowerName = file.basename.toLowerCase();
        if (lowerPath.includes('tamplates') || lowerPath.includes('templates') || lowerName.includes('шаблон')) {
            continue;
        }
        if (lowerName.startsWith('00_') || lowerName.includes('план') || lowerName.startsWith('_архив')) {
            continue;
        }

        const cache = metadataCache.getFileCache(file);
        const tags = cache?.frontmatter?.tags 
            ? (Array.isArray(cache.frontmatter.tags) ? cache.frontmatter.tags : [cache.frontmatter.tags]) 
            : [];
        
        const isSceneFile = tags.some(t => String(t).match(/сцены|сюжет/i)) || file.basename.match(/сцены|сюжет/i);
        if (!isSceneFile) continue;

        const session = cache?.frontmatter?.session || 
            (file.parent && !['lor', 'dnd', 'tamplates', 'templates', 'сессии'].includes(file.parent.name.toLowerCase()) ? file.parent.name : 'Сессия 01 - Побег из Зоны 86');

        try {
            const content = await vault.read(file);
            
            // Determine whether file is multi-scene or single-scene
            const hasMultipleScenes = /(?=^##\s+(?:Сцена|\d+|🎬))/gmi.test(content);
            
            let rawSections = [];
            if (hasMultipleScenes) {
                rawSections = content.split(/(?=^##\s+(?:Сцена|\d+|🎬))/gmi);
            } else {
                rawSections = ['', content];
            }

            for (let i = 1; i < rawSections.length; i++) {
                const sec = rawSections[i];
                let title = '';
                let body = '';

                if (hasMultipleScenes) {
                    const titleMatch = sec.match(/^##\s+(.*)/m);
                    title = titleMatch ? titleMatch[1].trim() : `Сцена ${scenes.length + 1}`;
                    body = sec.replace(/^##\s+.*(?:\r?\n|$)/m, '').trim();
                } else {
                    const h1Match = sec.match(/^#\s+(?:🎬\s*)?(.*)/m);
                    title = h1Match ? h1Match[1].trim() : file.basename;
                    body = sec.replace(/^#\s+.*(?:\r?\n|$)/m, '').trim();
                }

                // Extract Goal & Sensory
                const goalMatch = body.match(/\*\*(?:🎯\s*)?(?:Главная\s+)?цель(?:\s*сцены)?:\*\*\s*(.*)/i);
                const goal = goalMatch ? goalMatch[1].trim() : '';

                const sensoryMatch = body.match(/\*\*(?:👁️\s*)?Сенсорика(?:\s*палитра)?:\*\*\s*(.*)/i);
                const sensory = sensoryMatch ? sensoryMatch[1].trim() : '';

                const locMatch = body.match(/\*\*Локация:\*\*\s*(.*)/i);
                const location = locMatch ? locMatch[1].trim() : '';

                // Lookahead pattern to terminate callouts before next callout, hr or heading
                const calloutEnd = '(?=\\n\\s*>\\s*\\[!|\\n\\s*---\\s*|\\n\\s*##|\\n\\n\\s*[^>\\s]|$)';

                // Extract Read-Aloud block (> [!quote] Зачитать игрокам ...)
                let readAloud = '';
                const quoteRegex = new RegExp(`>\\s*\\[!quote\\][^\\n]*\\n([\\s\\S]*?)${calloutEnd}`, 'i');
                const quoteMatch = body.match(quoteRegex);
                if (quoteMatch) {
                    readAloud = quoteMatch[1].replace(/^>\s?/gm, '').trim();
                }

                // Extract Personas (> [!persona] ...)
                const personas = [];
                const personaRegex = new RegExp(`>\\s*\\[!persona\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`, 'gi');
                let pm;
                while ((pm = personaRegex.exec(body)) !== null) {
                    const pTitle = pm[1].trim() || 'Отыгрыш';
                    const pBody = pm[2].replace(/^>\s?/gm, '').trim();
                    personas.push({ title: pTitle, body: pBody });
                }

                // Extract Clues & Checks (> [!tip] ...)
                const clues = [];
                const tipRegex = new RegExp(`>\\s*\\[!tip\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`, 'i');
                const tipMatch = body.match(tipRegex);
                if (tipMatch) {
                    const tipBody = tipMatch[2].replace(/^>\s?/gm, '').trim();
                    const lines = tipBody.split('\n').filter(l => l.trim().length > 0);
                    lines.forEach(l => clues.push(l.trim().replace(/^[-*]\s*/, '')));
                }

                // Extract Story Vectors & Branches (> [!todo] ...)
                const branches = [];
                let nudge = '';
                const todoRegex = new RegExp(`>\\s*\\[!todo\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`, 'i');
                const todoMatch = body.match(todoRegex);
                if (todoMatch) {
                    const todoBody = todoMatch[2].replace(/\r/g, '').replace(/^>\s?/gm, '').trim();
                    const lines = todoBody.split('\n');
                    for (let j = 0; j < lines.length; j++) {
                        const trimmed = lines[j].trim().replace(/^[-*]\s*/, '').trim();
                        if (/пинок\s*мастера/i.test(trimmed)) {
                            let nText = trimmed.replace(/\*\*.*?\*\*:?\s*/i, '').trim();
                            if (!nText && j + 1 < lines.length) {
                                nText = lines[j + 1].trim();
                                j++;
                            }
                            nudge = nText.replace(/^[*_—]+|[*_—]+$/g, '').trim();
                        } else if (trimmed.length > 0) {
                            branches.push(trimmed);
                        }
                    }
                }

                // Extract dialogue lines
                const dialogues = [];
                const lines = body.split('\n');
                for (const l of lines) {
                    const trimmed = l.trim().replace(/^>\s*/, '').replace(/^[-*]\s*/, '');
                    if (trimmed.startsWith('_—') || trimmed.startsWith('—') || /^[А-ЯЁ][а-яё]+:\s*_?«?[—–-]/.test(trimmed)) {
                        dialogues.push(trimmed.replace(/^_+|_+$/g, '').trim());
                    } else if (trimmed.match(/\*\*(?:Фраза|Реплика|На угрозу|На мирный ответ)[:\s]*\*\*:?\s*(.*)/i)) {
                        const dm = trimmed.match(/\*\*(?:Фраза|Реплика|На угрозу|На мирный ответ)[:\s]*\*\*:?\s*(.*)/i);
                        if (dm && dm[1]) {
                            dialogues.push(dm[1].replace(/^[_«"\s]+|[_»".\s]+$/g, '').trim());
                        }
                    }
                }

                // Extract Cast / Mentioned NPCs ([[Имя|Алиас]])
                const cast = [];
                const castRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
                let cm;
                while ((cm = castRegex.exec(body)) !== null) {
                    const charName = cm[1].trim();
                    if (!cast.includes(charName) && charName !== file.basename && !charName.toLowerCase().startsWith('сцена')) {
                        cast.push(charName);
                    }
                }

                // Extract Master Tactics / Warnings (> [!warning] or > [!danger])
                const mechanics = [];
                const mechRegex = new RegExp(`>\\s*\\[!(warning|danger|caution)\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`, 'gi');
                let mm;
                while ((mm = mechRegex.exec(body)) !== null) {
                    const type = mm[1];
                    const mTitle = mm[2] || 'Механика';
                    const mContent = mm[3].replace(/^>\s?/gm, '').trim();
                    mechanics.push({ type, title: mTitle, content: mContent });
                }

                scenes.push({
                    id: `scene-${scenes.length + 1}`,
                    scene_id: cache?.frontmatter?.scene_id || file.basename,
                    session: session,
                    file: file.basename,
                    path: file.path,
                    title: title,
                    goal: goal,
                    sensory: sensory,
                    location: location,
                    readAloud: readAloud,
                    personas: personas,
                    clues: clues,
                    branches: branches,
                    nudge: nudge,
                    dialogues: dialogues,
                    cast: cast,
                    mechanics: mechanics,
                    raw: body
                });
            }
        } catch (e) {
            console.error(`TaleBridge: Ошибка парсинга сцен из ${file.path}:`, e);
        }
    }

    return scenes;
}

// =============================================================================
// SECTION 3: Modals & Settings UI
// =============================================================================
const DEFAULT_SETTINGS = {
    port: 30123,
    autoOpenCreatureNote: true
};

class BookmarkSuggestModal extends obsidian.FuzzySuggestModal {
    constructor(app, plugin, bookmarks) {
        super(app);
        this.plugin = plugin;
        this.bookmarks = bookmarks;
        this.setPlaceholder('Выберите локацию для перемещения камеры...');
    }

    getItems() {
        return this.bookmarks;
    }

    getItemText(item) {
        return item.name || 'Без названия';
    }

    onChooseItem(item) {
        this.plugin.gotoBookmark(item.id, item.name);
    }
}

class TaleBridgeSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Настройки TaleBridge (Obsidian <-> TaleSpire)' });

        new obsidian.Setting(containerEl)
            .setName('Порт WebSocket сервера')
            .setDesc('Порт для связи с TaleSpire Symbiote (по умолчанию 30123)')
            .addText(text => text
                .setPlaceholder('30123')
                .setValue(String(this.plugin.settings.port))
                .onChange(async (value) => {
                    const port = parseInt(value, 10);
                    if (!isNaN(port) && port > 1024 && port < 65535) {
                        this.plugin.settings.port = port;
                        await this.plugin.saveSettings();
                    }
                }));

        new obsidian.Setting(containerEl)
            .setName('Автоматически открывать заметку существа')
            .setDesc('При выборе токена в TaleSpire искать и открывать карточку NPC в Obsidian')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoOpenCreatureNote)
                .onChange(async (val) => {
                    this.plugin.settings.autoOpenCreatureNote = val;
                    await this.plugin.saveSettings();
                }));
    }
}

// =============================================================================
// SECTION 4: TaleBridge Obsidian Plugin Core
// =============================================================================
class TaleBridgePlugin extends obsidian.Plugin {
    async onload() {
        console.log('Loading TaleBridge plugin...');
        await this.loadSettings();

        this.lastSelectedCreature = null;
        this.currentBookmarks = [];

        // Status bar indicator
        this.statusBarEl = this.addStatusBarItem();
        this.updateStatusBar();

        // Start WebSocket Server
        this.startServer();

        // Register Global Helper for scripts & dev console
        window.TaleBridge = {
            send: (type, payload) => this.send(type, payload),
            rollDice: (formula, name = 'Roll') => this.rollDice(formula, name),
            gotoBookmark: (id, name) => this.gotoBookmark(id, name),
            scanAndSendCharacters: () => this.scanAndSendCharacters(),
            ping: () => this.send('PING', { timestamp: Date.now() })
        };

        // --- Commands ---
        this.addCommand({
            id: 'talebridge-ping',
            name: 'Ping TaleSpire',
            callback: () => {
                if (this.wss && this.wss.clients.size > 0) {
                    this.send('PING', { timestamp: Date.now() });
                    new obsidian.Notice('TaleBridge: Ping отправлен');
                } else {
                    new obsidian.Notice('TaleBridge: Нет связи с TaleSpire');
                }
            }
        });

        this.addCommand({
            id: 'talebridge-sync-roster',
            name: 'Синхронизировать персонажей и бестиарий с TaleSpire',
            callback: async () => {
                await this.scanAndSendCharacters();
                new obsidian.Notice('TaleBridge: Ростер персонажей отправлен в TaleSpire');
            }
        });

        this.addCommand({
            id: 'talebridge-sync-scenes',
            name: 'Синхронизировать сцены сюжета с TaleSpire',
            callback: async () => {
                await this.scanAndSendScenes();
                new obsidian.Notice('TaleBridge: Сцены сюжета отправлены в TaleSpire');
            }
        });

        this.addCommand({
            id: 'talebridge-roll-d20',
            name: 'Бросить 1d20 в TaleSpire',
            callback: () => {
                this.rollDice('1d20', 'Проверка d20');
            }
        });

        this.addCommand({
            id: 'talebridge-link-active-creature',
            name: 'Привязать выбранный токен к текущей заметке',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new obsidian.Notice('TaleBridge: Нет открытой заметки для привязки');
                    return;
                }
                if (!this.lastSelectedCreature || !this.lastSelectedCreature.id) {
                    new obsidian.Notice('TaleBridge: Сначала выберите фигурку в TaleSpire');
                    return;
                }

                await this.linkCreatureToNote(activeFile, this.lastSelectedCreature);
            }
        });

        this.addCommand({
            id: 'talebridge-goto-bookmark',
            name: 'Навести камеру на локацию TaleSpire (Закладки)',
            callback: () => {
                if (this.currentBookmarks.length === 0) {
                    this.send('GET_BOOKMARKS', {});
                    new obsidian.Notice('TaleBridge: Запрос закладок из TaleSpire...');
                    setTimeout(() => {
                        if (this.currentBookmarks.length > 0) {
                            new BookmarkSuggestModal(this.app, this, this.currentBookmarks).open();
                        } else {
                            new obsidian.Notice('TaleBridge: Закладки не найдены на доске TaleSpire');
                        }
                    }, 400);
                    return;
                }
                new BookmarkSuggestModal(this.app, this, this.currentBookmarks).open();
            }
        });

        // Register custom markdown code block processor ```dnd-action
        this.registerMarkdownCodeBlockProcessor('dnd-action', (source, el, ctx) => {
            const rows = source.split('\n');
            const data = {};
            for (const r of rows) {
                const idx = r.indexOf(':');
                if (idx !== -1) {
                    const k = r.slice(0, idx).trim().toLowerCase();
                    const v = r.slice(idx + 1).trim();
                    data[k] = v;
                }
            }

            const card = el.createEl('div', { cls: 'talebridge-action-card' });
            const header = card.createEl('div', { cls: 'talebridge-action-header' });
            header.createEl('strong', { text: data.name || 'Действие' });

            const meta = card.createEl('div', { cls: 'talebridge-action-meta' });
            if (data.hit) meta.createEl('span', { text: `Попадание: ${data.hit} | ` });
            if (data.dmg) meta.createEl('span', { text: `Урон: ${data.dmg} ` });
            if (data.type) meta.createEl('span', { text: `(${data.type})` });

            if (data.desc) {
                card.createEl('div', { cls: 'talebridge-action-desc', text: data.desc });
            }

            const btnRow = card.createEl('div', { cls: 'talebridge-action-buttons' });
            if (data.hit) {
                const btnHit = btnRow.createEl('button', { text: `Бросок атаки (${data.hit})` });
                btnHit.onclick = () => {
                    const bonus = data.hit.startsWith('+') || data.hit.startsWith('-') ? data.hit : `+${data.hit}`;
                    this.rollDice(`1d20${bonus}`, `${data.name || 'Атака'} (Попадание)`);
                };
            }
            if (data.dmg) {
                const btnDmg = btnRow.createEl('button', { text: `Бросок урона (${data.dmg})` });
                btnDmg.onclick = () => {
                    this.rollDice(data.dmg, `${data.name || 'Атака'} (Урон)`);
                };
            }
        });

        // Settings tab
        this.addSettingTab(new TaleBridgeSettingTab(this.app, this));
    }

    async onunload() {
        console.log('Unloading TaleBridge plugin...');
        await this.stopServer();
        if (window.TaleBridge) {
            delete window.TaleBridge;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    updateStatusBar() {
        if (!this.statusBarEl) return;
        const count = this.wss ? this.wss.clients.size : 0;
        if (count > 0) {
            this.statusBarEl.setText(`TaleBridge: Онлайн (${count})`);
            this.statusBarEl.title = `TaleSpire подключен (клиентов: ${count})`;
        } else {
            this.statusBarEl.setText('TaleBridge: Ожидание TS...');
            this.statusBarEl.title = `Сервер запущен на порту ${this.settings.port}. Ожидание подключения TaleSpire Symbiote.`;
        }
    }

    // --- WebSocket Server Lifecycle ---
    async startServer() {
        try {
            this.wss = new SimpleWebSocketServer(this.settings.port);

            this.wss.on('listening', (port) => {
                console.log(`TaleBridge WS Server запущен на порту ${port}`);
                this.updateStatusBar();
            });

            this.wss.on('connection', async (client) => {
                console.log('TaleBridge: Новое подключение от TaleSpire Symbiote');
                this.updateStatusBar();
                new obsidian.Notice('TaleSpire подключен к TaleBridge');
                this.wss.send(client, {
                    type: 'HANDSHAKE_ACK',
                    payload: { vault: this.app.vault.getName(), version: '0.5.0' }
                });
                this.send('GET_BOOKMARKS', {});
                await this.scanAndSendCharacters();
                await this.scanAndSendScenes();
            });

            this.wss.on('disconnect', (client) => {
                console.log('TaleBridge: Symbiote отключился');
                this.updateStatusBar();
            });

            this.wss.on('message', (message, client) => {
                this.handleIncomingMessage(message, client);
            });

            this.wss.on('error', (err) => {
                console.error('TaleBridge WS Error:', err);
            });

            await this.wss.start();
        } catch (err) {
            console.error('TaleBridge: Ошибка запуска сервера:', err);
            new obsidian.Notice(`TaleBridge: Ошибка запуска порта ${this.settings.port}`);
            this.updateStatusBar();
        }
    }

    async stopServer() {
        if (this.wss) {
            await this.wss.stop();
            this.wss = null;
            this.updateStatusBar();
        }
    }

    send(type, payload = {}) {
        if (!this.wss) return;
        this.wss.broadcast({ type, payload });
    }

    rollDice(formula, name = 'Roll') {
        if (!this.wss || this.wss.clients.size === 0) {
            new obsidian.Notice('TaleBridge: TaleSpire не подключен');
            return;
        }
        this.send('ROLL_DICE', { formula, name });
        new obsidian.Notice(`Бросок в TaleSpire: ${formula} (${name})`);
    }

    gotoBookmark(id, name) {
        if (!this.wss || this.wss.clients.size === 0) {
            new obsidian.Notice('TaleBridge: TaleSpire не подключен');
            return;
        }
        this.send('GOTO_BOOKMARK', { id, name });
        new obsidian.Notice(`Камера направлена: ${name || id}`);
    }

    // --- Scan Vault for Characters and Monsters ---
    async scanAndSendCharacters() {
        const roster = await scanCharacters(this.app.vault, this.app.metadataCache);
        this.send('CHARACTERS_LIST', roster);
        return roster;
    }

    // --- Scan Vault for Story Scenes & Read-Aloud Blocks ---
    async scanAndSendScenes() {
        const scenes = await scanScenes(this.app.vault, this.app.metadataCache);
        this.send('SCENES_LIST', scenes);
        return scenes;
    }

    async handleGetNote(payload, client) {
        if (!payload) return;
        let file = null;
        if (payload.path) {
            file = this.app.vault.getAbstractFileByPath(payload.path);
        }
        if (!file && payload.name) {
            const clean = payload.name.replace(/\.md$/, '').toLowerCase().trim();
            file = this.app.vault.getMarkdownFiles().find(f => f.basename.toLowerCase().trim() === clean);
        }

        if (file && file instanceof obsidian.TFile) {
            const content = await this.app.vault.read(file);
            const cache = this.app.metadataCache.getFileCache(file);
            this.wss.send(client, {
                type: 'NOTE_CONTENT',
                payload: {
                    name: file.basename,
                    path: file.path,
                    content: content,
                    frontmatter: cache?.frontmatter || {}
                }
            });
        }
    }

    async handleOpenInObsidian(payload) {
        if (!payload) return;
        let file = null;
        if (payload.path) {
            file = this.app.vault.getAbstractFileByPath(payload.path);
        }
        if (!file && payload.name) {
            const clean = payload.name.replace(/\.md$/, '').toLowerCase().trim();
            file = this.app.vault.getMarkdownFiles().find(f => f.basename.toLowerCase().trim() === clean);
        }

        if (file && file instanceof obsidian.TFile) {
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);
            new obsidian.Notice(`Открыта заметка: ${file.basename}`);
        } else {
            new obsidian.Notice(`Заметка не найдена: ${payload.name || payload.path}`);
        }
    }

    async handleIncomingMessage(rawMessage, client) {
        let parsed;
        try {
            parsed = JSON.parse(rawMessage);
        } catch (e) {
            console.error('TaleBridge: Ошибка парсинга JSON:', e);
            return;
        }

        const { type, payload } = parsed;

        switch (type) {
            case 'HANDSHAKE':
                this.wss.send(client, {
                    type: 'HANDSHAKE_ACK',
                    payload: { vault: this.app.vault.getName(), version: '0.5.0' }
                });
                break;

            case 'GET_ROSTER':
                await this.scanAndSendCharacters();
                break;

            case 'GET_SCENES':
                await this.scanAndSendScenes();
                break;

            case 'GET_NOTE':
                await this.handleGetNote(payload, client);
                break;

            case 'OPEN_IN_OBSIDIAN':
                await this.handleOpenInObsidian(payload);
                break;

            case 'BOOKMARKS_LIST':
                if (Array.isArray(payload)) {
                    this.currentBookmarks = payload;
                }
                break;

            case 'CREATURE_SELECTED':
                this.lastSelectedCreature = payload;
                if (this.settings.autoOpenCreatureNote && payload && payload.name) {
                    await this.tryOpenCreatureNote(payload);
                }
                break;

            case 'LINK_CREATURE_TO_NOTE':
                if (payload && payload.creature) {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.linkCreatureToNote(activeFile, payload.creature);
                    }
                }
                break;

            case 'PING':
                this.wss.send(client, { type: 'PONG', payload: { time: Date.now() } });
                break;

            default:
                break;
        }
    }

    async tryOpenCreatureNote(creature) {
        const files = this.app.vault.getMarkdownFiles();
        const targetId = creature.id;
        const targetName = (creature.name || '').toLowerCase().trim();

        // 1. Match by frontmatter talespire_id
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.talespire_id && cache.frontmatter.talespire_id === targetId) {
                await this.openFileInLeaf(file);
                return;
            }
        }

        // 2. Match by exact or partial name
        for (const file of files) {
            const base = file.basename.toLowerCase().trim();
            if (base === targetName || targetName.includes(base) || base.includes(targetName)) {
                await this.openFileInLeaf(file);
                return;
            }
        }
    }

    async openFileInLeaf(file) {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
            return;
        }
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
        new obsidian.Notice(`TaleBridge: Фокус на [${file.basename}]`);
    }

    async linkCreatureToNote(file, creature) {
        try {
            await this.app.fileManager.processFrontMatter(file, (fm) => {
                fm.talespire_id = creature.id;
                fm.talespire_name = creature.name;
                if (!fm.hp && creature.hpMax) fm.hp = creature.hpMax;
            });
            new obsidian.Notice(`Привязано к TaleSpire: ${creature.name} -> ${file.basename}`);
            await this.scanAndSendCharacters();
        } catch (err) {
            console.error('TaleBridge: Ошибка записи frontmatter:', err);
            new obsidian.Notice('TaleBridge: Ошибка привязки токена');
        }
    }
}

module.exports = TaleBridgePlugin;
