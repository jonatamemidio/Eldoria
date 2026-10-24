// Service worker do Eldoria: guarda o jogo no aparelho para abrir rápido e funcionar offline.
// Ao publicar uma versão nova do jogo, troque o número em VERSAO para forçar a atualização.
const VERSAO='eldoria-v4';
const LOCAL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'];
const HOSTS=['cdnjs.cloudflare.com','cdn.jsdelivr.net','unpkg.com'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(VERSAO);await c.addAll(LOCAL);
 for(const u of LIBS){try{await c.add(new Request(u,{mode:'no-cors'}))}catch(x){}}self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==VERSAO)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){ // jogo: tenta a rede primeiro (pega atualizações) e cai no cache sem internet
  e.respondWith(fetch(new Request(r.url,{cache:'no-cache',credentials:'same-origin'})).then(res=>{const cp=res.clone();caches.open(VERSAO).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
 }else if(HOSTS.includes(u.hostname)){ // bibliotecas: cache primeiro
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(VERSAO).then(c=>c.put(r,cp));return res})));
 }});
