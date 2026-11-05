import assert from 'node:assert/strict';

// Exercise the shipped CSS cascade, including utilities and inherited disabled state.
export async function checkCursors(page) {
  const cursors = await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.innerHTML = `
      <button data-case="button">Button</button>
      <select data-case="select"><option>Option</option></select>
      <input data-case="checkbox" type="checkbox">
      <input data-case="radio" type="radio">
      <input data-case="submit" type="submit">
      <details><summary data-case="summary">Details</summary></details>
      <div data-case="role" role="button">Action</div>
      <button data-case="disabled" class="cursor-pointer" disabled>Disabled</button>
      <button data-case="disabled-role" role="button" disabled>Disabled</button>
      <div data-case="aria-disabled" role="button" aria-disabled="true" class="cursor-pointer">Disabled</div>
      <fieldset disabled>
        <legend><button data-case="legend">Available</button></legend>
        <button data-case="fieldset-button" class="cursor-pointer">Disabled</button>
        <select data-case="fieldset-select" class="cursor-pointer"><option>Option</option></select>
        <label data-case="disabled-label" class="cursor-pointer"><input type="checkbox">Disabled</label>
      </fieldset>
      <label data-case="checkbox-label"><input type="checkbox">Check</label>
      <label data-case="text-label"><input type="text">Text</label>
      <input data-case="text" type="text">
      <textarea data-case="textarea"></textarea>
      <button data-case="special-cursor" class="cursor-not-allowed">Custom cursor</button>
      <button data-case="dynamic" class="cursor-pointer">Dynamic</button>
    `;
    document.body.append(fixture);
    try {
      const values = Object.fromEntries(
        [...fixture.querySelectorAll('[data-case]')].map((element) => [
          element.dataset.case,
          getComputedStyle(element).cursor,
        ]),
      );
      const dynamic = fixture.querySelector('[data-case="dynamic"]');
      dynamic.disabled = true;
      values['dynamic-disabled'] = getComputedStyle(dynamic).cursor;
      dynamic.disabled = false;
      values['dynamic-enabled'] = getComputedStyle(dynamic).cursor;
      return values;
    } finally {
      fixture.remove();
    }
  });
  for (const name of [
    'button',
    'select',
    'checkbox',
    'radio',
    'submit',
    'summary',
    'role',
    'legend',
    'checkbox-label',
    'dynamic',
    'dynamic-enabled',
  ])
    assert.equal(cursors[name], 'pointer', `${name} should signal an available action`);
  for (const name of [
    'disabled',
    'disabled-role',
    'aria-disabled',
    'fieldset-button',
    'fieldset-select',
    'disabled-label',
    'special-cursor',
    'dynamic-disabled',
  ])
    assert.equal(cursors[name], 'not-allowed', `${name} should signal an unavailable action`);
  assert.ok(
    ['auto', 'default'].includes(cursors['text-label']),
    'Text labels should keep their normal cursor',
  );
  assert.equal(cursors.text, 'text');
  assert.equal(cursors.textarea, 'text');
}
