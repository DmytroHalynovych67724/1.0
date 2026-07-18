import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, imageUrl } from '../api';
import dhlLogo from '../../assets/carriers/dhl.png';
import dpdLogo from '../../assets/carriers/dpd.png';
import glsLogo from '../../assets/carriers/gls.png';
import inpostLogo from '../../assets/carriers/inpost.png';
import novaPoshtaLogo from '../../assets/carriers/nova-poshta.png';
import parcelLockerIcon from '../../assets/carriers/parcel-locker.png';
import pickupSellerLogo from '../../assets/carriers/pickup-seller.png';
import checkoutContactIcon from '../../assets/carriers/checkout-contact.png';
import checkoutDeliveryIcon from '../../assets/carriers/checkout-delivery.png';
import blikLogo from '../../assets/payments/blik.png';
import googlePayLogo from '../../assets/payments/google-pay.png';
import {
  deliveryDescriptions,
  deliveryNames,
  fulfillmentFallback,
  localized,
  paymentDescriptions,
  paymentNames,
} from '../checkoutOptions';
import { useStore } from '../store';

const words = {
  pl: {
    created: 'Zamówienie zostało utworzone.', hint: 'Najlepsza okazja może być dwa kliknięcia stąd.', remove: 'Usuń', contact: 'Dane kontaktowe', receiver: 'Dane odbiorcy', name: 'Imię i nazwisko', phone: 'Telefon', deliveryTitle: 'Dostawa', paymentTitle: 'Płatność', address: 'Ulica i numer', city: 'Miasto', postal: 'Kod pocztowy', country: 'Kraj', point: 'Numer lub adres punktu', pointPlaceholder: 'np. WAW01M albo Oddział 12', shippingPrice: 'Dostawa', free: 'Bezpłatnie', days: 'dni robocze', packages: 'przesyłki', package: 'przesyłka', comment: 'Uwagi do zamówienia', commentPlaceholder: 'np. proszę zadzwonić przed dostawą', check: 'Cena, dostępność i rabat są ponownie sprawdzane na serwerze. Dane płatnicze obsługuje zewnętrzny operator.', unavailable: 'Wybrany sposób nie jest dostępny dla produktów w koszyku.', pickupMulti: 'Odbiór osobisty jest dostępny tylko dla produktów od jednego sprzedawcy.', secure: 'Bezpieczny wybór', onlinePending: 'Po utworzeniu zamówienia otrzymasz instrukcję płatności.', cashInfo: 'Zapłacisz dopiero przy odbiorze.', deliveryFor: 'Cena za', eta: 'Przewidywany czas', regionLabel: 'Rynek dostawy', order: 'Złóż zamówienie', paymentPending: 'Oczekuje na płatność', dueOnDelivery: 'Płatność przy odbiorze', serverTariff: 'Taryfa przewoźnika jest obliczana po stronie serwera.', validation: 'Sprawdź wymagane pole:',
  },
  uk: {
    created: 'Замовлення створено.', hint: 'Найкраща пропозиція може бути лише за два кліки.', remove: 'Видалити', contact: 'Контактні дані', receiver: 'Дані отримувача', name: 'Ім’я та прізвище', phone: 'Телефон', deliveryTitle: 'Доставка', paymentTitle: 'Оплата', address: 'Вулиця та номер будинку', city: 'Місто', postal: 'Поштовий індекс', country: 'Країна', point: 'Номер або адреса пункту', pointPlaceholder: 'наприклад, поштомат 1234 або відділення 12', shippingPrice: 'Доставка', free: 'Безкоштовно', days: 'робочі дні', packages: 'посилки', package: 'посилка', comment: 'Коментар до замовлення', commentPlaceholder: 'наприклад, зателефонуйте перед доставкою', check: 'Ціна, наявність і знижка повторно перевіряються сервером. Платіжні дані обробляє зовнішній оператор.', unavailable: 'Цей спосіб недоступний для товарів у кошику.', pickupMulti: 'Самовивіз доступний лише для товарів одного продавця.', secure: 'Безпечний вибір', onlinePending: 'Після створення замовлення ви отримаєте інструкцію для оплати.', cashInfo: 'Оплата лише під час отримання.', deliveryFor: 'Вартість за', eta: 'Орієнтовний термін', regionLabel: 'Регіон доставки', order: 'Оформити замовлення', paymentPending: 'Очікує на оплату', dueOnDelivery: 'Оплата при отриманні', serverTariff: 'Тариф перевізника розраховується на сервері.', validation: 'Перевірте обов’язкове поле:',
  },
  en: {
    created: 'Your order has been created.', hint: 'The best deal may be just two clicks away.', remove: 'Remove', contact: 'Contact details', receiver: 'Recipient details', name: 'Full name', phone: 'Phone', deliveryTitle: 'Delivery', paymentTitle: 'Payment', address: 'Street and building number', city: 'City', postal: 'Postal code', country: 'Country', point: 'Point number or address', pointPlaceholder: 'e.g. locker WAW01M or Branch 12', shippingPrice: 'Delivery', free: 'Free', days: 'business days', packages: 'parcels', package: 'parcel', comment: 'Order notes', commentPlaceholder: 'e.g. please call before delivery', check: 'Price, stock and discounts are revalidated by the server. Payment data is handled by an external provider.', unavailable: 'This option is unavailable for the products in your cart.', pickupMulti: 'Personal collection is available only for products from one seller.', secure: 'Secure choice', onlinePending: 'You will receive payment instructions after the order is created.', cashInfo: 'You will pay only when collecting the order.', deliveryFor: 'Price for', eta: 'Estimated time', regionLabel: 'Delivery market', order: 'Place order', paymentPending: 'Awaiting payment', dueOnDelivery: 'Payment on collection', serverTariff: 'The carrier tariff is calculated on the server.', validation: 'Check the required field:',
  },
};

const regionNames = {
  pl: { pl: 'Polska', uk: 'Польща', en: 'Poland' },
  ua: { pl: 'Ukraina', uk: 'Україна', en: 'Ukraine' },
  eu: { pl: 'Europa', uk: 'Європа', en: 'Europe' },
};

const deliveryVisuals = {
  inpost_locker: { src: inpostLogo, tone: 'inpost', serviceIcon: parcelLockerIcon },
  dpd_courier: { src: dpdLogo, tone: 'dpd' },
  dpd_parcelshop: { src: dpdLogo, tone: 'dpd' },
  gls_parcelshop: { src: glsLogo, tone: 'gls' },
  nova_poshta_locker: { src: novaPoshtaLogo, tone: 'nova' },
  nova_poshta_branch: { src: novaPoshtaLogo, tone: 'nova' },
  nova_poshta_courier: { src: novaPoshtaLogo, tone: 'nova' },
  dhl_standard: { src: dhlLogo, tone: 'dhl' },
  dhl_express: { src: dhlLogo, tone: 'dhl' },
};

function DeliveryMark({ option, compact = false }) {
  if (option?.kind === 'pickup') {
    return <span className={`fulfillment-mark fulfillment-mark--pickup${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <img className="fulfillment-logo" src={pickupSellerLogo} alt="" />
    </span>;
  }

  const visual = deliveryVisuals[option?.id];
  if (!visual) return <span className={`fulfillment-mark${compact ? ' is-compact' : ''}`} aria-hidden="true">{option?.carrier?.slice(0, 3).toUpperCase()}</span>;

  return <span className={`fulfillment-mark fulfillment-mark--${visual.tone}${compact ? ' is-compact' : ''}`} aria-hidden="true">
    <img className="fulfillment-logo" src={visual.src} alt="" />
    {visual.serviceIcon && <span className="fulfillment-service-icon"><img src={visual.serviceIcon} alt="" /></span>}
  </span>;
}

const paymentBrandAssets = {
  blik: blikLogo,
  google_pay: googlePayLogo,
};

function PaymentMark({ method }) {
  const brandAsset = paymentBrandAssets[method];
  if (brandAsset) return <span className={`payment-mark payment-mark--${method}`} aria-hidden="true"><img src={brandAsset} alt="" /></span>;

  const type = method === 'card'
    ? 'card'
    : ['bank_transfer', 'sepa_transfer'].includes(method)
      ? 'bank'
      : ['cash_on_delivery', 'cash_on_pickup'].includes(method)
        ? 'cash'
        : 'wallet';

  return <span className={`payment-mark payment-mark--${type}`} aria-hidden="true">
    {type === 'card' && <svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 9h19M6 15h5" /></svg>}
    {type === 'bank' && <svg viewBox="0 0 24 24" fill="none"><path d="M3 9h18L12 3 3 9ZM5 20h14M7 9v8M12 9v8M17 9v8" /></svg>}
    {type === 'cash' && <svg viewBox="0 0 24 24" fill="none"><path d="M3 7.5h18v10H3zM7 12.5h.01M17 12.5h.01" /><circle cx="12" cy="12.5" r="2.5" /></svg>}
    {type === 'wallet' && <strong>P</strong>}
  </span>;
}

function paymentFitsDelivery(method, kind) {
  if (method === 'cash_on_pickup') return kind === 'pickup';
  if (method === 'cash_on_delivery') return kind !== 'pickup';
  return true;
}

export default function Cart() {
  const { t, cart, updateQty, removeFromCart, formatPrice, user, setCart, flash, language, region: selectedRegion } = useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [checkout, setCheckout] = useState({ name: '', phone: '', email: '', deliveryOption: '', paymentMethod: '', address: '', city: '', postalCode: '', country: '', deliveryPoint: '', comment: '' });
  const [busy, setBusy] = useState(false);
  const region = cart[0]?.product.region || selectedRegion || 'pl';
  const currency = cart[0]?.product.currency || { pl: 'PLN', ua: 'UAH', eu: 'EUR' }[region];
  const [remoteFulfillment, setRemoteFulfillment] = useState({});
  const fulfillment = remoteFulfillment[region] || fulfillmentFallback[region];

  useEffect(() => {
    api(`/orders/options?region=${encodeURIComponent(region)}`)
      .then((options) => {
        if (Array.isArray(options?.delivery) && Array.isArray(options?.payments)) {
          setRemoteFulfillment((current) => ({ ...current, [region]: options }));
        }
      })
      .catch(() => {});
  }, [region]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.qty, 0), [cart]);
  const packageCount = useMemo(() => new Set(cart.map((item) => item.product.sellerId || `seller:${item.product.seller}`)).size, [cart]);
  const shippingAllowed = cart.every((item) => item.product.delivery !== 'pickup');
  const pickupAllowed = packageCount === 1 && cart.every((item) => item.product.delivery !== 'shipping');
  const deliveryOptions = useMemo(() => (fulfillment?.delivery || []).filter((option) => option.kind === 'pickup' ? pickupAllowed : shippingAllowed), [fulfillment, pickupAllowed, shippingAllowed]);
  const selectedDelivery = deliveryOptions.find((option) => option.id === checkout.deliveryOption) || deliveryOptions[0];
  const paymentOptions = useMemo(() => (fulfillment?.payments || []).filter((method) => paymentFitsDelivery(method, selectedDelivery?.kind)), [fulfillment, selectedDelivery?.kind]);
  const selectedPayment = paymentOptions.includes(checkout.paymentMethod) ? checkout.paymentMethod : paymentOptions[0];
  const shipping = selectedDelivery ? (selectedDelivery.priceCents / 100) * (selectedDelivery.kind === 'pickup' ? 1 : packageCount) : 0;
  const total = subtotal + shipping;

  const change = (field) => (event) => setCheckout((value) => ({ ...value, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth', { state: { from: '/cart' } });
    if (!selectedDelivery || !selectedPayment) return flash(c.unavailable);
    const checkoutPayload = {
      customerName: checkout.name.trim(),
      phone: checkout.phone.trim(),
      email: checkout.email.trim(),
      deliveryOption: selectedDelivery.id,
      paymentMethod: selectedPayment,
      ...(checkout.comment.trim() ? { comment: checkout.comment.trim() } : {}),
      ...(selectedDelivery.kind === 'point'
        ? { city: checkout.city.trim(), deliveryPoint: checkout.deliveryPoint.trim() }
        : {}),
      ...(selectedDelivery.kind === 'courier'
        ? {
            address: checkout.address.trim(),
            city: checkout.city.trim(),
            postalCode: checkout.postalCode.trim(),
            ...(region === 'eu' ? { country: checkout.country.trim() } : {}),
          }
        : {}),
    };
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({ id: item.id, qty: item.qty })),
          promoCode,
          checkout: checkoutPayload,
        }),
      });
      setCart([]);
      flash(`#${order.id.slice(0, 8)} · ${c.created}`);
      navigate('/account?tab=orders');
    } catch (error) {
      const invalidField = error.details?.[0]?.field;
      const fieldLabels = {
        customerName: c.name,
        phone: c.phone,
        email: 'Email',
        address: c.address,
        city: c.city,
        postalCode: c.postal,
        country: c.country,
        deliveryPoint: c.point,
      };
      flash(invalidField ? `${c.validation} ${fieldLabels[invalidField] || invalidField}` : error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!cart.length) return <div className="shell empty-cart"><span>0</span><h1>{t('cartEmpty')}</h1><p>{c.hint}</p><Link className="primary-button" to="/catalog">{t('continue')}</Link></div>;

  return (
    <form className="cart-page-react shell" onSubmit={submit}>
      <section className="cart-lines">
        <div className="page-heading page-heading--compact"><span className="section-label">Checkout</span><h1>{t('cartTitle')}</h1></div>
        {cart.map((item) => <article className="cart-line" key={item.id}>
          <img src={imageUrl(item.product.images?.[0])} alt="" />
          <div><Link to={`/product/${item.id}`}>{item.product.title}</Link><small>{t(item.product.condition === 'new' ? 'new' : 'used')} · {item.product.location} · {item.product.seller}</small><button type="button" onClick={() => removeFromCart(item.id)}>{c.remove}</button></div>
          <div className="qty"><button type="button" aria-label="Minus" onClick={() => updateQty(item.id, item.qty - 1)}>−</button><b>{item.qty}</b><button type="button" aria-label="Plus" onClick={() => updateQty(item.id, item.qty + 1)}>+</button></div>
          <strong>{formatPrice(item.product.price * item.qty, item.product.currency)}</strong>
        </article>)}

        <section className="checkout-step">
          <header><span className="checkout-step-icon"><img src={checkoutContactIcon} alt="" /></span><div><small>{c.contact}</small><h2>{c.receiver}</h2></div></header>
          <div className="form-grid-react">
            <label>{c.name}<input required autoComplete="name" value={checkout.name} onChange={change('name')} /></label>
            <label>{c.phone}<input required type="tel" autoComplete="tel" value={checkout.phone} onChange={change('phone')} /></label>
            <label className="span-2">Email<input required type="email" autoComplete="email" value={checkout.email} onChange={change('email')} /></label>
          </div>
        </section>

        <section className="checkout-step">
          <header><span className="checkout-step-icon"><img src={checkoutDeliveryIcon} alt="" /></span><div><small>{c.deliveryTitle}</small><h2>{c.deliveryTitle.replace(/^\d+\s·\s/, '')}</h2></div><b className="region-chip">{region.toUpperCase()} · {localized(regionNames, region, language)}</b></header>
          {!pickupAllowed && packageCount > 1 && <p className="checkout-note">{c.pickupMulti}</p>}
          <div className="fulfillment-options">
            {deliveryOptions.map((option) => <button type="button" key={option.id} className={selectedDelivery?.id === option.id ? 'is-active' : ''} onClick={() => setCheckout((value) => ({ ...value, deliveryOption: option.id }))}>
              <DeliveryMark option={option} />
              <span><b>{localized(deliveryNames, option.id, language)}</b><small>{localized(deliveryDescriptions, option.kind, language)}</small></span>
              <span className="fulfillment-price"><b>{option.priceCents ? formatPrice(option.priceCents / 100, currency) : c.free}</b><small>{option.etaMax ? `${option.etaMin}–${option.etaMax} ${c.days}` : '—'}</small></span>
            </button>)}
          </div>

          {selectedDelivery?.kind === 'point' && <div className="form-grid-react checkout-address"><label>{c.city}<input required autoComplete="address-level2" value={checkout.city} onChange={change('city')} /></label><label>{c.point}<input required placeholder={c.pointPlaceholder} value={checkout.deliveryPoint} onChange={change('deliveryPoint')} /></label></div>}
          {selectedDelivery?.kind === 'courier' && <div className="form-grid-react checkout-address">
            <label className="span-2">{c.address}<input required autoComplete="street-address" value={checkout.address} onChange={change('address')} /></label>
            <label>{c.city}<input required autoComplete="address-level2" value={checkout.city} onChange={change('city')} /></label>
            <label>{c.postal}<input required autoComplete="postal-code" value={checkout.postalCode} onChange={change('postalCode')} /></label>
            {region === 'eu' && <label className="span-2">{c.country}<input required autoComplete="country-name" value={checkout.country} onChange={change('country')} /></label>}
          </div>}
          {selectedDelivery?.kind === 'pickup' && <div className="pickup-explainer"><DeliveryMark option={selectedDelivery} compact /><p>{localized(deliveryDescriptions, 'pickup', language)}</p></div>}
          {selectedDelivery && selectedDelivery.kind !== 'pickup' && <div className="delivery-meta"><span><small>{c.eta}</small><b>{selectedDelivery.etaMin}–{selectedDelivery.etaMax} {c.days}</b></span><span><small>{c.deliveryFor}</small><b>{packageCount} {packageCount === 1 ? c.package : c.packages}</b></span><span><small>{c.secure}</small><b>Tracking ✓</b></span></div>}
        </section>

        <section className="checkout-step">
          <header><span>03</span><div><small>{c.paymentTitle}</small><h2>{c.paymentTitle.replace(/^\d+\s·\s/, '')}</h2></div></header>
          <div className="payment-options">
            {paymentOptions.map((method) => <button type="button" key={method} className={selectedPayment === method ? 'is-active' : ''} onClick={() => setCheckout((value) => ({ ...value, paymentMethod: method }))}>
              <PaymentMark method={method} /><span><b>{localized(paymentNames, method, language)}</b><small>{localized(paymentDescriptions, method, language)}</small></span><span className="payment-radio" />
            </button>)}
          </div>
          <p className="checkout-note">{selectedPayment?.startsWith('cash_') ? c.cashInfo : c.onlinePending}</p>
          <label className="checkout-comment">{c.comment}<textarea value={checkout.comment} onChange={change('comment')} placeholder={c.commentPlaceholder} maxLength="500" /></label>
        </section>
      </section>

      <aside className="cart-summary">
        <span className="section-label">{t('summary')}</span><h2>{t('total')}</h2>
        <dl><div><dt>{t('subtotal')}</dt><dd>{formatPrice(subtotal, currency)}</dd></div><div><dt>{c.shippingPrice}</dt><dd>{shipping ? formatPrice(shipping, currency) : c.free}</dd></div><div className="summary-total"><dt>{t('total')}</dt><dd>{formatPrice(total, currency)}</dd></div></dl>
        {selectedDelivery && <div className="summary-choice"><DeliveryMark option={selectedDelivery} compact /><div><span>{selectedDelivery.carrier}</span><small>{packageCount} {packageCount === 1 ? c.package : c.packages} · {c.serverTariff}</small></div></div>}
        <label>{t('promo')}<div className="promo-input"><input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="KOD-123" /><span>✓</span></div></label>
        <button className="primary-button primary-button--wide" disabled={busy || !selectedDelivery || !selectedPayment} type="submit">{user ? (busy ? '…' : c.order) : t('login')}</button>
        <small>{c.check}</small>
      </aside>
    </form>
  );
}
