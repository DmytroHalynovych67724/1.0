const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { currencyForRegion, normalizeRegion } = require('../utils/regions');

const SHIPPING_CENTS = { pl: 1999, ua: 9900, eu: 1499 };

function parseItems(value) {
  try {
    const items = JSON.parse(value || '[]');
    return Array.isArray(items) ? items : [];
  } catch (_error) {
    return [];
  }
}

function parseCheckout(value) {
  try {
    const checkout = JSON.parse(value || '{}');
    return checkout && typeof checkout === 'object' && !Array.isArray(checkout) ? checkout : {};
  } catch (_error) {
    return {};
  }
}

function normalizeOrder(row) {
  if (!row) return null;
  const region = normalizeRegion(row.region);
  return {
    id: row.id,
    userId: row.userId,
    items: parseItems(row.items),
    subtotal: Number(row.subtotal ?? row.total) || 0,
    discount: Number(row.discount) || 0,
    shipping: Number(row.shipping) || 0,
    shippingDiscount: Number(row.shippingDiscount) || 0,
    total: Number(row.total) || 0,
    promoCode: row.promoCode || null,
    rewardType: row.rewardType || null,
    rewardGift: row.rewardGift || null,
    checkout: parseCheckout(row.checkoutData),
    region,
    currency: currencyForRegion(region),
    status: row.status || 'created',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || null,
  };
}

async function createOrder({ userId, items, checkout: checkoutData = {}, promoCode = '' }) {
  const db = getDB();

  const processOrder = db.transaction(async () => {
    const snapshot = [];
    let totalCents = 0;
    let orderRegion;

    for (const item of items) {
      const product = await db
        .prepare(
          `
        SELECT id, title, price, priceCents, stock, brand, condition, images, region, currency,
               createdBy, sellerType
        FROM products
        WHERE id = ?
      `
        )
        .get(item.id);

      if (!product) {
        throw new AppError(
          409,
          'PRODUCT_UNAVAILABLE',
          `Product ${item.id} is no longer available`,
          [{ field: 'items', productId: item.id, message: 'Product does not exist' }]
        );
      }
      if (!Number.isInteger(product.stock) || product.stock < item.qty) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Not enough stock for ${product.title}`, [
          {
            field: 'items',
            productId: product.id,
            requested: item.qty,
            available: Math.max(Number(product.stock) || 0, 0),
            message: 'Requested quantity is unavailable',
          },
        ]);
      }

      const productRegion = normalizeRegion(product.region);
      if (orderRegion && productRegion !== orderRegion) {
        throw new AppError(
          400,
          'MIXED_REGIONS',
          'Products from different regions cannot be combined',
          [{ field: 'items', productId: product.id, message: 'Choose products from one region' }]
        );
      }
      orderRegion = productRegion;

      const acceptedOffer = await db
        .prepare(
          `
        SELECT o.id, o.amountCents
        FROM price_offers o
        JOIN conversations c ON c.id = o.conversationId
        WHERE o.productId = ? AND c.buyerId = ? AND o.status = 'accepted' AND o.expiresAt > ?
        ORDER BY o.updatedAt DESC, o.createdAt DESC LIMIT 1
      `
        )
        .get(product.id, userId, Date.now());
      const listPriceCents = Number.isInteger(product.priceCents)
        ? product.priceCents
        : Math.round(Number(product.price) * 100);
      const unitPriceCents = acceptedOffer?.amountCents || listPriceCents;
      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0) {
        throw new AppError(
          409,
          'PRODUCT_UNAVAILABLE',
          `Product ${product.title} has an invalid price`
        );
      }

      const lineTotalCents = unitPriceCents * item.qty;
      totalCents += lineTotalCents;
      if (!Number.isSafeInteger(totalCents)) {
        throw new AppError(400, 'ORDER_TOTAL_TOO_LARGE', 'Order total is too large');
      }

      let image = null;
      const productImages = parseItems(product.images);
      if (productImages.length && typeof productImages[0] === 'string') image = productImages[0];
      const sellerId =
        product.createdBy ||
        (
          await db
            .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY createdAt ASC LIMIT 1")
            .get()
        )?.id ||
        null;
      snapshot.push({
        id: product.id,
        productId: product.id,
        title: product.title,
        brand: product.brand || 'Inne',
        condition: product.condition === 'new' ? 'new' : 'used',
        sellerType: product.sellerType === 'private' ? 'private' : 'store',
        image,
        price: unitPriceCents / 100,
        listPrice: listPriceCents / 100,
        negotiated: Boolean(acceptedOffer),
        acceptedOfferId: acceptedOffer?.id || null,
        sellerId,
        qty: item.qty,
        lineTotal: lineTotalCents / 100,
        region: productRegion,
        currency: currencyForRegion(productRegion),
      });
    }

    const subtotalCents = totalCents;
    const deliveryMethod = checkoutData.deliveryMethod === 'shipping' ? 'shipping' : 'pickup';
    let shippingCents = deliveryMethod === 'shipping' ? SHIPPING_CENTS[orderRegion] : 0;
    let shippingDiscountCents = 0;
    let discountCents = 0;
    let appliedPromo = null;
    let appliedRewardType = null;
    let rewardGift = null;
    if (promoCode) {
      const now = Date.now();
      const promo = await db
        .prepare('SELECT * FROM promo_codes WHERE code = ? COLLATE NOCASE')
        .get(promoCode);
      const alreadyUsed = promo
        ? await db
            .prepare('SELECT 1 FROM promo_redemptions WHERE code = ? COLLATE NOCASE AND userId = ?')
            .get(promo.code, userId)
        : null;
      const unavailable =
        !promo ||
        promo.active !== 1 ||
        promo.region !== orderRegion ||
        (promo.startsAt && promo.startsAt > now) ||
        (promo.expiresAt && promo.expiresAt < now) ||
        (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) ||
        promo.minTotalCents > subtotalCents ||
        (promo.ownerId && promo.ownerId !== userId) ||
        alreadyUsed;
      if (unavailable) {
        throw new AppError(
          400,
          'INVALID_PROMO_CODE',
          'Promo code is invalid or unavailable for this order',
          [
            {
              field: 'promoCode',
              message: 'Check the code, region, minimum total and validity period',
            },
          ]
        );
      }
      const eligibleSubtotalCents = snapshot.reduce((sum, item) => {
        const conditionMatches =
          promo.applicableCondition === 'any' || item.condition === promo.applicableCondition;
        const sellerMatches =
          promo.applicableSellerType === 'any' || item.sellerType === promo.applicableSellerType;
        return conditionMatches && sellerMatches ? sum + Math.round(item.lineTotal * 100) : sum;
      }, 0);
      const hasUsedItem = snapshot.some((item) => item.condition === 'used');
      const rewardType = promo.rewardType || 'discount';

      if (rewardType === 'shipping') {
        if (deliveryMethod !== 'shipping' || shippingCents <= 0) {
          throw new AppError(
            400,
            'PROMO_NOT_APPLICABLE',
            'This code is valid only for a delivery order'
          );
        }
        shippingDiscountCents = shippingCents;
      } else if (rewardType === 'gift') {
        if (!hasUsedItem) {
          throw new AppError(
            400,
            'PROMO_NOT_APPLICABLE',
            'This gift is available only with a pre-owned item'
          );
        }
        rewardGift = promo.giftKey || 'care_kit';
      } else if (rewardType === 'smart' && eligibleSubtotalCents === 0 && hasUsedItem) {
        rewardGift = promo.giftKey || 'care_kit';
      } else {
        if (eligibleSubtotalCents <= 0) {
          throw new AppError(
            400,
            'PROMO_NOT_APPLICABLE',
            'Product discounts apply only to new items sold by verified stores'
          );
        }
        discountCents =
          promo.type === 'percent'
            ? Math.round((eligibleSubtotalCents * promo.value) / 100)
            : promo.value;
        if (promo.maxDiscountCents != null) {
          discountCents = Math.min(discountCents, promo.maxDiscountCents);
        }
        discountCents = Math.max(0, Math.min(discountCents, eligibleSubtotalCents));
        if (rewardType === 'smart' && hasUsedItem) {
          rewardGift = promo.giftKey || 'care_kit';
        }
      }
      appliedPromo = promo.code.toUpperCase();
      appliedRewardType =
        rewardType === 'smart' && rewardGift && discountCents > 0
          ? 'smart'
          : rewardGift
            ? 'gift'
            : rewardType === 'smart'
              ? 'discount'
              : rewardType;
    }

    shippingCents = Math.max(0, shippingCents);
    totalCents = subtotalCents - discountCents + shippingCents - shippingDiscountCents;

    for (const item of items) {
      const result = await db
        .prepare(
          `
        UPDATE products
        SET stock = stock - ?, updatedAt = ?
        WHERE id = ? AND stock >= ?
      `
        )
        .run(item.qty, Date.now(), item.id, item.qty);
      if (!result.changes) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Product stock changed during checkout');
      }
    }
    for (const item of snapshot.filter((entry) => entry.acceptedOfferId)) {
      await db
        .prepare(
          "UPDATE price_offers SET status = 'redeemed', updatedAt = ? WHERE id = ? AND status = 'accepted'"
        )
        .run(Date.now(), item.acceptedOfferId);
    }

    const id = uuidv4();
    const createdAt = Date.now();
    await db
      .prepare(
        `
      INSERT INTO orders (
        id, userId, items, subtotal, subtotalCents, discount, discountCents,
        shipping, shippingCents, shippingDiscount, shippingDiscountCents,
        total, totalCents, promoCode, rewardType, rewardGift, checkoutData,
        region, currency, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        userId,
        JSON.stringify(snapshot),
        subtotalCents / 100,
        subtotalCents,
        discountCents / 100,
        discountCents,
        shippingCents / 100,
        shippingCents,
        shippingDiscountCents / 100,
        shippingDiscountCents,
        totalCents / 100,
        totalCents,
        appliedPromo,
        appliedRewardType,
        rewardGift,
        JSON.stringify({
          ...checkoutData,
          ...(rewardGift ? { reward: { type: 'gift', key: rewardGift } } : {}),
        }),
        orderRegion,
        currencyForRegion(orderRegion),
        'created',
        createdAt
      );

    if (appliedPromo) {
      await db
        .prepare('UPDATE promo_codes SET usedCount = usedCount + 1 WHERE code = ? COLLATE NOCASE')
        .run(appliedPromo);
      await db
        .prepare(
          'INSERT INTO promo_redemptions (id, code, userId, orderId, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
        .run(uuidv4(), appliedPromo, userId, id, createdAt);
    }
    await db
      .prepare(
        'INSERT INTO order_status_history (id, orderId, status, changedBy, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(uuidv4(), id, 'created', userId, createdAt);

    return normalizeOrder(await db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
  });

  return processOrder.immediate();
}

async function getOrder(id) {
  return normalizeOrder(await getDB().prepare('SELECT * FROM orders WHERE id = ?').get(id));
}

async function listOrders({ userId, includeAll = false, limit = 50, offset = 0 }) {
  const db = getDB();
  const rows = includeAll
    ? await db
        .prepare('SELECT * FROM orders ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .all(limit, offset)
    : await db
        .prepare('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .all(userId, limit, offset);
  return rows.map(normalizeOrder);
}

async function updateOrderStatus({ orderId, status, changedBy }) {
  const transitions = {
    created: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
  };
  const db = getDB();
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (!Object.hasOwn(transitions, status) || !transitions[order.status]?.includes(status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Order cannot move from ${order.status} to ${status}`
    );
  }
  const now = Date.now();
  await db.transaction(async () => {
    await db
      .prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, now, orderId);
    await db
      .prepare(
        'INSERT INTO order_status_history (id, orderId, status, changedBy, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(uuidv4(), orderId, status, changedBy, now);
  })();
  return normalizeOrder(await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId));
}

module.exports = { createOrder, getOrder, listOrders, normalizeOrder, updateOrderStatus };
