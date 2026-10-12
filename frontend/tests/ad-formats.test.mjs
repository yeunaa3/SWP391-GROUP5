import test from 'node:test';
import assert from 'node:assert/strict';
import { adFormat, adFormats } from '../src/utils/adFormats.js';

test('six existing placements have distinct responsive presentation formats', () => {
  assert.equal(new Set(Object.values(adFormats).map(item => item.name)).size, 6);
  assert.equal(adFormat('IN_ARTICLE').name, 'rectangle');
  assert.equal(adFormat('ARTICLE_SIDEBAR').name, 'skyscraper');
  assert.equal(adFormat('unknown').name, 'billboard');
});
