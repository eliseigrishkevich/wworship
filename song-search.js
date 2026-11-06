(function(root){
 'use strict';
 const STOP=new Set('и а но в во на с со к ко по из у за от до для о об я ты мы вы он она они мне тебя тебе меня нам наш ваш мой твой не то это как что все еще пусть'.split(' '));
 const COMMON='господь господи господа иисус иисуса христос христа спаситель спасителя святой святый дух любовь любви чудесно прекрасно славь славим хвала хвалю хвалите славлю прославляю поклоняюсь поклонение небеса небесный сердце сердца вера верой милость благодать аллилуйя воскрес воскресший воскресение живой живет'.split(' ');
 function normalize(value){let text=String(value||'').toLowerCase().normalize('NFKC').replace(/ё/g,'е').replace(/[’'`]/g,'');if(/[а-яіїєґ]/.test(text)){const look={a:'а',c:'с',e:'е',o:'о',p:'р',x:'х'};text=text.replace(/\S+/g,w=>/[а-яіїєґ]/.test(w)?w.replace(/[aceopx]/g,c=>look[c]):w)}return text.replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
 function cleanQuery(q){return String(q||'').trim().slice(0,240).replace(/^(?:мед[,:!]?\s*)?(?:(?:найди|поищи|ищи|найти)\s+)?(?:(?:пожалуйста|мне)\s+)?(?:(?:песню|песня|песни|текст|аккорды)\s*[:—-]?\s+)?/i,'').trim()}
 function words(s){return normalize(s).split(' ').filter(Boolean)}
 function lyricText(s){return String(s||'').split('\n').filter(l=>!(root.WMusic&&l.trim()&&l.trim().split(/\s+/).every(root.WMusic.isChord))).map(l=>l.replace(/\[([^\]]+)\]/g,(all,c)=>root.WMusic?.isChord(c)?'':all)).join('\n')}
 function distance(a,b,max=2){
  if(a===b)return 0;if(Math.abs(a.length-b.length)>max)return max+1;
  let previous=Array.from({length:b.length+1},(_,i)=>i),before=null;
  for(let i=1;i<=a.length;i++){const row=[i];let minimum=i;for(let j=1;j<=b.length;j++){row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));if(before&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],before[j-2]+1);minimum=Math.min(minimum,row[j])}if(minimum>max)return max+1;before=previous;previous=row}return previous[b.length];
 }
 function similarity(a,b){if(a===b)return 1;const len=Math.max(a.length,b.length);if(Math.min(a.length,b.length)<3)return 0;if(a.startsWith(b)||b.startsWith(a)){if(Math.abs(a.length-b.length)<=2)return .88}const d=distance(a,b,len>=7?2:1);return d<=(len>=7?2:1)?1-d/len:0}
 function coverage(query,tokens){const set=new Set(tokens);return query.reduce((sum,w)=>{if(set.has(w))return sum+1;let best=0;for(const t of set){if(Math.abs(t.length-w.length)>2)continue;best=Math.max(best,similarity(w,t));if(best>=.9)break}return sum+best},0)/Math.max(1,query.length)}
 function match(query,song){
  const q=normalize(cleanQuery(query)),qw=words(q).slice(0,24),meaningful=qw.filter(w=>!STOP.has(w)&&w.length>2),tokens=meaningful.length?meaningful:qw;
  if(!q)return{score:0,kind:'title',snippet:''};
  const title=normalize(song.title||song.trackName),artist=normalize(song.artist||song.artistName),text=lyricText((song.text||song.plainLyrics||'')+'\n'+(song.vText||''));
  const tw=words(title),aw=words(artist);let score=0,kind='title',snippet='';
  if(title===q)score=240;
  else if(title.includes(q))score=190;
  else{const c=coverage(qw,tw);if(c>=.72)score=c*145-Math.abs(qw.length-tw.length)*2}
  const combined=coverage(tokens,[...tw,...aw]);if(combined>=.85&&coverage(tokens,tw)<combined)score=Math.max(score,combined*130);
  if(artist===q){if(score<140){score=140;kind='artist'}}
  const normText=normalize(text);
  if(qw.length>=3&&normText.includes(q)){if(score<205){score=205;kind='lyrics';snippet=text.split('\n').find(l=>normalize(l).includes(qw.filter(w=>w.length>3)[0]||qw[0]))||''}}
  else if(tokens.length>=2){
   const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);let best=0,line='';
   for(let i=0;i<lines.length;i++){const window=lines[i]+' '+(lines[i+1]||'');const c=coverage(tokens,words(window));if(c>best){best=c;line=lines[i]}if(best===1)break}
   if(best>=.76){const value=best*160;if(value>score){score=value;kind='lyrics';snippet=line}}
  }
  return{score:Math.round(score),kind,snippet:snippet.slice(0,130)};
 }
 function rank(query,songs,limit=12){const seen=new Set();return songs.map(song=>{const matches=(Array.isArray(query)?query:[query]).map((q,i)=>{const m=match(q,song);return {...m,score:m.score-i*3}});return{song,...matches.sort((a,b)=>b.score-a.score)[0]}}).filter(x=>{const key=x.song.id||normalize(x.song.title||x.song.trackName)+'|'+normalize(x.song.artist||x.song.artistName);if(x.score<80||seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>b.score-a.score||normalize(a.song.title||a.song.trackName).localeCompare(normalize(b.song.title||b.song.trackName))).slice(0,limit)}
 function dictionary(songs){const set=new Set(COMMON);for(const s of songs){for(const w of words((s.title||s.trackName||'')+' '+(s.artist||s.artistName||'')+' '+lyricText(s.text||s.plainLyrics||'').slice(0,1200)))if(w.length>=4)set.add(w);if(set.size>8000)break}return set}
 function correct(q,dict){return words(q).map(w=>{if(w.length<4||dict.has(w))return w;let best=w,score=0;for(const candidate of dict){if(Math.abs(w.length-candidate.length)>2)continue;const value=similarity(w,candidate);if(value>.76&&value>score){best=candidate;score=value}}return best}).join(' ')}
 function keyboard(q){const from="qwertyuiop[]asdfghjkl;'zxcvbnm,.",to='йцукенгшщзхъфывапролджэячсмитьбю';return String(q).toLowerCase().split('').map(c=>{const i=from.indexOf(c);return i<0?c:to[i]}).join('')}
 function transliterate(q){return String(q).toLowerCase().replace(/shch|sch|yo|zh|kh|ts|ch|sh|yu|ya|[a-z]/g,c=>({shch:'щ',sch:'щ',yo:'е',zh:'ж',kh:'х',ts:'ц',ch:'ч',sh:'ш',yu:'ю',ya:'я',a:'а',b:'б',v:'в',g:'г',d:'д',e:'е',z:'з',i:'и',j:'й',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',t:'т',u:'у',f:'ф',h:'х',c:'к',y:'ы',w:'в',x:'кс',q:'к'})[c]||c)}
 function variants(query,songs=[]){const cleaned=normalize(cleanQuery(query)),dict=dictionary(songs),out=[cleaned,correct(cleaned,dict)];if(/[a-z]/i.test(query)&&!/[а-яіїєґ]/i.test(query)){const keys=normalize(keyboard(cleanQuery(query))),trans=normalize(transliterate(cleanQuery(query)));out.push(keys,correct(keys,dict),trans,correct(trans,dict))}return [...new Set(out.filter(q=>q.length>=2))].slice(0,5)}
 function anchors(query){const list=words(cleanQuery(query)),content=list.filter(w=>!STOP.has(w)&&w.length>=4);const out=[];if(content.length>=2)out.push(content.slice(-3).join(' '));if(list.length>=5){out.push(list.slice(0,3).join(' '));out.push(list.slice(-3).join(' '))}if(content.length>=2)out.push([...content].sort((a,b)=>b.length-a.length).slice(0,2).join(' '));return [...new Set(out)].filter(q=>q!==normalize(cleanQuery(query))).slice(0,3)}
 const api={normalize,cleanQuery,distance,similarity,match,rank,variants,anchors,keyboard,transliterate};root.WSearch=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
