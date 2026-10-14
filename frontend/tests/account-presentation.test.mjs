import test from 'node:test';
import assert from 'node:assert/strict';
import {accountInitials,accountRole} from '../src/utils/accountPresentation.js';
test('default avatar uses actual user initials, including Vietnamese names',()=>{
  assert.equal(accountInitials({fullName:'Bùi Quang Cường'}),'QC');
  assert.equal(accountInitials({fullName:'  Đức Ngọc  '}),'ĐN');
  assert.equal(accountInitials({username:'reader.demo'}),'R');
  assert.equal(accountInitials(null),'U');
});
test('account label follows current role rather than current workspace',()=>{
  assert.equal(accountRole(['READER','ADMINISTRATOR'])[1],'Administrator');
  assert.equal(accountRole(['AD_MANAGER'])[1],'Ad manager');
  assert.equal(accountRole(['BUSINESS'])[1],'Business');
  assert.equal(accountRole(['SUBSCRIBER'])[1],'Reader');
});
