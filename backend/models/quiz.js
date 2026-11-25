const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { play, rewardFor, dailyQuestions, localizedQuestion, today } = require('./rewards');

const TTL = 30 * 60 * 1000;
const REQUIRED = 7;

function present(row, language = 'pl', attempt = null) {
  const locale = ['pl', 'uk', 'en'].includes(language) ? language : 'pl';
  const questions = JSON.parse(row.questionData);
  const result = row.result ? JSON.parse(row.result) : null;
  return {
    sessionId: row.id, region: row.region, revision: Number(row.revision), expiresAt: Number(row.expiresAt),
    questions: questions.map((question) => localizedQuestion(question, locale, { userId: row.userId, day: row.day })),
    answers: JSON.parse(row.answers), total: questions.length, requiredCorrect: REQUIRED,
    attempted: Boolean(attempt || result), result,
    previousResult: result ? { won: result.won, rewardCode: result.rewardCode } : attempt ? { won: Boolean(attempt.won), rewardCode: attempt.rewardCode || null } : null,
  };
}

async function quizChallenge({ userId, language, region = 'pl' }) {
  if (!['pl', 'ua', 'eu'].includes(region)) throw new AppError(400, 'INVALID_REGION', 'Choose a valid market');
  const db = getDB();
  const day = today();
  const now = Date.now();
  const attempt = await db.prepare("SELECT won,rewardCode FROM game_attempts WHERE userId = ? AND game = 'quiz' AND attemptDate = ?").get(userId, day);
  const row = { id: uuidv4(), userId, day, region, questionData: JSON.stringify(dailyQuestions(userId)), createdAt: now, expiresAt: now + TTL, now };
  // Snapshot questions, including server-only answers, to keep an in-progress quiz stable across deployments.
  await db.prepare(`INSERT INTO quiz_sessions (id,userId,day,region,questionData,createdAt,expiresAt)
    VALUES (@id,@userId,@day,@region,@questionData,@createdAt,@expiresAt)
    ON CONFLICT(userId) DO UPDATE SET id=excluded.id,day=excluded.day,region=excluded.region,
      questionData=excluded.questionData,answers='[]',revision=0,result=NULL,createdAt=excluded.createdAt,expiresAt=excluded.expiresAt
    WHERE quiz_sessions.day <> excluded.day OR (quiz_sessions.expiresAt <= @now AND quiz_sessions.result IS NULL)`).run(row);
  await db.prepare('UPDATE quiz_sessions SET region = ? WHERE userId = ? AND revision = 0 AND result IS NULL').run(region, userId);
  return present(await db.prepare('SELECT * FROM quiz_sessions WHERE userId = ?').get(userId), language, attempt);
}

async function answerQuestion({ userId, sessionId, revision, questionId, answer, language }) {
  if (typeof sessionId !== 'string' || !Number.isInteger(revision) || revision < 0 || typeof questionId !== 'string' || typeof answer !== 'string') throw new AppError(400, 'INVALID_QUIZ_ANSWER', 'Submit a question, an answer and the current revision');
  const db = getDB();
  const row = await db.prepare('SELECT * FROM quiz_sessions WHERE id = ? AND userId = ?').get(sessionId, userId);
  if (!row) throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz not found');
  if (row.day !== today() || Number(row.expiresAt) <= Date.now()) throw new AppError(410, 'QUIZ_EXPIRED', 'This quiz expired. Reload the questions.');
  if (Number(row.revision) !== revision) throw new AppError(409, 'STALE_QUIZ_ANSWER', 'The quiz has advanced. Restore its current state.');
  if (row.result || await db.prepare("SELECT 1 FROM game_attempts WHERE userId = ? AND game = 'quiz' AND attemptDate = ?").get(userId, row.day)) throw new AppError(409, 'DAILY_ATTEMPT_USED', "Today's quiz has already been completed");
  const questions = JSON.parse(row.questionData);
  const question = questions[revision];
  if (!question || question.id !== questionId || !question.options.some(([value]) => value === answer)) throw new AppError(400, 'INVALID_QUIZ_ANSWER', 'Answer the current question with one of its options');
  const answers = [...JSON.parse(row.answers), { questionId, answer }];
  const commit = async (result = null) => {
    const updated = await db.prepare(`UPDATE quiz_sessions SET answers=?,revision=revision+1,result=?
      WHERE id=? AND userId=? AND revision=? AND result IS NULL AND expiresAt>?`).run(JSON.stringify(answers), result ? JSON.stringify(result) : null, sessionId, userId, revision, Date.now());
    if (!updated.changes) throw new AppError(409, 'STALE_QUIZ_ANSWER', 'The quiz has advanced. Restore its current state.');
  };
  if (answers.length === questions.length) {
    const correct = answers.filter((item, index) => questions[index].id === item.questionId && questions[index].answer === item.answer).length;
    await play({ userId, region: row.region, game: 'quiz', won: correct >= REQUIRED,
      reward: rewardFor('quiz', { perfect: correct === questions.length }),
      result: { correct, total: questions.length, requiredCorrect: REQUIRED,
        review: questions.map((question, index) => ({ questionId: question.id, selectedValue: answers[index].answer, correctValue: question.answer })) }, commitResult: commit });
  } else await commit();
  return present(await db.prepare('SELECT * FROM quiz_sessions WHERE id = ? AND userId = ?').get(sessionId, userId), language);
}

module.exports = { quizChallenge, answerQuestion };
