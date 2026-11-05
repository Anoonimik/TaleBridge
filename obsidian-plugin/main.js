const obsidian = require('obsidian');
const http = require('http');
const crypto = require('crypto');
const cp = require('child_process');
const EventEmitter = require('events');

// =============================================================================
// SECTION 1: Lightweight Built-in RFC 6455 WebSocket Server
// =============================================================================
class SimpleWebSocketServer extends EventEmitter {
    constructor(port = 30123, httpHandler = null) {
        super();
        this.port = port;
        this.httpHandler = httpHandler;
        this.clients = new Set();
        this.server = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                if (this.httpHandler) {
                    try {
                        const handled = await this.httpHandler(req, res);
                        if (handled) return;
                    } catch (e) {
                        console.error('TaleBridge HTTP Error:', e);
                    }
                }
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
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

            this.server.listen(this.port, '0.0.0.0', () => {
                this.emit('listening', this.port);
                resolve(this.port);
            }).on('error', (err) => {
                try {
                    this.server.listen(this.port, '127.0.0.1', () => {
                        this.emit('listening', this.port);
                        resolve(this.port);
                    }).on('error', (e) => reject(e));
                } catch (e2) {
                    reject(err);
                }
            });
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
// SECTION 2: Vault Scanner & Character State Engine
// =============================================================================
function parseAbilityScores(content) {
    if (!content) return null;
    const headerRegex = /\|\s*(?:Сила|СИЛ|STR)\s*\|\s*(?:Ловкость|ЛОВ|DEX)\s*\|\s*(?:Телосложение|ТЕЛ|CON)\s*\|\s*(?:Интеллект|ИНТ|INT)\s*\|\s*(?:Мудрость|МУД|WIS)\s*\|\s*(?:Харизма|ХАР|CHA)\s*\|/i;
    const match = content.match(headerRegex);
    if (!match) return null;

    const afterHeader = content.slice(match.index + match[0].length);
    const lines = afterHeader.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        if (line.includes('---')) continue;
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 6) {
            return {
                str: cells[0],
                dex: cells[1],
                con: cells[2],
                int: cells[3],
                wis: cells[4],
                cha: cells[5]
            };
        }
    }
    return null;
}

function extractSection(text, headerName) {
    if (!text) return '';
    const regex = new RegExp(`(^|\\n)##\\s*${headerName}[^\\n]*`, 'i');
    const m = text.match(regex);
    if (!m) return '';
    const rest = text.slice(m.index + m[0].length);
    const nextMatch = rest.match(/\n##?\s+/);
    return nextMatch ? rest.slice(0, nextMatch.index).trim() : rest.trim();
}

function parseInventory(content) {
    const sectionText = extractSection(content, 'Инвентарь');
    if (!sectionText) return [];

    const items = [];
    const lines = sectionText.split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('-')) continue;

        let equipped = false;
        let rest = line.replace(/^-\s*/, '');
        if (rest.startsWith('[x]') || rest.startsWith('[X]')) {
            equipped = true;
            rest = rest.replace(/^\[[xX]\]\s*/, '');
        } else if (rest.startsWith('[ ]')) {
            equipped = false;
            rest = rest.replace(/^\[\s*\]\s*/, '');
        }

        let description = '';
        const descMatch = rest.match(/\s+[—–-]\s+(.*)$/);
        if (descMatch) {
            description = descMatch[1].trim();
            rest = rest.slice(0, descMatch.index).trim();
        }

        let category = 'Снаряжение';
        const catMatch = rest.match(/\[(.*?)\]/);
        if (catMatch) {
            category = catMatch[1].trim();
            rest = rest.replace(/\[(.*?)\]/, '').trim();
        }

        let quantity = 1;
        let weight = 0;
        const metaMatch = rest.match(/\((.*?)\)/);
        if (metaMatch) {
            const metaContent = metaMatch[1];
            const qtyM = metaContent.match(/кол-во:\s*(\d+)/i) || metaContent.match(/qty:\s*(\d+)/i) || metaContent.match(/(\d+)\s*шт/i);
            if (qtyM) quantity = parseInt(qtyM[1], 10) || 1;

            const weightM = metaContent.match(/вес:\s*([\d.]+)/i) || metaContent.match(/weight:\s*([\d.]+)/i) || metaContent.match(/([\d.]+)\s*(?:кг|фунт|lb)/i);
            if (weightM) weight = parseFloat(weightM[1]) || 0;

            rest = rest.replace(/\((.*?)\)/, '').trim();
        }

        const name = rest.trim();
        if (name && name !== '(Инвентарь пуст)') {
            items.push({
                id: 'it_' + Math.random().toString(36).substring(2, 9),
                name,
                equipped,
                quantity,
                weight,
                category,
                description
            });
        }
    }
    return items;
}

function serializeInventory(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return '## Инвентарь\n- (Инвентарь пуст)';
    }

    const lines = ['## Инвентарь'];
    for (const it of items) {
        const check = it.equipped ? '[x]' : '[ ]';
        const qty = it.quantity || 1;
        const wt = (it.weight !== undefined && it.weight !== null && it.weight !== '') ? `, вес: ${it.weight} кг` : '';
        const cat = it.category ? ` [${it.category}]` : '';
        const desc = it.description ? ` — ${it.description}` : '';
        lines.push(`- ${check} ${it.name} (кол-во: ${qty}${wt})${cat}${desc}`);
    }
    return lines.join('\n');
}

function parsePlayerNotes(content) {
    return extractSection(content, 'Заметки игрока');
}

function serializePlayerNotes(notesText) {
    const clean = (notesText || '').trim();
    return `## Заметки игрока\n\n${clean}`;
}

async function updateCharacterSection(vault, file, sectionHeaderName, newSectionText) {
    const content = await vault.read(file);
    const regex = new RegExp(`(^|\\r?\\n)##\\s*${sectionHeaderName}[^\\n]*([\\s\\S]*?)(?=\\r?\\n##?\\s+|$)`, 'i');

    let updatedContent;
    if (regex.test(content)) {
        updatedContent = content.replace(regex, `$1${newSectionText}\n\n`).replace(/\n{3,}/g, '\n\n').trim() + '\n';
    } else {
        updatedContent = content.trimEnd() + '\n\n' + newSectionText + '\n';
    }
    await vault.modify(file, updatedContent);
    return updatedContent;
}

function serializeActions(attacks) {
    if (!attacks || attacks.length === 0) return '';
    return attacks.map(atk => {
        let block = '```dnd-action\n';
        block += `name: ${atk.name || 'Атака'}\n`;
        if (atk.hit) block += `hit: ${atk.hit}\n`;
        if (atk.dmg) block += `dmg: ${atk.dmg}\n`;
        if (atk.type) block += `type: ${atk.type}\n`;
        if (atk.desc) block += `desc: ${atk.desc}\n`;
        block += '```';
        return block;
    }).join('\n\n');
}

async function updateCharacterActions(vault, file, attacks) {
    const content = await vault.read(file);
    const serialized = serializeActions(attacks);

    const firstActionIdx = content.indexOf('```dnd-action');
    if (firstActionIdx !== -1) {
        const regex = /```dnd-action[\s\S]*?```/g;
        let lastEnd = -1;
        let m;
        while ((m = regex.exec(content)) !== null) {
            lastEnd = m.index + m[0].length;
        }
        if (lastEnd !== -1) {
            const before = content.slice(0, firstActionIdx).trimEnd();
            const after = content.slice(lastEnd).trimStart();
            const newContent = serialized 
                ? `${before}\n\n${serialized}\n\n${after}`.replace(/\n{3,}/g, '\n\n').trim() + '\n'
                : `${before}\n\n${after}`.replace(/\n{3,}/g, '\n\n').trim() + '\n';
            await vault.modify(file, newContent);
            return;
        }
    }

    if (!serialized) return;

    const sectionHeaders = ['## Заметки игрока', '## Инвентарь', '## Предыстория'];
    let insertIdx = -1;
    for (const h of sectionHeaders) {
        const idx = content.indexOf(h);
        if (idx !== -1 && (insertIdx === -1 || idx < insertIdx)) {
            insertIdx = idx;
        }
    }

    let newContent;
    if (insertIdx !== -1) {
        const before = content.slice(0, insertIdx).trimEnd();
        const after = content.slice(insertIdx).trimStart();
        newContent = `${before}\n\n## Действия и атаки\n\n${serialized}\n\n${after}`.trim() + '\n';
    } else {
        newContent = `${content.trimEnd()}\n\n## Действия и атаки\n\n${serialized}\n`;
    }
    await vault.modify(file, newContent);
}

async function updateCharacterStats(vault, file, stats) {
    const content = await vault.read(file);
    const headerRegex = /\|\s*(?:Сила|СИЛ|STR)\s*\|\s*(?:Ловкость|ЛОВ|DEX)\s*\|\s*(?:Телосложение|ТЕЛ|CON)\s*\|\s*(?:Интеллект|ИНТ|INT)\s*\|\s*(?:Мудрость|МУД|WIS)\s*\|\s*(?:Харизма|ХАР|CHA)\s*\|/i;
    const match = content.match(headerRegex);
    if (match) {
        const afterHeader = content.slice(match.index + match[0].length);
        const lines = afterHeader.split(/\r?\n/);
        let rowIdx = -1;
        for (let i = 0; i < Math.min(3, lines.length); i++) {
            if (lines[i].includes('---')) continue;
            if (lines[i].includes('|')) {
                rowIdx = i;
                break;
            }
        }
        if (rowIdx !== -1) {
            const rowLine = lines[rowIdx];
            const newRow = `| ${stats.str || '10 (+0)'} | ${stats.dex || '10 (+0)'} | ${stats.con || '10 (+0)'} | ${stats.int || '10 (+0)'} | ${stats.wis || '10 (+0)'} | ${stats.cha || '10 (+0)'} |`;
            const rowStart = match.index + match[0].length + afterHeader.indexOf(rowLine);
            const beforeRow = content.slice(0, rowStart);
            const afterRow = content.slice(rowStart + rowLine.length);
            const newContent = `${beforeRow}${newRow}${afterRow}`;
            await vault.modify(file, newContent);
            return;
        }
    }
}

function hasTag(tags, targetTags) {
    if (!tags) return false;
    const tagArray = (Array.isArray(tags) ? tags : [tags]).flatMap(t => 
        String(t).toLowerCase().replace(/^#+/, '').split(/[\s,/#]+/)
    );
    const targets = targetTags.map(t => t.toLowerCase());
    return tagArray.some(t => targets.includes(t));
}

async function scanCharacters(vault, metadataCache) {
    const files = vault.getMarkdownFiles();
    const roster = [];

    for (const file of files) {
        let fm = metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) {
            try {
                const raw = await vault.read(file);
                if (raw.startsWith('---')) {
                    const endIdx = raw.indexOf('\n---', 3);
                    if (endIdx !== -1) {
                        const yamlText = raw.substring(3, endIdx);
                        fm = obsidian.parseYaml(yamlText) || {};
                    }
                }
            } catch (e) {}
        }
        if (!fm) continue;

        const tags = fm.tags ? (Array.isArray(fm.tags) ? fm.tags : [fm.tags]) : [];

        const isNpc = hasTag(tags, [
            'npc', 'бестиарий', 'персонажи', 'персонаж', 'игрок', 'игроки', 
            'боссфайт', 'босс', 'monster', 'bestiary', 'character', 'characters', 
            'player', 'players', 'pc', 'creature'
        ]) || fm.hp || fm.ac;

        if (isNpc) {
            let attacks = [];
            let content = '';
            let stats = null;
            let inventory = [];
            let playerNotes = '';
            try {
                content = await vault.read(file);
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
                stats = parseAbilityScores(content);
                inventory = parseInventory(content);
                playerNotes = parsePlayerNotes(content);
            } catch (e) {
                console.error(`TaleBridge: Ошибка парсинга для ${file.path}:`, e);
            }

            let isPlayable = false;
            if (fm.playable === false || fm.is_player === false || fm.pc === false) {
                isPlayable = false;
            } else if (fm.playable === true || fm.is_player === true || fm.pc === true) {
                isPlayable = true;
            } else if (hasTag(tags, ['игрок', 'игроки', 'player', 'players', 'pc', 'party'])) {
                isPlayable = true;
            } else if (file.basename.includes('Артём') || file.basename.includes('Глицин')) {
                isPlayable = true;
            }

            let category = 'NPC';
            if (hasTag(tags, ['бестиарий', 'боссфайт', 'босс', 'конструкт', 'стража', 'bestiary', 'monster', 'creature', 'boss'])) {
                category = 'Бестиарий';
            } else if (isPlayable) {
                category = 'Игроки';
            } else if (hasTag(tags, ['союзник', 'союзники', 'ally', 'allies'])) {
                category = 'Союзники';
            } else if (hasTag(tags, ['антагонист', 'антагонисты', 'враг', 'враги', 'enemy', 'villain'])) {
                category = 'Враги';
            }

            roster.push({
                name: file.basename,
                path: file.path,
                category: category,
                playable: isPlayable,
                tags: tags,
                hp: fm.hp !== undefined ? fm.hp : '-',
                hp_max: fm.hp_max !== undefined ? fm.hp_max : (fm.hp !== undefined ? fm.hp : '-'),
                ac: fm.ac || '-',
                speed: fm.speed || '-',
                race: fm.race || '',
                class: fm.class || '',
                status: fm.status || '',
                talespire_id: fm.talespire_id || '',
                talespire_name: fm.talespire_name || '',
                attacks: attacks,
                stats: stats,
                inventoryCount: inventory.length,
                hasPlayerNotes: playerNotes.length > 0
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
        
        const isSceneFile = tags.some(t => String(t).match(/сцены|сюжет|scene|scenes|story|encounter/i)) || 
            file.basename.match(/сцены|сюжет|scene|encounter/i);
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
    autoOpenCreatureNote: true,
    gmPin: '5'
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

        new obsidian.Setting(containerEl)
            .setName('PIN-код Мастера')
            .setDesc('Пароль для перехода из режима Игрока в режим Гейм-Мастера в симбиоте (по умолчанию 5; оставьте пустым для входа без пароля)')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(String(this.plugin.settings.gmPin ?? '5'))
                .onChange(async (val) => {
                    this.plugin.settings.gmPin = val.trim();
                    await this.plugin.saveSettings();
                    this.plugin.send('CONFIG_UPDATE', { gmPin: this.plugin.settings.gmPin });
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
        this.currentHandout = null;

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

        // Auto-sync when notes are modified or created in Obsidian
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file && file.extension === 'md') {
                    this.debouncedScanCharacters(500);
                }
            })
        );
        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file && file.extension === 'md') {
                    this.debouncedScanCharacters(500);
                }
            })
        );

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
            this.wss = new SimpleWebSocketServer(this.settings.port, (req, res) => this.handleHttpRequest(req, res));

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
                    payload: { 
                        vault: this.app.vault.getName(), 
                        version: '0.6.0',
                        gmPin: this.settings.gmPin ?? '5'
                    }
                });
                this.send('GET_BOOKMARKS', {});
                await this.scanAndSendCharacters();
                await this.scanAndSendScenes();
                const images = this.scanVaultImages();
                this.wss.send(client, {
                    type: 'VAULT_IMAGES_LIST',
                    payload: images
                });
                if (this.currentHandout) {
                    this.wss.send(client, {
                        type: 'MEDIA_HANDOUT',
                        payload: this.currentHandout
                    });
                }
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

    debouncedScanCharacters(delayMs = 400) {
        if (this._scanTimeout) clearTimeout(this._scanTimeout);
        this._scanTimeout = setTimeout(() => {
            this.scanAndSendCharacters();
        }, delayMs);
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
                    payload: { 
                        vault: this.app.vault.getName(), 
                        version: '0.6.0',
                        gmPin: this.settings.gmPin ?? '5'
                    }
                });
                break;

            case 'GET_ROSTER':
            case 'GET_CHARACTERS':
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

            case 'GET_PLAYER_DATA':
                if (payload && payload.characterName) {
                    const pData = await this.getCharacterPlayerData(payload.characterName);
                    this.wss.send(client, {
                        type: 'PLAYER_DATA',
                        payload: pData
                    });
                }
                break;

            case 'UPDATE_INVENTORY':
                if (payload && payload.characterName && payload.items) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        const serialized = serializeInventory(payload.items);
                        await updateCharacterSection(this.app.vault, file, 'Инвентарь', serialized);
                        this.wss.broadcast({
                            type: 'INVENTORY_UPDATED',
                            payload: { characterName: payload.characterName, items: payload.items }
                        });
                        new obsidian.Notice(`Инвентарь сохранен: ${payload.characterName}`);
                    }
                }
                break;

            case 'UPDATE_PLAYER_NOTES':
                if (payload && payload.characterName) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        const serialized = serializePlayerNotes(payload.notes || '');
                        await updateCharacterSection(this.app.vault, file, 'Заметки игрока', serialized);
                        this.wss.send(client, {
                            type: 'PLAYER_NOTES_UPDATED',
                            payload: { characterName: payload.characterName, savedAt: Date.now() }
                        });
                        this.wss.broadcast({
                            type: 'PLAYER_NOTES_SYNC',
                            payload: { characterName: payload.characterName, notes: payload.notes || '' }
                        });
                    }
                }
                break;

            case 'UPDATE_CHARACTER_HP':
                if (payload && payload.characterName) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        await this.app.fileManager.processFrontMatter(file, (fm) => {
                            fm.hp = payload.hp;
                            if (payload.maxHp) fm.hp_max = payload.maxHp;
                        });
                        this.wss.broadcast({
                            type: 'CHARACTER_HP_UPDATED',
                            payload: { characterName: payload.characterName, hp: payload.hp, maxHp: payload.maxHp }
                        });
                    }
                }
                break;

            case 'UPDATE_CHARACTER_ACTIONS':
                if (payload && payload.characterName && Array.isArray(payload.attacks)) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        await updateCharacterActions(this.app.vault, file, payload.attacks);
                        const updatedData = await this.getCharacterPlayerData(payload.characterName);
                        this.wss.broadcast({
                            type: 'PLAYER_DATA',
                            payload: updatedData
                        });
                        this.debouncedScanCharacters();
                        new obsidian.Notice(`Действия обновлены: ${payload.characterName}`);
                    }
                }
                break;

            case 'UPDATE_CHARACTER_PARAM':
                if (payload && payload.characterName && payload.param) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        await this.app.fileManager.processFrontMatter(file, (fm) => {
                            if (payload.param === 'ac') fm.ac = payload.value;
                            else if (payload.param === 'hp_max') fm.hp_max = payload.value;
                            else if (payload.param === 'speed') fm.speed = payload.value;
                            else if (payload.param === 'level') fm.level = payload.value;
                            else if (payload.param === 'status') fm.status = payload.value;
                            else if (payload.param === 'race') fm.race = payload.value;
                            else if (payload.param === 'class') fm.class = payload.value;
                        });
                        const updatedData = await this.getCharacterPlayerData(payload.characterName);
                        this.wss.broadcast({
                            type: 'PLAYER_DATA',
                            payload: updatedData
                        });
                        this.debouncedScanCharacters();
                        new obsidian.Notice(`Параметр ${payload.param} обновлен: ${payload.characterName}`);
                    }
                }
                break;

            case 'UPDATE_CHARACTER_STATS':
                if (payload && payload.characterName && payload.stats) {
                    const file = this.findCharacterFile(payload.characterName);
                    if (file) {
                        await updateCharacterStats(this.app.vault, file, payload.stats);
                        const updatedData = await this.getCharacterPlayerData(payload.characterName);
                        this.wss.broadcast({
                            type: 'PLAYER_DATA',
                            payload: updatedData
                        });
                        this.debouncedScanCharacters();
                        new obsidian.Notice(`Характеристики обновлены: ${payload.characterName}`);
                    }
                }
                break;

            case 'BROADCAST_HANDOUT':
                if (payload) {
                    this.currentHandout = payload;
                    this.wss.broadcast({
                        type: 'MEDIA_HANDOUT',
                        payload: payload
                    });
                    new obsidian.Notice(`Трансляция игрокам: ${payload.title || 'Медиа'}`);
                }
                break;

            case 'DISMISS_HANDOUT':
                this.currentHandout = null;
                this.wss.broadcast({
                    type: 'DISMISS_HANDOUT',
                    payload: payload || {}
                });
                new obsidian.Notice('Трансляция снята у всех игроков');
                break;

            case 'GET_CURRENT_HANDOUT':
                if (this.currentHandout) {
                    this.wss.send(client, {
                        type: 'MEDIA_HANDOUT',
                        payload: this.currentHandout
                    });
                }
                break;

            case 'SYNC_COMBAT_STATE':
                this.combatState = payload || null;
                this.wss.broadcast({
                    type: 'COMBAT_STATE_UPDATE',
                    payload: this.combatState
                });
                break;

            case 'GET_COMBAT_STATE':
                if (this.combatState) {
                    this.wss.send(client, {
                        type: 'COMBAT_STATE_UPDATE',
                        payload: this.combatState
                    });
                }
                break;

            case 'GET_VAULT_IMAGES': {
                const images = this.scanVaultImages();
                this.wss.send(client, {
                    type: 'VAULT_IMAGES_LIST',
                    payload: images
                });
                break;
            }

            case 'PING':
                this.wss.send(client, { type: 'PONG', payload: { time: Date.now() } });
                break;

            case 'GET_SYSTEM_CLIPBOARD': {
                const text = await this.readSystemClipboard();
                this.wss.send(client, {
                    type: 'SYSTEM_CLIPBOARD',
                    payload: { text, requestId: data.requestId || null }
                });
                break;
            }

            case 'SET_SYSTEM_CLIPBOARD': {
                if (data.payload && typeof data.payload.text === 'string') {
                    await this.writeSystemClipboard(data.payload.text);
                }
                break;
            }

            default:
                break;
        }
    }

    async readSystemClipboard() {
        // 1. Try electron clipboard
        try {
            let electron = null;
            try { electron = require('electron'); } catch (_) {}
            if (!electron && typeof window !== 'undefined' && window.require) {
                try { electron = window.require('electron'); } catch (_) {}
            }
            if (electron && electron.clipboard && typeof electron.clipboard.readText === 'function') {
                const txt = electron.clipboard.readText();
                if (typeof txt === 'string' && txt.length > 0) return txt;
            }
        } catch (_) {}

        // 2. Try PowerShell fallback on Windows
        return new Promise((resolve) => {
            try {
                cp.execFile('powershell.exe', ['-NoProfile', '-Command', 'Get-Clipboard'], { timeout: 3000 }, (err, stdout) => {
                    if (!err && stdout) {
                        resolve(stdout.replace(/\r\n$/, '').replace(/\n$/, ''));
                    } else {
                        resolve('');
                    }
                });
            } catch (_) {
                resolve('');
            }
        });
    }

    async writeSystemClipboard(text) {
        if (typeof text !== 'string') return;
        try {
            let electron = null;
            try { electron = require('electron'); } catch (_) {}
            if (!electron && typeof window !== 'undefined' && window.require) {
                try { electron = window.require('electron'); } catch (_) {}
            }
            if (electron && electron.clipboard && typeof electron.clipboard.writeText === 'function') {
                electron.clipboard.writeText(text);
                return;
            }
        } catch (_) {}

        try {
            const child = cp.execFile('powershell.exe', ['-NoProfile', '-Command', 'Set-Clipboard -Value $input'], { timeout: 3000 }, () => {});
            if (child && child.stdin) {
                child.stdin.write(text);
                child.stdin.end();
            }
        } catch (_) {}
    }

    async handleHttpRequest(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }

        if (req.url.startsWith('/clipboard-write') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body || '{}');
                    await this.writeSystemClipboard(data.text || '');
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ ok: true }));
                } catch (_) {
                    res.writeHead(400);
                    res.end();
                }
            });
            return true;
        }

        if (req.url.startsWith('/clipboard')) {
            try {
                const text = await this.readSystemClipboard();
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ text: text || '' }));
                return true;
            } catch (err) {
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ text: '', error: String(err) }));
                return true;
            }
        }

        if (req.url.startsWith('/vault-file') || req.url.startsWith('/public/')) {
            try {
                let filePath = '';
                if (req.url.startsWith('/public/')) {
                    filePath = decodeURIComponent(req.url.slice(1));
                } else {
                    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
                    filePath = decodeURIComponent(parsedUrl.searchParams.get('path') || '');
                }

                // Check direct path or prefixed with public/
                let file = this.app.vault.getAbstractFileByPath(filePath);
                if (!file && !filePath.toLowerCase().startsWith('public/')) {
                    file = this.app.vault.getAbstractFileByPath(`public/${filePath}`);
                }

                if (file && file instanceof obsidian.TFile) {
                    const ext = file.extension.toLowerCase();
                    let mime = 'application/octet-stream';
                    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
                        mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : `image/${ext}`);
                    }
                    const data = await this.app.vault.readBinary(file);
                    const buf = Buffer.from(data);
                    res.writeHead(200, {
                        'Content-Type': mime,
                        'Content-Length': buf.length,
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(buf);
                    return true;
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File not found in vault');
                    return true;
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error serving vault file');
                return true;
            }
        }

        if (req.url === '/api/vault-images') {
            const images = this.scanVaultImages();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(images));
            return true;
        }

        return false;
    }

    scanVaultImages() {
        const files = this.app.vault.getFiles();
        const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
        const images = [];

        // 1. Prioritize images from public/ directory
        for (const f of files) {
            const ext = f.extension.toLowerCase();
            if (imageExtensions.includes(ext)) {
                const normPath = f.path.replace(/\\/g, '/');
                if (normPath.toLowerCase().startsWith('public/')) {
                    images.push({
                        name: f.name,
                        path: normPath,
                        extension: ext,
                        isPublic: true
                    });
                }
            }
        }

        // 2. If none found in public/, fallback to all images in vault
        if (images.length === 0) {
            for (const f of files) {
                const ext = f.extension.toLowerCase();
                if (imageExtensions.includes(ext)) {
                    images.push({
                        name: f.name,
                        path: f.path.replace(/\\/g, '/'),
                        extension: ext,
                        isPublic: false
                    });
                }
            }
        }

        images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        return images;
    }

    findCharacterFile(characterName) {
        if (!characterName) return null;
        const clean = characterName.toLowerCase().trim();
        const files = this.app.vault.getMarkdownFiles();

        let file = files.find(f => f.basename.toLowerCase().trim() === clean);
        if (file) return file;

        file = files.find(f => {
            const cache = this.app.metadataCache.getFileCache(f);
            return cache?.frontmatter?.talespire_name?.toLowerCase().trim() === clean;
        });
        if (file) return file;

        file = files.find(f => {
            const cache = this.app.metadataCache.getFileCache(f);
            const aliases = cache?.frontmatter?.aliases;
            if (Array.isArray(aliases)) {
                return aliases.some(a => String(a).toLowerCase().trim() === clean);
            }
            return false;
        });
        if (file) return file;

        file = files.find(f => {
            const b = f.basename.toLowerCase().trim();
            return b.includes(clean) || clean.includes(b);
        });
        return file || null;
    }

    async getCharacterPlayerData(characterName) {
        const file = this.findCharacterFile(characterName);
        if (!file) {
            return { error: 'Персонаж не найден', characterName };
        }

        const content = await this.app.vault.read(file);
        const cache = this.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter || {};

        const attacks = [];
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

        const stats = parseAbilityScores(content);
        const inventory = parseInventory(content);
        const playerNotes = parsePlayerNotes(content);

        let rawHp = fm.hp !== undefined ? fm.hp : 20;
        let hpMax = fm.hp_max !== undefined ? parseInt(fm.hp_max, 10) : (fm.max_hp !== undefined ? parseInt(fm.max_hp, 10) : null);
        let hp = 0;

        if (typeof rawHp === 'string' && rawHp.includes('/')) {
            const parts = rawHp.split('/');
            hp = parseInt(parts[0], 10);
            if (isNaN(hp)) hp = 0;
            if (hpMax === null || isNaN(hpMax)) {
                hpMax = parseInt(parts[1], 10);
                if (isNaN(hpMax)) hpMax = hp || 20;
            }
        } else {
            hp = parseInt(rawHp, 10);
            if (isNaN(hp)) hp = 20;
            if (hpMax === null || isNaN(hpMax)) hpMax = hp || 20;
        }

        return {
            name: file.basename,
            path: file.path,
            hp: hp,
            hp_max: hpMax,
            ac: fm.ac || 10,
            speed: fm.speed || '9 м',
            race: fm.race || '',
            class: fm.class || '',
            level: fm.level || 1,
            status: fm.status || '',
            talespire_id: fm.talespire_id || '',
            talespire_name: fm.talespire_name || '',
            stats: stats,
            attacks: attacks,
            inventory: inventory,
            playerNotes: playerNotes
        };
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
