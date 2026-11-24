const { AppError } = require('./errors');

const AVAILABILITY = ['in_stock', 'on_order', 'expected', 'unavailable'];
const MARKET_VERSIONS = ['', 'CN', 'Global', 'EU', 'US', 'UK', 'JP', 'KR', 'Other'];
const TEXT_LIMITS = { sku: 80, batch: 80, firmware: 120, languages: 160, networkBands: 240, packageContents: 300, warrantyTerms: 300, leadTime: 120 };

function validateSupplyDetails(input) {
  const issues = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Supply details must be an object', [{ field: 'supplyDetails', message: 'Object required' }]);
  }
  const result = {};
  for (const [key, raw] of Object.entries(input)) {
    const field = `supplyDetails.${key}`;
    if (key === 'availability' || key === 'marketVersion') {
      if (typeof raw !== 'string' || !(key === 'availability' ? AVAILABILITY : MARKET_VERSIONS).includes(raw)) issues.push({ field, message: 'Unsupported value' });
      else if (raw) result[key] = raw;
    } else if (Object.hasOwn(TEXT_LIMITS, key)) {
      if (typeof raw !== 'string' || raw.trim().length > TEXT_LIMITS[key]) issues.push({ field, message: `Text up to ${TEXT_LIMITS[key]} characters required` });
      else if (raw.trim()) result[key] = raw.trim();
    } else issues.push({ field, message: 'Unknown supply field' });
  }
  if (issues.length) throw new AppError(400, 'VALIDATION_ERROR', 'Check supply details', issues);
  return result;
}

module.exports = { validateSupplyDetails, AVAILABILITY, MARKET_VERSIONS };
