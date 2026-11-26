import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { imageUrl } from '../api';
import {
  canListNew,
  filterInventory,
  inventoryCondition,
  inventorySummary,
} from '../sellerInventory.mjs';
import { availabilityFor, supplyCopy, newSellerCopy } from '../supplyDetails.mjs';

export const inventoryCopy = {
  uk: {
    title: 'Мої товари й оголошення',
    all: 'Усі',
    new: 'Нова техніка',
    used: 'Б/в оголошення',
    newLead: 'Версії, артикули, партії та залишки нової техніки.',
    usedLead: 'Власні пристрої, їхній стан і повідомлення покупців.',
    allLead: 'Обери напрям, щоб працювати з товарами магазину або приватними оголошеннями.',
    addNew: 'Додати новий товар',
    addUsed: 'Продати б/в пристрій',
    search: 'Пошук за назвою, моделлю, SKU або партією',
    status: 'Статус',
    total: 'Позицій',
    active: 'Активних',
    drafts: 'Чернеток',
    units: 'Одиниць для покупки',
    unitsHint:
      'Лише активні доступні товари; приховані, демонстраційні й товари без дозволу на нову техніку не враховані.',
    empty: 'За цими фільтрами позицій немає.',
    clear: 'Скинути фільтри',
    hidden: 'Приховано модерацією',
    blocked:
      'Продаж нової техніки потребує дозволу. Старі позиції залишаються тут для перегляду; публічна видимість обмежена.',
    access: 'Роль і доступ',
    working: 'Виконуємо дію…',
    failed: 'Не вдалося видалити оголошення. Спробуй ще раз.',
    market: 'Ринок',
    batch: 'Партія',
  },
  pl: {
    title: 'Moje produkty i ogłoszenia',
    all: 'Wszystkie',
    new: 'Nowy sprzęt',
    used: 'Używane urządzenia',
    newLead: 'Wersje, kody produktu, partie i stany nowego sprzętu.',
    usedLead: 'Własne urządzenia, ich stan i wiadomości kupujących.',
    allLead: 'Wybierz nowy sprzęt lub prywatne ogłoszenia.',
    addNew: 'Dodaj nowy produkt',
    addUsed: 'Sprzedaj używany sprzęt',
    search: 'Szukaj nazwy, modelu, SKU lub partii',
    status: 'Status',
    total: 'Pozycje',
    active: 'Aktywne',
    drafts: 'Szkice',
    units: 'Sztuki dostępne do zakupu',
    unitsHint:
      'Tylko aktywne, dostępne produkty; bez ukrytych, demonstracyjnych i nowego sprzętu bez zgody.',
    empty: 'Brak pozycji dla tych filtrów.',
    clear: 'Wyczyść filtry',
    hidden: 'Ukryte przez moderację',
    blocked:
      'Sprzedaż nowego sprzętu wymaga zgody. Starsze pozycje nadal są widoczne tutaj; ich publiczna widoczność jest ograniczona.',
    access: 'Rola i dostęp',
    working: 'Wykonywanie działania…',
    failed: 'Nie udało się usunąć ogłoszenia. Spróbuj ponownie.',
    market: 'Rynek',
    batch: 'Partia',
  },
  en: {
    title: 'My products and listings',
    all: 'All',
    new: 'New devices',
    used: 'Pre-owned listings',
    newLead: 'Versions, product codes, batches and stock for new devices.',
    usedLead: 'Your devices, their condition and buyer messages.',
    allLead: 'Choose store products or private listings.',
    addNew: 'Add new product',
    addUsed: 'Sell a pre-owned device',
    search: 'Search name, model, SKU or batch',
    status: 'Status',
    total: 'Listings',
    active: 'Active',
    drafts: 'Drafts',
    units: 'Units available to buy',
    unitsHint:
      'Active, available items only; excludes hidden items, demos and new devices without sales approval.',
    empty: 'No listings match these filters.',
    clear: 'Clear filters',
    hidden: 'Hidden by moderation',
    blocked:
      'New-device sales require approval. Older items remain here for review; their public visibility is restricted.',
    access: 'Role and access',
    working: 'Working…',
    failed: 'Could not delete the listing. Please try again.',
    market: 'Market',
    batch: 'Batch',
  },
};

export default function SellerInventory({
  listings,
  user,
  language,
  c,
  formatPrice,
  onEdit,
  onRemove,
  loading,
}) {
  const w = inventoryCopy[language] || inventoryCopy.pl;
  const supply = supplyCopy[language] || supplyCopy.pl;
  const permission = newSellerCopy[language] || newSellerCopy.pl;
  const [params, setParams] = useSearchParams();
  const requested = params.get('inventory');
  const condition = ['all', 'new', 'used'].includes(requested)
    ? requested
    : canListNew(user)
      ? 'new'
      : 'used';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState('');
  const [error, setError] = useState('');
  const selected = filterInventory(listings, { condition });
  const visible = filterInventory(selected, { status, query });
  const summary = inventorySummary(selected, user);
  const switchSection = (value) => {
    setParams({ tab: 'listings', inventory: value });
    setQuery('');
    setStatus('');
    setError('');
  };
  const remove = async (id) => {
    if (removing) return;
    setRemoving(id);
    setError('');
    try {
      await onRemove(id);
    } catch {
      setError(w.failed);
    } finally {
      setRemoving('');
    }
  };
  return (
    <section className="account-section seller-inventory" aria-busy={loading || !!removing}>
      <header className="section-title">
        <div>
          <span className="eyebrow">NaShary Seller</span>
          <h2>{w.title}</h2>
        </div>
      </header>
      <nav className="inventory-directions" aria-label={w.title}>
        {['new', 'used', 'all'].map((value) => (
          <button
            type="button"
            key={value}
            className={condition === value ? 'is-active' : ''}
            aria-pressed={condition === value}
            disabled={!!removing}
            onClick={() => switchSection(value)}
          >
            <span>{w[value]}</span>
            <b>
              {value === 'all'
                ? listings.length
                : listings.filter((item) => inventoryCondition(item) === value).length}
            </b>
          </button>
        ))}
      </nav>
      <div className="inventory-intro">
        <p>{w[condition === 'all' ? 'allLead' : `${condition}Lead`]}</p>
        <div className="inventory-create">
          {condition !== 'used' && canListNew(user) && (
            <Link className="primary-button" to="/sell?condition=new">
              ＋ {w.addNew}
            </Link>
          )}
          {condition !== 'new' && (
            <Link className="primary-button" to="/sell?condition=used">
              ＋ {w.addUsed}
            </Link>
          )}
        </div>
      </div>
      {condition !== 'used' && (
        <div className="supply-notice">
          <b>{canListNew(user) ? permission.allowed : permission.denied}</b>
          {!canListNew(user) && (
            <p>
              {w.blocked} <Link to="/account?tab=access">{w.access} →</Link>
            </p>
          )}
        </div>
      )}
      <dl className="inventory-metrics">
        {[
          ['total', summary.total],
          ['active', summary.active],
          ['drafts', summary.drafts],
          ['units', summary.availableUnits],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{w[key]}</dt>
            <dd>{loading ? '…' : value}</dd>
          </div>
        ))}
      </dl>
      <p className="inventory-hint">{w.unitsHint}</p>
      <div className="inventory-filters">
        <label>
          {w.search}
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          {w.status}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{w.all}</option>
            {['active', 'reserved', 'sold', 'draft'].map((value) => (
              <option key={value} value={value}>
                {c[value]}
              </option>
            ))}
          </select>
        </label>
        {(query || status) && (
          <button
            className="quiet-button"
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('');
            }}
          >
            {w.clear}
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {removing && <p role="status">{w.working}</p>}
      {!loading && !visible.length && (
        <div className="account-empty">
          <p>{w.empty}</p>
        </div>
      )}
      <div className="listing-table">
        {visible.map((item) => (
          <article key={item.id}>
            <img src={imageUrl(item.images?.[0])} alt="" />
            <div>
              <Link to={`/product/${item.id}`}>{item.title}</Link>
              <small>
                {w[inventoryCondition(item)]} · {c[item.status] || item.status} · {item.stock}{' '}
                {c.pieces} · {w.market}: {item.region?.toUpperCase()}
              </small>
              {item.condition === 'new' && (
                <small>
                  {supply[availabilityFor(item)]}
                  {item.supplyDetails?.marketVersion
                    ? ` · ${item.supplyDetails.marketVersion === 'Other' ? supply.other : item.supplyDetails.marketVersion}`
                    : ''}
                  {item.supplyDetails?.sku ? ` · SKU: ${item.supplyDetails.sku}` : ''}
                  {item.supplyDetails?.batch ? ` · ${w.batch}: ${item.supplyDetails.batch}` : ''}
                </small>
              )}
              {item.moderationStatus === 'hidden' && (
                <small className="moderation-warning">
                  {w.hidden}
                  {item.moderationReason ? `: ${item.moderationReason}` : ''}
                </small>
              )}
            </div>
            <strong>{formatPrice(item.price, item.currency)}</strong>
            <div className="row-actions">
              <button
                type="button"
                disabled={!!removing}
                aria-label={`${c.edit}: ${item.title}`}
                title={c.edit}
                onClick={() => onEdit(item)}
              >
                ✎
              </button>
              <button
                type="button"
                disabled={!!removing}
                aria-label={`${c.remove}: ${item.title}`}
                title={c.remove}
                onClick={() => remove(item.id)}
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
