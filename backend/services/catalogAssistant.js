const { listProducts } = require('../models/products');

const CATEGORY_RULES = [
  ['Smartfony', ['smartfon', 'telefon', 'iphone', 'galaxy', 'pixel', 'phone', 'смартфон', 'телефон']],
  ['Laptopy', ['laptop', 'notebook', 'macbook', 'ноутбук']],
  ['Tablety', ['tablet', 'ipad', 'планшет']],
  ['Gaming', ['gaming', 'konsol', 'playstation', 'xbox', 'nintendo', 'геймінг', 'консол']],
  ['Audio', ['audio', 'sluchawk', 'airpods', 'glosnik', 'headphone', 'speaker', 'навушник', 'колонк']],
  ['Monitory', ['monitor', 'telewizor', 'tv', 'display', 'монітор', 'телевізор']],
  ['Foto', ['aparat', 'kamera', 'camera', 'фотоапарат', 'камер']],
  ['Akcesoria', ['akcesori', 'etui', 'ladowark', 'kabel', 'accessor', 'case', 'charger', 'аксесуар', 'чохол', 'заряд']],
];

const BRAND_RULES = [
  ['Apple', ['apple', 'iphone', 'ipad', 'macbook', 'airpods']],
  ['Samsung', ['samsung', 'galaxy']],
  ['Google', ['google', 'pixel']],
  ['Xiaomi', ['xiaomi', 'redmi', 'poco']],
  ['Sony', ['sony', 'playstation']],
  ['Microsoft', ['microsoft', 'xbox']],
  ['Nintendo', ['nintendo', 'switch']],
  ['Lenovo', ['lenovo', 'thinkpad', 'legion']],
  ['ASUS', ['asus', 'rog', 'zenbook']],
  ['Acer', ['acer', 'predator']],
  ['HP', [' hp ', 'hewlett', 'omen']],
  ['Dell', ['dell', 'alienware']],
  ['Huawei', ['huawei']],
  ['OnePlus', ['oneplus']],
  ['Motorola', ['motorola', 'moto']],
  ['LG', [' lg ']],
];

const STOP_WORDS = new Set([
  'szukam', 'szukaj', 'chce', 'chcialbym', 'potrzebuje', 'prosze', 'pokaz', 'znajdz',
  'looking', 'need', 'want', 'show', 'find', 'please', 'a', 'an', 'the',
  'шукаю', 'потрібен', 'потрібна', 'потрібно', 'хочу', 'покажи', 'знайди', 'будь', 'ласка',
  'sprzet', 'urzadzenie', 'device', 'electronics', 'техніка', 'пристрій',
  'nowy', 'nowa', 'nowe', 'new', 'новий', 'нова', 'нове',
  'uzywany', 'uzywana', 'uzywane', 'used', 'preowned', 'вживаний', 'вживана', 'вживане', 'бу',
  'zl', 'pln', 'uah', 'eur', 'грн', 'euro',
  'dostawa', 'dostawa', 'delivery', 'wysylka', 'доставка',
  'gwarancja', 'warranty', 'гарантія',
]);
const GENERIC_CATEGORY_WORDS = new Set([
  'smartfon', 'telefon', 'phone', 'смартфон', 'телефон', 'laptop', 'notebook', 'ноутбук',
  'tablet', 'планшет', 'gaming', 'геймінг', 'audio', 'sluchawki', 'headphones', 'навушники',
  'monitor', 'telewizor', 'display', 'монітор', 'телевізор', 'aparat', 'kamera', 'camera',
  'фотоапарат', 'akcesoria', 'accessories', 'аксесуари',
]);

function normalize(value = '') {
  return ` ${String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ+]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function moneyValue(value) {
  const number = Number(String(value || '').replace(/[\s,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function firstMoney(query, expressions) {
  for (const expression of expressions) {
    const match = query.match(expression);
    const value = moneyValue(match?.[1]);
    if (value) return value;
  }
  return undefined;
}

function parseAssistantQuery(input) {
  const original = String(input || '').trim().slice(0, 180);
  const query = normalize(original);
  const category = CATEGORY_RULES.find(([, terms]) => terms.some((term) => query.includes(term)))?.[0];
  const brand = BRAND_RULES.find(([, aliases]) => aliases.some((alias) => query.includes(alias)))?.[0];
  const condition = /(uzywan|used|pre owned|second hand|вживан|б у| бу )/i.test(query)
    ? 'used'
    : /( now| new | нов)/i.test(query)
      ? 'new'
      : undefined;
  const maxPrice = firstMoney(query, [
    /(?:\bdo|ponizej|mniej niz|max(?:imum)?|under|up to|до|менше|макс(?:имум)?|не дорожче)\s*([\d\s,.]+)/i,
  ]);
  const minPrice = firstMoney(query, [/(?:\bod|from|від)\s*([\d\s,.]+)/i]);
  const verified = /(zweryfikowan|verified|перевірен|верифікован)/i.test(query);
  const negotiable = /(negocjac|targ|negotiable|торг)/i.test(query);
  const delivery = /(dostaw|delivery|wysylk|доставк)/i.test(query) ? 'shipping' : undefined;
  const warranty = /(gwaranc|warranty|гаранті)/i.test(query) ? 'any' : undefined;

  const priceValues = new Set([maxPrice, minPrice].filter(Boolean).map(String));
  const searchTokens = normalize(original)
    .trim()
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !GENERIC_CATEGORY_WORDS.has(token) && !priceValues.has(token))
    .filter((token) => !/^(do|od|under|from|max|maximum|до|від)$/.test(token));

  return {
    original,
    filters: { category, brand, condition, minPrice, maxPrice, verified, negotiable, delivery, warranty },
    searchTokens: [...new Set(searchTokens)],
  };
}

function productScore(product, tokens) {
  if (!tokens.length) return 1;
  const title = normalize(product.title);
  const brandModel = normalize(`${product.brand} ${product.model}`);
  const details = normalize(`${product.category} ${product.description} ${Object.values(product.specs || {}).join(' ')}`);
  let score = 0;
  for (const token of tokens) {
    if (title.includes(` ${token} `)) score += 9;
    else if (title.includes(token)) score += 6;
    if (brandModel.includes(token)) score += 5;
    if (details.includes(token)) score += 1;
  }
  if (product.sellerVerified) score += 1.5;
  if (product.sellerRating) score += product.sellerRating / 10;
  return score;
}

function localizedReply(language, count, filters) {
  const parts = [];
  if (filters.category) parts.push(filters.category);
  if (filters.brand) parts.push(filters.brand);
  if (filters.condition === 'used') parts.push(language === 'uk' ? 'вживане' : language === 'en' ? 'pre-owned' : 'używane');
  if (filters.condition === 'new') parts.push(language === 'uk' ? 'нове' : language === 'en' ? 'new' : 'nowe');
  if (filters.maxPrice) parts.push(`${language === 'uk' ? 'до' : language === 'en' ? 'up to' : 'do'} ${filters.maxPrice}`);
  const criteria = parts.length ? ` (${parts.join(', ')})` : '';
  if (language === 'uk') return count ? `Знайшов ${count} відповідних пропозицій${criteria}. Найкращі — нижче.` : `За цими критеріями нічого не знайшов${criteria}. Спробуй збільшити бюджет або прибрати одну з умов.`;
  if (language === 'en') return count ? `I found ${count} matching offers${criteria}. The best ones are below.` : `I found no offers matching these criteria${criteria}. Try a higher budget or fewer conditions.`;
  return count ? `Znalazłem ${count} pasujących ofert${criteria}. Najlepsze są poniżej.` : `Nie znalazłem ofert spełniających te warunki${criteria}. Zwiększ budżet albo usuń jeden z warunków.`;
}

async function searchCatalogWithAssistant(input, { region = 'pl', language = 'pl' } = {}) {
  const parsed = parseAssistantQuery(input);
  const filters = Object.fromEntries(
    Object.entries({ ...parsed.filters, region, inStock: true }).filter(([, value]) => value !== undefined && value !== false)
  );
  const wantsWarranty = Boolean(filters.warranty);
  delete filters.warranty;
  const products = await listProducts({ ...filters, sort: 'price_asc' });
  const ranked = products
    .filter((product) => !wantsWarranty || product.warranty !== 'none')
    .map((product) => ({ product, score: productScore(product, parsed.searchTokens) }))
    .filter((entry) => !parsed.searchTokens.length || entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
    .map((entry) => entry.product);
  const catalog = new URLSearchParams();
  if (parsed.searchTokens.length) catalog.set('q', parsed.searchTokens.join(' '));
  for (const [key, value] of Object.entries(parsed.filters)) {
    if (key !== 'warranty' && value !== undefined && value !== false) catalog.set(key, String(value));
  }
  return {
    reply: localizedReply(language, ranked.length, parsed.filters),
    total: ranked.length,
    results: ranked.slice(0, 4),
    filters: parsed.filters,
    catalogQuery: catalog.toString(),
  };
}

module.exports = { normalize, parseAssistantQuery, productScore, searchCatalogWithAssistant };
