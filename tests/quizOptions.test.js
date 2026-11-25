const test = require('node:test');
const assert = require('node:assert/strict');
const { orderQuizOptions } = require('../backend/utils/quizOptions');

test('daily quiz options preserve values and labels without favoring source position', () => {
  const options = [['correct', { uk: 'Правильна', en: 'Correct' }], ['wrong-a', 'A'], ['wrong-b', 'B']];
  const context = { userId: 'test-player', day: '2026-11-25', questionId: 'storage' };
  const first = orderQuizOptions(options, context);
  assert.deepEqual(orderQuizOptions(options, context), first);
  assert.deepEqual(orderQuizOptions([...options].reverse(), context), first);
  assert.deepEqual(new Set(first.map(([value]) => value)), new Set(options.map(([value]) => value)));
  assert.equal(first.find(([value]) => value === 'correct')[1].uk, 'Правильна');
  assert.deepEqual(options.map(([value]) => value), ['correct', 'wrong-a', 'wrong-b']);
  const positions = new Set(Array.from({ length: 24 }, (_, index) => orderQuizOptions(options, { ...context, questionId: `question-${index}` }).findIndex(([value]) => value === 'correct')));
  assert.deepEqual(positions, new Set([0, 1, 2]));
  const orders = new Set(Array.from({ length: 12 }, (_, index) => JSON.stringify(orderQuizOptions(options, { ...context, userId: `player-${index}` }))));
  assert.ok(orders.size > 1);
});
