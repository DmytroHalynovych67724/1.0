(() => {
  'use strict';

  const API_ROOT = '/api';
  const CURRENT_REGION = window.NaSharyRegion?.region || 'pl';
  const CURRENT_CURRENCY = window.NaSharyRegion?.currency || 'PLN';
  const STORAGE = {
    products: 'nashary-demo-products',
    cart: 'nashary-cart',
    favorites: 'nashary-favorites',
    token: 'nashary-token',
    user: 'nashary-user'
  };

  const CATEGORIES = [
    { value: 'Смартфони', label: 'Смартфони', icon: '📱' },
    { value: 'Ноутбуки', label: 'Ноутбуки', icon: '💻' },
    { value: 'Комп’ютери', label: 'Комп’ютери', icon: '🖥️' },
    { value: 'Gaming', label: 'Геймінг', icon: '🎮' },
    { value: 'Аудіо', label: 'Аудіо', icon: '🎧' },
    { value: 'TV', label: 'TV і монітори', icon: '📺' },
    { value: 'Фото', label: 'Фото і відео', icon: '📷' },
    { value: 'Аксесуари', label: 'Аксесуари', icon: '⌨️' }
  ];

  const CATEGORY_ALIASES = {
    Telefony: 'Смартфони',
    Phones: 'Смартфони',
    Smartfony: 'Смартфони',
    Laptopy: 'Ноутбуки',
    Computers: 'Комп’ютери',
    Audio: 'Аудіо',
    Monitory: 'TV',
    Akcesoria: 'Аксесуари',
    Accessories: 'Аксесуари',
    General: 'Електроніка',
    Elektronika: 'Електроніка'
  };

  const CATEGORY_IMAGES = {
    Смартфони: 'assets/products/phone.svg',
    Ноутбуки: 'assets/products/laptop.svg',
    'Комп’ютери': 'assets/products/laptop.svg',
    Gaming: 'assets/products/console.svg',
    'Геймінг': 'assets/products/console.svg',
    'Аудіо': 'assets/products/headphones.svg',
    TV: 'assets/products/monitor.svg',
    'Фото': 'assets/products/camera.svg',
    'Аксесуари': 'assets/products/watch.svg',
    'Електроніка': 'assets/product-placeholder.svg'
  };

  const FALLBACK_PRODUCTS = [
    {
      id: 'demo-iphone-15',
      title: 'Apple iPhone 15 Pro 256GB',
      description:
        'Smartfon z polskiej dystrybucji w świetnym stanie. Pełny zestaw, przewód USB-C i 12 miesięcy gwarancji sklepu.',
      price: 4299,
      oldPrice: 4699,
      category: 'Смартфони',
      location: 'Warszawa',
      images: ['assets/products/phone.svg'],
      condition: 'used',
      brand: 'Apple',
      stock: 2,
      seller: 'SmartPoint',
      delivery: 'both',
      createdAt: Date.now() - 1000 * 60 * 42
    },
    {
      id: 'demo-macbook-air',
      title: 'MacBook Air M2 13″ 16/512GB',
      description:
        'Nowy ultrabook z układem Apple M2, ekranem Liquid Retina i baterią działającą do 18 godzin.',
      price: 4899,
      category: 'Ноутбуки',
      location: 'Kraków',
      images: ['assets/products/laptop.svg'],
      condition: 'new',
      brand: 'Apple',
      stock: 5,
      seller: 'Tech Space',
      delivery: 'shipping',
      createdAt: Date.now() - 1000 * 60 * 60 * 5
    },
    {
      id: 'demo-playstation',
      title: 'Sony PlayStation 5 Slim',
      description:
        'Konsola z napędem i dwoma kontrolerami DualSense. Używana ostrożnie, bez napraw i ukrytych wad.',
      price: 1990,
      category: 'Gaming',
      location: 'Wrocław',
      images: ['assets/products/console.svg'],
      condition: 'used',
      brand: 'Sony',
      stock: 1,
      seller: 'Aleksander',
      delivery: 'both',
      createdAt: Date.now() - 1000 * 60 * 60 * 23
    },
    {
      id: 'demo-headphones',
      title: 'Навушники Sony WH‑1000XM5',
      description:
        'Nowe słuchawki bezprzewodowe z ANC, aplikacją producenta i czasem pracy do 30 godzin.',
      price: 1349,
      oldPrice: 1499,
      category: 'Аудіо',
      location: 'Gdańsk',
      images: ['assets/products/headphones.svg'],
      condition: 'new',
      brand: 'Sony',
      stock: 8,
      seller: 'Sound Lab',
      delivery: 'shipping',
      createdAt: Date.now() - 1000 * 60 * 60 * 29
    },
    {
      id: 'demo-monitor',
      title: 'Монітор Samsung Odyssey G5 27″',
      description:
        'Monitor gamingowy QHD 165 Hz. Bez martwych pikseli, z pudełkiem, podstawą i przewodami.',
      price: 1090,
      category: 'TV',
      location: 'Poznań',
      images: ['assets/products/monitor.svg'],
      condition: 'used',
      brand: 'Samsung',
      stock: 1,
      seller: 'Maks',
      delivery: 'pickup',
      createdAt: Date.now() - 1000 * 60 * 60 * 32
    },
    {
      id: 'demo-camera',
      title: 'Камера Fujifilm X‑S20 Body',
      description:
        'Nowy aparat bezlusterkowy z oficjalną gwarancją, matrycą 26 MP, stabilizacją i nagrywaniem 6.2K.',
      price: 5299,
      category: 'Фото',
      location: 'Warszawa',
      images: ['assets/products/camera.svg'],
      condition: 'new',
      brand: 'Fujifilm',
      stock: 3,
      seller: 'Photo Pro',
      delivery: 'both',
      createdAt: Date.now() - 1000 * 60 * 60 * 48
    },
    {
      id: 'demo-watch',
      title: 'Apple Watch Series 9 45mm',
      description:
        'Smartwatch w dobrym stanie, kondycja baterii 93%. Pudełko, oryginalny pasek i przewód do ładowania.',
      price: 1290,
      category: 'Аксесуари',
      location: 'Lublin',
      images: ['assets/products/watch.svg'],
      condition: 'used',
      brand: 'Apple',
      stock: 1,
      seller: 'Maria',
      delivery: 'both',
      createdAt: Date.now() - 1000 * 60 * 60 * 56
    },
    {
      id: 'demo-lenovo',
      title: 'Lenovo Legion 5 15ACH6H',
      description:
        'Wydajny laptop gamingowy Ryzen 7, RTX 3060, 16/1000 GB. Po czyszczeniu, działa bez zarzutu.',
      price: 3390,
      category: 'Ноутбуки',
      location: 'Katowice',
      images: ['assets/products/laptop.svg'],
      condition: 'used',
      brand: 'Lenovo',
      stock: 1,
      seller: 'Game Gear',
      delivery: 'both',
      createdAt: Date.now() - 1000 * 60 * 60 * 72
    },
    {
      id: 'demo-offline-ua-laptop',
      title: 'ASUS TUF Gaming A15',
      description: 'Новий ноутбук з офіційною гарантією, Ryzen 7, 16 GB RAM і RTX 4060.',
      price: 48999,
      category: 'Ноутбуки',
      location: 'Львів',
      images: ['assets/products/laptop.svg'],
      condition: 'new',
      brand: 'ASUS',
      stock: 3,
      seller: 'Tech Львів',
      delivery: 'shipping',
      region: 'ua',
      createdAt: Date.now() - 1000 * 60 * 19
    },
    {
      id: 'demo-offline-eu-console',
      title: 'Steam Deck OLED 512 GB',
      description: 'Brand-new handheld console with EU warranty and tracked delivery.',
      price: 569,
      category: 'Gaming',
      location: 'Prague, CZ',
      images: ['assets/products/console.svg'],
      condition: 'new',
      brand: 'Valve',
      stock: 5,
      seller: 'EuroGaming',
      delivery: 'shipping',
      region: 'eu',
      createdAt: Date.now() - 1000 * 60 * 24
    }
  ];

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeCategory(value) {
    const category = String(value || '').trim();
    return CATEGORY_ALIASES[category] || category || 'Електроніка';
  }

  function normalizeCondition(value) {
    const condition = String(value || '').toLowerCase();
    return ['used', 'б/в', 'бв', 'вживаний'].includes(condition) ? 'used' : 'new';
  }

  function normalizeDelivery(value) {
    return ['shipping', 'pickup', 'both'].includes(value) ? value : 'both';
  }

  function safeImageUrl(value, fallback = 'assets/product-placeholder.svg') {
    const url = String(value || '').trim();
    if (!url) return fallback;
    if (/^(https?:\/\/|data:image\/|blob:|\/|\.\.?\/|assets\/)/i.test(url)) return url;
    return fallback;
  }

  function normalizeProduct(product = {}) {
    let images = product.images;
    if (typeof images === 'string') images = safeParse(images, [images]);
    const category = normalizeCategory(product.category);
    const cleanImages = Array.isArray(images)
      ? images.map((image) => safeImageUrl(image, '')).filter(Boolean)
      : [];
    const price = Math.max(0, Number(product.price) || 0);
    const stockValue = Number(product.stock);
    const region = ['pl', 'ua', 'eu'].includes(String(product.region || '').toLowerCase())
      ? String(product.region).toLowerCase()
      : 'pl';
    const regionalCurrency = { pl: 'PLN', ua: 'UAH', eu: 'EUR' }[region];

    return {
      ...product,
      id: String(product.id || `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title: String(product.title || 'Оголошення без назви'),
      description: String(product.description || 'Продавець ще не додав опис товару.'),
      price,
      oldPrice: Number(product.oldPrice) > price ? Number(product.oldPrice) : null,
      category,
      location: String(product.location || 'Польща'),
      images: cleanImages.length ? cleanImages : [CATEGORY_IMAGES[category] || 'assets/product-placeholder.svg'],
      condition: normalizeCondition(product.condition),
      brand: String(product.brand || 'Інший бренд'),
      stock: Number.isFinite(stockValue) ? Math.max(0, Math.floor(stockValue)) : 1,
      seller: String(product.seller || 'Перевірений продавець'),
      delivery: normalizeDelivery(product.delivery),
      region,
      currency: regionalCurrency,
      createdAt: Number(product.createdAt) || Date.now()
    };
  }

  function getStoredProducts() {
    const stored = safeParse(localStorage.getItem(STORAGE.products), null);
    if (Array.isArray(stored) && stored.length) return stored.map(normalizeProduct);
    return FALLBACK_PRODUCTS.map(normalizeProduct);
  }

  function saveProducts(products) {
    localStorage.setItem(STORAGE.products, JSON.stringify(products.map(normalizeProduct)));
  }

  function addLocalProduct(product) {
    const newProduct = normalizeProduct(product);
    const products = getStoredProducts();
    products.unshift(newProduct);
    saveProducts(products);
    return newProduct;
  }

  function updateLocalProduct(id, payload) {
    const products = getStoredProducts();
    const index = products.findIndex((product) => product.id === String(id));
    if (index === -1) return null;
    products[index] = normalizeProduct({ ...products[index], ...payload, id: products[index].id });
    saveProducts(products);
    return products[index];
  }

  function removeLocalProduct(id) {
    const products = getStoredProducts().filter((product) => product.id !== String(id));
    saveProducts(products);
    return products;
  }

  async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

    let response;
    try {
      response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
    } catch (error) {
      const networkError = new Error('Не вдалося з’єднатися із сервером. Перевірте підключення.');
      networkError.isNetworkError = true;
      networkError.cause = error;
      throw networkError;
    }

    const contentType = response.headers.get('content-type') || '';
    const body = response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

    if (!response.ok) {
      const error = new Error(body?.error || body?.message || `Помилка сервера (${response.status})`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  async function fetchProducts() {
    try {
      const products = await apiRequest(`/products?region=${encodeURIComponent(CURRENT_REGION)}`);
      return Array.isArray(products) ? products.map(normalizeProduct) : [];
    } catch (error) {
      if (!error.isNetworkError) console.warn('Не вдалося завантажити каталог', error);
      return getStoredProducts().filter((product) => product.region === CURRENT_REGION);
    }
  }

  async function fetchProduct(id) {
    try {
      return normalizeProduct(await apiRequest(`/products/${encodeURIComponent(id)}`));
    } catch (error) {
      if (error.status === 404 && error.body?.code === 'PRODUCT_NOT_FOUND') return null;
      if (!error.isNetworkError && error.status !== 404) throw error;
      return getStoredProducts().find((product) => product.id === String(id)) || null;
    }
  }

  function formatPrice(value, currency = 'PLN') {
    const safeCurrency = /^[A-Z]{3}$/.test(String(currency || '').toUpperCase())
      ? String(currency).toUpperCase()
      : 'PLN';
    return new Intl.NumberFormat(window.NaSharyI18n?.intlLocale || 'pl-PL', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    const date = new Date(Number(value) || value);
    return Number.isNaN(date.getTime())
      ? 'Нещодавно'
      : new Intl.DateTimeFormat(window.NaSharyI18n?.intlLocale || 'pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function deliveryLabel(value) {
    return {
      shipping: 'Доставка по Польщі',
      pickup: 'Тільки самовивіз',
      both: 'Доставка або самовивіз'
    }[normalizeDelivery(value)];
  }

  function conditionLabel(value) {
    return normalizeCondition(value) === 'used' ? 'Б/в' : 'Новий';
  }

  function readList(key) {
    const list = safeParse(localStorage.getItem(key), []);
    return Array.isArray(list) ? list : [];
  }

  function emitStateChange() {
    window.dispatchEvent(new CustomEvent('nashary:statechange'));
  }

  function getFavorites() {
    return [...new Set(readList(STORAGE.favorites).map(String))];
  }

  function toggleFavorite(id) {
    const stringId = String(id);
    const favorites = getFavorites();
    const index = favorites.indexOf(stringId);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(stringId);
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
    emitStateChange();
    return index < 0;
  }

  function getCart() {
    return readList(STORAGE.cart)
      .map((item) => ({
        id: String(item.id || ''),
        qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
        region: ['pl', 'ua', 'eu'].includes(item.region) ? item.region : 'pl'
      }))
      .filter((item) => item.id && item.region === CURRENT_REGION);
  }

  function setCart(cart) {
    localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
    emitStateChange();
  }

  function addToCart(id, qty = 1) {
    const stringId = String(id);
    const cart = getCart();
    const item = cart.find((entry) => entry.id === stringId);
    if (item) item.qty += Math.max(1, Math.floor(Number(qty) || 1));
    else cart.push({ id: stringId, qty: Math.max(1, Math.floor(Number(qty) || 1)), region: CURRENT_REGION });
    setCart(cart);
    return cart;
  }

  function updateCartItem(id, qty) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === String(id));
    if (!item) return cart;
    const nextQty = Math.floor(Number(qty) || 0);
    if (nextQty <= 0) return removeFromCart(id);
    item.qty = nextQty;
    setCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    const cart = getCart().filter((entry) => entry.id !== String(id));
    setCart(cart);
    return cart;
  }

  function clearCart() {
    setCart([]);
  }

  function getToken() {
    return localStorage.getItem(STORAGE.token) || '';
  }

  function getStoredUser() {
    const user = safeParse(localStorage.getItem(STORAGE.user), null);
    return user && typeof user === 'object' ? user : null;
  }

  function setSession(token, user = null) {
    if (token) localStorage.setItem(STORAGE.token, token);
    else localStorage.removeItem(STORAGE.token);
    if (user) localStorage.setItem(STORAGE.user, JSON.stringify(user));
    else localStorage.removeItem(STORAGE.user);
    emitStateChange();
  }

  function clearSession() {
    setSession('', null);
  }

  async function getCurrentUser(force = false) {
    if (!getToken()) return null;
    if (!force) {
      const stored = getStoredUser();
      if (stored) return stored;
    }
    try {
      const body = await apiRequest('/auth/me');
      const user = body?.user || body;
      if (user && typeof user === 'object') {
        localStorage.setItem(STORAGE.user, JSON.stringify(user));
        return user;
      }
      return null;
    } catch (error) {
      if (error.status === 401 || error.status === 403) clearSession();
      throw error;
    }
  }

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (value == null) return;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = String(value);
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'attributes') {
        Object.entries(value).forEach(([name, attributeValue]) => node.setAttribute(name, String(attributeValue)));
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node) node[key] = value;
      else node.setAttribute(key, String(value));
    });
    const entries = Array.isArray(children) ? children : [children];
    entries.filter((child) => child != null).forEach((child) => {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function createProductImage(product, className = 'product-image') {
    const image = el('img', {
      className,
      alt: product.title,
      src: safeImageUrl(product.images?.[0]),
      loading: 'lazy',
      decoding: 'async'
    });
    image.addEventListener('error', () => {
      if (!image.src.endsWith('/assets/product-placeholder.svg')) {
        image.src = 'assets/product-placeholder.svg';
      }
    });
    return image;
  }

  function updateHeaderCounters() {
    const favoriteCount = getFavorites().length;
    const cartCount = getCart().reduce((total, item) => total + item.qty, 0);
    document.querySelectorAll('[data-favorite-count]').forEach((node) => {
      node.textContent = String(favoriteCount);
      node.hidden = favoriteCount === 0;
    });
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = String(cartCount);
      node.hidden = cartCount === 0;
    });

    const user = getStoredUser();
    document.querySelectorAll('[data-account-label]').forEach((node) => {
      node.textContent = user?.username || user?.name || 'Увійти';
    });
  }

  function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = el('div', {
        className: 'toast-container',
        attributes: { 'aria-live': 'polite', 'aria-atomic': 'true' }
      });
      document.body.append(container);
    }
    const toast = el('div', { className: `toast toast--${type}` }, [
      el('span', { className: 'toast__icon', text: type === 'error' ? '!' : '✓' }),
      el('span', { text: message })
    ]);
    container.append(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function productLink(id) {
    return `product.html?id=${encodeURIComponent(id)}`;
  }

  function initials(name) {
    return String(name || 'T')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  window.addEventListener('storage', emitStateChange);
  window.addEventListener('nashary:statechange', updateHeaderCounters);
  document.addEventListener('DOMContentLoaded', updateHeaderCounters);

  window.NaShary = Object.freeze({
    API_ROOT,
    currentRegion: CURRENT_REGION,
    currentCurrency: CURRENT_CURRENCY,
    CATEGORIES,
    STORAGE,
    normalizeProduct,
    normalizeCategory,
    safeImageUrl,
    formatPrice,
    formatDate,
    deliveryLabel,
    conditionLabel,
    fetchProducts,
    fetchProduct,
    apiRequest,
    getStoredProducts,
    saveProducts,
    addLocalProduct,
    updateLocalProduct,
    removeLocalProduct,
    getFavorites,
    toggleFavorite,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getToken,
    getStoredUser,
    setSession,
    clearSession,
    getCurrentUser,
    el,
    clearNode,
    createProductImage,
    updateHeaderCounters,
    showToast,
    productLink,
    initials
  });
})();
