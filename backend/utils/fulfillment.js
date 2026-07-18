const { AppError } = require('./errors');
const { normalizeRegion } = require('./regions');

const DELIVERY_OPTIONS = Object.freeze({
  pl: [
    { id: 'inpost_locker', carrier: 'InPost', kind: 'point', priceCents: 1499, etaMin: 1, etaMax: 2 },
    { id: 'dpd_courier', carrier: 'DPD', kind: 'courier', priceCents: 1999, etaMin: 1, etaMax: 2 },
    { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
  ],
  ua: [
    { id: 'nova_poshta_locker', carrier: 'Nova Poshta', kind: 'point', priceCents: 7000, etaMin: 1, etaMax: 2 },
    { id: 'nova_poshta_branch', carrier: 'Nova Poshta', kind: 'point', priceCents: 8000, etaMin: 1, etaMax: 3 },
    { id: 'nova_poshta_courier', carrier: 'Nova Poshta', kind: 'courier', priceCents: 14000, etaMin: 1, etaMax: 3 },
    { id: 'ukrposhta_branch', carrier: 'Ukrposhta', kind: 'point', priceCents: 6000, etaMin: 2, etaMax: 5 },
    { id: 'ukrposhta_courier', carrier: 'Ukrposhta', kind: 'courier', priceCents: 10000, etaMin: 2, etaMax: 5 },
    { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
  ],
  eu: [
    { id: 'dpd_parcelshop', carrier: 'DPD Pickup', kind: 'point', priceCents: 799, etaMin: 2, etaMax: 4 },
    { id: 'gls_parcelshop', carrier: 'GLS', kind: 'point', priceCents: 999, etaMin: 2, etaMax: 4 },
    { id: 'dhl_standard', carrier: 'DHL', kind: 'courier', priceCents: 1299, etaMin: 2, etaMax: 5 },
    { id: 'dhl_express', carrier: 'DHL Express', kind: 'courier', priceCents: 1999, etaMin: 1, etaMax: 2 },
    { id: 'pickup_seller', carrier: 'Seller', kind: 'pickup', priceCents: 0, etaMin: 0, etaMax: 0 },
  ],
});

const PAYMENT_OPTIONS = Object.freeze({
  pl: ['card', 'blik', 'google_pay', 'bank_transfer', 'cash_on_delivery', 'cash_on_pickup'],
  ua: ['card', 'google_pay', 'bank_transfer', 'cash_on_delivery', 'cash_on_pickup'],
  eu: ['card', 'google_pay', 'paypal', 'sepa_transfer', 'cash_on_pickup'],
});

const LEGACY_DEFAULTS = Object.freeze({
  pl: 'dpd_courier',
  ua: 'nova_poshta_branch',
  eu: 'dhl_standard',
});

function deliveryOptionsForRegion(value) {
  return DELIVERY_OPTIONS[normalizeRegion(value)];
}

function paymentOptionsForRegion(value) {
  return PAYMENT_OPTIONS[normalizeRegion(value)];
}

function resolveDelivery(value, requested) {
  const region = normalizeRegion(value);
  let optionId = typeof requested === 'string' ? requested.trim().toLowerCase() : '';
  if (optionId === 'shipping') optionId = LEGACY_DEFAULTS[region];
  if (optionId === 'pickup' || !optionId) optionId = 'pickup_seller';
  const option = deliveryOptionsForRegion(region).find((entry) => entry.id === optionId);
  if (!option) {
    throw new AppError(400, 'DELIVERY_OPTION_UNAVAILABLE', 'Selected delivery option is unavailable in this region');
  }
  return option;
}

function resolvePayment(value, requested, deliveryKind) {
  const region = normalizeRegion(value);
  let paymentMethod = typeof requested === 'string' ? requested.trim().toLowerCase() : '';
  if (!paymentMethod) paymentMethod = deliveryKind === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery';
  if (!paymentOptionsForRegion(region).includes(paymentMethod)) {
    throw new AppError(400, 'PAYMENT_METHOD_UNAVAILABLE', 'Selected payment method is unavailable in this region');
  }
  if (paymentMethod === 'cash_on_pickup' && deliveryKind !== 'pickup') {
    throw new AppError(400, 'PAYMENT_METHOD_UNAVAILABLE', 'Cash on pickup requires personal collection');
  }
  if (paymentMethod === 'cash_on_delivery' && deliveryKind === 'pickup') {
    throw new AppError(400, 'PAYMENT_METHOD_UNAVAILABLE', 'Cash on delivery requires parcel delivery');
  }
  return paymentMethod;
}

function paymentStatusFor(method) {
  if (method === 'cash_on_delivery' || method === 'cash_on_pickup') return 'due_on_delivery';
  if (method === 'bank_transfer' || method === 'sepa_transfer') return 'awaiting_transfer';
  return 'awaiting_payment';
}

function publicFulfillmentOptions(value) {
  const region = normalizeRegion(value);
  return {
    region,
    delivery: deliveryOptionsForRegion(region),
    payments: paymentOptionsForRegion(region),
  };
}

module.exports = {
  DELIVERY_OPTIONS,
  PAYMENT_OPTIONS,
  deliveryOptionsForRegion,
  paymentOptionsForRegion,
  paymentStatusFor,
  publicFulfillmentOptions,
  resolveDelivery,
  resolvePayment,
};
