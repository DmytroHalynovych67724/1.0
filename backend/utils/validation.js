const { AppError } = require('./errors');
const { REGIONS } = require('./regions');

const CONDITIONS = new Set(['new', 'used']);
const DELIVERY_METHODS = new Set(['shipping', 'pickup', 'both']);
const SELLER_TYPES = new Set(['store', 'private']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validationFailure(details) {
  return new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function validateCredentials(body, { registration = false } = {}) {
  const details = [];
  if (!isPlainObject(body))
    throw validationFailure([{ field: 'body', message: 'JSON object is required' }]);

  const username = normalizeUsername(body.username);
  const password = body.password;

  if (typeof username !== 'string' || !username) {
    details.push({ field: 'username', message: 'Username is required' });
  } else if (username.length < 3 || username.length > 40) {
    details.push({ field: 'username', message: 'Username must contain 3 to 40 characters' });
  } else if (!/^[\p{L}\p{N}._-]+$/u.test(username)) {
    details.push({ field: 'username', message: 'Username contains unsupported characters' });
  }

  if (typeof password !== 'string' || !password) {
    details.push({ field: 'password', message: 'Password is required' });
  } else if (registration && password.length < 8) {
    details.push({ field: 'password', message: 'Password must contain at least 8 characters' });
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    details.push({ field: 'password', message: 'Password must not exceed 72 UTF-8 bytes' });
  }

  if (details.length) throw validationFailure(details);
  return { username, password };
}

function readString(input, field, details, options = {}) {
  const value = input[field];
  if (typeof value !== 'string') {
    details.push({ field, message: `${field} must be a string` });
    return undefined;
  }

  const normalized = value.trim();
  const min = options.min ?? 0;
  const max = options.max ?? Infinity;
  if (normalized.length < min || normalized.length > max) {
    details.push({ field, message: `${field} must contain ${min} to ${max} characters` });
    return undefined;
  }
  return normalized;
}

function isValidImage(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const image = value.trim();
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(image)) {
    return Buffer.byteLength(image, 'utf8') <= 1_000_000;
  }
  if (image.length > 2048) return false;
  try {
    const url = new URL(image);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function validateProduct(body, { partial = false } = {}) {
  if (!isPlainObject(body))
    throw validationFailure([{ field: 'body', message: 'JSON object is required' }]);

  const supportedFields = [
    'title',
    'description',
    'price',
    'images',
    'specs',
    'category',
    'location',
    'condition',
    'brand',
    'stock',
    'seller',
    'sellerType',
    'delivery',
    'region',
    'model',
    'warranty',
    'negotiable',
    'status',
    'urgent',
    'inspection',
    'deviceDetails',
  ];
  const details = [];
  const value = {};
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  if (partial && !supportedFields.some(has)) {
    throw validationFailure([{ field: 'body', message: 'At least one product field is required' }]);
  }

  if (!partial || has('title')) {
    if (!has('title')) details.push({ field: 'title', message: 'title is required' });
    else value.title = readString(body, 'title', details, { min: 3, max: 120 });
  }

  if (!partial || has('description')) {
    if (has('description'))
      value.description = readString(body, 'description', details, { min: 0, max: 5000 });
    else value.description = '';
  }

  if (!partial || has('price')) {
    if (!has('price')) {
      details.push({ field: 'price', message: 'price is required' });
    } else if (
      typeof body.price !== 'number' ||
      !Number.isFinite(body.price) ||
      body.price <= 0 ||
      body.price > 10_000_000
    ) {
      details.push({
        field: 'price',
        message: 'price must be a number greater than 0 and no more than 10000000',
      });
    } else if (Math.abs(body.price * 100 - Math.round(body.price * 100)) > 1e-6) {
      details.push({ field: 'price', message: 'price can have no more than 2 decimal places' });
    } else {
      value.price = body.price;
    }
  }

  if (!partial || has('images')) {
    if (!has('images')) {
      value.images = [];
    } else if (!Array.isArray(body.images) || body.images.length > 8) {
      details.push({
        field: 'images',
        message: 'images must be an array containing no more than 8 items',
      });
    } else if (!body.images.every(isValidImage)) {
      details.push({
        field: 'images',
        message: 'Each image must be an http(s) URL or a supported data image',
      });
    } else {
      value.images = body.images.map((image) => image.trim());
    }
  }

  if (!partial || has('specs')) {
    if (!has('specs')) value.specs = {};
    else if (!isPlainObject(body.specs) || Object.keys(body.specs).length > 32) {
      details.push({
        field: 'specs',
        message: 'specs must be an object with no more than 32 fields',
      });
    } else {
      const specs = {};
      for (const [key, raw] of Object.entries(body.specs)) {
        const normalized =
          typeof raw === 'number' || typeof raw === 'boolean'
            ? String(raw)
            : typeof raw === 'string'
              ? raw.trim()
              : '';
        if (!/^[a-z][a-z0-9_]{0,29}$/i.test(key) || !normalized || normalized.length > 80) {
          details.push({ field: `specs.${key}`, message: 'spec name or value is invalid' });
        } else specs[key] = normalized;
      }
      value.specs = specs;
    }
  }

  const optionalStrings = [
    ['category', 'Elektronika', 2, 60],
    ['location', 'Unknown', 2, 80],
    ['brand', 'Inne', 1, 60],
    ['seller', 'NaShary Store', 2, 80],
    ['model', 'Inne', 1, 100],
  ];
  for (const [field, fallback, min, max] of optionalStrings) {
    if (!partial || has(field)) {
      if (has(field)) value[field] = readString(body, field, details, { min, max });
      else value[field] = fallback;
    }
  }

  if (!partial || has('warranty')) {
    const warranty = has('warranty') ? String(body.warranty).trim().toLowerCase() : 'none';
    if (!['none', 'seller', 'manufacturer'].includes(warranty))
      details.push({ field: 'warranty', message: 'warranty is invalid' });
    else value.warranty = warranty;
  }
  if (!partial || has('status')) {
    const status = has('status') ? String(body.status).trim().toLowerCase() : 'active';
    if (!['active', 'reserved', 'sold', 'draft'].includes(status))
      details.push({ field: 'status', message: 'status is invalid' });
    else value.status = status;
  }
  for (const field of ['negotiable', 'urgent']) {
    if (!partial || has(field)) {
      const raw = has(field) ? body[field] : field === 'negotiable';
      if (typeof raw !== 'boolean') details.push({ field, message: `${field} must be boolean` });
      else value[field] = raw;
    }
  }
  if (!partial || has('inspection')) {
    if (!has('inspection')) value.inspection = {};
    else if (!isPlainObject(body.inspection) || Object.keys(body.inspection).length > 12)
      details.push({ field: 'inspection', message: 'inspection must be a small object' });
    else value.inspection = Object.fromEntries(Object.entries(body.inspection).map(([key, raw]) => [key, Boolean(raw)]));
  }
  if (!partial || has('deviceDetails')) {
    if (!has('deviceDetails')) value.deviceDetails = {};
    else if (!isPlainObject(body.deviceDetails) || Object.keys(body.deviceDetails).length > 16)
      details.push({ field: 'deviceDetails', message: 'deviceDetails must be a small object' });
    else {
      const allowed = ['batteryHealth', 'display', 'body', 'completeness', 'defects', 'grade', 'country', 'serialChecked', 'specSource', 'specSourceId'];
      value.deviceDetails = Object.fromEntries(Object.entries(body.deviceDetails).filter(([key, raw]) => allowed.includes(key) && ['string', 'number', 'boolean'].includes(typeof raw)).map(([key, raw]) => [key, typeof raw === 'string' ? raw.trim().slice(0, 300) : raw]));
    }
  }

  if (!partial || has('condition')) {
    const condition =
      has('condition') && typeof body.condition === 'string'
        ? body.condition.trim().toLowerCase()
        : 'used';
    if (!CONDITIONS.has(condition))
      details.push({ field: 'condition', message: 'condition must be new or used' });
    else value.condition = condition;
  }

  if (!partial || has('stock')) {
    const stock = has('stock') ? body.stock : 1;
    if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) {
      details.push({ field: 'stock', message: 'stock must be an integer from 0 to 100000' });
    } else value.stock = stock;
  }

  if (!partial || has('sellerType')) {
    const sellerType =
      has('sellerType') && typeof body.sellerType === 'string'
        ? body.sellerType.trim().toLowerCase()
        : 'store';
    if (!SELLER_TYPES.has(sellerType))
      details.push({ field: 'sellerType', message: 'sellerType must be store or private' });
    else value.sellerType = sellerType;
  }

  if (!partial || has('delivery')) {
    const delivery =
      has('delivery') && typeof body.delivery === 'string'
        ? body.delivery.trim().toLowerCase()
        : 'both';
    if (!DELIVERY_METHODS.has(delivery))
      details.push({ field: 'delivery', message: 'delivery must be shipping, pickup or both' });
    else value.delivery = delivery;
  }

  if (!partial || has('region')) {
    const region =
      has('region') && typeof body.region === 'string' ? body.region.trim().toLowerCase() : 'pl';
    if (!REGIONS.has(region))
      details.push({ field: 'region', message: 'region must be pl, ua or eu' });
    else value.region = region;
  }

  if (details.length) throw validationFailure(details);
  return value;
}

function validateOrder(body) {
  if (!isPlainObject(body))
    throw validationFailure([{ field: 'body', message: 'JSON object is required' }]);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw validationFailure([{ field: 'items', message: 'items must contain 1 to 50 products' }]);
  }

  const details = [];
  const quantities = new Map();
  body.items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      details.push({ field: `items[${index}]`, message: 'Item must be an object' });
      return;
    }
    const idValue = item.id ?? item.productId;
    const id = typeof idValue === 'string' ? idValue.trim() : '';
    const qty = item.qty;
    if (!id || id.length > 100) {
      details.push({ field: `items[${index}].id`, message: 'Valid product id is required' });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      details.push({
        field: `items[${index}].qty`,
        message: 'qty must be an integer from 1 to 99',
      });
    }
    if (id && Number.isInteger(qty) && qty >= 1 && qty <= 99) {
      quantities.set(id, (quantities.get(id) || 0) + qty);
    }
  });

  const items = Array.from(quantities, ([id, qty]) => ({ id, qty }));
  for (const item of items) {
    if (item.qty > 99)
      details.push({ field: 'items', message: `Combined quantity for ${item.id} exceeds 99` });
  }

  const checkout = {};
  const nestedCheckout = isPlainObject(body.checkout) ? body.checkout : {};
  const checkoutSource = { ...nestedCheckout, ...body };
  if (checkoutSource.name && !checkoutSource.customerName) {
    checkoutSource.customerName = checkoutSource.name;
  }
  if (checkoutSource.delivery && !checkoutSource.deliveryMethod) {
    checkoutSource.deliveryMethod = checkoutSource.delivery;
  }
  const optionalCheckoutFields = [
    ['customerName', 2, 80],
    ['phone', 6, 30],
    ['email', 5, 120],
    ['address', 3, 240],
    ['city', 2, 80],
    ['postalCode', 2, 16],
    ['country', 2, 80],
    ['deliveryOption', 2, 40],
    ['deliveryPoint', 1, 120],
    ['paymentMethod', 2, 40],
    ['comment', 0, 500],
  ];
  for (const [field, min, max] of optionalCheckoutFields) {
    if (!Object.prototype.hasOwnProperty.call(checkoutSource, field)) continue;
    checkout[field] = readString(checkoutSource, field, details, { min, max });
  }
  if (checkout.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email)) {
    details.push({ field: 'email', message: 'email must be a valid email address' });
  }
  if (Object.prototype.hasOwnProperty.call(checkoutSource, 'deliveryMethod')) {
    const deliveryMethod =
      typeof checkoutSource.deliveryMethod === 'string'
        ? checkoutSource.deliveryMethod.trim().toLowerCase()
        : '';
    if (!['shipping', 'pickup'].includes(deliveryMethod)) {
      details.push({
        field: 'deliveryMethod',
        message: 'deliveryMethod must be shipping or pickup',
      });
    } else checkout.deliveryMethod = deliveryMethod;
  }
  let promoCode = '';
  if (Object.prototype.hasOwnProperty.call(body, 'promoCode')) {
    promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
    if (promoCode && !/^[A-Z0-9_-]{3,30}$/.test(promoCode)) {
      details.push({ field: 'promoCode', message: 'promoCode has an invalid format' });
    }
  }

  if (details.length) throw validationFailure(details);
  return { items, checkout, promoCode };
}

function validatePagination(query) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  const details = [];
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    details.push({ field: 'limit', message: 'limit must be an integer from 1 to 100' });
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    details.push({ field: 'offset', message: 'offset must be a non-negative integer' });
  }
  if (details.length) throw validationFailure(details);
  return { limit, offset };
}

module.exports = {
  CONDITIONS,
  DELIVERY_METHODS,
  SELLER_TYPES,
  REGIONS,
  validateCredentials,
  validateOrder,
  validatePagination,
  validateProduct,
};
