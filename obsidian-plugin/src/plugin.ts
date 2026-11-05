import {serveHttp} from './server/http';
import { Plugin, PluginSettingTab, Setting, Modal, Notice, TFile, type App } from 'obsidian';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Character, CombatState } from '../../packages/domain/types';
import { APP_VERSION, combatSchema } from '../../packages/protocol';
import { BridgeServer, type Client } from './server/transport';
import { SessionManager, newCode, secretHash } from './server/sessions';
import { BridgeApplication } from './application';
import { CharacterRepository } from './vault/repository';
import { scanCharacters, scanScenes } from './vault/parsers';
import { patchFrontmatter } from './vault/documents';

interface Settings {
  port: number; bind: string; allowedOrigins: string[]; gmHash: string; invites: Record<string,string>;
  campaignId: string; combat?: CombatState;
}
class CodeModal extends Modal {
  constructor(app:App,private code:string) {super(app);}
  onOpen() {
    this.titleEl.setText('Сохраните код доступа');
    this.contentEl.createEl('p',{text:'Код показывается один раз. Передайте его только назначенному участнику.'});
    const field = this.contentEl.createEl('input',{type:'text',value:this.code}); field.readOnly = true; field.setAttribute('aria-label','Код доступа'); field.select();
    new Setting(this.contentEl).addButton(b => b.setButtonText('Копировать').onClick(async () => { await navigator.clipboard.writeText(this.code); new Notice('Код скопирован'); }));
  }
}
class SettingsTab extends PluginSettingTab {
  constructor(app:App,private bridge:TaleBridgePlugin) {super(app,bridge);}
  display() {
    this.containerEl.empty(); this.containerEl.createEl('h2',{text:'TaleBridge — подключения'});
    new Setting(this.containerEl).setName('Код Мастера').setDesc('Создание нового кода отзывает все активные сессии. Старый PIN не используется.').addButton(b => b.setButtonText('Создать новый код').onClick(async () => {
      const code = newCode(); this.bridge.settings.gmHash = secretHash(code); await this.bridge.revokeAndSave(); new CodeModal(this.app,code).open();
    }));
    new Setting(this.containerEl).setName('Порт').setDesc('Применяется после перезапуска плагина.').addText(t => t.setValue(String(this.bridge.settings.port)).onChange(async value => {
      const port = Number(value); if (Number.isInteger(port) && port > 1024 && port <= 65535) {this.bridge.settings.port = port; await this.bridge.saveSettings();}
    }));
    new Setting(this.containerEl).setName('Разрешить подключения по локальной сети').setDesc('Используйте доверенную сеть/VPN. Для публичного сервера необходим HTTPS/WSS proxy. Применяется после перезапуска.').addToggle(t => t.setValue(this.bridge.settings.bind === '0.0.0.0').onChange(async value => {this.bridge.settings.bind = value ? '0.0.0.0' : '127.0.0.1'; await this.bridge.saveSettings();}));
    new Setting(this.containerEl).setName('Разрешенные origin').setDesc('По одному полному HTTP(S) origin в строке. Адрес самого сервера разрешен автоматически.').addTextArea(t => t.setValue(this.bridge.settings.allowedOrigins.join('\n')).onChange(async value => {
      const origins = value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      if (origins.every(v => {try {return new URL(v).origin === v && /^https?:/.test(v);} catch {return false;}})) {this.bridge.settings.allowedOrigins = origins; await this.bridge.saveSettings();}
    }));
    this.containerEl.createEl('h3',{text:'Коды игроков'});
    this.containerEl.createEl('p',{text:'Каждый код предоставляет доступ только к одному персонажу. Обновление кода отзывает сессии.'});
    const list = this.containerEl.createDiv();
    void this.bridge.characters().then(characters => {
      if (!this.containerEl.contains(list)) return;
      for (const character of characters.filter(c => c.playable)) new Setting(list).setName(character.name).addButton(b => b.setButtonText('Создать код').onClick(async () => {
        const code = newCode(); this.bridge.settings.invites[character.id!] = secretHash(code); await this.bridge.revokeAndSave(); new CodeModal(this.app,code).open();
      })).addButton(b => b.setButtonText('Отозвать').onClick(async () => {delete this.bridge.settings.invites[character.id!]; await this.bridge.revokeAndSave(); new Notice('Доступ отозван');}));
    }).catch(() => new Notice('Не удалось прочитать персонажей. Проверьте YAML заметок.'));
  }
}
export default class TaleBridgePlugin extends Plugin {
  declare settings:Settings;
  private transport?:BridgeServer;
  private application?:BridgeApplication;
  private repository!:CharacterRepository;
  private status?:HTMLElement;
  private scanTimer?:ReturnType<typeof setTimeout>;
  private characterCache?:Promise<Character[]>;
  private sceneCache?:ReturnType<typeof scanScenes>;
  private stopping = false;
  private clientQueues = new Map<string,Promise<void>>();
  async onload() {
    const stored = (await this.loadData()) || {};
    const combat = combatSchema.safeParse(stored.combat);
    this.settings = {port:stored.port || 30123,bind:stored.bind === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1',allowedOrigins:Array.isArray(stored.allowedOrigins) ? stored.allowedOrigins : [],gmHash:stored.gmHash || '',invites:stored.invites || {},campaignId:stored.campaignId || randomUUID(),combat:combat.success ? {...combat.data,revision:stored.combat.revision || randomUUID()} : undefined};
    await this.saveSettings();
    this.repository = new CharacterRepository({
      getMarkdownFiles:() => this.app.vault.getMarkdownFiles(),
      read:file => this.app.vault.read(this.note(file.path)),
      process:(file,update) => this.app.vault.process(this.note(file.path),update),
    });
    this.status = this.addStatusBarItem();
    const sessions = new SessionManager(() => this.settings);
    this.transport = new BridgeServer({...this.settings,allowWebview:true},(req,res) => this.http(req,res));
    this.application = new BridgeApplication(sessions,{
      repository:this.repository,campaignId:this.settings.campaignId,vaultName:() => this.app.vault.getName(),listCharacters:() => this.characters(),
      listScenes:() => this.scenes(),readNote:path => this.app.vault.read(this.note(path)),openNote:async path => {await this.app.workspace.getLeaf(false).openFile(this.note(path));},
      linkCreature:async (id,name) => {
        const file = this.app.workspace.getActiveFile(); if (!file) throw new Error('Нет активной заметки');
        await this.app.vault.process(file,content => patchFrontmatter(content,{talespire_id:id,talespire_name:name}));
      },
      images:() => this.app.vault.getFiles().filter(f => /\.(png|jpe?g|gif|webp|mp4|webm|mp3|ogg|wav)$/i.test(f.path)).map(f => ({path:f.path,name:f.name})),
      readAsset:async path => {const file = this.note(path); if (file.stat.size > 25*1024*1024) throw new Error('Слишком большой файл'); return Buffer.from(await this.app.vault.readBinary(file));},
      saveCombat:async state => {this.settings.combat = state; await this.saveSettings();},
      send:(client,message) => this.transport?.send(client,message),clients:() => this.transport?.clients || [],
    },this.settings.combat);
    this.transport.on('connection',() => this.updateStatus());
    this.transport.on('disconnect',(client:Client) => {this.clientQueues.delete(client.id); this.application?.disconnect(client); this.updateStatus();});
    this.transport.on('message',(raw:string,client:Client) => {
      const previous = this.clientQueues.get(client.id) || Promise.resolve();
      const next = previous.catch(() => {}).then(() => this.application?.handle(raw,client));
      this.clientQueues.set(client.id,next);
      void next.finally(() => {if(this.clientQueues.get(client.id) === next) this.clientQueues.delete(client.id);});
    });
    try {await this.transport.start(); this.updateStatus();} catch {await this.transport.stop(); new Notice('TaleBridge: не удалось запустить сервер. Проверьте порт.');}
    const invalidate = () => {
      this.characterCache = undefined; this.sceneCache = undefined; clearTimeout(this.scanTimer);
      this.scanTimer = setTimeout(() => {if(!this.stopping) void this.application?.refresh().catch(() => new Notice('TaleBridge: ошибка обновления заметок'));},500);
    };
    this.registerEvent(this.app.metadataCache.on('changed',invalidate));
    this.registerEvent(this.app.vault.on('rename',invalidate)); this.registerEvent(this.app.vault.on('delete',invalidate));
    this.addSettingTab(new SettingsTab(this.app,this));
    this.addCommand({id:'talebridge-open',name:'Открыть браузерный клиент',callback:() => window.open(`http://127.0.0.1:${this.settings.port}/`)});
    this.addCommand({id:'talebridge-revoke',name:'Отозвать все подключения',callback:() => {void this.revokeAndSave();}});
    this.registerMarkdownCodeBlockProcessor('dnd-action',(source,el) => {
      const data = Object.fromEntries(source.split(/\r?\n/).filter(l => l.includes(':')).map(l => [l.slice(0,l.indexOf(':')).trim(),l.slice(l.indexOf(':')+1).trim()]));
      el.createEl('strong',{text:data.name || 'Действие'});
      el.createEl('p',{text:[data.hit && `Попадание: ${data.hit}`,data.dmg && `Урон: ${data.dmg}`,data.desc].filter(Boolean).join(' · ')});
      // The same authenticated executor is used by the companion; no unauthenticated global helper.
      el.createEl('a',{text:'Открыть TaleBridge для броска',href:`http://127.0.0.1:${this.settings.port}/`});
    });
    if (!this.settings.gmHash) new Notice('TaleBridge: создайте код Мастера в настройках плагина. Старый PIN отключен.');
  }
  private note(path:string):TFile {const file = this.app.vault.getAbstractFileByPath(path); if(!(file instanceof TFile)) throw new Error('Файл не найден'); return file;}
  characters():Promise<Character[]> {
    if (!this.characterCache) this.characterCache = scanCharacters(this.app.vault,this.app.metadataCache).then(async records => {
      const result:Character[] = [];
      for (const record of records) {const character = await this.repository.identify(this.note(record.path)); result.push({...character,category:record.category,playable:record.playable,tags:record.tags.map(String)});}
      return result;
    }).catch(error => {this.characterCache = undefined; throw error;});
    return this.characterCache.then(records => Promise.all(records.map(async record => ({...record,...await this.repository.get(record.id!)}))));
  }
  private scenes() {return this.sceneCache ||= scanScenes(this.app.vault,this.app.metadataCache);}
  saveSettings() {return this.saveData(this.settings);}
  async revokeAndSave() {this.application?.sessions.revokeAll(); for(const c of this.transport?.clients || []) c.socket.close(1008,'Access revoked'); await this.saveSettings();}
  private updateStatus() {this.status?.setText(`TaleBridge ${APP_VERSION}: ${this.transport?.clients.size || 0} подключений`);}
  private async http(req:IncomingMessage,res:ServerResponse):Promise<void> {
    await serveHttp(req,res,{application:this.application!,readStatic:async relative => Buffer.from(await this.app.vault.adapter.readBinary(this.manifest.dir + '/web/' + relative))});
  }

  async onunload() {this.stopping = true; clearTimeout(this.scanTimer); this.application?.dispose(); await this.transport?.stop(); this.clientQueues.clear();}
}
