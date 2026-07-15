import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';

const words = {
  pl: {
    created: 'Zamówienie zostało utworzone.',
    hint: 'Najlepsza okazja może być dwa kliknięcia stąd.',
    remove: 'Usuń',
    receiver: 'Dane odbiorcy',
    name: 'Imię i nazwisko',
    phone: 'Telefon',
    method: 'Sposób odbioru',
    shipping: 'Dostawa',
    pickup: 'Odbiór osobisty',
    address: 'Adres',
    shippingPrice: 'Dostawa',
    free: '0',
    check: 'Ostateczna cena, kod oraz dostępność są sprawdzane przez serwer.',
  },
  uk: {
    created: 'Замовлення створено.',
    hint: 'Найкраща пропозиція може бути лише за два кліки.',
    remove: 'Видалити',
    receiver: 'Дані отримувача',
    name: 'Ім’я та прізвище',
    phone: 'Телефон',
    method: 'Спосіб отримання',
    shipping: 'Доставка',
    pickup: 'Самовивіз',
    address: 'Адреса',
    shippingPrice: 'Доставка',
    free: '0',
    check: 'Остаточну ціну, код і наявність перевіряє сервер.',
  },
  en: {
    created: 'Your order has been created.',
    hint: 'The best deal may be just two clicks away.',
    remove: 'Remove',
    receiver: 'Recipient details',
    name: 'Full name',
    phone: 'Phone',
    method: 'Delivery method',
    shipping: 'Delivery',
    pickup: 'Collection',
    address: 'Address',
    shippingPrice: 'Delivery',
    free: '0',
    check: 'The final price, promo code and stock are verified by the server.',
  },
};

const shippingByCurrency = { PLN: 19.99, UAH: 99, EUR: 14.99 };

export default function Cart() {
  const { t, cart, updateQty, removeFromCart, formatPrice, user, setCart, flash, language } =
    useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [checkout, setCheckout] = useState({
    name: '',
    phone: '',
    email: '',
    delivery: 'shipping',
    address: '',
  });
  const [busy, setBusy] = useState(false);
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [cart]
  );
  const currency = cart[0]?.product.currency || 'PLN';
  const shipping = checkout.delivery === 'shipping' ? shippingByCurrency[currency] || 0 : 0;
  const total = subtotal + shipping;
  const submit = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth', { state: { from: '/cart' } });
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({ id: item.id, qty: item.qty })),
          promoCode,
          checkout,
        }),
      });
      setCart([]);
      flash(`#${order.id.slice(0, 8)} · ${c.created}`);
      navigate('/account?tab=orders');
    } catch (error) {
      flash(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (!cart.length)
    return (
      <div className="shell empty-cart">
        <span>0</span>
        <h1>{t('cartEmpty')}</h1>
        <p>{c.hint}</p>
        <Link className="primary-button" to="/catalog">
          {t('continue')}
        </Link>
      </div>
    );
  return (
    <form className="cart-page-react shell" onSubmit={submit}>
      <section className="cart-lines">
        <div className="page-heading page-heading--compact">
          <span className="section-label">Checkout</span>
          <h1>{t('cartTitle')}</h1>
        </div>
        {cart.map((item) => (
          <article className="cart-line" key={item.id}>
            <img src={imageUrl(item.product.images?.[0])} alt="" />
            <div>
              <Link to={`/product/${item.id}`}>{item.product.title}</Link>
              <small>
                {t(item.product.condition === 'new' ? 'new' : 'used')} · {item.product.location}
              </small>
              <button type="button" onClick={() => removeFromCart(item.id)}>
                {c.remove}
              </button>
            </div>
            <div className="qty">
              <button type="button" onClick={() => updateQty(item.id, item.qty - 1)}>
                −
              </button>
              <b>{item.qty}</b>
              <button type="button" onClick={() => updateQty(item.id, item.qty + 1)}>
                ＋
              </button>
            </div>
            <strong>{formatPrice(item.product.price * item.qty, item.product.currency)}</strong>
          </article>
        ))}
        <div className="checkout-form">
          <h2>{c.receiver}</h2>
          <div className="form-grid-react">
            <label>
              {c.name}
              <input
                required
                value={checkout.name}
                onChange={(event) => setCheckout({ ...checkout, name: event.target.value })}
              />
            </label>
            <label>
              {c.phone}
              <input
                required
                value={checkout.phone}
                onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={checkout.email}
                onChange={(event) => setCheckout({ ...checkout, email: event.target.value })}
              />
            </label>
            <label>
              {c.method}
              <select
                value={checkout.delivery}
                onChange={(event) => setCheckout({ ...checkout, delivery: event.target.value })}
              >
                <option value="shipping">{c.shipping}</option>
                <option value="pickup">{c.pickup}</option>
              </select>
            </label>
            <label className="span-2">
              {c.address}
              <input
                required={checkout.delivery === 'shipping'}
                value={checkout.address}
                onChange={(event) => setCheckout({ ...checkout, address: event.target.value })}
              />
            </label>
          </div>
        </div>
      </section>
      <aside className="cart-summary">
        <span className="section-label">{t('summary')}</span>
        <h2>{t('total')}</h2>
        <dl>
          <div>
            <dt>{t('subtotal')}</dt>
            <dd>{formatPrice(subtotal, currency)}</dd>
          </div>
          <div>
            <dt>{c.shippingPrice}</dt>
            <dd>{formatPrice(shipping, currency)}</dd>
          </div>
          <div className="summary-total">
            <dt>{t('total')}</dt>
            <dd>{formatPrice(total, currency)}</dd>
          </div>
        </dl>
        <label>
          {t('promo')}
          <div className="promo-input">
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="KOD-123"
            />
            <span>✓</span>
          </div>
        </label>
        <button className="primary-button primary-button--wide" disabled={busy} type="submit">
          {user ? (busy ? '…' : t('checkout')) : t('login')}
        </button>
        <small>{c.check}</small>
      </aside>
    </form>
  );
}
