const { setup } = require('./app');
const { getDB } = require('./db');
const { ensureAdmin } = require('./services/admin');
const { currencyForRegion, normalizeRegion } = require('./utils/regions');
const { curatedSpecs } = require('./services/deviceSpecs');

const BASE_DEMO_PRODUCTS = [
  {
    id: 'demo-iphone-15',
    title: 'Apple iPhone 15 128 GB',
    description:
      'Nowy smartfon z polskiej dystrybucji, fabrycznie zapakowany, gwarancja 24 miesiące.',
    price: 3199,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Warszawa',
    condition: 'new',
    brand: 'Apple',
    stock: 8,
    seller: 'NaShary Store',
    sellerType: 'store',
    delivery: 'both',
  },
  {
    id: 'demo-galaxy-s23',
    title: 'Samsung Galaxy S23 256 GB',
    description:
      'Telefon używany przez rok, w pełni sprawny. Drobne ślady na ramce, ekran bez rys.',
    price: 1799,
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Kraków',
    condition: 'used',
    brand: 'Samsung',
    stock: 1,
    seller: 'Marek',
    sellerType: 'private',
    delivery: 'both',
  },
  {
    id: 'demo-macbook-air-m2',
    title: 'MacBook Air M2 13″ 8/256 GB',
    description:
      'Lekki laptop w kolorze Midnight. Kondycja baterii 94%, komplet z ładowarką i pudełkiem.',
    price: 3699,
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Laptopy',
    location: 'Wrocław',
    condition: 'used',
    brand: 'Apple',
    stock: 1,
    seller: 'Anna',
    sellerType: 'private',
    delivery: 'shipping',
  },
  {
    id: 'demo-lenovo-legion',
    title: 'Lenovo Legion 5 Ryzen 7 / RTX 4060',
    description: 'Nowy laptop gamingowy, ekran 165 Hz, 16 GB RAM i dysk SSD 1 TB. Faktura VAT.',
    price: 5299,
    images: [
      'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Laptopy',
    location: 'Poznań',
    condition: 'new',
    brand: 'Lenovo',
    stock: 4,
    seller: 'GamePoint',
    sellerType: 'store',
    delivery: 'both',
  },
  {
    id: 'demo-sony-headphones',
    title: 'Sony WH-1000XM5',
    description: 'Słuchawki bezprzewodowe z ANC, bardzo dobry stan, etui i przewody w zestawie.',
    price: 999,
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Audio',
    location: 'Gdańsk',
    condition: 'used',
    brand: 'Sony',
    stock: 1,
    seller: 'Kuba',
    sellerType: 'private',
    delivery: 'shipping',
  },
  {
    id: 'demo-airpods-pro',
    title: 'Apple AirPods Pro 2 USB-C',
    description: 'Oryginalne, nowe słuchawki z aktywną redukcją hałasu. Gwarancja producenta.',
    price: 999,
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Audio',
    location: 'Warszawa',
    condition: 'new',
    brand: 'Apple',
    stock: 12,
    seller: 'NaShary Store',
    sellerType: 'store',
    delivery: 'both',
  },
  {
    id: 'demo-ps5-slim',
    title: 'PlayStation 5 Slim z napędem',
    description:
      'Konsola w świetnym stanie, jeden pad DualSense i komplet okablowania. Odbiór osobisty.',
    price: 1899,
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Gaming',
    location: 'Lublin',
    condition: 'used',
    brand: 'Sony',
    stock: 1,
    seller: 'Paweł',
    sellerType: 'private',
    delivery: 'pickup',
  },
  {
    id: 'demo-switch-oled',
    title: 'Nintendo Switch OLED White',
    description: 'Nowa konsola z ekranem OLED 7″, 64 GB pamięci i stacją dokującą.',
    price: 1399,
    images: [
      'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Gaming',
    location: 'Katowice',
    condition: 'new',
    brand: 'Nintendo',
    stock: 6,
    seller: 'GamePoint',
    sellerType: 'store',
    delivery: 'both',
  },
  {
    id: 'demo-monitor-lg',
    title: 'Monitor LG UltraGear 27″ 144 Hz',
    description:
      'Monitor QHD IPS dla graczy. Bez martwych pikseli, z podstawą i przewodem DisplayPort.',
    price: 899,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Monitory',
    location: 'Łódź',
    condition: 'used',
    brand: 'LG',
    stock: 1,
    seller: 'Olek',
    sellerType: 'private',
    delivery: 'pickup',
  },
  {
    id: 'demo-logitech-mx',
    title: 'Logitech MX Master 3S',
    description: 'Nowa bezprzewodowa mysz do pracy, cichy klik, sensor 8000 DPI i USB-C.',
    price: 399,
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Akcesoria',
    location: 'Warszawa',
    condition: 'new',
    brand: 'Logitech',
    stock: 15,
    seller: 'NaShary Store',
    sellerType: 'store',
    delivery: 'shipping',
  },
  {
    id: 'demo-ua-iphone-14',
    title: 'Apple iPhone 14 128 GB',
    description: 'Смартфон у відмінному стані, батарея 91%, повний комплект і чек.',
    price: 21999,
    images: [
      'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Київ',
    condition: 'used',
    brand: 'Apple',
    stock: 1,
    seller: 'Андрій',
    sellerType: 'private',
    delivery: 'both',
    region: 'ua',
  },
  {
    id: 'demo-ua-asus-tuf',
    title: 'ASUS TUF Gaming A15 RTX 4060',
    description: 'Новий ігровий ноутбук з офіційною гарантією, Ryzen 7, 16/512 GB.',
    price: 48999,
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Laptopy',
    location: 'Львів',
    condition: 'new',
    brand: 'ASUS',
    stock: 3,
    seller: 'Tech Львів',
    sellerType: 'store',
    delivery: 'shipping',
    region: 'ua',
  },
  {
    id: 'demo-ua-xbox-series-s',
    title: 'Xbox Series S 512 GB',
    description: 'Консоль без ремонту, два геймпади, кабелі та коробка в комплекті.',
    price: 9999,
    images: [
      'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Gaming',
    location: 'Дніпро',
    condition: 'used',
    brand: 'Microsoft',
    stock: 1,
    seller: 'Влад',
    sellerType: 'private',
    delivery: 'both',
    region: 'ua',
  },
  {
    id: 'demo-eu-pixel-8',
    title: 'Google Pixel 8 128 GB',
    description: 'Unlocked EU model in excellent condition, original box and USB-C cable included.',
    price: 419,
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Berlin, DE',
    condition: 'used',
    brand: 'Google',
    stock: 1,
    seller: 'Jonas',
    sellerType: 'private',
    delivery: 'shipping',
    region: 'eu',
  },
  {
    id: 'demo-eu-steam-deck',
    title: 'Steam Deck OLED 512 GB',
    description: 'Brand-new handheld console with EU warranty and tracked delivery.',
    price: 569,
    images: [
      'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Gaming',
    location: 'Prague, CZ',
    condition: 'new',
    brand: 'Valve',
    stock: 5,
    seller: 'EuroGaming',
    sellerType: 'store',
    delivery: 'shipping',
    region: 'eu',
  },
  {
    id: 'demo-eu-dell-monitor',
    title: 'Dell UltraSharp U2723QE 4K',
    description: '27-inch 4K USB-C monitor, tested and fully functional, minor marks on the stand.',
    price: 459,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Monitory',
    location: 'Vienna, AT',
    condition: 'used',
    brand: 'Dell',
    stock: 1,
    seller: 'Mia',
    sellerType: 'private',
    delivery: 'pickup',
    region: 'eu',
  },
];

const EXTRA_PRODUCT_SPECS = [
  [
    'pl-airpods-pro-2',
    'Apple AirPods Pro 2 USB-C',
    899,
    'Audio',
    'Warszawa',
    'used',
    'Apple',
    1,
    'Kacper',
    'pl',
    'photo-1600294037681-c80b4cb5b434',
  ],
  [
    'pl-ps5-slim',
    'PlayStation 5 Slim 1 TB',
    2199,
    'Gaming',
    'Łódź',
    'new',
    'Sony',
    6,
    'GameHub',
    'pl',
    'photo-1607853202273-797f1c22a38e',
  ],
  [
    'pl-ipad-air',
    'iPad Air M2 11″ 128 GB',
    2799,
    'Tablety',
    'Gdynia',
    'new',
    'Apple',
    4,
    'iStore Plus',
    'pl',
    'photo-1544244015-0df4b3ffc6b0',
  ],
  [
    'pl-galaxy-watch',
    'Samsung Galaxy Watch6 44 mm',
    649,
    'Akcesoria',
    'Lublin',
    'used',
    'Samsung',
    1,
    'Natalia',
    'pl',
    'photo-1523275335684-37898b6baf30',
  ],
  [
    'pl-lg-oled',
    'LG OLED C3 55″',
    4299,
    'Monitory',
    'Katowice',
    'new',
    'LG',
    3,
    'RTV Zone',
    'pl',
    'photo-1593359677879-a4bb92f829d1',
  ],
  [
    'pl-dji-mini',
    'DJI Mini 4 Pro Fly More',
    3899,
    'Foto',
    'Rzeszów',
    'used',
    'DJI',
    1,
    'Patryk',
    'pl',
    'photo-1473968512647-3e447244af8f',
  ],
  [
    'pl-keychron',
    'Keychron K8 Pro RGB',
    399,
    'Akcesoria',
    'Poznań',
    'new',
    'Keychron',
    8,
    'KeyStore',
    'pl',
    'photo-1587829741301-dc798b83add3',
  ],
  [
    'pl-thinkpad',
    'Lenovo ThinkPad X1 Carbon Gen 11',
    4699,
    'Laptopy',
    'Wrocław',
    'used',
    'Lenovo',
    1,
    'Michał',
    'pl',
    'photo-1496181133206-80ce9b88a853',
  ],
  [
    'ua-airpods-max',
    'Apple AirPods Max Space Gray',
    16999,
    'Audio',
    'Київ',
    'used',
    'Apple',
    1,
    'Олена',
    'ua',
    'photo-1618366712010-f4ae9c647dcb',
  ],
  [
    'ua-ps5',
    'PlayStation 5 Slim + DualSense',
    22999,
    'Gaming',
    'Одеса',
    'new',
    'Sony',
    4,
    'Game UA',
    'ua',
    'photo-1607853202273-797f1c22a38e',
  ],
  [
    'ua-ipad-10',
    'Apple iPad 10 64 GB Wi-Fi',
    15499,
    'Tablety',
    'Львів',
    'used',
    'Apple',
    1,
    'Марія',
    'ua',
    'photo-1544244015-0df4b3ffc6b0',
  ],
  [
    'ua-watch-6',
    'Samsung Galaxy Watch6 Classic',
    9999,
    'Akcesoria',
    'Харків',
    'new',
    'Samsung',
    5,
    'Mobile Point',
    'ua',
    'photo-1523275335684-37898b6baf30',
  ],
  [
    'ua-lg-monitor',
    'LG UltraGear 27GP850 165 Hz',
    12999,
    'Monitory',
    'Дніпро',
    'used',
    'LG',
    1,
    'Сергій',
    'ua',
    'photo-1527443224154-c4a3942d3acf',
  ],
  [
    'ua-canon-r10',
    'Canon EOS R10 18–45 mm',
    31999,
    'Foto',
    'Івано-Франківськ',
    'new',
    'Canon',
    2,
    'PhotoHub',
    'ua',
    'photo-1502920917128-1aa500764cbd',
  ],
  [
    'ua-mx-master',
    'Logitech MX Master 3S',
    3499,
    'Akcesoria',
    'Тернопіль',
    'new',
    'Logitech',
    7,
    'Gadget UA',
    'ua',
    'photo-1527864550417-7fd91fc51a46',
  ],
  [
    'ua-macbook-m1',
    'MacBook Air M1 8/256 GB',
    26999,
    'Laptopy',
    'Чернівці',
    'used',
    'Apple',
    1,
    'Роман',
    'ua',
    'photo-1517336714731-489689fd1ca8',
  ],
  [
    'eu-airpods',
    'AirPods Pro 2nd Gen USB-C',
    209,
    'Audio',
    'Munich, DE',
    'new',
    'Apple',
    7,
    'Sound EU',
    'eu',
    'photo-1600294037681-c80b4cb5b434',
  ],
  [
    'eu-ps5',
    'PlayStation 5 Slim Disc Edition',
    489,
    'Gaming',
    'Brno, CZ',
    'new',
    'Sony',
    5,
    'NextPlay',
    'eu',
    'photo-1607853202273-797f1c22a38e',
  ],
  [
    'eu-ipad-pro',
    'iPad Pro M4 11″ 256 GB',
    979,
    'Tablety',
    'Amsterdam, NL',
    'used',
    'Apple',
    1,
    'Sophie',
    'eu',
    'photo-1544244015-0df4b3ffc6b0',
  ],
  [
    'eu-garmin',
    'Garmin Fenix 7 Sapphire Solar',
    499,
    'Akcesoria',
    'Vienna, AT',
    'used',
    'Garmin',
    1,
    'Lukas',
    'eu',
    'photo-1523275335684-37898b6baf30',
  ],
  [
    'eu-samsung-oled',
    'Samsung Odyssey OLED G8 34″',
    749,
    'Monitory',
    'Berlin, DE',
    'new',
    'Samsung',
    3,
    'DisplayLab',
    'eu',
    'photo-1527443224154-c4a3942d3acf',
  ],
  [
    'eu-fuji-xs20',
    'Fujifilm X-S20 Body',
    1099,
    'Foto',
    'Milan, IT',
    'used',
    'Fujifilm',
    1,
    'Marco',
    'eu',
    'photo-1502920917128-1aa500764cbd',
  ],
  [
    'eu-mx-keys',
    'Logitech MX Keys Mini',
    79,
    'Akcesoria',
    'Paris, FR',
    'new',
    'Logitech',
    9,
    'DeskSetup',
    'eu',
    'photo-1587829741301-dc798b83add3',
  ],
  [
    'eu-xps-13',
    'Dell XPS 13 Plus i7 / 16 GB',
    899,
    'Laptopy',
    'Copenhagen, DK',
    'used',
    'Dell',
    1,
    'Freja',
    'eu',
    'photo-1496181133206-80ce9b88a853',
  ],
];

const MODEL_OFFER_DEMOS = [
  {
    id: 'demo-iphone-15-used-blue',
    title: 'Apple iPhone 15 128 GB Blue',
    description:
      'Bateria 92%, ekran bez rys, delikatne ślady na ramce. Pudełko i przewód w zestawie.',
    price: 2699,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Gdańsk',
    condition: 'used',
    brand: 'Apple',
    stock: 1,
    seller: 'Michał',
    sellerType: 'private',
    delivery: 'both',
    region: 'pl',
    deviceDetails: {
      batteryHealth: 92,
      display: 'Bardzo dobry',
      body: 'Drobne ślady',
      completeness: 'Pudełko i przewód',
      defects: 'Brak',
      grade: 'A',
      country: 'Polska',
      serialChecked: true,
    },
  },
  {
    id: 'demo-iphone-15-used-black',
    title: 'Apple iPhone 15 256 GB Black',
    description:
      'W pełni sprawny, bateria 87%. Widoczne rysy na ramce, ekran w bardzo dobrym stanie.',
    price: 2799,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Poznań',
    condition: 'used',
    brand: 'Apple',
    stock: 1,
    seller: 'Ola',
    sellerType: 'private',
    delivery: 'shipping',
    region: 'pl',
    deviceDetails: {
      batteryHealth: 87,
      display: 'Bardzo dobry',
      body: 'Widoczne rysy',
      completeness: 'Telefon i przewód',
      defects: 'Brak',
      grade: 'B',
      country: 'Niemcy',
      serialChecked: true,
    },
  },
  {
    id: 'demo-galaxy-s23-new',
    title: 'Samsung Galaxy S23 256 GB Black',
    description: 'Nowy, zaplombowany telefon z fakturą i gwarancją producenta.',
    price: 2099,
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=85',
    ],
    category: 'Smartfony',
    location: 'Warszawa',
    condition: 'new',
    brand: 'Samsung',
    stock: 4,
    seller: 'MobileHub',
    sellerType: 'store',
    delivery: 'both',
    region: 'pl',
    warranty: 'manufacturer',
    deviceDetails: {
      batteryHealth: 100,
      display: 'Nowy',
      body: 'Nowy',
      completeness: 'Pełny zestaw',
      defects: 'Brak',
      grade: 'N',
      country: 'Polska',
      serialChecked: true,
    },
  },
];

const DEMO_PRODUCTS = [
  ...BASE_DEMO_PRODUCTS,
  ...MODEL_OFFER_DEMOS,
  ...EXTRA_PRODUCT_SPECS.map(
    ([id, title, price, category, location, condition, brand, stock, seller, region, photo]) => ({
      id: `demo-${id}`,
      title,
      description:
        condition === 'new'
          ? 'Nowy produkt z gwarancją, bezpieczną wysyłką i możliwością kontaktu ze sprzedawcą.'
          : 'Sprawdzony, w pełni działający sprzęt. Dokładny stan i komplet można potwierdzić na czacie.',
      price,
      images: [`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1200&q=85`],
      category,
      location,
      condition,
      brand,
      stock,
      seller,
      sellerType: stock > 1 ? 'store' : 'private',
      delivery: 'both',
      region,
    })
  ),
];

function exportDemoProducts() {
  const createdAt = Date.now();
  return DEMO_PRODUCTS.map((product, index) => {
    const curated = product.category === 'Smartfony' ? curatedSpecs(product.title) : null;
    return {
      ...product,
      region: normalizeRegion(product.region),
      currency: currencyForRegion(product.region),
      priceCents: Math.round(product.price * 100),
      specs: { ...(curated?.specs || {}), ...inferSpecs(product) },
      model: inferModel(product),
      warranty: product.warranty || (product.condition === 'new' ? 'manufacturer' : 'none'),
      negotiable: product.sellerType === 'private',
      sellerVerified: product.sellerType === 'store',
      status: 'active',
      urgent: false,
      inspection: {
        screen: true,
        battery: true,
        cameras: true,
        buttons: true,
        connectivity: true,
        serialNumber: true,
      },
      deviceDetails: inferDeviceDetails(product),
      createdAt: createdAt - index * 60_000,
    };
  });
}

const DEMO_PROMO_CODES = [
  {
    code: 'STARTPL10',
    type: 'percent',
    value: 10,
    region: 'pl',
    minTotalCents: 10000,
    maxDiscountCents: 50000,
  },
  {
    code: 'STARTUA10',
    type: 'percent',
    value: 10,
    region: 'ua',
    minTotalCents: 100000,
    maxDiscountCents: 300000,
  },
  {
    code: 'STARTEU10',
    type: 'percent',
    value: 10,
    region: 'eu',
    minTotalCents: 5000,
    maxDiscountCents: 5000,
  },
];

function inferSpecs(product) {
  const title = product.title.toLowerCase();
  const category = product.category;
  const specs = {};
  const capacities = [...product.title.matchAll(/(\d+)\s*(GB|TB)/gi)];
  const screen = product.title.match(/(\d+(?:[.,]\d+)?)\s*[″"]/);
  const colorNames = ['Black', 'Graphite', 'Silver', 'White', 'Blue'];
  const explicitColor = [
    ['black', 'Black'],
    ['white', 'White'],
    ['silver', 'Silver'],
    ['blue', 'Blue'],
    ['green', 'Green'],
    ['purple', 'Purple'],
    ['yellow', 'Yellow'],
    ['natural', 'Natural'],
  ].find(([needle]) => title.includes(needle));
  const colorIndex = [...product.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  specs.color = explicitColor?.[1] || colorNames[colorIndex % colorNames.length];
  if (capacities.length)
    specs.storage = `${capacities.at(-1)[1]} ${capacities.at(-1)[2].toUpperCase()}`;
  if (screen) specs.screen = `${screen[1].replace(',', '.')}″`;

  if (category === 'Smartfony' || category === 'Tablety') {
    specs.os = /iphone|ipad/.test(title) ? 'iOS / iPadOS' : 'Android';
    specs.ram = /pixel|galaxy s23/.test(title) ? '8 GB' : /ipad/.test(title) ? '8 GB' : '6 GB';
    specs.processor = /iphone 15/.test(title)
      ? 'Apple A16'
      : /ipad.*m[24]/.test(title)
        ? title.includes('m4')
          ? 'Apple M4'
          : 'Apple M2'
        : /pixel/.test(title)
          ? 'Google Tensor'
          : /galaxy/.test(title)
            ? 'Snapdragon'
            : 'Apple A-series';
    if (!specs.screen)
      specs.screen = /ipad/.test(title) ? '11″' : /pixel/.test(title) ? '6.2″' : '6.1″';
  }
  if (category === 'Laptopy') {
    specs.processor = title.includes('m2')
      ? 'Apple M2'
      : title.includes('m1')
        ? 'Apple M1'
        : title.includes('ryzen 7')
          ? 'AMD Ryzen 7'
          : title.includes('i7')
            ? 'Intel Core i7'
            : 'Intel Core i5';
    specs.ram = /16\s*(gb|\/)/i.test(product.title) ? '16 GB' : '8 GB';
    specs.gpu = /rtx\s*4060/i.test(product.title) ? 'NVIDIA RTX 4060' : 'Zintegrowana';
    specs.os = title.includes('macbook') ? 'macOS' : 'Windows';
    if (!specs.screen)
      specs.screen = title.includes('xps 13') || title.includes('macbook') ? '13″' : '15.6″';
  }
  if (category === 'Gaming') {
    specs.platform = title.includes('playstation')
      ? 'PlayStation 5'
      : title.includes('xbox')
        ? 'Xbox Series'
        : title.includes('steam deck')
          ? 'PC handheld'
          : 'PC';
    specs.storage ||= title.includes('1 tb') ? '1 TB' : '512 GB';
  }
  if (category === 'Monitory') {
    specs.resolution = /4k|u2723|oled c3/.test(title)
      ? '4K UHD'
      : /ultragear|odyssey/.test(title)
        ? 'QHD'
        : 'Full HD';
    specs.refreshRate = /165/.test(title)
      ? '165 Hz'
      : /oled g8/.test(title)
        ? '175 Hz'
        : /oled c3/.test(title)
          ? '120 Hz'
          : '60 Hz';
    if (!specs.screen)
      specs.screen = title.includes('55') ? '55″' : title.includes('34') ? '34″' : '27″';
  }
  if (category === 'Audio') {
    specs.audioType = /airpods|earbuds/.test(title) ? 'Słuchawki douszne' : 'Słuchawki nauszne';
    specs.connectivity = 'Bluetooth';
  }
  if (category === 'Akcesoria') {
    specs.accessoryType = /watch|garmin/.test(title)
      ? 'Smartwatch'
      : /key|keyboard/.test(title)
        ? 'Klawiatura'
        : 'Mysz';
    specs.connectivity = /keychron/.test(title) ? 'Bluetooth / USB' : 'Bluetooth';
  }
  if (category === 'Foto') {
    specs.resolution = /canon/.test(title) ? '24 MP' : /fuji/.test(title) ? '26 MP' : '20 MP';
    specs.connectivity = 'Wi-Fi / Bluetooth';
  }
  return specs;
}

function inferModel(product) {
  let value = String(product.model || product.title || '').replace(
    new RegExp(`^${String(product.brand || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'),
    ''
  );
  value = value
    .replace(/\b\d+\s*\/\s*\d+\s*(?:GB|TB)?\b/gi, '')
    .replace(/\b\d+\s*(?:GB|TB)\b/gi, '')
    .replace(/\b(?:Black|White|Blue|Silver|Graphite|Gold|Green|Purple|Yellow|Natural)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return value || product.title;
}

function inferDeviceDetails(product) {
  if (product.deviceDetails) return product.deviceDetails;
  if (product.condition === 'new')
    return {
      batteryHealth: 100,
      display: 'Nowy',
      body: 'Nowy',
      completeness: 'Pełny zestaw',
      defects: 'Brak',
      grade: 'N',
      serialChecked: true,
    };
  const score = [...product.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const batteryHealth = 82 + (score % 15);
  return {
    batteryHealth,
    display: score % 3 ? 'Bardzo dobry' : 'Drobne rysy',
    body: score % 2 ? 'Drobne ślady' : 'Bardzo dobry',
    completeness: score % 2 ? 'Urządzenie i ładowarka' : 'Pełny zestaw',
    defects: 'Brak',
    grade: batteryHealth >= 90 ? 'A' : 'B',
    serialChecked: true,
  };
}

async function insertDemoProducts(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO products (
      id, title, description, price, priceCents, images, specs, category, location,
      condition, brand, model, stock, seller, sellerType, delivery, warranty, negotiable, status, urgent, inspection, deviceDetails, region, currency, createdAt
    ) VALUES (
      @id, @title, @description, @price, @priceCents, @images, @specs, @category, @location,
      @condition, @brand, @model, @stock, @seller, @sellerType, @delivery, @warranty, @negotiable, @status, @urgent, @inspection, @deviceDetails, @region, @currency, @createdAt
    )
  `);
  const createdAt = Date.now();
  const insertAll = db.transaction(async () => {
    let inserted = 0;
    for (const [index, product] of DEMO_PRODUCTS.entries()) {
      const result = await insert.run({
        ...product,
        region: normalizeRegion(product.region),
        currency: currencyForRegion(product.region),
        priceCents: Math.round(product.price * 100),
        images: JSON.stringify(product.images),
        specs: JSON.stringify(inferSpecs(product)),
        model: inferModel(product),
        warranty: product.warranty || (product.condition === 'new' ? 'manufacturer' : 'none'),
        negotiable: product.sellerType === 'private' ? 1 : 0,
        status: 'active',
        urgent: 0,
        inspection: JSON.stringify({
          screen: true,
          battery: true,
          cameras: true,
          buttons: true,
          connectivity: true,
          serialNumber: true,
        }),
        deviceDetails: JSON.stringify(inferDeviceDetails(product)),
        createdAt: createdAt - index * 60_000,
      });
      inserted += result.changes;
      await db
        .prepare('UPDATE products SET specs = ?, model = ?, deviceDetails = ? WHERE id = ?')
        .run(
          JSON.stringify(inferSpecs(product)),
          inferModel(product),
          JSON.stringify(inferDeviceDetails(product)),
          product.id
        );
    }
    return inserted;
  });
  return insertAll();
}

async function insertDemoPromoCodes(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO promo_codes (
      code, type, value, region, minTotalCents, maxDiscountCents,
      active, usageLimit, usedCount, createdAt
    ) VALUES (
      @code, @type, @value, @region, @minTotalCents, @maxDiscountCents,
      1, 10000, 0, @createdAt
    )
  `);
  const createdAt = Date.now();
  return db.transaction(async () => {
    let inserted = 0;
    for (const promo of DEMO_PROMO_CODES) {
      inserted += (await insert.run({ ...promo, createdAt })).changes;
    }
    return inserted;
  })();
}

async function enrichPhoneSpecifications(db) {
  const rows = await db
    .prepare("SELECT id, title, specs FROM products WHERE category = 'Smartfony'")
    .all();
  const update = db.prepare('UPDATE products SET specs = ? WHERE id = ?');
  return db.transaction(async () => {
    let changed = 0;
    for (const row of rows) {
      const match = curatedSpecs(row.title);
      if (!match) continue;
      let current = {};
      try {
        current = JSON.parse(row.specs || '{}');
      } catch (_error) {
        current = {};
      }
      await update.run(JSON.stringify({ ...match.specs, ...current }), row.id);
      changed += 1;
    }
    return changed;
  })();
}

async function seed() {
  await setup();
  const db = getDB();
  const admin = await ensureAdmin(db, { allowDevelopmentDefault: db.kind === 'sqlite' });
  if (admin.skipped) {
    throw new Error('ADMIN_PASSWORD is required before seeding a Turso or production database');
  }
  const insertedProducts = await insertDemoProducts(db);
  await enrichPhoneSpecifications(db);
  const insertedPromoCodes = await insertDemoPromoCodes(db);
  const adminUser = await db
    .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
    .get(admin.username);
  if (adminUser) {
    await db.prepare('UPDATE products SET createdBy = ? WHERE createdBy IS NULL').run(adminUser.id);
  }
  console.log(
    `Demo catalog ready (${insertedProducts} new products, ${DEMO_PRODUCTS.length} total demo products)`
  );
  console.log(
    `Promo codes ready (${insertedPromoCodes} new, ${DEMO_PROMO_CODES.length} demo codes)`
  );
  console.log(
    admin.created ? `Admin created: ${admin.username}` : `Admin ready: ${admin.username}`
  );
  return { insertedProducts, insertedPromoCodes, demoProducts: DEMO_PRODUCTS.length, admin };
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { DEMO_PRODUCTS, DEMO_PROMO_CODES, exportDemoProducts, seed };
