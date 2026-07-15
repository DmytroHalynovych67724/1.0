const fs = require('node:fs/promises');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');

const SMARTPHONE_CATEGORY_ID = '1893';
const CATALOG_URL =
  'https://data.icecat.biz/export/freexml/EN/107.vertical.files.index.xml.gz';
const SUPPLIERS_URL =
  'https://data.icecat.biz/export/freexml/refs/SuppliersList.xml.gz';
const CACHE_FILE = path.resolve(__dirname, '../../data/icecat-smartphones.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VARIANT_WORDS = new Set([
  'air',
  'edge',
  'fe',
  'fold',
  'flip',
  'lite',
  'max',
  'mini',
  'note',
  'plus',
  'pro',
  'se',
  'ultra',
  'xl',
]);
const GENERIC_WORDS = new Set([
  '5g',
  'dual',
  'galaxy',
  'mobile',
  'phone',
  'smartphone',
  'sim',
]);

let catalogPromise;

function decodeXml(value = '') {
  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function attribute(tag, name) {
  return decodeXml(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '');
}

function normalize(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalize(value).split(' ').filter(Boolean);
}

function identityTokens(value, brand = '') {
  const brandTokens = new Set(tokens(brand));
  const source = tokens(value);
  return source.filter((token, index) => {
    if (brandTokens.has(token) || GENERIC_WORDS.has(token)) return false;
    if (/^(gb|tb)$/.test(token)) return false;
    if (/^\d+(gb|tb)$/.test(token)) return false;
    if (/^(32|64|128|256|512|1024|2048)$/.test(token) && /^(gb|tb)$/.test(source[index + 1] || '')) {
      return false;
    }
    return true;
  });
}

function variantTokens(value) {
  return new Set(tokens(value).filter((token) => VARIANT_WORDS.has(token)));
}

async function downloadXml(url) {
  const apiToken = String(process.env.ICECAT_API_TOKEN || '').trim();
  if (!apiToken) throw new Error('ICECAT_API_TOKEN is required for the Icecat catalog index');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { 'api-token': apiToken, 'user-agent': 'NaShary diploma marketplace/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Icecat catalog returned ${response.status}`);
    return gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8');
  } finally {
    clearTimeout(timeout);
  }
}

function supplierMap(xml) {
  const suppliers = new Map();
  for (const tag of xml.match(/<Supplier\b[^>]*>/g) || []) {
    const id = attribute(tag, 'ID');
    const name = attribute(tag, 'Name');
    if (id && name) suppliers.set(id, name);
  }
  return suppliers;
}

async function buildCatalog() {
  const [supplierXml, catalogXml] = await Promise.all([
    downloadXml(SUPPLIERS_URL),
    downloadXml(CATALOG_URL),
  ]);
  const suppliers = supplierMap(supplierXml);
  const products = [];
  const smartphoneFilePattern = new RegExp(
    `<file\\b[^>]*\\bCatid="${SMARTPHONE_CATEGORY_ID}"[^>]*>`,
    'g'
  );
  for (const tag of catalogXml.match(smartphoneFilePattern) || []) {
    const icecatId = attribute(tag, 'Product_ID');
    const supplierId = attribute(tag, 'Supplier_id');
    const brand = suppliers.get(supplierId) || '';
    const model = attribute(tag, 'Model_Name');
    if (!icecatId || !brand || !model) continue;
    products.push({
      icecatId,
      brand,
      model,
      productCode: attribute(tag, 'Prod_ID'),
      views: Number(attribute(tag, 'Product_View')) || 0,
      onMarket: attribute(tag, 'On_Market') === '1',
    });
  }
  const payload = { generatedAt: Date.now(), products };
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(payload));
  return products;
}

async function readCache(allowExpired = false) {
  try {
    const payload = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    if (!Array.isArray(payload.products)) return null;
    if (!allowExpired && Date.now() - Number(payload.generatedAt || 0) > CACHE_TTL_MS) return null;
    return payload.products;
  } catch (_error) {
    return null;
  }
}

async function loadCatalog() {
  if (process.env.NODE_ENV === 'test' || !String(process.env.ICECAT_API_TOKEN || '').trim()) return [];
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const cached = await readCache(false);
      if (cached) return cached;
      try {
        return await buildCatalog();
      } catch (error) {
        const stale = await readCache(true);
        if (stale) return stale;
        throw error;
      }
    })().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

function scoreProduct(product, query, queryBrand) {
  const brandName = normalize(product.brand);
  if (queryBrand && brandName !== queryBrand) return -1;
  const candidate = normalize(`${product.brand} ${product.model} ${product.productCode}`);
  const modelName = normalize(product.model);
  const required = identityTokens(query, product.brand);
  if (!required.length || required.some((token) => !candidate.includes(token))) return -1;

  const requestedVariants = variantTokens(query);
  const candidateVariants = variantTokens(product.model);
  if ([...requestedVariants].some((token) => !candidateVariants.has(token))) return -1;
  if ([...candidateVariants].some((token) => !requestedVariants.has(token))) return -1;

  const requestedModel = normalize(
    tokens(query)
      .filter((token) => !tokens(product.brand).includes(token) && !GENERIC_WORDS.has(token))
      .join(' ')
  );
  let score = required.length * 1000;
  if (modelName === requestedModel) score += 12000;
  else if (modelName.includes(requestedModel) || requestedModel.includes(modelName)) score += 5000;
  if (product.onMarket) score += 500;
  score += Math.min(900, Math.log10(product.views + 1) * 150);
  return score;
}

async function searchIcecatCatalog(query, { limit = 8 } = {}) {
  const products = await loadCatalog();
  if (!products.length) return [];
  const normalizedQuery = normalize(query);
  const brands = [...new Set(products.map((product) => normalize(product.brand)))].sort(
    (left, right) => right.length - left.length
  );
  const queryBrand = brands.find(
    (brand) => normalizedQuery === brand || normalizedQuery.startsWith(`${brand} `)
  );
  return products
    .map((product) => ({ product, score: scoreProduct(product, query, queryBrand) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || right.product.views - left.product.views)
    .slice(0, limit)
    .map(({ product, score }) => ({ ...product, score }));
}

module.exports = {
  identityTokens,
  normalize,
  searchIcecatCatalog,
  variantTokens,
};
