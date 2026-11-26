import { mergeDetectedSpecs } from './specAutofill.mjs';

export function specsAfterLookup(current, match, query, manualKeys = []) {
  return Object.values(match?.specs || {}).some(Boolean)
    ? mergeDetectedSpecs(current, match.specs, query, manualKeys, match.choices || {})
    : { ...current };
}

export function selectSpecLookupResult(matches, { ai = false, requestedStorage = '' } = {}) {
  const match = matches.find(item => requestedStorage && String(item.specs?.storage || '').includes(requestedStorage)) || matches[0];
  const hasData = Object.values(match?.specs || {}).filter(Boolean).length > 0;
  return { match, autoApply: matches.length === 1 && hasData && (ai || match.matchConfidence !== 'fallback'), identityOnly: ai && matches.length === 1 && !hasData };
}
