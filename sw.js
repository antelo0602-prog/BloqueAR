/* BLOQUES: guarda el juego en el dispositivo para abrirlo sin señal.
   Con internet siempre intenta la versión publicada más nueva; sin internet usa la guardada. */
const CACHE='bloques-v26';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    // Uno por uno: si falta algún archivo opcional, el resto igual queda guardado.
    await Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const nav=req.mode==='navigate';
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    try{
      const res=await Promise.race([fetch(req,{cache:'no-cache'}),new Promise((_,no)=>setTimeout(()=>no(Error('lento')),nav?3500:6000))]);
      if(res.ok&&!res.redirected)c.put(nav?'./':req,res.clone()).catch(()=>{});
      return res;
    }catch(err){
      const hit=(nav?await c.match('./')||await c.match('./index.html'):await c.match(req,{ignoreSearch:true}));
      if(hit)return hit;
      throw err;
    }
  })());
});
