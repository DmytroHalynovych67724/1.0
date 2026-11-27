const { validProductCode } = require('../services/deviceProductCode');
const INSPECTION_KEYS = ['screen', 'battery', 'cameras', 'buttons', 'connectivity', 'serialNumber'];
const TEXT_KEYS = ['display', 'body', 'completeness', 'defects', 'repairs', 'batteryRuntime', 'country', 'specSource', 'specSourceId', 'productCode'];
const HEALTH_STATES = ['unknown', 'reported', 'unavailable', 'not_applicable'];
const DEFECT_STATES = ['unknown', 'none', 'reported'];

function validHealth(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

// Legacy records keep only usable facts. Missing values never imply good condition.
function normalizeDeviceDetails(raw = {}) {
  const result = {};
  for (const key of TEXT_KEYS) if (typeof raw[key] === 'string') result[key] = raw[key].trim().slice(0, 300);
  result.grade = ['', 'A+', 'A', 'B', 'C', 'D'].includes(raw.grade) ? raw.grade : '';
  if (typeof raw.serialChecked === 'boolean') result.serialChecked = raw.serialChecked;
  result.batteryHealthStatus = HEALTH_STATES.includes(raw.batteryHealthStatus)
    ? raw.batteryHealthStatus : validHealth(raw.batteryHealth) ? 'reported' : 'unknown';
  if (result.batteryHealthStatus === 'reported' && validHealth(raw.batteryHealth)) result.batteryHealth = raw.batteryHealth;
  else if (result.batteryHealthStatus === 'reported') result.batteryHealthStatus = 'unknown';
  result.defectsStatus = DEFECT_STATES.includes(raw.defectsStatus)
    ? raw.defectsStatus : result.defects ? 'reported' : 'unknown';
  if (result.defectsStatus === 'none') result.defects = '';
  if (result.defectsStatus === 'reported' && !result.defects) result.defectsStatus = 'unknown';
  return result;
}

function validateDeviceDetails(raw, errors) {
  const allowed = [...TEXT_KEYS, 'grade', 'serialChecked', 'batteryHealth', 'batteryHealthStatus', 'defectsStatus'];
  const fail = (key, message) => errors.push({ field: `deviceDetails.${key}`, message });
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.includes(key)) fail(key, 'Unknown condition field');
    else if (TEXT_KEYS.includes(key) && (typeof value !== 'string' || value.length > 300)) fail(key, 'Use text up to 300 characters');
  }
  if (raw.productCode && !validProductCode(raw.productCode)) fail('productCode', 'Use a model product code of 3 to 50 letters, digits or . _ / # -');
  if ('grade' in raw && !['', 'A+', 'A', 'B', 'C', 'D'].includes(raw.grade)) fail('grade', 'Invalid seller condition grade');
  if ('serialChecked' in raw && typeof raw.serialChecked !== 'boolean') fail('serialChecked', 'Use a boolean');
  if ('batteryHealth' in raw && raw.batteryHealth !== '' && raw.batteryHealth !== null && !validHealth(raw.batteryHealth)) fail('batteryHealth', 'Battery health must be an integer from 0 to 100, or omitted');
  if ('batteryHealthStatus' in raw && !HEALTH_STATES.includes(raw.batteryHealthStatus)) fail('batteryHealthStatus', 'Invalid battery data status');
  if (raw.batteryHealthStatus === 'reported' && !validHealth(raw.batteryHealth)) fail('batteryHealth', 'Enter the device-reported percentage or choose no data');
  if ('defectsStatus' in raw && !DEFECT_STATES.includes(raw.defectsStatus)) fail('defectsStatus', 'Invalid defects status');
  if (raw.defectsStatus === 'reported' && !(typeof raw.defects === 'string' && raw.defects.trim())) fail('defects', 'Describe the known defects');
  return normalizeDeviceDetails(raw);
}

function normalizeInspection(raw = {}) {
  return Object.fromEntries(INSPECTION_KEYS.map((key) => [key, raw[key] === true]));
}

module.exports = { INSPECTION_KEYS, normalizeInspection, normalizeDeviceDetails, validateDeviceDetails };
