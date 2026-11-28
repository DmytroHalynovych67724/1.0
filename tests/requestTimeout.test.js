const test = require('node:test');
const assert = require('node:assert/strict');

test('request deadline releases a stalled connection and a stalled response body without retrying', async () => {
  const { requestWithTimeout } = await import('../frontend/src/requestTimeout.mjs');
  const original = global.fetch;
  try {
    for (const stalledBody of [false, true]) {
      let calls=0, signal;
      global.fetch=async (_url, options)=>{ calls++; signal=options.signal; return stalledBody ? {status:200,json:()=>new Promise(()=>{})} : new Promise(()=>{}); };
      await assert.rejects(requestWithTimeout('/test',{},10),{code:'REQUEST_TIMEOUT'});
      assert.equal(calls,1); assert.equal(signal.aborted,true);
    }
    global.fetch=async()=>({status:200,json:async()=>({ok:true})});
    assert.equal((await requestWithTimeout('/test',{},100)).payload.ok,true);
    const controller=new AbortController(); controller.abort();
    await assert.rejects(requestWithTimeout('/test',{signal:controller.signal},100),{name:'AbortError'});
  } finally { global.fetch=original; }
});
