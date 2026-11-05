import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';

export async function checkPersonalClues(browser) {
  // A separate fixture keeps this multi-client scenario within the real login rate limit.
  const server = spawn(
    process.execPath,
    ['--import', './scripts/register.mjs', 'tests/browser-server.ts'],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  let diagnostics = '';
  server.stderr.on('data', (chunk) => {
    diagnostics += chunk;
  });
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error('Archive server timeout: ' + diagnostics)),
        10000,
      );
      server.once('exit', () => {
        clearTimeout(timer);
        reject(Error('Archive server stopped: ' + diagnostics));
      });
      server.stdout.on('data', (chunk) => {
        const match = /READY (http:\/\/[^\s]+)/.exec(String(chunk));
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
    });
    await checkArchiveClients(browser, url);
  } finally {
    server.kill();
  }
}
async function checkArchiveClients(browser, url) {
  const contexts = [];
  const socket = new WebSocket(url.replace('http:', 'ws:') + '/ws', { headers: { Origin: url } });
  async function command(type, payload) {
    const requestId = crypto.randomUUID();
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off('message', listener);
        reject(Error('Clue test request timeout'));
      }, 10000);
      const listener = (data) => {
        const message = JSON.parse(String(data));
        if (
          message.requestId !== requestId ||
          !['ACK', 'HANDSHAKE_ACK', 'ERROR'].includes(message.type)
        )
          return;
        clearTimeout(timer);
        socket.off('message', listener);
        if (message.type === 'ERROR') reject(Error(JSON.stringify(message.payload)));
        else resolve(message);
      };
      socket.on('message', listener);
    });
    socket.send(JSON.stringify({ protocolVersion: 1, type, payload, requestId }));
    return response;
  }
  async function login(role, code) {
    const context = await browser.newContext();
    contexts.push(context);
    const page = await context.newPage();
    await page.goto(url);
    const dialog = page.getByRole('dialog', { name: 'Подключение к Мастеру' });
    await dialog.getByLabel('Подключиться как').selectOption(role);
    await dialog.getByLabel('Код доступа', { exact: true }).fill(code);
    await dialog.getByRole('button', { name: 'Подключиться', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    return page;
  }
  const overlay = (page) => page.getByRole('dialog', { name: 'Материал Мастера' });
  try {
    await once(socket, 'open');
    await command('HANDSHAKE', { role: 'gm', code: 'gm-code' });
    const alice = await login('player', 'alice-code');
    const bob = await login('player', 'bob-code');
    const gm = await login('gm', 'gm-code');
    await command('BROADCAST_HANDOUT', {
      type: 'text',
      url: '',
      title: 'Clue test letter',
      description: 'Find the lighthouse',
      active: true,
    });
    for (const page of [alice, bob, gm])
      await overlay(page).getByText('Find the lighthouse', { exact: true }).waitFor();
    await alice.keyboard.press('Escape');
    await alice.getByRole('button', { name: 'Улики', exact: true }).click();
    await alice.getByText('Архив полученных улик (0)', { exact: true }).waitFor();
    await command('BROADCAST_HANDOUT', {
      type: 'text',
      url: '',
      title: 'Clue test letter',
      description: 'Find the lighthouse',
      active: true,
    });
    for (const page of [alice, bob, gm]) {
      await overlay(page).getByRole('button', { name: 'Сохранить у себя', exact: true }).click();
      assert.ok(
        await overlay(page)
          .getByRole('button', { name: 'Сохранено в улики ✓', exact: true })
          .isDisabled(),
      );
    }
    await overlay(gm).getByRole('button', { name: 'Скрыть только у себя', exact: true }).click();
    await gm.getByRole('button', { name: 'Улики', exact: true }).click();
    await gm.getByRole('button', { name: 'Открыть', exact: true }).click();
    await gm.keyboard.press('Escape');
    await overlay(gm).waitFor({ state: 'hidden' });
    assert.ok(
      await overlay(bob).isVisible(),
      'GM archive close must not dismiss another participant’s live handout',
    );
    await alice.keyboard.press('Escape');
    await alice.getByRole('button', { name: 'Улики', exact: true }).click();
    await alice
      .getByRole('button', { name: 'Удалить «Clue test letter» только у себя', exact: true })
      .click();
    await alice
      .getByRole('button', { name: 'Подтвердить удаление «Clue test letter» у себя', exact: true })
      .click();
    await alice.getByText('Архив полученных улик (0)', { exact: true }).waitFor();
    await bob.keyboard.press('Escape');
    await bob.getByRole('button', { name: 'Улики', exact: true }).click();
    await bob.getByText('Архив полученных улик (1)', { exact: true }).waitFor();
    await alice.reload();
    await overlay(alice).waitFor();
    await alice.keyboard.press('Escape');
    await alice.getByRole('button', { name: 'Улики', exact: true }).click();
    await alice.getByText('Архив полученных улик (0)', { exact: true }).waitFor();
    await bob.reload();
    await overlay(bob).waitFor();
    await bob.keyboard.press('Escape');
    await bob.getByRole('button', { name: 'Улики', exact: true }).click();
    await bob.getByText('Архив полученных улик (1)', { exact: true }).waitFor();
    await command('BROADCAST_HANDOUT', {
      type: 'text',
      url: '',
      title: 'Unsaved letter',
      description: 'Do not archive automatically',
      active: true,
    });
    await overlay(gm)
      .getByTitle('Прекратить трансляцию и закрыть экран у всех игроков', { exact: true })
      .click();
    for (const page of [alice, bob, gm]) await overlay(page).waitFor({ state: 'hidden' });
    await bob.getByText('Архив полученных улик (1)', { exact: true }).waitFor();
    assert.equal(await bob.getByText('Unsaved letter', { exact: true }).count(), 0);
    await bob.getByRole('button', { name: 'Открыть', exact: true }).click();
    await command('DISMISS_HANDOUT', {});
    assert.ok(
      await overlay(bob).isVisible(),
      'Dismissal affects the live broadcast, not a personal archive preview',
    );
    await bob.keyboard.press('Escape');
    console.log(
      'Personal clue archives passed: voluntary save, GM global dismissal and local preview, independent deletion and persistence across reload.',
    );
  } finally {
    socket.close();
    await Promise.all(contexts.map((context) => context.close()));
  }
}
