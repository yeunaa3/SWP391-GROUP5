import test from 'node:test';
import assert from 'node:assert/strict';
import {readerPolicy} from '../src/utils/readerPolicy.js';
test('business, manager and admin never see reader marketing or ads',()=>{
  for(const role of ['BUSINESS','AD_MANAGER','ADMINISTRATOR']){
    assert.deepEqual(readerPolicy({roles:[role]},false),{readerNavigation:false,showAdvertising:false});
    assert.deepEqual(readerPolicy({roles:[role,'READER','SUBSCRIBER']},true),{readerNavigation:false,showAdvertising:false});
  }
});
test('ordinary readers see marketing and ads while active Premium hides ads without a timer',()=>{
  assert.deepEqual(readerPolicy({roles:['READER']},false),{readerNavigation:true,showAdvertising:true});
  assert.deepEqual(readerPolicy({roles:['SUBSCRIBER']},true),{readerNavigation:true,showAdvertising:false});
  assert.equal(readerPolicy({roles:['SUBSCRIBER']},false).showAdvertising,true);
});
test('guests retain public navigation; unknown signed-in roles fail closed',()=>{
  assert.equal(readerPolicy(null).showAdvertising,true);
  assert.deepEqual(readerPolicy({roles:[]}),{readerNavigation:false,showAdvertising:false});
});
