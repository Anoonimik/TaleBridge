import path from 'node:path';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const bundle = await build({
  entryPoints: ['symbiote/tests/react-sessions.tsx'],
  nodePaths: [path.resolve('symbiote/node_modules')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
});
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/app.js' ? 'text/javascript' : 'text/html');
  res.end(
    req.url === '/app.js'
      ? bundle.outputFiles[0].contents
      : '<!doctype html><html><body><div id="root"></div><script src="/app.js"></script></body></html>',
  );
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => Boolean(window.reactSessions));
  await page.evaluate(() => window.reactSessions.open('item'));
  const item = page.getByRole('dialog', { name: 'Редактировать предмет' });
  await item.getByLabel('Название предмета', { exact: true }).fill('Unsaved draft');
  await page.evaluate(() => window.reactSessions.refreshItem());
  assert.equal(
    await item.getByLabel('Название предмета', { exact: true }).inputValue(),
    'Unsaved draft',
  );
  await item.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.evaluate(() => window.reactSessions.open('item'));
  assert.equal(
    await item.getByLabel('Название предмета', { exact: true }).inputValue(),
    'Server rope',
  );
  await item.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.evaluate(() => {
    window.reactSessions.deferSave(true);
    window.reactSessions.open('item');
  });
  const nameInput = item.getByLabel('Название предмета', { exact: true });
  await nameInput.fill('Edited rope');
  await item.getByRole('button', { name: 'Сохранить', exact: true }).click();
  assert.ok(await nameInput.isDisabled());
  assert.ok(await item.getByRole('button', { name: 'Сохранение…', exact: true }).isDisabled());
  await page.keyboard.press('Escape');
  await item.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
  assert.ok(await item.isVisible());
  await page.evaluate(() => window.reactSessions.rejectSave());
  await item.getByRole('alert').getByText('Inventory save failed', { exact: true }).waitFor();
  assert.equal(await nameInput.inputValue(), 'Edited rope');
  await item.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.evaluate(() => window.reactSessions.resolveSave());
  await item.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.reactSessions.saved().name), 'Edited rope');
  await page.evaluate(() => window.reactSessions.deferSave(false));
  await page.evaluate(() => window.reactSessions.open('spell'));
  const spell = page.getByRole('dialog', { name: 'Сотворение заклинания' });
  await spell.getByTitle('Выбрать 3 круг (2/2)', { exact: true }).click();
  await page.evaluate(() => window.reactSessions.refresh());
  assert.ok(
    await spell
      .getByRole('button', { name: 'Сотворить заклинание (3 круг)', exact: true })
      .isEnabled(),
  );
  await page.evaluate(() => window.reactSessions.exhaust());
  assert.ok(
    await spell
      .getByRole('button', { name: 'Сотворить заклинание (3 круг)', exact: true })
      .isDisabled(),
  );
  await page.evaluate(() => window.reactSessions.changeSpell());
  await spell.getByRole('button', { name: 'Сотворить заклинание (1 круг)', exact: true }).waitFor();
  await spell.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
  await page.evaluate(() => window.reactSessions.open('attack'));
  await page
    .getByTitle('Бросить 1d20 + бонус попадания в TaleSpire', { exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  assert.equal(await page.evaluate(() => window.reactSessions.pending()), 1);
  await page.evaluate(() => window.reactSessions.character('bob'));
  await page.getByTitle('Бросить 1d20 + бонус попадания в TaleSpire', { exact: true }).waitFor();
  assert.ok(
    await page
      .getByTitle('Бросить 1d20 + бонус попадания в TaleSpire', { exact: true })
      .isEnabled(),
  );
  await page.evaluate(() => window.reactSessions.resolve(25));
  assert.equal(await page.getByText('КРИТИЧЕСКИЙ УДАР!', { exact: true }).count(), 0);
  await page.getByTitle('Бросок урона', { exact: true }).click();
  await page.evaluate(() => window.reactSessions.reject());
  await page.getByRole('alert').getByText('Old request failed', { exact: true }).waitFor();
  await page.evaluate(() => window.reactSessions.open('concentration'));
  await page.getByRole('button', { name: 'Спасбросок Телосложения', exact: true }).click();
  await page.evaluate(() => {
    window.reactSessions.character('bob', 'replacement');
    window.reactSessions.reject();
  });
  assert.ok(
    await page.getByRole('button', { name: 'Спасбросок Телосложения', exact: true }).isEnabled(),
  );
  assert.equal(await page.getByText('Old request failed', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'React StrictMode regression scenarios passed: draft preservation, acknowledged saves and retry, session reset, slot selection, stale async results.',
  );
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
