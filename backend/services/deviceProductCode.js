function normalizeProductCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function validProductCode(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9#._/-]{2,49}$/i.test(value.trim());
}
function hasProductCode(text, code) {
  const escaped = normalizeProductCode(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Boolean(escaped) && new RegExp(`(?:^|[^a-z0-9#._/-])${escaped}(?=$|[^a-z0-9#._/-]|[.](?=$|[^a-z0-9]))`, 'i').test(String(text));
}
function referenceMatchesCode(source, code) {
  const text = String(source.text || '').replace(/https?:\/\/[^\s<>)]+/gi, ' ');
  const escaped = normalizeProductCode(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A platform identifier cannot inherit specifications from its longer variant codes.
  if (new RegExp(`(?:^|[^a-z0-9#._/-])${escaped}[-._/][a-z0-9]`,'i').test(`${source.title || ''} ${text}`)) return false;
  let urlMatches = false;
  try {
    const url = new URL(source.url);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/,'').replace(/\.(?:html?|pdf|php)$/i,'');
    urlMatches = normalizeProductCode(path).endsWith('/' + normalizeProductCode(code)) || [...url.searchParams.values()].some(value=>normalizeProductCode(value)===normalizeProductCode(code));
  } catch { /* The source text can still provide the exact code. */ }
  if (hasProductCode(source.title || '',code) || urlMatches) return true;
  if (!hasProductCode(text,code)) return false;
  // A family comparison table with several similar SKUs cannot confirm one column.
  const prefix = normalizeProductCode(code).slice(0,4).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const siblings = new Set((text.match(new RegExp(`\\b${prefix}[a-z0-9#._/-]*\\b`,'gi')) || []).map(value=>value.toUpperCase()));
  return siblings.size <= 1;
}
module.exports = { normalizeProductCode, validProductCode, hasProductCode, referenceMatchesCode };
