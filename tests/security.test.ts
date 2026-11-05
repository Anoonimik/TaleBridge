import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {SessionManager,secretHash} from '../obsidian-plugin/src/server/sessions';
import {replaceSection} from '../obsidian-plugin/src/vault/documents';

test('anonymous access cannot read or write campaign data',async()=>{
  const f=fixture(),c=f.client();for(const type of ['GET_CHARACTERS','GET_SCENES','GET_VAULT_IMAGES','GET_COMBAT_STATE']){const r=await f.send(c,type);assert.equal(r.type,'ERROR');assert.equal((r.payload as {code:string}).code,'UNAUTHORIZED');}f.app.dispose();
});
test('player snapshot never contains PIN, GM scenes, another character or journal',async()=>{
  const f=fixture(),a=await f.login('player','alice-code');const text=JSON.stringify(f.messages.get(a.id));assert.ok(!text.includes('gmHash'));assert.ok(!text.includes('gm-code'));assert.ok(!text.includes('GM secret'));assert.ok(!text.includes('Bob secret'));assert.ok(!text.includes('SCENES_LIST'));assert.ok(text.includes('Alice secret'));f.app.dispose();
});
test('player cannot request or change another character',async()=>{
  const f=fixture(),a=await f.login('player','alice-code');for(const type of ['GET_PLAYER_DATA','UPDATE_CHARACTER_HP']){const result=await f.send(a,type,{characterId:'bob',hp:0});assert.equal(result.type,'ERROR');}assert.equal((await f.repo.get('bob')).hp,15);f.app.dispose();
});
test('GM operations remain inaccessible to player',async()=>{
  const f=fixture(),a=await f.login('player','alice-code');for(const [type,payload] of [['GET_SCENES',{}],['GET_NOTE',{path:'players/Bob.md'}],['BROADCAST_HANDOUT',{type:'text',url:'secret'}],['SYNC_COMBAT_STATE',{active:false,round:1,turnIndex:0,combatants:[]}]])assert.equal((await f.send(a,String(type),payload)).type,'ERROR');f.app.dispose();
});
test('player data is delivered only to owner and requester',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),b=await f.login('player','bob-code'),gm=await f.login('gm','gm-code');f.messages.set(b.id,[]);f.messages.set(a.id,[]);
  const before=await f.repo.get('alice');await f.send(gm,'UPDATE_CHARACTER_PARAM',{characterId:'alice',param:'level',value:4},before.revision);
  assert.ok(f.messages.get(a.id)!.some(m=>m.type==='PLAYER_DATA'));assert.equal(f.messages.get(b.id)!.filter(m=>m.type==='PLAYER_DATA').length,0);f.app.dispose();
});
test('ACK is emitted after successful save and identical request is idempotent',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),before=await f.repo.get('alice');const first=await f.send(a,'UPDATE_PLAYER_NOTES',{characterId:'alice',notes:'$& saved'},before.revision,'same-request');assert.equal(first.type,'ACK');assert.ok(f.docs.get('players/Alice.md')!.includes('$& saved'));const content=f.docs.get('players/Alice.md');const again=await f.send(a,'UPDATE_PLAYER_NOTES',{characterId:'alice',notes:'$& saved'},before.revision,'same-request');assert.deepEqual(again,first);assert.equal(f.docs.get('players/Alice.md'),content);f.app.dispose();
});
test('conflicting write returns error and keeps external changes',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),before=await f.repo.get('alice');f.docs.set('players/Alice.md',replaceSection(f.docs.get('players/Alice.md')!,'Заметки игрока','## Заметки игрока\nexternal'));
  const result=await f.send(a,'UPDATE_PLAYER_NOTES',{characterId:'alice',notes:'old'},before.revision);assert.equal(result.type,'ERROR');assert.equal((result.payload as {code:string}).code,'CONFLICT');assert.ok(f.docs.get('players/Alice.md')!.includes('external'));f.app.dispose();
});
test('skills, temporary HP, spells and resources persist on server',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),before=await f.repo.get('alice');const state={skills:{athletics:'expert'},temp_hp:5,inspiration:true,spells:[{id:'s',name:'Light',level:0}],resources:[{id:'r',name:'Focus',current:1,max:2,resetOn:'long'}]};const result=await f.send(a,'UPDATE_CHARACTER_STATE',{characterId:'alice',state},before.revision);assert.equal(result.type,'ACK');const saved=await f.repo.get('alice');assert.equal(saved.skills?.athletics,'expert');assert.equal(saved.temp_hp,5);assert.equal(saved.spells?.[0].id,'s');assert.equal(saved.resources?.[0].current,1);assert.ok(f.docs.get('players/Alice.md')!.includes('custom: keep'));f.app.dispose();
});
test('clipboard commands and legacy attack command are rejected',async()=>{
  const f=fixture(),gm=await f.login('gm','gm-code');for(const type of ['GET_SYSTEM_CLIPBOARD','SET_SYSTEM_CLIPBOARD','UPDATE_CHARACTER_ATTACKS'])assert.equal((await f.send(gm,type)).type,'ERROR');f.app.dispose();
});
test('new action command saves and survives a fresh read',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),before=await f.repo.get('alice');assert.equal((await f.send(a,'UPDATE_CHARACTER_ACTIONS',{characterId:'alice',attacks:[{name:'Sword',hit:'+4',dmg:'1d8+2'}]},before.revision)).type,'ACK');assert.equal((await f.repo.get('alice')).attacks?.[0].name,'Sword');f.app.dispose();
});
test('media needs a resource-specific ticket, which is revoked with the session',async()=>{
  const f=fixture(),gm=await f.login('gm','gm-code');await f.send(gm,'GET_VAULT_IMAGES');const images=f.messages.get(gm.id)!.filter(m=>m.type==='VAULT_IMAGES_LIST').at(-1)!.payload as {path:string}[];const url=new URL(images[0].path,'http://localhost'),id=url.pathname.split('/').pop()!,ticket=url.searchParams.get('ticket')!;
  await assert.rejects(f.app.readMedia(id,'bad'));assert.equal((await f.app.readMedia(id,ticket)).data.toString(),'image');await assert.rejects(f.app.readMedia('another-id',ticket));f.sessions.revokeAll();await assert.rejects(f.app.readMedia(id,ticket));f.app.dispose();
});
test('expired/revoked sessions fail, login attempts are limited',()=>{
  let now=1000;const sessions=new SessionManager(()=>({gmHash:secretHash('secret'),invites:{}}),()=>now);const s=sessions.authenticate('good',{role:'gm',code:'secret'});assert.ok(sessions.isValid(s));now+=9*60*60*1000;assert.ok(!sessions.isValid(s));for(let i=0;i<5;i++)assert.throws(()=>sessions.authenticate('bad',{role:'gm',code:'wrong'}));assert.throws(()=>sessions.authenticate('bad',{role:'gm',code:'secret'}),/попыток/);
});
test('dice execution requires the registered GM driver and exact roll ID',async()=>{
  const f=fixture(),a=await f.login('player','alice-code'),driver=await f.login('gm','gm-code',true),other=await f.login('gm','gm-code');
  await f.send(a,'ROLL_DICE',{formula:'1d20',name:'Save',rollId:'roll-1',isGmOnly:true});const routed=f.messages.get(driver.id)!.find(m=>m.type==='ROLL_DICE')!;assert.equal((routed.payload as {isGmOnly:boolean}).isGmOnly,false);
  assert.equal((await f.send(other,'DICE_RESULT',{rollId:'roll-1',total:20})).type,'ERROR');await f.send(driver,'DICE_RESULT',{rollId:'roll-1',total:7});assert.equal((f.messages.get(a.id)!.find(m=>m.type==='DICE_RESULT')!.payload as {total:number}).total,7);assert.equal((await f.send(driver,'DICE_RESULT',{rollId:'roll-1',total:20})).type,'ERROR');f.app.dispose();
});
