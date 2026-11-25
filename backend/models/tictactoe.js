const crypto = require('node:crypto');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { play, rewardFor } = require('./rewards');

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const TTL = 30 * 60 * 1000;

function outcome(board) {
  const line = LINES.find((cells) => board[cells[0]] && cells.every((cell) => board[cell] === board[cells[0]]));
  return line ? board[line[0]] : board.every(Boolean) ? 'draw' : null;
}

function minimax(board, maximizing, depth = 0) {
  const winner = outcome(board);
  if (winner) return winner === 'O' ? 10 - depth : winner === 'X' ? depth - 10 : 0;
  const values = [];
  board.forEach((cell, index) => {
    if (cell) return;
    const next = [...board]; next[index] = maximizing ? 'O' : 'X';
    values.push(minimax(next, !maximizing, depth + 1));
  });
  return maximizing ? Math.max(...values) : Math.min(...values);
}

function botMove(board) {
  const free = board.map((cell, index) => cell ? null : index).filter((cell) => cell !== null);
  if (!free.length) return null;
  // Retain the existing 5% fallibility so an honest player can earn the reward.
  if (crypto.randomInt(100) < 5) return free[crypto.randomInt(free.length)];
  const scored = free.map((index) => { const next = [...board]; next[index] = 'O'; return { index, score: minimax(next, false) }; });
  const best = Math.max(...scored.map(({ score }) => score));
  const choices = scored.filter(({ score }) => score === best);
  return choices[crypto.randomInt(choices.length)].index;
}

function view(row) {
  return { sessionId: row.id, region: row.region, board: JSON.parse(row.board), revision: Number(row.revision), winner: row.winner || null, reward: row.result ? JSON.parse(row.result) : null, expiresAt: Number(row.expiresAt) };
}

async function readSession(userId, id) {
  const row = id
    ? await getDB().prepare('SELECT * FROM tictactoe_sessions WHERE id = ? AND userId = ?').get(id, userId)
    : await getDB().prepare('SELECT * FROM tictactoe_sessions WHERE userId = ?').get(userId);
  if (!row) throw new AppError(404, 'GAME_NOT_FOUND', 'Game not found');
  if (Number(row.expiresAt) <= Date.now()) throw new AppError(410, 'GAME_EXPIRED', 'This game expired. Start a new board.');
  return row;
}

async function currentGame({ userId, id }) { return view(await readSession(userId, id)); }

async function startGame({ userId, region }) {
  if (!['pl', 'ua', 'eu'].includes(region)) throw new AppError(400, 'INVALID_REGION', 'Choose a valid market');
  const now = Date.now();
  const row = { id: uuidv4(), userId, region, board: JSON.stringify(Array(9).fill(null)), revision: 0, winner: null, result: null, createdAt: now, expiresAt: now + TTL };
  // One current board per account bounds storage and invalidates an abandoned board.
  await getDB().prepare(`INSERT INTO tictactoe_sessions (id, userId, region, board, revision, winner, result, createdAt, expiresAt)
    VALUES (@id, @userId, @region, @board, @revision, @winner, @result, @createdAt, @expiresAt)
    ON CONFLICT(userId) DO UPDATE SET id = excluded.id, region = excluded.region, board = excluded.board,
      revision = 0, winner = NULL, result = NULL, createdAt = excluded.createdAt, expiresAt = excluded.expiresAt`).run(row);
  return view(row);
}

async function move({ userId, id, cell, revision }) {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || !Number.isInteger(revision) || revision < 0) throw new AppError(400, 'INVALID_GAME_MOVE', 'Choose an empty cell and current revision');
  const row = await readSession(userId, id);
  if (Number(row.revision) !== revision) throw new AppError(409, 'STALE_GAME_MOVE', 'The board has changed. Reload its current state.');
  if (row.winner) throw new AppError(409, 'GAME_FINISHED', 'This board has finished');
  const board = JSON.parse(row.board);
  if (board[cell]) throw new AppError(409, 'CELL_OCCUPIED', 'This cell is occupied');
  board[cell] = 'X';
  let winner = outcome(board);
  if (!winner) { const index = botMove(board); if (index !== null) board[index] = 'O'; winner = outcome(board); }
  const commit = async (reward) => {
    const updated = await getDB().prepare(`UPDATE tictactoe_sessions SET board = ?, revision = revision + 1, winner = ?, result = ?
      WHERE id = ? AND userId = ? AND revision = ? AND expiresAt > ? AND winner IS NULL`).run(JSON.stringify(board), winner, reward ? JSON.stringify(reward) : null, id, userId, revision, Date.now());
    if (!updated.changes) throw new AppError(409, 'STALE_GAME_MOVE', 'The board has changed. Reload its current state.');
  };
  if (winner === 'X') {
    try {
      await play({ userId, region: row.region, game: 'tictactoe', won: true, reward: rewardFor('tictactoe'), commitResult: commit });
    } catch (error) {
      if (error.code !== 'DAILY_ATTEMPT_USED') throw error;
      await commit({ won: true, used: true, rewardCode: null });
    }
  } else await commit(null);
  return currentGame({ userId, id });
}

module.exports = { currentGame, startGame, move };
