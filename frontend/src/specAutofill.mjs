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

export function mergeDetectedSpecs(current, detected, query, manualKeys = []) {
  const manual = Object.fromEntries(manualKeys.filter((key) => key in current).map((key) => [key, current[key]]));
  return { ...detected, ...configurationFromQuery(query), ...manual };
}
