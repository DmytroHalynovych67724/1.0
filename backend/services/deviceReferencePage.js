function cleanReferenceHtml(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<\/(?:p|div|li|tr|section|h[1-6])\s*>|<br\s*\/?\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi,entity=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'})[entity.toLowerCase()])
    .replace(/&#(x[0-9a-f]+|\d+);/gi,(_all,value)=>{const n=value[0].toLowerCase()==='x'?parseInt(value.slice(1),16):Number(value);return n>0 && n<=0x10ffff?String.fromCodePoint(n):' ';})
    .replace(/[\t ]+/g,' ').replace(/\n[\t ]*/g,'\n').slice(0,60000);
}

async function fetchReferencePage(url, {safeUrl,fetchImpl=global.fetch,timeoutMs=4000,maxBytes=1000000}={}) {
  let target=safeUrl?.(url);
  if(!target || typeof fetchImpl!=='function') return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    for(let redirects=0;redirects<=2;redirects++) {
      const response=await fetchImpl(target.href,{signal:controller.signal,redirect:'manual',headers:{accept:'text/html','user-agent':'NaShary device specification lookup'}});
      if([301,302,303,307,308].includes(response.status)) {
        const location=response.headers?.get('location');
        target=location?safeUrl(new URL(location,target).href):null;
        if(!target) return null;
        continue;
      }
      if(!response.ok || !/text\/html/i.test(response.headers?.get('content-type') || '')) return null;
      if(Number(response.headers?.get('content-length'))>maxBytes || !response.body?.getReader) return null;
      const reader=response.body.getReader();
      const chunks=[];let size=0;
      try {
        let chunk=await reader.read();
        while(!chunk.done) {
          const {value}=chunk;
          size+=value.byteLength;
          if(size>maxBytes) return null;
          chunks.push(Buffer.from(value));
          chunk=await reader.read();
        }
      } finally { await reader.cancel().catch(()=>{}); }
      return cleanReferenceHtml(Buffer.concat(chunks).toString('utf8'));
    }
    return null;
  } catch { return null; }
  finally {clearTimeout(timer);}
}
module.exports={fetchReferencePage,cleanReferenceHtml};
