const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { currencyForRegion, normalizeRegion } = require('../utils/regions');

function parseImages(value) {
  try {
    const images = JSON.parse(value || '[]');
    return Array.isArray(images) ? images : [];
  } catch (_error) {
    return [];
  }
}

function normalizeConversation(row) {
  if (!row) return null;
  return {
    ...row,
    productImages: parseImages(row.productImages),
    productPrice: row.productPrice == null ? null : Number(row.productPrice),
    unreadCount: Number(row.unreadCount) || 0,
  };
}

async function conversationForUser(id, userId) {
  return getDB()
    .prepare(
      `
    SELECT c.*, p.title AS productTitle, p.images AS productImages, p.price AS productPrice,
      p.currency AS productCurrency, buyer.username AS buyerName, seller.username AS sellerName,
      buyer.avatar AS buyerAvatar, seller.avatar AS sellerAvatar
    FROM conversations c
    JOIN products p ON p.id = c.productId
    JOIN users buyer ON buyer.id = c.buyerId
    JOIN users seller ON seller.id = c.sellerId
    WHERE c.id = ? AND (c.buyerId = ? OR c.sellerId = ?)
  `
    )
    .get(id, userId, userId);
}

async function openConversation({ productId, userId }) {
  const db = getDB();
  const product = await db
    .prepare('SELECT id, createdBy FROM products WHERE id = ?')
    .get(productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  let sellerId = product.createdBy;
  if (!sellerId)
    sellerId = (
      await db
        .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY createdAt ASC LIMIT 1")
        .get()
    )?.id;
  if (!sellerId) throw new AppError(409, 'SELLER_UNAVAILABLE', 'Seller is unavailable');
  if (sellerId === userId)
    throw new AppError(
      400,
      'OWN_PRODUCT_CHAT',
      'You cannot start a buyer chat for your own product'
    );

  const existing = await db
    .prepare('SELECT id FROM conversations WHERE productId = ? AND buyerId = ? AND sellerId = ?')
    .get(productId, userId, sellerId);
  if (existing) return normalizeConversation(await conversationForUser(existing.id, userId));

  const id = uuidv4();
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO conversations (id, productId, buyerId, sellerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, productId, userId, sellerId, now, now);
  return normalizeConversation(await conversationForUser(id, userId));
}

async function listConversations(userId) {
  return (
    await getDB()
      .prepare(
        `
    SELECT c.*, p.title AS productTitle, p.images AS productImages, p.price AS productPrice,
      p.currency AS productCurrency, buyer.username AS buyerName, seller.username AS sellerName,
      buyer.avatar AS buyerAvatar, seller.avatar AS sellerAvatar,
      (SELECT body FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) AS lastMessage,
      (SELECT createdAt FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) AS lastMessageAt,
      (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND senderId != ? AND readAt IS NULL) AS unreadCount
    FROM conversations c
    JOIN products p ON p.id = c.productId
    JOIN users buyer ON buyer.id = c.buyerId
    JOIN users seller ON seller.id = c.sellerId
    WHERE c.buyerId = ? OR c.sellerId = ?
    ORDER BY c.updatedAt DESC
  `
      )
      .all(userId, userId, userId)
  ).map(normalizeConversation);
}

async function listMessages({ conversationId, userId }) {
  const conversation = await conversationForUser(conversationId, userId);
  if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  const db = getDB();
  await db
    .prepare(
      'UPDATE messages SET readAt = ? WHERE conversationId = ? AND senderId != ? AND readAt IS NULL'
    )
    .run(Date.now(), conversationId, userId);
  await db
    .prepare(
      "UPDATE price_offers SET status = 'expired', updatedAt = ? WHERE conversationId = ? AND status = 'pending' AND expiresAt < ?"
    )
    .run(Date.now(), conversationId, Date.now());
  return {
    conversation: normalizeConversation(conversation),
    messages: await db
      .prepare(
        `
      SELECT m.id, m.senderId, u.username AS senderName, m.body, m.createdAt, m.readAt
      FROM messages m JOIN users u ON u.id = m.senderId
      WHERE m.conversationId = ? ORDER BY m.createdAt ASC LIMIT 200
    `
      )
      .all(conversationId),
    offers: (
      await db
        .prepare(
          `
      SELECT o.*, creator.username AS creatorName, recipient.username AS recipientName
      FROM price_offers o
      JOIN users creator ON creator.id = o.createdBy
      JOIN users recipient ON recipient.id = o.recipientId
      WHERE o.conversationId = ? ORDER BY o.createdAt ASC
    `
        )
        .all(conversationId)
    ).map((offer) => ({
      ...offer,
      amount: offer.amountCents / 100,
    })),
  };
}

async function sendMessage({ conversationId, userId, body }) {
  if (!(await conversationForUser(conversationId, userId))) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  const id = uuidv4();
  const createdAt = Date.now();
  const db = getDB();
  await db.transaction(async () => {
    await db
      .prepare(
        'INSERT INTO messages (id, conversationId, senderId, body, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, conversationId, userId, body, createdAt);
    await db
      .prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?')
      .run(createdAt, conversationId);
  })();
  return await db
    .prepare(
      `
    SELECT m.id, m.senderId, u.username AS senderName, m.body, m.createdAt, m.readAt
    FROM messages m JOIN users u ON u.id = m.senderId WHERE m.id = ?
  `
    )
    .get(id);
}

async function deleteMessage({ conversationId, messageId, userId }) {
  if (!(await conversationForUser(conversationId, userId))) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  const db = getDB();
  const message = await db
    .prepare('SELECT senderId FROM messages WHERE id = ? AND conversationId = ?')
    .get(messageId, conversationId);
  if (!message) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  if (message.senderId !== userId) {
    throw new AppError(403, 'MESSAGE_DELETE_DENIED', 'You can delete only your own messages');
  }
  await db.transaction(async () => {
    await db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    await db
      .prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?')
      .run(Date.now(), conversationId);
  })();
  return { deleted: true, id: messageId };
}

async function createOffer({ conversationId, userId, amount, parentOfferId = null }) {
  const db = getDB();
  const conversation = await conversationForUser(conversationId, userId);
  if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  const product = await db
    .prepare('SELECT priceCents, price, region FROM products WHERE id = ?')
    .get(conversation.productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 1_000_000_000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Offer amount must be a valid positive price');
  }
  const recipientId =
    conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
  const now = Date.now();
  const id = uuidv4();
  const expiresAt = now + 48 * 60 * 60 * 1000;
  await db.transaction(async () => {
    if (parentOfferId) {
      const parent = await db
        .prepare(
          "SELECT * FROM price_offers WHERE id = ? AND conversationId = ? AND recipientId = ? AND status = 'pending'"
        )
        .get(parentOfferId, conversationId, userId);
      if (!parent)
        throw new AppError(
          409,
          'OFFER_UNAVAILABLE',
          'The original offer can no longer be countered'
        );
      await db
        .prepare("UPDATE price_offers SET status = 'countered', updatedAt = ? WHERE id = ?")
        .run(now, parentOfferId);
    }
    await db
      .prepare(
        `
      INSERT INTO price_offers (
        id, conversationId, productId, createdBy, recipientId, amountCents,
        currency, status, parentOfferId, expiresAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `
      )
      .run(
        id,
        conversationId,
        conversation.productId,
        userId,
        recipientId,
        amountCents,
        currencyForRegion(normalizeRegion(product.region)),
        parentOfferId,
        expiresAt,
        now
      );
    await db
      .prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?')
      .run(now, conversationId);
  })();
  return await db
    .prepare('SELECT *, amountCents / 100.0 AS amount FROM price_offers WHERE id = ?')
    .get(id);
}

async function respondToOffer({ conversationId, offerId, userId, action }) {
  if (!['accept', 'reject'].includes(action)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Action must be accept or reject');
  }
  if (!(await conversationForUser(conversationId, userId))) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  const db = getDB();
  const offer = await db
    .prepare(
      "SELECT * FROM price_offers WHERE id = ? AND conversationId = ? AND recipientId = ? AND status = 'pending'"
    )
    .get(offerId, conversationId, userId);
  if (!offer || offer.expiresAt < Date.now()) {
    throw new AppError(409, 'OFFER_UNAVAILABLE', 'This offer is no longer available');
  }
  const status = action === 'accept' ? 'accepted' : 'rejected';
  const now = Date.now();
  await db.transaction(async () => {
    await db
      .prepare('UPDATE price_offers SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, now, offerId);
    if (status === 'accepted') {
      await db
        .prepare(
          "UPDATE price_offers SET status = 'rejected', updatedAt = ? WHERE conversationId = ? AND id != ? AND status = 'pending'"
        )
        .run(now, conversationId, offerId);
    }
    await db
      .prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?')
      .run(now, conversationId);
  })();
  return { ...offer, status, updatedAt: now, amount: offer.amountCents / 100 };
}

module.exports = {
  createOffer,
  deleteMessage,
  listConversations,
  listMessages,
  openConversation,
  respondToOffer,
  sendMessage,
};
