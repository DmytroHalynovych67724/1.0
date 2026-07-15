const express = require('express');
const {
  createOffer,
  deleteMessage,
  listConversations,
  listMessages,
  openConversation,
  respondToOffer,
  sendMessage,
} = require('../models/chats');
const { requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listConversations(req.user.id)))
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    if (!productId || productId.length > 100)
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid productId is required');
    res.status(201).json(await openConversation({ productId, userId: req.user.id }));
  })
);

router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    res.json(await listMessages({ conversationId: req.params.id, userId: req.user.id }));
  })
);

router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 1000)
      throw new AppError(400, 'VALIDATION_ERROR', 'Message must contain 1 to 1000 characters');
    res
      .status(201)
      .json(await sendMessage({ conversationId: req.params.id, userId: req.user.id, body }));
  })
);

router.delete(
  '/:id/messages/:messageId',
  asyncHandler(async (req, res) => {
    res.json(
      await deleteMessage({
        conversationId: req.params.id,
        messageId: req.params.messageId,
        userId: req.user.id,
      })
    );
  })
);

router.post(
  '/:id/offers',
  asyncHandler(async (req, res) => {
    const amount = Number(req.body?.amount);
    const parentOfferId =
      typeof req.body?.parentOfferId === 'string' ? req.body.parentOfferId.trim() : null;
    res.status(201).json(
      await createOffer({
        conversationId: req.params.id,
        userId: req.user.id,
        amount,
        parentOfferId: parentOfferId || null,
      })
    );
  })
);

router.patch(
  '/:id/offers/:offerId',
  asyncHandler(async (req, res) => {
    const action = typeof req.body?.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    res.json(
      await respondToOffer({
        conversationId: req.params.id,
        offerId: req.params.offerId,
        userId: req.user.id,
        action,
      })
    );
  })
);

module.exports = router;
