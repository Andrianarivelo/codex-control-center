'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readEffort, writeEffortText } = require('../src/config');
const { normalizeWindow } = require('../src/usage');

test('reads configured reasoning effort', () => {
  assert.equal(readEffort('model = "gpt-5.6-sol"\nmodel_reasoning_effort = "xhigh"\n'), 'xhigh');
});

test('updates effort without disturbing the rest of the TOML file', () => {
  const original = 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "medium"\n[features]\nfoo = true\n';
  const updated = writeEffortText(original, 'max');
  assert.equal(updated, 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "max"\n[features]\nfoo = true\n');
});

test('inserts effort after the model setting', () => {
  assert.equal(writeEffortText('model = "gpt-5.6-sol"\n', 'low'), 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "low"\n');
});

test('normalizes a usage window as remaining allowance', () => {
  assert.deepEqual(normalizeWindow({ used_percent: 23, reset_after_seconds: 90 }), { used: 23, remaining: 77, resetSeconds: 90 });
});
