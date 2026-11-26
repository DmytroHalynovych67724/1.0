export function selectSpecLookupResult(matches, { ai = false, requestedStorage = '' } = {}) {
  const match = matches.find(item => requestedStorage && String(item.specs?.storage || '').includes(requestedStorage)) || matches[0];
  const hasData = Object.values(match?.specs || {}).filter(Boolean).length >= 2;
  return { match, autoApply: matches.length === 1 && hasData && (ai || match.matchConfidence !== 'fallback') };
}
