const V = "w-v31-github";
const SHELL = ["icons/w-glass-180.png", "icons/w-glass-192.png", "icons/w-glass-512.png", "icons/w-glass-maskable-512.png", "./", "index.html", "config.js", "music.js", "song-search.js", "cards.css", "stage-update.css", "push-client.js", "migration-config.js", "migration-data.js", "migration-client.js", "manifest.webmanifest","manifest-nova.webmanifest","icons/icon-192.png",
  "stickers/s001.webp","stickers/s002.webp","stickers/s003.webp","stickers/s004.webp","stickers/s005.webp","stickers/s006.webp","stickers/s007.webp","stickers/s008.webp","stickers/s009.webp","stickers/s010.webp","stickers/s011.webp","stickers/s012.webp","stickers/s013.webp","stickers/s014.webp","stickers/s015.webp","stickers/s016.webp","stickers/s017.webp","stickers/s018.webp","stickers/s019.webp","stickers/s020.webp","stickers/s021.webp","stickers/s022.webp","stickers/s023.webp","stickers/s024.webp","stickers/s025.webp","stickers/s026.webp","stickers/s027.webp","stickers/s028.webp","stickers/s029.webp","stickers/s030.webp","stickers/s031.webp","stickers/s032.webp","stickers/s033.webp","stickers/s034.webp","stickers/s035.webp","stickers/s036.webp","stickers/s037.webp","stickers/s038.webp","stickers/s039.webp","stickers/s040.webp","stickers/s041.webp","stickers/s042.webp","stickers/s043.webp","stickers/s044.webp","stickers/s045.webp","stickers/s046.webp","stickers/s047.webp","stickers/s048.webp","stickers/s049.webp","stickers/s050.webp","stickers/s051.webp","stickers/s052.webp","stickers/s053.webp"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith("w-") && x !== V).map(x => caches.delete(x)))).then(() => clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url), own = u.origin === location.origin;
  const lib = u.hostname === "cdn.jsdelivr.net" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (!own && !lib) return; // данные Supabase и фото из облака не трогаем
  if (own) { // сначала сеть, без интернета — сохранённая копия
    e.respondWith(Promise.race([fetch(r), new Promise((_, rj) => setTimeout(rj, 5000))]).then(x => { if (x.ok) { const y = x.clone(); caches.open(V).then(c => c.put(r.mode === "navigate" ? "index.html" : r, y)); } return x; })
      .catch(() => caches.match(r.mode === "navigate" ? "index.html" : r, { ignoreSearch: true }).then(m => m || fetch(r))));
  } else { // библиотеки и шрифты — сначала кэш
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(x => { if (x.ok) { const y = x.clone(); caches.open(V).then(c => c.put(r, y)); } return x; })));
  }
});
self.addEventListener('push', event => {
 event.waitUntil((async () => {
  let payload={};try{payload=event.data?event.data.json():{}}catch{payload={body:'Откройте приложение, чтобы посмотреть обновление.'}}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  windows.forEach(client=>client.postMessage({type:'W_PUSH'}));
  if(windows.some(client=>client.visibilityState==='visible'&&client.focused))return;
  const target=new URL(payload.url||'./',self.registration.scope);
  const safeUrl=target.origin===self.location.origin?target.href:self.registration.scope;
  await self.registration.showNotification(String(payload.title||'W · Наша группа').slice(0,120),{
   body:String(payload.body||'Новое в группе').slice(0,240),icon:'icons/w-glass-180.png',badge:'icons/icon-192.png',
   tag:String(payload.tag||'w-update').slice(0,120),data:{url:safeUrl}
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||'./',self.registration.scope);
  if(target.origin!==self.location.origin)return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>new URL(client.url).origin===target.origin);
  if(existing){await existing.navigate(target.href);await existing.focus()}else await self.clients.openWindow(target.href);
 })());
});
