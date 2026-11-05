import { checkPersonalClues } from './browser-clues.mjs';
import { checkCursors } from './browser-cursors.mjs';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
const server = spawn(
  process.execPath,
  ['--import', './scripts/register.mjs', 'tests/browser-server.ts'],
  { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
);
let diagnostics = '';
server.stderr.on('data', (c) => {
  diagnostics += c;
});
const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Error('Test server timeout: ' + diagnostics)), 10000);
  server.once('exit', () => {
    clearTimeout(timeout);
    reject(Error('Test server stopped: ' + diagnostics));
  });
  server.stdout.on('data', (c) => {
    const match = /READY (http:\/\/[^\s]+)/.exec(String(c));
    if (match) {
      clearTimeout(timeout);
      resolve(match[1]);
    }
  });
});
(async () => {
  let browser;
  try {
    const url = await ready;
    browser = await chromium.launch(
      process.env.PLAYWRIGHT_CHANNEL
        ? { channel: process.env.PLAYWRIGHT_CHANNEL, headless: true }
        : { headless: true },
    );
    await fs.mkdir('test-results', { recursive: true });
    const results = [];
    for (const width of [375, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } }),
        page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        Object.defineProperty(crypto, 'randomUUID', { value: undefined });
      });
      await page.goto(url);
      const dialog = page.getByRole('dialog', { name: 'Подключение к Мастеру' });
      await dialog.waitFor();
      await checkCursors(page);
      await dialog.click({ position: { x: 1, y: 1 } });
      assert.ok(await dialog.isVisible(), 'Backdrop must not dismiss the login dialog');
      await page.keyboard.press('Escape');
      assert.ok(await dialog.isVisible(), 'Escape must not dismiss the login dialog');
      const code = dialog.getByLabel('Код доступа', { exact: true });
      await code.fill('keep-draft');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          readText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
        } });
      });
      await dialog.getByRole('button', { name: 'Вставить код', exact: true }).click();
      await dialog.getByRole('status').getByText('Не удалось прочитать буфер обмена.', { exact: false }).waitFor();
      assert.equal(await code.inputValue(), 'keep-draft');
      await page.evaluate(() => {
        navigator.clipboard.readText = async () => '  alice-code\n';
      });
      await dialog.getByRole('button', { name: 'Вставить код', exact: true }).click();
      await page.waitForFunction((id) => document.getElementById(id)?.value === 'alice-code', await code.getAttribute('id'));
      assert.equal(await code.inputValue(), 'alice-code');
      await dialog.getByRole('button', { name: 'Подключиться', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.locator('#hero-select').waitFor();
      assert.deepEqual(await page.locator('#hero-select option').allTextContents(), [
        'Выберите героя...',
        'Alice',
      ]);
      assert.ok(!(await page.locator('body').innerText()).includes('GM secret'));
      await page.getByRole('button', { name: 'Инвентарь', exact: true }).click();
      await page.locator('button[title="Редактировать предмет"]').first().click();
      const editor = page.getByRole('dialog', { name: 'Редактировать предмет' });
      await editor.waitFor();
      const itemName = `Rope (${width}) [edited]`;
      const itemDescription = `Description ${width}\n## Heading inside description\nLiteral $&`;
      await editor.getByLabel('Название предмета', { exact: true }).fill(itemName);
      await editor.getByLabel('Количество предметов', { exact: true }).fill('3');
      await editor.getByLabel('Вес одного предмета (кг)', { exact: true }).fill('0.025');
      await editor.getByLabel('Описание предмета', { exact: true }).fill(itemDescription);
      await editor.getByRole('button', { name: 'Сохранить', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.reload();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Инвентарь', exact: true }).click();
      await page.locator('button[title="Редактировать предмет"]').first().click();
      await editor.waitFor();
      assert.equal(await editor.getByLabel('Название предмета', { exact: true }).inputValue(), itemName);
      assert.equal(await editor.getByLabel('Описание предмета', { exact: true }).inputValue(), itemDescription);
      assert.equal(await editor.getByLabel('Вес одного предмета (кг)', { exact: true }).inputValue(), '0.025');
      await editor.getByRole('button', { name: 'Отмена', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Журнал', exact: true }).click();
      const notes = page.getByLabel('Личный журнал: Alice');
      const content = `Audit notes ${width}\n## Heading within notes\nLiteral $& $1`;
      await notes.fill(content);
      await page.getByText('Подтверждено сервером', { exact: true }).waitFor();
      await page.reload();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Журнал', exact: true }).click();
      await notes.waitFor();
      assert.equal(await notes.inputValue(), content);
      await page.locator('button[title*="Подключено:"]').click();
      await dialog.waitFor();
      await dialog.getByLabel('Код доступа', { exact: true }).focus();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        assert.ok(await dialog.evaluate((element) => element.contains(document.activeElement)));
      }
      await page.keyboard.press('Escape');
      assert.ok(await dialog.isVisible());
      await dialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.screenshot({ path: `test-results/player-${width}.png` });
      await page.locator('button[title^="Режим Игрока"]').click();
      const gmDialog = page.getByRole('dialog', { name: 'Доступ Мастера' });
      await gmDialog.waitFor();
      await gmDialog.click({ position: { x: 1, y: 1 } });
      await page.keyboard.press('Escape');
      assert.ok(await gmDialog.isVisible(), 'GM login must close only with its close button');
      const gmCode = gmDialog.getByLabel('Код Мастера из настроек Obsidian', { exact: true });
      await gmCode.fill('keep-gm-draft');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          readText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
        } });
      });
      await gmDialog.getByRole('button', { name: 'Вставить код', exact: true }).click();
      await gmDialog.getByRole('alert').getByText('Не удалось прочитать буфер обмена.', { exact: false }).waitFor();
      assert.equal(await gmCode.inputValue(), 'keep-gm-draft');
      await gmDialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
      await gmDialog.waitFor({ state: 'hidden' });
      await page.locator('button[title^="Режим Игрока"]').click();
      await page.evaluate(() => { navigator.clipboard.readText = async () => '  gm-code\n'; });
      await gmDialog.getByRole('button', { name: 'Вставить код', exact: true }).click();
      await page.waitForFunction((id) => document.getElementById(id)?.value === 'gm-code', await gmCode.getAttribute('id'));
      if (width === 375) {
        await gmDialog.getByRole('button', { name: 'Войти', exact: true }).click();
        await gmDialog.waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Сюжет', exact: true }).click();
        await page.getByText('Private scene', { exact: false }).first().waitFor();
      } else {
        await gmDialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
        await gmDialog.waitFor({ state: 'hidden' });
      }
      assert.deepEqual(errors, []);
      results.push({
        width,
        authenticated: true,
        notesRoundTrip: true,
        keyboardDialog: true,
        pageErrors: errors,
      });
      await context.close();
    }
    const context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(url);
    const dialog = page.getByRole('dialog', { name: 'Подключение к Мастеру' });
    await dialog.getByLabel('Подключиться как').selectOption('gm');
    await dialog.getByLabel('Код доступа', { exact: true }).fill('gm-code');
    await dialog.getByRole('button', { name: 'Подключиться', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByText('Private scene', { exact: false }).first().waitFor();
    await context.close();
    await checkPersonalClues(browser);
    await fs.writeFile(
      'test-results/browser.json',
      JSON.stringify({ results, gmScene: true }, null, 2),
    );
    console.log(JSON.stringify({ results, gmScene: true }, null, 2));
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
