export const fulfillmentFallback = {
  pl: {
    delivery: [
      { id: 'inpost_locker', carrier: 'InPost', kind: 'point', priceCents: 1499, etaMin: 1, etaMax: 2 },
      { id: 'dpd_courier', carrier: 'DPD', kind: 'courier', priceCents: 1999, etaMin: 1, etaMax: 2 },
      { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
    ],
    payments: ['card', 'blik', 'bank_transfer', 'cash_on_delivery', 'cash_on_pickup'],
  },
  ua: {
    delivery: [
      { id: 'nova_poshta_locker', carrier: 'Nova Poshta', kind: 'point', priceCents: 7000, etaMin: 1, etaMax: 2 },
      { id: 'nova_poshta_branch', carrier: 'Nova Poshta', kind: 'point', priceCents: 8000, etaMin: 1, etaMax: 3 },
      { id: 'nova_poshta_courier', carrier: 'Nova Poshta', kind: 'courier', priceCents: 14000, etaMin: 1, etaMax: 3 },
      { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
    ],
    payments: ['card', 'bank_transfer', 'cash_on_delivery', 'cash_on_pickup'],
  },
  eu: {
    delivery: [
      { id: 'dpd_parcelshop', carrier: 'DPD Pickup', kind: 'point', priceCents: 799, etaMin: 2, etaMax: 4 },
      { id: 'dhl_standard', carrier: 'DHL', kind: 'courier', priceCents: 1299, etaMin: 2, etaMax: 5 },
      { id: 'dhl_express', carrier: 'DHL Express', kind: 'courier', priceCents: 1999, etaMin: 1, etaMax: 2 },
      { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
    ],
    payments: ['card', 'paypal', 'sepa_transfer', 'cash_on_pickup'],
  },
};

export const deliveryNames = {
  inpost_locker: { pl: 'Paczkomat InPost', uk: 'Поштомат InPost', en: 'InPost parcel locker' },
  dpd_courier: { pl: 'Kurier DPD', uk: 'Кур’єр DPD', en: 'DPD courier' },
  nova_poshta_locker: { pl: 'Paczkomat Nova Poshta', uk: 'Поштомат Нової пошти', en: 'Nova Poshta locker' },
  nova_poshta_branch: { pl: 'Oddział Nova Poshta', uk: 'Відділення Нової пошти', en: 'Nova Poshta branch' },
  nova_poshta_courier: { pl: 'Kurier Nova Poshta', uk: 'Кур’єр Нової пошти', en: 'Nova Poshta courier' },
  dpd_parcelshop: { pl: 'Punkt DPD Pickup', uk: 'Пункт DPD Pickup', en: 'DPD Pickup point' },
  dhl_standard: { pl: 'Kurier DHL Standard', uk: 'Кур’єр DHL Standard', en: 'DHL Standard courier' },
  dhl_express: { pl: 'DHL Express', uk: 'DHL Express', en: 'DHL Express' },
  pickup_seller: { pl: 'Odbiór od sprzedawcy', uk: 'Самовивіз у продавця', en: 'Collection from seller' },
};

export const deliveryDescriptions = {
  point: {
    pl: 'Odbiór w wybranym automacie lub punkcie.',
    uk: 'Отримання у вибраному поштоматі або відділенні.',
    en: 'Collect from your chosen locker or service point.',
  },
  courier: {
    pl: 'Przesyłka rejestrowana pod wskazany adres.',
    uk: 'Відстежувана доставка за вказаною адресою.',
    en: 'Tracked delivery to the provided address.',
  },
  pickup: {
    pl: 'Termin i miejsce ustalisz ze sprzedawcą na czacie.',
    uk: 'Час і місце узгоджуються з продавцем у чаті.',
    en: 'Arrange the time and place with the seller in chat.',
  },
};

export const paymentNames = {
  card: { pl: 'Karta płatnicza', uk: 'Банківська картка', en: 'Payment card' },
  blik: { pl: 'BLIK', uk: 'BLIK', en: 'BLIK' },
  paypal: { pl: 'PayPal', uk: 'PayPal', en: 'PayPal' },
  bank_transfer: { pl: 'Przelew bankowy', uk: 'Банківський переказ', en: 'Bank transfer' },
  sepa_transfer: { pl: 'Przelew SEPA', uk: 'Переказ SEPA', en: 'SEPA transfer' },
  cash_on_delivery: { pl: 'Płatność przy odbiorze', uk: 'Оплата при отриманні', en: 'Cash on delivery' },
  cash_on_pickup: { pl: 'Płatność przy spotkaniu', uk: 'Оплата при зустрічі', en: 'Pay on collection' },
};

export const paymentDescriptions = {
  card: { pl: 'Visa lub Mastercard — płatność po utworzeniu zamówienia.', uk: 'Visa або Mastercard — оплата після створення замовлення.', en: 'Visa or Mastercard — pay after the order is created.' },
  blik: { pl: 'Potwierdzenie kodem BLIK w aplikacji banku.', uk: 'Підтвердження кодом BLIK у банківському застосунку.', en: 'Confirm with a BLIK code in your banking app.' },
  paypal: { pl: 'Płatność z salda PayPal lub podpiętej karty.', uk: 'Оплата з балансу PayPal або прив’язаної картки.', en: 'Pay using your PayPal balance or linked card.' },
  bank_transfer: { pl: 'Dane do przelewu pojawią się po zamówieniu.', uk: 'Реквізити з’являться після оформлення.', en: 'Transfer details appear after placing the order.' },
  sepa_transfer: { pl: 'Przelew w EUR na rachunek sprzedawcy.', uk: 'Переказ у EUR на рахунок продавця.', en: 'EUR transfer to the seller account.' },
  cash_on_delivery: { pl: 'Zapłacisz przewoźnikowi przy odbiorze paczki.', uk: 'Оплата перевізнику під час отримання.', en: 'Pay the carrier when the parcel arrives.' },
  cash_on_pickup: { pl: 'Zapłacisz sprzedawcy po sprawdzeniu sprzętu.', uk: 'Оплата продавцю після перевірки техніки.', en: 'Pay the seller after inspecting the device.' },
};

export function localized(dictionary, key, language) {
  return dictionary[key]?.[language] || dictionary[key]?.pl || key;
}
