const crypto = require('node:crypto');

// Keep an account's daily option order stable across reloads and languages.
// The order never depends on the correct answer or on the source-array position.
function orderQuizOptions(options, { userId, day, questionId }) {
  return options.map((option) => ({
    option,
    rank: crypto.createHash('sha256').update(JSON.stringify(['quiz-options-v1', day, userId, questionId, option[0]])).digest('hex'),
  })).sort((a, b) => a.rank.localeCompare(b.rank) || a.option[0].localeCompare(b.option[0])).map(({ option }) => option);
}

module.exports = { orderQuizOptions };
