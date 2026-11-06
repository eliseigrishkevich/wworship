(function(root){
 'use strict';
 const simple=new Set(['w_mode','w_font','w_song_mode','w_tab','w_seen','w_guide','w_cpos','w_rvdis','w_rvn','w_spl']);
 function allowed(key,uid){return simple.has(key)||key==='w_custom_commands_'+uid||key==='w_command_acks_'+uid||key.startsWith('w_transpose_v2:'+encodeURIComponent(uid)+':')}
 function valueOK(key,v,uid){
  if(key.startsWith('w_transpose_v2:'))return Number.isInteger(v)&&v>=-11&&v<=11;
  if(key==='w_mode')return ['light','dark','black'].includes(v);
  if(key==='w_song_mode')return ['all','text','chords'].includes(v);
  if(key==='w_tab')return ['songs','sets','mem','prop'].includes(v);
  if(key==='w_font')return v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).every(k=>['p','s','zs','sfs','slh'].includes(k))&&Object.entries(v).every(([k,x])=>['p','s'].includes(k)?typeof x==='string'&&/^[a-z-]{1,30}$/.test(x):typeof x==='number'&&Number.isFinite(x)&&x>=0.5&&x<=200);
  if(key==='w_seen')return Number.isFinite(v)&&v>=0;
  if(key==='w_guide')return v===0||v===1;
  if(key==='w_spl')return typeof v==='string'&&v.length<=500;
  if(key==='w_cpos')return v===null||(typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<20&&JSON.stringify(v).length<2000);
  if(key==='w_custom_commands_'+uid)return Array.isArray(v)&&v.length<=12&&v.every(x=>typeof x==='string'&&x.length<=180);
  return Array.isArray(v)&&v.length<=2000&&v.every(x=>typeof x==='string'&&x.length<=200);
 }
 function validate(payload,uid){
  if(!uid||payload?.format!=='w-worship-preferences'||payload.version!==1||payload.userId!==uid||!payload.values||Array.isArray(payload.values)||typeof payload.values!=='object')throw new Error('Это настройки другого пользователя или неподдерживаемый файл. Войдите в тот же аккаунт, что в старом приложении.');
  const entries=Object.entries(payload.values);if(entries.length>3000||JSON.stringify(payload).length>1000000)throw new Error('Файл настроек слишком большой.');
  for(const [k,v] of entries)if(!allowed(k,uid)||k.length>500||!valueOK(k,v,uid))throw new Error('Файл содержит неподдерживаемые настройки.');
  return entries;
 }
 function collect(storage,uid,origin){
  const values=Object.create(null);if(!uid)throw new Error('Сначала войдите в приложение.');
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!allowed(key,uid))continue;try{const v=JSON.parse(storage.getItem(key));if(valueOK(key,v,uid))values[key]=v}catch{}}
  return {format:'w-worship-preferences',version:1,userId:uid,sourceOrigin:origin,createdAt:new Date().toISOString(),values};
 }
 function apply(storage,payload,uid){
  const entries=validate(payload,uid),previous=entries.map(([k])=>[k,storage.getItem(k)]);
  try{for(const [k,v] of entries)storage.setItem(k,JSON.stringify(v));storage.setItem('w_migration_completed_'+uid,JSON.stringify({at:Date.now(),source:payload.sourceOrigin}));}
  catch(e){for(const [k,v] of previous){try{v===null?storage.removeItem(k):storage.setItem(k,v)}catch{}}throw new Error('Недостаточно места для настроек. Перенос не завершён.');}
  return entries.length;
 }
 const api={collect,validate,apply,allowed};root.WMigrationData=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
