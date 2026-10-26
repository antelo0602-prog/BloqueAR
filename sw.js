/* BLOQUES: guarda el juego en el dispositivo para abrirlo sin señal.
   Con internet siempre intenta la versión publicada más nueva; sin internet usa la guardada. */
const CACHE='bloques-v77';
const ARTE='estancia-arte-v74';   // aparte: no se borra con cada versión (cambia sólo si cambia el arte)
const FILES=['./','./index.html','./poblar.html','./estancia.html','./pampa.html','./truco.html','./uno.html','./ludo.html','./ajedrez.html','./pool.html','./sudoku.html','./solitario.html','./buscaminas.html','./laberinto.html','./invasores.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
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
    for(const k of await caches.keys())if(k!==CACHE&&k!==ARTE)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const nav=req.mode==='navigate';
  // El arte de EstanciAR (estancia_arte/…) no se baja al instalar: cada imagen se guarda la primera vez que se usa
  // y desde ahí sale del celular (si una versión trae arte nuevo, se cambia ARTE y se renueva).
  // v74: los paquetes llevan el hash de su contenido en el nombre (arte_<grupo>.<hash>.bin). Al guardar uno nuevo se borran
  // los otros del mismo grupo (y los viejos sin hash). «?fresco=…» = bajarlo de la red y reemplazar lo guardado.
  if(/\/estancia_arte\//.test(url.pathname)){e.respondWith((async()=>{const c=await caches.open(ARTE),limpio=url.origin+url.pathname,fresco=url.searchParams.has('fresco');
    if(!fresco){const hit=await c.match(limpio);if(hit)return hit;}
    const res=await fetch(fresco?new Request(limpio,{cache:'reload'}):req);
    if(res.ok){await c.put(limpio,res.clone()).catch(()=>{});
      const m=url.pathname.match(/\/(arte_[A-Za-z0-9_]+)\.[0-9a-f]{8}\.bin$/);
      if(m)for(const k of await c.keys()){const pn=new URL(k.url).pathname;if(pn!==url.pathname&&(pn.endsWith('/'+m[1]+'.bin')||new RegExp('/'+m[1]+'\\.[0-9a-f]{8}\\.bin$').test(pn)||/\.webp$/.test(pn)))c.delete(k).catch(()=>{});}}
    return res;})());return;}
  // Cada página (BloqueAR y PoblAR) se guarda por su dirección, sin el #… ni el ?….
  const page=nav?(/\/(index\.html)?$/.test(url.pathname)?'./':url.origin+url.pathname):null;
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    try{
      const res=await Promise.race([fetch(req,{cache:'no-cache'}),new Promise((_,no)=>setTimeout(()=>no(Error('lento')),nav?3500:6000))]);
      if(res.ok&&!res.redirected)c.put(nav?page:req,res.clone()).catch(()=>{});
      return res;
    }catch(err){
      const hit=(nav?await c.match(page,{ignoreSearch:true})||await c.match('./')||await c.match('./index.html'):await c.match(req,{ignoreSearch:true}));
      if(hit)return hit;
      throw err;
    }
  })());
});
