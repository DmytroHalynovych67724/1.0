const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { quiz, quizChallenge, spin } = require('../models/rewards');
const { currentGame, startGame, move } = require('../models/tictactoe');
const { asyncHandler, AppError } = require('../utils/errors');

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
    res.json(await quizChallenge({ userId: req.user.id, language: req.query?.language }));
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
  (_req, _res, next) => next(new AppError(400, 'GAME_SESSION_REQUIRED', 'Start a game and submit each move; final boards are not accepted'))
);

router.get('/tictactoe/current', asyncHandler(async (req, res) => { res.json(await currentGame({ userId: req.user.id })); }));
router.post('/tictactoe/start', asyncHandler(async (req, res) => { res.status(201).json(await startGame({ userId: req.user.id, region: req.body?.region })); }));
router.get('/tictactoe/:id', asyncHandler(async (req, res) => { res.json(await currentGame({ userId: req.user.id, id: req.params.id })); }));
router.post('/tictactoe/:id/moves', asyncHandler(async (req, res) => { res.json(await move({ userId: req.user.id, id: req.params.id, cell: req.body?.cell, revision: req.body?.revision })); }));

module.exports = router;
