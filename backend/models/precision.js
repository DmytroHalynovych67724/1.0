const crypto = require('node:crypto');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { play, rewardFor } = require('./rewards');

const TTL = 30_000;
const NETWORK_ALLOWANCE = 5_000;

function view(row) {
  return { sessionId: row.id, region: row.region, target: Number(row.target), cycleMs: Number(row.cycleMs), expiresAt: Number(row.expiresAt), serverTime: Date.now(), result: row.result ? JSON.parse(row.result) : null };
}
async function session(userId, id) {
  const row = await getDB().prepare('SELECT * FROM precision_sessions WHERE id=? AND userId=?').get(id, userId);
  if (!row) throw new AppError(404, 'GAME_NOT_FOUND', 'Game not found');
  if (!row.result && Number(row.expiresAt) <= Date.now()) throw new AppError(410, 'GAME_EXPIRED', 'This game expired. Start again.');
  return row;
}
async function currentGame({ userId, id }) { return view(await session(userId, id)); }
async function startGame({ userId, region }) {
  if (!['pl', 'ua', 'eu'].includes(region)) throw new AppError(400, 'INVALID_REGION', 'Choose a valid market');
  const now = Date.now();
  const row = { id: uuidv4(), userId, region, target: crypto.randomInt(1800, 8201) / 100, cycleMs: crypto.randomInt(1050, 1401), createdAt: now, expiresAt: now + TTL };
  await getDB().prepare(`INSERT INTO precision_sessions (id,userId,region,target,cycleMs,createdAt,expiresAt)
    VALUES (@id,@userId,@region,@target,@cycleMs,@createdAt,@expiresAt)
    ON CONFLICT(userId) DO UPDATE SET id=excluded.id,region=excluded.region,target=excluded.target,
      cycleMs=excluded.cycleMs,createdAt=excluded.createdAt,expiresAt=excluded.expiresAt,result=NULL`).run(row);
  return view(row);
}
async function stopGame({ userId, id, elapsedMs }) {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > TTL) throw new AppError(400, 'INVALID_GAME_TIME', 'Invalid stop time');
  const row = await session(userId, id);
  if (row.result) throw new AppError(409, 'GAME_FINISHED', 'This game has already finished');
  const serverElapsed = Date.now() - Number(row.createdAt);
  // A visual frame timestamp is reported by the client. Bound it by the server clock;
  // allow network delay, but never accept a claimed position or a claimed win.
  if (elapsedMs > serverElapsed || serverElapsed - elapsedMs > NETWORK_ALLOWANCE) throw new AppError(400, 'INVALID_GAME_TIME', 'Could not confirm timing. Start again.');
  const phase = (elapsedMs % Number(row.cycleMs)) / Number(row.cycleMs);
  const position = phase < .5 ? phase * 200 : (1 - phase) * 200;
  const won = Math.abs(position - Number(row.target)) <= 1.75;
  const commit = async (result) => {
    const updated = await getDB().prepare('UPDATE precision_sessions SET result=? WHERE id=? AND userId=? AND result IS NULL AND expiresAt>?').run(JSON.stringify(result), id, userId, Date.now());
    if (!updated.changes) throw new AppError(409, 'GAME_FINISHED', 'This game has already finished or expired');
  };
  if (won) {
    try { await play({ userId, region: row.region, game: 'spin', won: true, reward: rewardFor('spin'), result: { position }, commitResult: commit }); }
    catch (error) {
      if (error.code !== 'DAILY_ATTEMPT_USED') throw error;
      await commit({ won: true, used: true, rewardCode: null, position });
    }
  } else await commit({ won: false, rewardCode: null, position });
  return currentGame({ userId, id });
}

module.exports = { currentGame, startGame, stopGame };
