const categories = ['Smartfony', 'Laptopy', 'Tablety', 'Gaming', 'Audio', 'Monitory', 'Foto', 'Akcesoria'];
const specKeys = ['screen', 'processor', 'ram', 'storage', 'gpu', 'os', 'resolution', 'refreshRate', 'displayType', 'color'];
const supplyKeys = ['deliveryTerms', 'returnTerms', 'sku', 'batch', 'origin', 'availability', 'marketVersion', 'firmware', 'languages', 'networkBands', 'packageContents', 'warrantyTerms', 'leadTime'];
export const importColumns = ['title', 'brand', 'model', 'category', 'price', 'stock', 'location', 'delivery', 'sku', 'batch', 'productCode', 'ram', 'storage', 'color', 'processor', 'gpu', 'images'];
const allowed = new Set([...importColumns, ...specKeys, ...supplyKeys, 'description', 'warranty']);
const fail = (code, row = 0, field = '') => { const error = new Error(code); error.row = row; error.field = field; throw error; };

// RFC-style quoted fields, including delimiters, escaped quotes and newlines.
export function readCsv(text) {
  const first = text.split(/\r?\n/)[0];
  const delimiter = first.split(';').length > first.split(',').length ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let quoted = false; let closed = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (char !== delimiter) { if (char === '\r' && text[index + 1] === '\n') index++; if (row.some(value => value.trim())) rows.push(row); row = []; }
    } else if (char === '"') {
      if (cell || closed) fail('format'); quoted = true;
    } else { if (closed) fail('format'); cell += char; }
  }
  if (quoted) fail('format');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift()?.map(value => value.trim()) || [];
  if (!headers.length || new Set(headers).size !== headers.length || headers.some(key => !allowed.has(key))) fail('columns');
  return rows.map((values, index) => {
    if (values.length !== headers.length) fail('format', index + 1);
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function parseCatalogImport(text, filename = '') {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 1_000_000) fail('size');
  text = text.replace(/^\uFEFF/, '');
  let rows;
  try { rows = filename.toLowerCase().endsWith('.json') ? JSON.parse(text) : readCsv(text); }
  catch (error) { if (error.row !== undefined) throw error; fail('format'); }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 50) fail('count');
  const seen = new Set();
  return rows.map((row, index) => {
    const number = index + 1;
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !allowed.has(key))) fail('columns', number);
    const str = (key, max = 80) => {
      if (row[key] === undefined || row[key] === '') return '';
      if (!['string', 'number'].includes(typeof row[key])) fail('value', number, key);
      const value = String(row[key]).trim(); if (value.length > max) fail('value', number, key); return value;
    };
    for (const key of ['title', 'brand', 'model', 'category', 'price', 'stock', 'location', 'delivery', 'sku']) if (!str(key, 120)) fail('required', number, key);
    if (str('title', 120).length < 3 || str('location').length < 2) fail('value', number, 'title / location');
    const price = str('price').replace(',', '.'); const stock = str('stock');
    if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0 || Number(price) > 10_000_000) fail('value', number, 'price');
    if (!/^\d+$/.test(stock) || Number(stock) > 100000) fail('value', number, 'stock');
    if (!categories.includes(str('category'))) fail('value', number, 'category');
    if (!['shipping', 'pickup', 'both'].includes(str('delivery'))) fail('value', number, 'delivery');
    const images = str('images', 4000).split('|').map(value => value.trim()).filter(Boolean);
    if (images.length > 8 || images.some(value => { try { return !['http:', 'https:'].includes(new URL(value).protocol); } catch { return true; } })) fail('value', number, 'images');
    const specs = Object.fromEntries(specKeys.map(key => [key, str(key)]).filter(([,value]) => value));
    const supplyDetails = Object.fromEntries(supplyKeys.map(key => [key, str(key, ({ deliveryTerms:500, returnTerms:500, sku:80, batch:80, firmware:120, languages:160, networkBands:240, packageContents:300, warrantyTerms:300, leadTime:120 })[key] || 80)]).filter(([,value]) => value));
    for (const [key, values] of Object.entries({ origin: ['local', 'china', 'other'], availability: ['in_stock', 'on_order', 'expected', 'unavailable'], marketVersion: ['CN', 'Global', 'EU', 'US', 'UK', 'JP', 'KR', 'Other'] })) if (supplyDetails[key] && !values.includes(supplyDetails[key])) fail('value', number, key);
    const identity = JSON.stringify([supplyDetails.sku, supplyDetails.batch || ''].map(value => value.replace(/[a-z]/g, letter => letter.toUpperCase())));
    if (seen.has(identity)) fail('duplicate', number, 'sku'); seen.add(identity);
    const warranty = str('warranty') || 'none'; if (!['none', 'seller', 'manufacturer'].includes(warranty)) fail('value', number, 'warranty');
    return { title: str('title', 120), brand: str('brand', 60), model: str('model', 100), category: str('category'), location: str('location'), price: Number(price), stock: Number(stock), delivery: str('delivery'), warranty, description: str('description', 5000), images, specs, supplyDetails, deviceDetails: { productCode: str('productCode', 100) } };
  });
}

export function catalogImportTemplate() {
  // Empty row: no invented stock, prices or real products enter the catalog.
  return '\uFEFF' + importColumns.join(';') + '\r\n' + importColumns.map(() => '').join(';') + '\r\n';
}
