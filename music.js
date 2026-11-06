(function (root) {
  'use strict';
  const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const PITCH = {C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,H:11};
  const chordRE = /^[A-GH][#b]?(?:(?:maj|min|dim|aug|sus|add|omit|m|M|Δ|ø|°)|\d|[#b+−-]\d*|\([^\s\[\]]*\))*(?:\/[A-GH][#b]?)?$/;
  function keyInfo(value) {
    const m=String(value||'').trim().replace(/♯/g,'#').replace(/♭/g,'b').match(/^([A-GH][#b]?)(m|min|minor|maj|major)?$/);
    return m && PITCH[m[1]]!==undefined ? {root:m[1],pitch:PITCH[m[1]],minor:['m','min','minor'].includes(m[2])} : null;
  }
  function delta(from,to) {
    const a=keyInfo(from),b=keyInfo(to);
    if(!a||!b)throw new Error('Укажите исходную и выбранную тональности');
    if(a.minor!==b.minor)throw new Error('Транспозиция не меняет лад: выберите мажор для мажора или минор для минора');
    return (b.pitch-a.pitch+12)%12;
  }
  function transposeChord(value,semitones,preferFlats) {
    if(!Number.isInteger(semitones))semitones=0;
    const notes=preferFlats?FLAT:SHARP;
    return String(value).replace(/^([A-GH][#b]?)|\/([A-GH][#b]?)$/g,(all,a,b)=>{
      const n=PITCH[a||b];if(n===undefined)return all;
      return (b?'/':'')+notes[((n+semitones)%12+12)%12];
    });
  }
  function isChord(value){return chordRE.test(value)}
  function transposeText(value,semitones,preferFlats) {
    return String(value||'').split('\n').map(line=>{
      const words=line.trim().split(/\s+/);
      if(line.trim()&&words.every(isChord))return line.replace(/\S+/g,c=>transposeChord(c,semitones,preferFlats));
      return line.replace(/\[([^\]\n]+)\]/g,(all,c)=>isChord(c)?'['+transposeChord(c,semitones,preferFlats)+']':all);
    }).join('\n');
  }
  function hasChords(value){return String(value||'').split('\n').some(line=>{const w=line.trim().split(/\s+/);return (line.trim()&&w.every(isChord))||[...line.matchAll(/\[([^\]]+)\]/g)].some(m=>isChord(m[1]))})}
  function preferenceKey(userId,songId){return 'w_transpose_v2:'+encodeURIComponent(userId||'local')+':'+encodeURIComponent(songId)}
  function readTranspose(storage,userId,songId){try{const n=JSON.parse(storage.getItem(preferenceKey(userId,songId)));return Number.isInteger(n)&&n>=-11&&n<=11?n:0}catch{return 0}}
  function writeTranspose(storage,userId,songId,n){if(!Number.isInteger(n)||n < -11||n > 11)throw new Error('Invalid transpose');storage.setItem(preferenceKey(userId,songId),JSON.stringify(n));return n}
  const api={keyInfo,delta,transposeChord,transposeText,hasChords,isChord,chordRE,preferenceKey,readTranspose,writeTranspose};
  root.WMusic=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
