import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventorySchema } from '../packages/protocol';
import { parseInventory, serializeInventory } from '../obsidian-plugin/src/vault/parsers';
import { getConsumableActionInfo } from '../symbiote/src/features/manage-inventory/lib/consumable-helper';
import { fixture } from './fixtures';
import type { InventoryItem } from '../packages/domain/types';
import { mergeInventoryEdit } from '../packages/domain/inventory-edit';

test('all representable editor categories and tiny weights survive a vault roundtrip', () => {
  for (const category of ['Снаряжение — редкое', 'Custom [type]', 'Custom (type)', 'A - B'])
    for (const weight of [0, 0.025, 0.0000001, 1e-10, 100000]) {
      const item = {
        id: 'edge',
        name: 'Item',
        category,
        quantity: 2,
        equipped: false,
        weight,
        description: 'Details',
      };
      assert.deepEqual(parseInventory(serializeInventory([item])), [item]);
    }
});

test('malformed encoded records fail closed instead of being rewritten as item names', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');
    const broken =
      '## Инвентарь\n- [ ] {"name":broken} <!-- talebridge-item-json:v1 --> <!-- talebridge-item:broken -->';
    assert.throws(() => parseInventory(broken), /Повреждена запись/);
    assert.throws(
      () => parseInventory('## Инвентарь\n- [ ] {"quantity":0} <!-- talebridge-item:old -->'),
      /Повреждена запись/,
    );
    const content = f.docs
      .get('players/Alice.md')!
      .replace('## Инвентарь', broken + '\n## Old inventory');
    f.docs.set('players/Alice.md', content);
    assert.equal(
      (
        await f.send(
          player,
          'UPDATE_INVENTORY',
          { characterId: 'alice', items: [{ id: 'new', name: 'New' }] },
          before.revision,
        )
      ).type,
      'ERROR',
    );
    assert.equal(f.docs.get('players/Alice.md'), content);
  } finally {
    f.app.dispose();
  }
});

test('vault write failure never acknowledges an inventory edit or changes the stored note', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');
    const content = f.docs.get('players/Alice.md');
    f.vault.process = async () => {
      throw new Error('Disk write failed');
    };
    const response = await f.send(
      player,
      'UPDATE_INVENTORY',
      { characterId: 'alice', items: [{ id: 'new', name: 'New' }] },
      before.revision,
    );
    assert.equal(response.type, 'ERROR');
    assert.equal(f.docs.get('players/Alice.md'), content);
  } finally {
    f.app.dispose();
  }
});

test('editing preserves concurrent quantity changes but rejects field conflicts and deleted items', () => {
  const original = { id: 'one', name: 'Rope', quantity: 3, weight: 1 };
  const edited = { ...original, name: 'Silk rope' };
  assert.deepEqual(mergeInventoryEdit(original, { ...original, quantity: 2 }, edited), {
    ...edited,
    quantity: 2,
  });
  assert.throws(() => mergeInventoryEdit(original, { ...original, name: 'Other rope' }, edited));
  assert.throws(() => mergeInventoryEdit(original, undefined, edited));
  assert.throws(() => mergeInventoryEdit(original, original, { ...edited, id: 'two' }));
  assert.equal(
    mergeInventoryEdit(
      { id: 'x', name: 'Old' },
      { id: 'x', name: 'Old', quantity: 5 },
      { id: 'x', name: 'New', quantity: 1 },
    ).quantity,
    5,
  );
});

test('special names and multiline descriptions roundtrip without injecting Markdown sections', () => {
  const item = {
    id: 'complex',
    name: 'Sword (silver) [rare] — +1',
    category: 'Custom [type]',
    quantity: 2,
    weight: 0.025,
    equipped: true,
    description: 'First line\n## Not a new section\n- Not another item $&',
  };
  const markdown = serializeInventory([item]);
  assert.deepEqual(parseInventory(markdown), [item]);
  assert.equal(markdown.split('\n').length, 2);
});

test('inventory edits require ownership and a fresh server revision', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');
    const items = [{ id: 'one', name: 'Edited item', quantity: 1 }];
    assert.equal(
      (await f.send(player, 'UPDATE_INVENTORY', { characterId: 'bob', items }, before.revision))
        .type,
      'ERROR',
    );
    assert.equal(
      (await f.send(player, 'UPDATE_INVENTORY', { characterId: 'alice', items }, before.revision))
        .type,
      'ACK',
    );
    assert.equal(
      (
        await f.send(
          player,
          'UPDATE_INVENTORY',
          { characterId: 'alice', items: [{ ...items[0], name: 'Stale edit' }] },
          before.revision,
        )
      ).type,
      'ERROR',
    );
    assert.equal((await f.repo.get('alice')).inventory?.[0].name, 'Edited item');
  } finally {
    f.app.dispose();
  }
});

test('inventorySchema accepts fully edited items and enforces validations', () => {
  const validEditedItems: InventoryItem[] = [
    {
      id: 'it_sword_01',
      name: 'Меч правосудия +1',
      category: 'Оружие',
      quantity: 1,
      weight: 1.5,
      equipped: true,
      description: 'Магический длинный меч, +1 к броскам атаки и урону.',
    },
    {
      id: 'it_potion_02',
      name: 'Зелье исцеления',
      category: 'Зелья',
      quantity: 3,
      weight: 0.2,
      equipped: false,
      description: 'Восстанавливает 2d4+2 хитов.',
    },
  ];

  const parsed = inventorySchema.parse(validEditedItems);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Меч правосудия +1');
  assert.equal(parsed[0].equipped, true);
  assert.equal(parsed[1].quantity, 3);
  assert.equal(parsed[1].description, 'Восстанавливает 2d4+2 хитов.');

  // Enforces positive integer quantity
  assert.throws(() => inventorySchema.parse([{ id: 'it_bad', name: 'Item', quantity: 0 }]));

  // Enforces non-negative weight
  assert.throws(() => inventorySchema.parse([{ id: 'it_bad', name: 'Item', weight: -1 }]));

  // Enforces unique IDs
  assert.throws(() =>
    inventorySchema.parse([
      { id: 'it_dup', name: 'Item 1' },
      { id: 'it_dup', name: 'Item 2' },
    ]),
  );
});

test('edited inventory items roundtrip cleanly through markdown serialization', () => {
  const original: InventoryItem[] = [
    {
      id: 'it_shield_magic',
      name: 'Щит стража',
      category: 'Броня',
      quantity: 1,
      weight: 3,
      equipped: true,
      description: '+2 КД, дает преимущество на спасброски от заклинаний',
    },
    {
      id: 'it_healer_kit',
      name: 'Походная аптечка',
      category: 'Снаряжение',
      quantity: 5,
      weight: 1.5,
      equipped: false,
      description: '10 использований для стабилизации',
    },
  ];

  const markdown = serializeInventory(original);
  assert.ok(markdown.includes('Щит стража'));
  assert.ok(markdown.includes('[x]'));
  assert.ok(markdown.includes('Походная аптечка'));
  assert.ok(markdown.includes('[ ]'));
  assert.ok(markdown.includes('<!-- talebridge-item:it_shield_magic -->'));
  assert.ok(markdown.includes('<!-- talebridge-item:it_healer_kit -->'));

  const deserialized = parseInventory(markdown);
  assert.equal(deserialized.length, 2);
  assert.deepEqual(deserialized[0], original[0]);
  assert.deepEqual(deserialized[1], original[1]);
});

test('editing item description updates consumable action detection dynamically', () => {
  const item: InventoryItem = {
    id: 'it_custom_brew',
    name: 'Старая склянка',
    category: 'Снаряжение',
    quantity: 1,
    weight: 0.5,
  };

  // Initially generic item
  const beforeEdit = getConsumableActionInfo(item);
  assert.equal(beforeEdit.isConsumable, false);
  assert.equal(beforeEdit.isHealing, false);
  assert.equal(beforeEdit.formula, null);

  // User edits item to be a healing potion with custom formula
  const editedItem: InventoryItem = {
    ...item,
    category: 'Зелья',
    name: 'Целебный отвар знахаря',
    description: 'Восстанавливает 3d8+4 хитов при употреблении',
  };

  const afterEdit = getConsumableActionInfo(editedItem);
  assert.equal(afterEdit.isConsumable, true);
  assert.equal(afterEdit.isHealing, true);
  assert.equal(afterEdit.formula, '3d8+4');
  assert.equal(afterEdit.label, 'Выпить');
});

test('server persists edited inventory items across UPDATE_INVENTORY', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');

    const editedItems: InventoryItem[] = [
      {
        id: 'it_vorpal',
        name: 'Остро заточенный кинжал',
        category: 'Оружие',
        quantity: 2,
        weight: 0.5,
        equipped: true,
        description: 'Урон 1d4+2 колющий',
      },
      {
        id: 'it_rations',
        name: 'Эльфийский дорожный паек',
        category: 'Снаряжение',
        quantity: 10,
        weight: 2,
        equipped: false,
        description: 'Сытный сухой паек на 10 дней',
      },
    ];

    const ack = await f.send(
      player,
      'UPDATE_INVENTORY',
      { characterId: 'alice', items: editedItems },
      before.revision,
    );
    assert.equal(ack.type, 'ACK');

    const updated = await f.repo.get('alice');
    assert.equal(updated.inventory?.length, 2);
    assert.equal(updated.inventory?.[0].name, 'Остро заточенный кинжал');
    assert.equal(updated.inventory?.[0].quantity, 2);
    assert.equal(updated.inventory?.[0].equipped, true);
    assert.equal(updated.inventory?.[1].name, 'Эльфийский дорожный паек');
    assert.equal(updated.inventory?.[1].quantity, 10);
  } finally {
    f.app.dispose();
  }
});
