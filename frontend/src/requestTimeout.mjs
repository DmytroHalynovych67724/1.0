// Bound the entire request, including reading a stalled response body.
export async function requestWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  let timer;
  let externalAbort;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('The server did not respond in time.'), { code: 'REQUEST_TIMEOUT' }));
      controller.abort();
    }, timeoutMs);
    externalAbort = () => {
      reject(options.signal.reason || Object.assign(new Error('Request cancelled'), { name: 'AbortError' }));
      controller.abort();
    };
    if (options.signal?.aborted) externalAbort();
    else options.signal?.addEventListener('abort', externalAbort, { once: true });
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { ...options, signal: controller.signal });
      let payload = null;
      if (response.status !== 204) {
        try { payload = await response.json(); }
        catch (error) { if (!(error instanceof SyntaxError)) throw error; }
      }
      return { response, payload };
    })()]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', externalAbort);
  }
}
