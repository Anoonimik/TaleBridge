import React, { useEffect, useId, useState } from 'react';
import { wsBridge, useAppStore, ModalShell } from '../../../shared';
export interface ConnectionModalProps {isOpen:boolean;onClose:()=>void;}
export const ConnectionModal=({isOpen,onClose}:ConnectionModalProps)=>{
  const connected=useAppStore(s=>s.connected),vault=useAppStore(s=>s.vaultName);
  const [host,setHost]=useState(wsBridge.getServerInfo().host),[port,setPort]=useState(String(wsBridge.getServerInfo().port));
  const [role,setRole]=useState<'gm'|'player'>('player'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const id=useId();
  useEffect(()=>{if(isOpen){setHost(wsBridge.getServerInfo().host);setPort(String(wsBridge.getServerInfo().port));setMessage('');}},[isOpen]);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setMessage('');
    try{
      const current=wsBridge.getServerInfo();if(current.host!==host.trim() || current.port!==Number(port))wsBridge.setServer(host.trim(),Number(port));
      await wsBridge.authenticate(role,code);setCode('');onClose();
    }catch(error){setMessage(error instanceof Error ? error.message : 'Не удалось подключиться');}finally{setBusy(false);}
  };
  return <ModalShell isOpen={isOpen} onClose={onClose} title="Подключение к Мастеру" subtitle={connected ? `Кампания: ${vault}` : 'Введите адрес сервера и личный код доступа'}>
    <form onSubmit={submit} className="p-4 overflow-y-auto flex flex-col gap-3">
      <label htmlFor={`${id}-host`}>Адрес сервера (IP или HTTPS-адрес)</label>
      <input id={`${id}-host`} required value={host} onChange={e=>setHost(e.target.value)} autoComplete="url" className="input-field" placeholder="192.168.1.10"/>
      <label htmlFor={`${id}-port`}>Порт</label>
      <input id={`${id}-port`} required type="number" min={1} max={65535} value={port} onChange={e=>setPort(e.target.value)} className="input-field"/>
      <label htmlFor={`${id}-role`}>Подключиться как</label>
      <select id={`${id}-role`} value={role} onChange={e=>setRole(e.target.value as 'gm'|'player')} className="input-field"><option value="player">Игрок</option><option value="gm">Мастер</option></select>
      <label htmlFor={`${id}-code`}>Код доступа</label>
      <input id={`${id}-code`} required type="password" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value)} className="input-field"/>
      <p className="text-slate-400">Мастер создает коды в настройках плагина Obsidian. Код игрока открывает только назначенного ему персонажа.</p>
      <div role="status" aria-live="polite" className="text-amber-300">{message}</div>
      <div className="flex gap-2 flex-wrap">
        <button type="submit" disabled={busy} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">{busy?'Подключение…':'Подключиться'}</button>
        <button type="button" disabled={busy} className="px-3 py-2 rounded border border-slate-500" onClick={async()=>{const result=await wsBridge.pingServer(host,Number(port));setMessage(result.ok?'Сервер доступен':result.error||'Нет связи');}}>Проверить сервер</button>
        {connected && <button type="button" onClick={()=>{void wsBridge.logout();}} className="px-3 py-2 rounded border border-slate-500">Выйти</button>}
      </div>
    </form>
  </ModalShell>;
};
