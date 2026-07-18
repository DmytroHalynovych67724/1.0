const assert = require('node:assert/strict');
const test = require('node:test');
const {
  GROQ_CHAT_URL,
  compactHistory,
  enhanceAssistantResult,
  requestGroqReply,
} = require('../backend/services/groqAssistant');

const catalogResult = {
  reply: 'Local fallback reply',
  total: 1,
  filters: { category: 'Smartfony', maxPrice: 2500 },
  results: [
    {
      id: 'phone-1',
      title: 'Apple iPhone 15',
      price: 2399,
      currency: 'PLN',
      condition: 'used',
      category: 'Smartfony',
      brand: 'Apple',
      model: 'iPhone 15',
      location: 'Warszawa',
      specs: { screen: '6.1 inch' },
    },
  ],
};

test('Groq assistant sends compact catalog context and returns generated text', async () => {
  let captured;
  const reply = await requestGroqReply({
    query: 'Szukam iPhone do 2500 zł',
    language: 'pl',
    region: 'pl',
    assistantResult: catalogResult,
    history: [{ role: 'user', content: 'Najlepiej używany' }],
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: 'Ten iPhone pasuje do Twojego budżetu.' } }],
          };
        },
      };
    },
  });

  assert.equal(reply, 'Ten iPhone pasuje do Twojego budżetu.');
  assert.equal(captured.url, GROQ_CHAT_URL);
  assert.equal(captured.options.headers.authorization, 'Bearer test-key');
  assert.equal(captured.body.model, 'llama-3.3-70b-versatile');
  assert.match(captured.body.messages.at(-1).content, /Apple iPhone 15/);
  assert.doesNotMatch(captured.options.body, /test-key/);
});

test('assistant safely falls back to local search when AI is unavailable', async () => {
  const result = await enhanceAssistantResult('iPhone', catalogResult, {
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: false }),
  });
  assert.equal(result.reply, 'Local fallback reply');
  assert.equal(result.assistantMode, 'local');
});

test('assistant history is size-limited and strips unsupported fields', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'unexpected',
    content: `message ${index}`,
    secret: 'not-forwarded',
  }));
  const compact = compactHistory(history);
  assert.equal(compact.length, 6);
  assert.deepEqual(Object.keys(compact[0]), ['role', 'content']);
  assert.equal(compact[0].role, 'user');
});
