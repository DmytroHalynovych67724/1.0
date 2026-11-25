// Called inside the cancellation transaction, after every seller's part is cancelled.
// Move the active redemption into the audit table; preserve the coupon's original terms.
async function releaseCancelledPromo(db, order, changedBy) {
  const redemption = await db.prepare('SELECT * FROM promo_redemptions WHERE orderId = ?').get(order.id);
  if (!redemption) return;
  const now = Date.now();
  await db.prepare(`INSERT INTO promo_redemption_releases (orderId,redemptionId,code,userId,redeemedAt,releasedAt,changedBy)
    VALUES (?,?,?,?,?,?,?)`).run(order.id, redemption.id, redemption.code, redemption.userId, redemption.createdAt, now, changedBy || null);
  const removed = await db.prepare('DELETE FROM promo_redemptions WHERE id = ? AND orderId = ?').run(redemption.id, order.id);
  if (removed.changes) {
    await db.prepare('UPDATE promo_codes SET usedCount = MAX(0, usedCount - 1) WHERE code = ? COLLATE NOCASE').run(redemption.code);
    await db.prepare('UPDATE orders SET promoReleasedAt = ? WHERE id = ?').run(now, order.id);
  }
}

module.exports = { releaseCancelledPromo };
