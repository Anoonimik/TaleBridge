// Local compiled client + mocked WebSocket only. Never connects to Obsidian.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/roksh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(playwrightPath);
const base = path.join(root, 'review-build');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(base, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(fs.readFileSync(file));
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const results = [];
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const hero = { name: 'Audit Hero', playable: true, category: 'Игроки', hp: 12, hp_max: 20, ac: 14, level: 3, inventory: [], playerNotes: 'mock notes' };
      await page.routeWebSocket('**/*', socket => socket.onMessage(raw => {
        const m = JSON.parse(raw);
        const reply = (type, payload) => socket.send(JSON.stringify({ type, payload }));
        if (m.type === 'HANDSHAKE') reply('HANDSHAKE_ACK', { vault: 'Mock vault', gmPin: '5' });
        if (m.type === 'GET_CHARACTERS') reply('CHARACTERS_LIST', [hero]);
        if (m.type === 'GET_PLAYER_DATA') reply('PLAYER_DATA', hero);
      }));
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.locator('#root').waitFor();
      await page.waitForFunction(() => document.querySelector('#root')?.textContent.includes('Audit Hero'));
      const connection = page.locator('button[title*="Подключено:"]');
      await connection.click();
      const dialogs = await page.getByRole('dialog').count();
      const hasConnectionTitle = await page.getByText('Подключение к Мастеру', { exact: true }).count();
      results.push({ width, rendered: true, pageErrors: errors, semanticDialogs: dialogs, connectionTitleMatches: hasConnectionTitle });
      await page.close();
    }
    console.log(JSON.stringify({ mocked: true, results }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
