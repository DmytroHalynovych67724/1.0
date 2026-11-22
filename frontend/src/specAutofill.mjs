export function configurationFromQuery(query = '') {
  const fields = {};
  const pair = query.match(/\b(\d{1,3})\s*\/\s*(\d{2,4})\s*(?:GB|ГБ)?(?=\s|$|[,;])/iu);
  if (pair) {
    fields.ram = pair[1] + ' GB';
    fields.storage = pair[2] + ' GB';
  }
  const capacity = [...query.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(GB|ГБ|TB|ТБ)(?=\s|$|[,;])/giu)];
  for (const item of capacity) {
    const size = Number(item[1].replace(',', '.'));
    if (size >= 32 || /tb|тб/i.test(item[2])) fields.storage = size + (/tb|тб/i.test(item[2]) ? ' TB' : ' GB');
  }
  return fields;
}

export function mergeDetectedSpecs(current, detected, query, manualKeys = [], choices = {}) {
  const manual = Object.fromEntries(manualKeys.map((key) => [key, current[key] || '']));
  const explicit = configurationFromQuery(query);
  for (const key of Object.keys(explicit)) {
    if (choices[key]?.length && !choices[key].includes(explicit[key])) delete explicit[key];
  }
  return Object.fromEntries(Object.entries({ ...detected, ...explicit, ...manual }).filter(([, value]) => value));
}
