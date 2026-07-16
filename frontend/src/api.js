export class ApiError extends Error {
  constructor(message, status, code, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const configuredApi = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const apiBase = configuredApi
  ? `${configuredApi}${configuredApi.endsWith('/api') ? '' : '/api'}`
  : '/api';
const backendOrigin = configuredApi.replace(/\/api$/, '');
const appBase = import.meta.env.BASE_URL || '/';

export const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === 'true' && !configuredApi;

function appUrl(value) {
  return `${appBase}${String(value || '').replace(/^\/+/, '')}`;
}

let demoCatalogPromise;

async function loadDemoCatalog() {
  if (!demoCatalogPromise) {
    demoCatalogPromise = fetch(appUrl('demo-products.json')).then(async (response) => {
      if (!response.ok) throw new ApiError('Nie udało się wczytać katalogu demonstracyjnego.', 503, 'DEMO_CATALOG_UNAVAILABLE');
      return response.json();
    });
  }
  return demoCatalogPromise;
}

export async function catalogPreview(path) {
  const [, search = ''] = String(path || '').split('?');
  return filterDemoProducts(await loadDemoCatalog(), new URLSearchParams(search));
}

function textValue(value) {
  if (Array.isArray(value)) return value.join(' ');
  if (value && typeof value === 'object') return Object.values(value).join(' ');
  return String(value ?? '');
}

function filterDemoProducts(items, params) {
  const reserved = new Set([
    'q',
    'region',
    'category',
    'brand',
    'model',
    'condition',
    'grade',
    'city',
    'sellerType',
    'delivery',
    'warranty',
    'verified',
    'negotiable',
    'urgent',
    'inStock',
    'minPrice',
    'maxPrice',
    'sort',
  ]);
  const query = (params.get('q') || '').trim().toLocaleLowerCase();
  const region = params.get('region');
  let products = items.filter((product) => {
    if (region && product.region !== region) return false;
    if (params.get('category') && product.category !== params.get('category')) return false;
    if (params.get('brand') && product.brand !== params.get('brand')) return false;
    if (params.get('model') && product.model !== params.get('model')) return false;
    if (params.get('condition') && product.condition !== params.get('condition')) return false;
    if (params.get('grade') && product.deviceDetails?.grade !== params.get('grade')) return false;
    if (params.get('city') && product.location !== params.get('city')) return false;
    if (params.get('sellerType') && product.sellerType !== params.get('sellerType')) return false;
    if (params.get('delivery') && product.delivery !== params.get('delivery')) return false;
    if (params.get('warranty') && product.warranty !== params.get('warranty')) return false;
    if (params.get('verified') === 'true' && !product.sellerVerified) return false;
    if (params.get('negotiable') === 'true' && !product.negotiable) return false;
    if (params.get('urgent') === 'true' && !product.urgent) return false;
    if (params.get('inStock') === 'true' && Number(product.stock) < 1) return false;
    if (params.get('minPrice') && Number(product.price) < Number(params.get('minPrice'))) return false;
    if (params.get('maxPrice') && Number(product.price) > Number(params.get('maxPrice'))) return false;
    if (query) {
      const haystack = [
        product.title,
        product.description,
        product.brand,
        product.model,
        product.category,
        product.location,
        ...Object.values(product.specs || {}),
      ]
        .map(textValue)
        .join(' ')
        .toLocaleLowerCase();
      if (!query.split(/\s+/).every((token) => haystack.includes(token))) return false;
    }
    for (const [key, expected] of params.entries()) {
      if (reserved.has(key) || !expected) continue;
      if (!textValue(product.specs?.[key]).toLocaleLowerCase().includes(expected.toLocaleLowerCase()))
        return false;
    }
    return true;
  });

  const sort = params.get('sort') || 'newest';
  const compare = {
    price_asc: (a, b) => Number(a.price) - Number(b.price),
    price_desc: (a, b) => Number(b.price) - Number(a.price),
    title_asc: (a, b) => a.title.localeCompare(b.title),
    stock_desc: (a, b) => Number(b.stock) - Number(a.stock),
    oldest: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  }[sort];
  if (compare) products = [...products].sort(compare);
  return products;
}

function modelSummary(offers) {
  const first = offers[0];
  const prices = offers.map((offer) => Number(offer.price));
  return {
    brand: first.brand,
    model: first.model,
    category: first.category,
    image: first.images?.[0],
    description: first.description,
    price: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: first.currency,
    },
    offers,
    specs: first.specs || {},
    variants: {
      colors: [...new Set(offers.map((item) => item.specs?.color).filter(Boolean))],
      storage: [...new Set(offers.map((item) => item.specs?.storage).filter(Boolean))],
    },
    reviews: [],
    accessories: [],
  };
}

async function staticDemoApi(path, options) {
  const method = String(options.method || 'GET').toUpperCase();
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  if (method === 'POST' && pathname === '/marketplace/newsletter') {
    return { ok: true, demo: true };
  }
  if (method !== 'GET') {
    throw new ApiError(
      'Ta funkcja wymaga uruchomionego serwera NaShary.',
      503,
      'STATIC_DEMO_ONLY'
    );
  }

  const catalog = await loadDemoCatalog();
  if (pathname === '/products') return filterDemoProducts(catalog, params);
  if (pathname === '/products/model') {
    const offers = filterDemoProducts(catalog, params).filter(
      (item) => item.brand === params.get('brand') && item.model === params.get('model')
    );
    if (!offers.length) throw new ApiError('Nie znaleziono modelu.', 404, 'MODEL_NOT_FOUND');
    return modelSummary(offers);
  }
  if (/^\/products\/[^/]+\/related$/.test(pathname)) {
    const id = decodeURIComponent(pathname.split('/')[2]);
    const current = catalog.find((item) => item.id === id);
    if (!current) return [];
    return catalog
      .filter((item) => item.id !== id && (item.category === current.category || item.brand === current.brand))
      .slice(0, 8);
  }
  if (/^\/products\/[^/]+$/.test(pathname)) {
    const id = decodeURIComponent(pathname.split('/')[2]);
    const product = catalog.find((item) => item.id === id);
    if (!product) throw new ApiError('Nie znaleziono produktu.', 404, 'PRODUCT_NOT_FOUND');
    return product;
  }
  if (pathname === '/marketplace/questions') return [];
  if (pathname === '/marketplace/assistant') {
    const query = params.get('q') || '';
    const products = filterDemoProducts(catalog, new URLSearchParams({ q: query, region: params.get('region') || '' })).slice(0, 4);
    return {
      reply: products.length
        ? `Znalazłem ${products.length} pasujące oferty w katalogu demonstracyjnym.`
        : 'Nie znalazłem dokładnego dopasowania. Spróbuj podać markę lub kategorię.',
      products,
      total: products.length,
      catalogQuery: new URLSearchParams({ q: query }).toString(),
    };
  }
  if (pathname === '/health') return { status: 'demo', service: 'nashary-pages' };
  throw new ApiError(
    'Ta funkcja wymaga uruchomionego serwera NaShary.',
    503,
    'STATIC_DEMO_ONLY'
  );
}

export async function api(path, options = {}) {
  if (isStaticDemo) return staticDemoApi(path, options);

  const token = localStorage.getItem('nashary-token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('nashary-token');
      localStorage.removeItem('nashary-user');
      window.dispatchEvent(new CustomEvent('nashary:auth-expired'));
    }
    throw new ApiError(
      (typeof payload?.error === 'string' ? payload.error : payload?.error?.message) ||
        payload?.message ||
        'Nie udało się wykonać operacji.',
      response.status,
      payload?.code || payload?.error?.code,
      payload?.details || payload?.error?.details
    );
  }
  return payload;
}

export function imageUrl(value) {
  if (!value) return appUrl('assets/product-placeholder.svg');
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  const clean = String(value).replace(/^\.\//, '');
  if (clean.startsWith('/assets/') || clean.startsWith('assets/')) {
    return appUrl(clean.replace(/^\//, ''));
  }
  if (clean.startsWith('/') && backendOrigin) return `${backendOrigin}${clean}`;
  if (clean.startsWith('/')) return clean;
  return appUrl(clean);
}
