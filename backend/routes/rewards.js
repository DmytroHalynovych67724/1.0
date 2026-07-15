const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { quiz, quizChallenge, spin, ticTacToe } = require('../models/rewards');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();
router.use(requireAuth);

router.post(
  '/spin',
  asyncHandler(async (req, res) => {
    res.json(await spin({ userId: req.user.id, region: req.body?.region }));
  })
);

router.get(
  '/quiz',
  asyncHandler(async (req, res) => {
    res.json(quizChallenge({ userId: req.user.id, language: req.query?.language }));
  })
);

router.post(
  '/quiz',
  asyncHandler(async (req, res) => {
    res.json(
      await quiz({
        userId: req.user.id,
        region: req.body?.region,
        answer: req.body?.answer,
        answers: req.body?.answers,
        questionId: req.body?.questionId,
      })
    );
  })
);

router.post(
  '/tictactoe',
  asyncHandler(async (req, res) => {
    res.json(
      await ticTacToe({ userId: req.user.id, region: req.body?.region, board: req.body?.board })
    );
  })
);

module.exports = router;
