import test from 'node:test';
import assert from 'node:assert/strict';
import { allowanceState } from '../src/utils/adAllowance.js';
const grant = { owner: 7, remainingSeconds: 300, receivedAt: 1000, leaseUntil: new Date(11000).toISOString() };
test('valid Premium sees a countdown only inside server-issued lease', () => {
  assert.deepEqual(allowanceState(grant,7,true,6000), {remainingSeconds:295,adFreeActive:true});
  assert.equal(allowanceState(grant,7,true,11000).adFreeActive,false);
});
test('ordinary, logged-out or switched users cannot reuse another entitlement', () => {
  assert.equal(allowanceState(grant,7,false,2000).adFreeActive,false);
  assert.equal(allowanceState(grant,8,true,2000).adFreeActive,false);
  assert.equal(allowanceState(null,7,true,2000).adFreeActive,false);
});
test('exhausted allowance renders ads even with a valid Premium plan', () => {
  assert.equal(allowanceState({...grant,remainingSeconds:0},7,true,2000).adFreeActive,false);
});
