import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replaceActions,replaceSection,patchFrontmatter,frontmatter,replaceStats} from '../obsidian-plugin/src/vault/documents';
import {fixture} from './fixtures';
import {cleanDiceFormula} from '../packages/domain/dice';
import {parseCommand} from '../packages/protocol';
import {parseRollResults} from '../symbiote/src/shared/api/talespire';

test('actions preserve intermediate prose, tails, dollar text and CRLF',()=>{
  const source='# Hero\r\n```dnd-action\r\nname: A\r\n```\r\nKEEP $&\r\n```dnd-action\r\nname: B\r\n```\r\n## Tail\r\nPreserve';
  const output=replaceActions(source,[{name:'C',desc:'$& $1'}]);assert.ok(output.includes('KEEP $&'));assert.ok(output.includes('Preserve'));assert.ok(output.includes('desc: $& $1'));assert.equal(output.match(/dnd-action/g)?.length,1);assert.ok(!output.replaceAll('\r\n','').includes('\n'));
});
test('section replacement treats dollars literally and ignores headings in code fences',()=>{
  const source='# Hero\n## Заметки игрока\n```md\n## Fake\n```\nold\n## Inventory\nKEEP';
  const result=replaceSection(source,'Заметки игрока','## Заметки игрока\n$& $1');assert.ok(result.includes('$& $1'));assert.ok(result.endsWith('## Inventory\nKEEP'));assert.ok(!result.includes('old'));
});
test('frontmatter patch retains comments, unknown fields and CRLF body',()=>{
  const output=patchFrontmatter('---\r\n# keep comment\r\ncustom: value\r\nhp: 4\r\n---\r\n# Body\r\n',{hp:5});assert.ok(output.includes('# keep comment'));assert.equal(frontmatter(output).custom,'value');assert.ok(output.endsWith('# Body\r\n'));
});
test('malformed YAML cancels writes',()=>assert.throws(()=>patchFrontmatter('---\nhp: [broken\n---\nbody',{hp:3})));
test('stat replacement does not corrupt table heading or following text',()=>{
  const source='| STR | DEX | CON | INT | WIS | CHA |\n| --- | --- | --- | --- | --- | --- |\n| 10 | 10 | 10 | 10 | 10 | 10 |\nTAIL';
  assert.ok(replaceStats(source,{str:'12 (+1)',dex:'10',con:'10',int:'10',wis:'10',cha:'10'}).endsWith('TAIL'));
});
test('concurrent writers with the same revision produce a conflict, never lost updates',async()=>{
  const f=fixture();const character=await f.repo.identify(f.files[0]);const settled=await Promise.allSettled([
    f.repo.update('alice',character.revision,c=>replaceSection(c,'Инвентарь','## Инвентарь\nNEW ITEM')),
    f.repo.update('alice',character.revision,c=>replaceSection(c,'Заметки игрока','## Заметки игрока\nNEW NOTE')),
  ]);assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);assert.equal(settled.filter(r=>r.status==='rejected').length,1);const latest=await f.repo.get('alice');await f.repo.update('alice',latest.revision,c=>replaceSection(c,'Заметки игрока','## Заметки игрока\nNEW NOTE'));const content=f.docs.get(f.files[0].path)!;assert.ok(content.includes('NEW ITEM'));assert.ok(content.includes('NEW NOTE'));f.app.dispose();
});
test('writes require revision and stable identity',async()=>{
  const f=fixture();await f.repo.identify(f.files[0]);await assert.rejects(f.repo.update('alice',undefined,c=>c),/версия/);f.docs.set(f.files[0].path,'---\ntalebridge_id: other\n---\n');await assert.rejects(f.repo.get('alice'));f.app.dispose();
});
test('dice grammar keeps composite expressions and rejects unsupported input',()=>{
  assert.equal(cleanDiceFormula('2d6 + 1d4 + 3'),'2d6+1d4+3');assert.equal(cleanDiceFormula('+4'),'1d20+4');assert.equal(cleanDiceFormula('2d20kh1-2'),'2d20kh1-2');for(const bad of ['2d6;alert(1)','101d6','1d1','2d20kh3'])assert.throws(()=>cleanDiceFormula(bad));
});
test('official TaleSpire result tree supports nested subtraction and modifiers',()=>{
  assert.equal(parseRollResults({kind:'rollResults',payload:{rollId:'r',resultsGroups:[{name:'test',result:{operator:'-',operands:[{kind:'d20',results:[16]},{value:3}]}}]}}),13);
  assert.equal(parseRollResults({resultsGroups:[{result:{operator:'+',operands:[{kind:'d6',results:[2,4]},{value:3}]}}]}),9);assert.equal(parseRollResults(null),null);
});
test('invalid messages and unsupported protocol are rejected',()=>{
  for(const value of [null,{},[],{type:'UPDATE_CHARACTER_HP',payload:{hp:-100}},{protocolVersion:9,requestId:'r',type:'PING',payload:{}}])assert.throws(()=>parseCommand(value));
  assert.throws(()=>parseCommand({protocolVersion:1,requestId:'r',type:'UPDATE_CHARACTER_HP',payload:{characterId:'a',hp:30,maxHp:20}}));
});
