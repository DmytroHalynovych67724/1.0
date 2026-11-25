const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { normalizeRegion, currencyForRegion } = require('../utils/regions');
const rewardPolicy = require('../../shared/rewardPolicy.json');
const { orderQuizOptions } = require('../utils/quizOptions');

const DAY = 24 * 60 * 60 * 1000;
const QUIZ_DAILY_TOTAL = 8;

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
}

function uniqueCode(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

const QUIZ_QUESTIONS = [
  {
    id: 'storage',
    prompt: {
      pl: 'Który nośnik nie ma ruchomych części?',
      uk: 'Який накопичувач не має рухомих частин?',
      en: 'Which storage device has no moving parts?',
    },
    options: [
      ['hdd', 'HDD'],
      ['ssd', 'SSD'],
      ['dvd', 'DVD'],
    ],
    answer: 'ssd',
  },
  {
    id: 'refresh',
    prompt: {
      pl: 'Co oznacza 120 Hz w ekranie smartfona?',
      uk: 'Що означає 120 Гц в екрані смартфона?',
      en: 'What does 120 Hz mean on a smartphone display?',
    },
    options: [
      ['memory', { pl: 'Pamięć', uk: 'Пам’ять', en: 'Memory' }],
      ['refresh', { pl: 'Częstotliwość odświeżania', uk: 'Частота оновлення', en: 'Refresh rate' }],
      ['brightness', { pl: 'Jasność', uk: 'Яскравість', en: 'Brightness' }],
    ],
    answer: 'refresh',
  },
  {
    id: 'usb',
    prompt: {
      pl: 'Które złącze jest standardem w nowych telefonach w UE?',
      uk: 'Який роз’єм є стандартом у нових телефонах в ЄС?',
      en: 'Which connector is standard on new phones in the EU?',
    },
    options: [
      ['micro', 'Micro USB'],
      ['lightning', 'Lightning'],
      ['usb-c', 'USB-C'],
    ],
    answer: 'usb-c',
  },
  {
    id: 'battery',
    prompt: {
      pl: 'Co najlepiej chroni baterię smartfona?',
      uk: 'Що найкраще захищає батарею смартфона?',
      en: 'What best protects a smartphone battery?',
    },
    options: [
      ['heat', { pl: 'Stałe przegrzewanie', uk: 'Постійний перегрів', en: 'Constant overheating' }],
      [
        'cool',
        {
          pl: 'Unikanie wysokiej temperatury',
          uk: 'Уникання високої температури',
          en: 'Avoiding high temperatures',
        },
      ],
      [
        'zero',
        {
          pl: 'Codzienne rozładowanie do zera',
          uk: 'Щоденна розрядка до нуля',
          en: 'Daily discharge to zero',
        },
      ],
    ],
    answer: 'cool',
  },
  {
    id: 'oled',
    prompt: {
      pl: 'Który ekran wyłącza pojedyncze piksele dla głębokiej czerni?',
      uk: 'Який екран вимикає окремі пікселі для глибокого чорного?',
      en: 'Which display turns off individual pixels for deep blacks?',
    },
    options: [
      ['oled', 'OLED'],
      ['tn', 'TN LCD'],
      ['eink', 'E-ink'],
    ],
    answer: 'oled',
  },
  {
    id: 'ram',
    prompt: {
      pl: 'Do czego służy pamięć RAM?',
      uk: 'Для чого потрібна оперативна пам’ять?',
      en: 'What is RAM used for?',
    },
    options: [
      [
        'active',
        {
          pl: 'Dane aktualnie używanych aplikacji',
          uk: 'Дані активних програм',
          en: 'Data used by active apps',
        },
      ],
      [
        'archive',
        { pl: 'Stałe archiwum zdjęć', uk: 'Постійний архів фото', en: 'Permanent photo archive' },
      ],
      ['power', { pl: 'Zasilanie procesora', uk: 'Живлення процесора', en: 'Powering the CPU' }],
    ],
    answer: 'active',
  },
  {
    id: 'ip68',
    prompt: {
      pl: 'Co najczęściej oznacza oznaczenie IP68?',
      uk: 'Що зазвичай означає позначення IP68?',
      en: 'What does an IP68 rating usually indicate?',
    },
    options: [
      [
        'water',
        {
          pl: 'Odporność na pył i wodę',
          uk: 'Захист від пилу та води',
          en: 'Dust and water resistance',
        },
      ],
      ['speed', { pl: 'Szybkość internetu', uk: 'Швидкість інтернету', en: 'Internet speed' }],
      [
        'camera',
        { pl: 'Rozdzielczość aparatu', uk: 'Роздільна здатність камери', en: 'Camera resolution' },
      ],
    ],
    answer: 'water',
  },
  {
    id: 'nfc',
    prompt: {
      pl: 'Która technologia umożliwia płatności zbliżeniowe telefonem?',
      uk: 'Яка технологія дає змогу платити телефоном безконтактно?',
      en: 'Which technology enables contactless phone payments?',
    },
    options: [
      ['nfc', 'NFC'],
      ['gps', 'GPS'],
      ['vga', 'VGA'],
    ],
    answer: 'nfc',
  },
  {
    id: 'wifi6',
    prompt: {
      pl: 'Wi‑Fi 6 to przede wszystkim standard…',
      uk: 'Wi‑Fi 6 — це насамперед стандарт…',
      en: 'Wi-Fi 6 is primarily a standard for…',
    },
    options: [
      [
        'wireless',
        { pl: 'Sieci bezprzewodowej', uk: 'Бездротової мережі', en: 'Wireless networking' },
      ],
      ['charging', { pl: 'Ładowania', uk: 'Заряджання', en: 'Charging' }],
      [
        'display',
        { pl: 'Wyświetlania obrazu', uk: 'Виведення зображення', en: 'Displaying images' },
      ],
    ],
    answer: 'wireless',
  },
  {
    id: 'gpu',
    prompt: {
      pl: 'Który podzespół odpowiada głównie za renderowanie grafiki?',
      uk: 'Який компонент переважно відповідає за обробку графіки?',
      en: 'Which component mainly renders graphics?',
    },
    options: [
      ['gpu', 'GPU'],
      ['ssd', 'SSD'],
      ['psu', 'PSU'],
    ],
    answer: 'gpu',
  },
  {
    id: 'resolution',
    prompt: {
      pl: 'Która rozdzielczość ma najwięcej pikseli?',
      uk: 'Яка роздільна здатність має найбільше пікселів?',
      en: 'Which resolution has the most pixels?',
    },
    options: [
      ['hd', 'HD'],
      ['fhd', 'Full HD'],
      ['4k', '4K UHD'],
    ],
    answer: '4k',
  },
  {
    id: 'backup',
    prompt: {
      pl: 'Co najlepiej chroni dane przed awarią dysku?',
      uk: 'Що найкраще захищає дані від поломки диска?',
      en: 'What best protects data from a drive failure?',
    },
    options: [
      ['backup', { pl: 'Kopia zapasowa', uk: 'Резервна копія', en: 'A backup' }],
      ['wallpaper', { pl: 'Nowa tapeta', uk: 'Нові шпалери', en: 'A new wallpaper' }],
      ['brightness', { pl: 'Niższa jasność', uk: 'Нижча яскравість', en: 'Lower brightness' }],
    ],
    answer: 'backup',
  },
  {
    id: 'hdmi',
    prompt: {
      pl: 'Które złącze przesyła obraz i dźwięk do monitora lub telewizora?',
      uk: 'Який роз’єм передає зображення і звук на монітор або телевізор?',
      en: 'Which connector carries video and audio to a monitor or TV?',
    },
    options: [
      ['hdmi', 'HDMI'],
      ['ethernet', 'Ethernet'],
      ['jack', '3.5 mm jack'],
    ],
    answer: 'hdmi',
  },
  {
    id: 'cores',
    prompt: {
      pl: 'Co oznacza liczba rdzeni procesora?',
      uk: 'Що означає кількість ядер процесора?',
      en: 'What does a CPU core count describe?',
    },
    options: [
      [
        'units',
        {
          pl: 'Liczbę jednostek wykonujących obliczenia',
          uk: 'Кількість обчислювальних блоків',
          en: 'The number of processing units',
        },
      ],
      ['storage', { pl: 'Pojemność dysku', uk: 'Обсяг накопичувача', en: 'Drive capacity' }],
      ['screen', { pl: 'Rozmiar ekranu', uk: 'Розмір екрана', en: 'Screen size' }],
    ],
    answer: 'units',
  },
  {
    id: 'used-phone',
    prompt: {
      pl: 'Co warto sprawdzić przed zakupem używanego telefonu?',
      uk: 'Що варто перевірити перед купівлею вживаного телефона?',
      en: 'What should you check before buying a used phone?',
    },
    options: [
      [
        'imei',
        {
          pl: 'IMEI, blokady i stan baterii',
          uk: 'IMEI, блокування та стан батареї',
          en: 'IMEI, locks and battery health',
        },
      ],
      ['color', { pl: 'Tylko kolor pudełka', uk: 'Лише колір коробки', en: 'Only the box color' }],
      [
        'volume',
        {
          pl: 'Wyłącznie głośność dzwonka',
          uk: 'Лише гучність дзвінка',
          en: 'Only ringtone volume',
        },
      ],
    ],
    answer: 'imei',
  },
];

function localizedQuestion(question, locale, context) {
  return {
    id: question.id,
    prompt: question.prompt[locale],
    options: orderQuizOptions(question.options, { ...context, questionId: question.id }).map(([value, label]) => ({
      value,
      label: typeof label === 'string' ? label : label[locale],
    })),
  };
}

function dailyQuestions(userId) {
  const seed = crypto.createHash('sha256').update(`${today()}:${userId}`).digest();
  return [...QUIZ_QUESTIONS]
    .map((question, index) => ({ question, rank: seed[index % seed.length] ^ index }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, QUIZ_DAILY_TOTAL)
    .map(({ question }) => question);
}

function maxDiscount(region, percent) {
  return rewardPolicy.capsCents[normalizeRegion(region)][String(percent)];
}

function rewardFor(game, { perfect = false } = {}) {
  return {
    rewardType: game === 'spin' ? 'shipping' : 'discount',
    value: game === 'quiz' && perfect ? rewardPolicy.perfectQuizPercent : rewardPolicy.standardPercent,
    giftKey: null,
  };
}

async function play({ userId, region, game, won, reward, result = {}, commitResult }) {
  const db = getDB();
  const attemptDate = today();
  if (
    await db
      .prepare('SELECT 1 FROM game_attempts WHERE userId = ? AND game = ? AND attemptDate = ?')
      .get(userId, game, attemptDate)
  ) {
    throw new AppError(409, 'DAILY_ATTEMPT_USED', "Today's attempt has already been used");
  }
  const id = uuidv4();
  const createdAt = Date.now();
  let rewardCode = null;
  let output;
  await db.transaction(async () => {
    if (await db.prepare('SELECT 1 FROM game_attempts WHERE userId = ? AND game = ? AND attemptDate = ?').get(userId, game, attemptDate)) {
      throw new AppError(409, 'DAILY_ATTEMPT_USED', "Today's attempt has already been used");
    }
    if (won) {
      const prefix = game === 'spin' ? 'SPIN' : game === 'quiz' ? 'QUIZ' : 'TTT';
      rewardCode = uniqueCode(prefix);
      await db
        .prepare(
          `
        INSERT INTO promo_codes (
          code, type, value, region, minTotalCents, maxDiscountCents, active,
          expiresAt, usageLimit, usedCount, ownerId, rewardType,
          applicableCondition, applicableSellerType, giftKey, createdAt
        ) VALUES (?, 'percent', ?, ?, 0, ?, 1, ?, 1, 0, ?, ?, 'new', 'store', ?, ?)
      `
        )
        .run(
          rewardCode,
          reward.value,
          normalizeRegion(region),
          reward.rewardType === 'shipping' ? rewardPolicy.shippingCapsCents[normalizeRegion(region)] : maxDiscount(region, reward.value),
          createdAt + rewardPolicy.expiresInDays * DAY,
          userId,
          reward.rewardType,
          reward.giftKey,
          createdAt
        );
    }
    await db
      .prepare(
        `
      INSERT INTO game_attempts (id, userId, game, attemptDate, won, rewardCode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, userId, game, attemptDate, won ? 1 : 0, rewardCode, createdAt);
    output = {
    game,
    won,
    rewardCode,
    rewardType: won ? reward.rewardType : null,
    rewardKey: won
      ? reward.rewardType === 'shipping'
        ? 'shipping_discount'
        : `discount_${reward.value}`
      : null,
    percent: won && reward.rewardType !== 'shipping' ? reward.value : 0,
    region: normalizeRegion(region),
    currency: currencyForRegion(region),
    maxDiscountCents: won ? reward.rewardType === 'shipping' ? rewardPolicy.shippingCapsCents[normalizeRegion(region)] : maxDiscount(region, reward.value) : null,
    expiresAt: won ? createdAt + rewardPolicy.expiresInDays * DAY : null,
    giftKey: won ? reward.giftKey : null,
    expiresInDays: won ? rewardPolicy.expiresInDays : 0,
    ...result,
    };
    if (commitResult) await commitResult(output);
  })();
  return output;
}

async function spin({ userId, region }) {
  const reward = rewardFor('spin');
  return play({ userId, region, game: 'spin', won: true, reward });
}

module.exports = { spin, play, rewardFor, dailyQuestions, localizedQuestion, today };
