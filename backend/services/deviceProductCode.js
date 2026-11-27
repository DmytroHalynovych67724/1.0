function normalizeProductCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function validProductCode(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9#._/-]{2,49}$/i.test(value.trim());
}
function hasProductCode(text, code) {
  const escaped = normalizeProductCode(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Boolean(escaped) && new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(String(text));
}
function referenceMatchesCode(source, code) {
  if (hasProductCode(`${source.title || ''} ${source.url || ''}`,code)) return true;
  const text = String(source.text || '');
  if (!hasProductCode(text,code)) return false;
  // A family comparison table with several similar SKUs cannot confirm one column.
  const prefix = normalizeProductCode(code).slice(0,4).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const siblings = new Set((text.match(new RegExp(`\\b${prefix}[a-z0-9#._/-]{${Math.max(0,code.length-4)}}\\b`,'gi')) || []).map(value=>value.toUpperCase()));
  return siblings.size <= 1;
}
module.exports = { normalizeProductCode, validProductCode, hasProductCode, referenceMatchesCode };
