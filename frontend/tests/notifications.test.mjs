import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationCategory,notificationDestination,filterNotifications} from '../src/utils/notifications.js';
const premium={id:1,title:'Gói đã duyệt',content:'Kiểm tra thời hạn',type:'PREMIUM',entityType:'PREMIUM_REQUEST',entityId:'42',read:false};
test('notification filters combine read state, category and text',()=>{
  const items=[premium,{id:2,title:'Đăng nhập',content:'Bảo mật',type:'ACCOUNT',read:true}];
  assert.equal(filterNotifications(items,{state:'unread',category:'premium',query:'duyệt'}).length,1);
  assert.equal(filterNotifications(items,{state:'read',category:'premium'}).length,0);
  assert.equal(notificationCategory({entityType:'CONTRACT'}),'payment');
});
test('related records link to the correct role workspace',()=>{
  assert.equal(notificationDestination(premium,['READER']),'/premium/my-subscription');
  assert.equal(notificationDestination(premium,['ADMINISTRATOR']),'/admin/subscription-packages');
  const campaign={entityType:'CAMPAIGN',entityId:'12'};
  assert.equal(notificationDestination(campaign,['BUSINESS']),'/business/campaigns/12');
  assert.equal(notificationDestination(campaign,['AD_MANAGER']),'/ad-manager/campaigns/12/review');
  assert.equal(notificationDestination(campaign,['READER']),null);
});
test('untrusted destination strings cannot become navigation URLs',()=>{
  assert.equal(notificationDestination({entityType:'CAMPAIGN',entityId:'https://evil.test'},['BUSINESS']),'/business/campaigns');
  assert.equal(notificationDestination({entityType:'https://evil.test',entityId:'42'},['READER']),null);
});
