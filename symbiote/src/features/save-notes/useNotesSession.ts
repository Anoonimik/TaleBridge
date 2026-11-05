import { useEffect, useRef, useState } from 'react';
import { wsBridge } from '../../shared/api/websocket';
import { storageKey } from '../../shared/lib/character-storage';
import type { Character } from '../../shared/types';
export function useNotesSession(character:Character) {
  const key=storageKey(`notes-draft:${character.id}`);
  const draft=()=>{try {return JSON.parse(localStorage.getItem(key)||'null') as {text:string;revision:string}|null;}catch{return null;}};
  const [text,setText]=useState(()=>draft()?.text ?? character.playerNotes ?? '');
  const [status,setStatus]=useState<'saved'|'local'|'saving'|'error'>(()=>draft() ? 'local' : 'saved');
  const [error,setError]=useState('');
  const revision=useRef(draft()?.revision || character.revision);
  const dirty=useRef(Boolean(draft()));const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const latest=useRef(text);const saving=useRef(false);const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
  useEffect(()=>{if(!dirty.current){setText(character.playerNotes || '');latest.current=character.playerNotes || '';revision.current=character.revision;}},[character.playerNotes,character.revision]);
  const save=async()=>{
    clearTimeout(timer.current);if(saving.current || !dirty.current)return;
    saving.current=true;const value=latest.current;setStatus('saving');setError('');
    try {
      const result=await wsBridge.request<{revision:string}>('UPDATE_PLAYER_NOTES',{characterId:character.id,notes:value},{expectedRevision:revision.current});
      revision.current=result.revision;
      if(latest.current===value){dirty.current=false;localStorage.removeItem(key);if(mounted.current)setStatus('saved');}
      else{localStorage.setItem(key,JSON.stringify({text:latest.current,revision:revision.current}));if(mounted.current){setStatus('local');timer.current=setTimeout(()=>{void save();},800);}}
    }catch(error){if(mounted.current){setStatus('error');setError(error instanceof Error ? error.message : 'Нет подтверждения сервера');}}
    finally{saving.current=false;}
  };
  const change=(value:string)=>{
    latest.current=value;dirty.current=true;setText(value);setStatus('local');
    try{localStorage.setItem(key,JSON.stringify({text:value,revision:revision.current}));}catch{setError('Не удалось сохранить черновик локально. Скопируйте текст.');}
    clearTimeout(timer.current);timer.current=setTimeout(()=>{void save();},800);
  };
  const acceptServer=()=>{clearTimeout(timer.current);dirty.current=false;localStorage.removeItem(key);latest.current=character.playerNotes || '';setText(latest.current);revision.current=character.revision;setStatus('saved');setError('');};
  return {text,change,save,status,error,acceptServer};
}
