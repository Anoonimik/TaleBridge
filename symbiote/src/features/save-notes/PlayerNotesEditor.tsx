import React,{useId} from 'react';
import {useRosterStore} from '../../shared/lib/useRosterStore';
import type {Character} from '../../shared/types';
import {useNotesSession} from './useNotesSession';
const labels={saved:'Подтверждено сервером',local:'Черновик на этом устройстве',saving:'Сохранение…',error:'Не сохранено на сервере'};
const NotesSession=({character}:{character:Character})=>{
  const session=useNotesSession(character),id=useId();
  return <section className="p-3 h-full flex flex-col gap-3 overflow-hidden">
    <div className="flex flex-wrap gap-2 items-center justify-between"><label htmlFor={id} className="font-bold">Личный журнал: {character.name}</label><span role="status" aria-live="polite">{labels[session.status]}</span></div>
    {session.error && <div role="alert" className="text-amber-300">{session.error} Текст остается в локальном черновике.<button type="button" className="underline ml-2" onClick={session.acceptServer}>Загрузить серверную версию</button></div>}
    <textarea id={id} value={session.text} onChange={e=>session.change(e.target.value)} className="input-field flex-1 resize-none leading-relaxed" placeholder="Улики, имена NPC и заметки…"/>
    <button type="button" disabled={session.status==='saving'} onClick={()=>{void session.save();}} className="p-2 rounded bg-indigo-600 text-white self-end">Сохранить сейчас</button>
  </section>;
};
export const PlayerNotesEditor=()=>{
  const character=useRosterStore(s=>s.playerData);
  return character?.id ? <NotesSession key={character.id} character={character}/> : <p className="p-3">Подключитесь к персонажу, чтобы открыть журнал.</p>;
};
