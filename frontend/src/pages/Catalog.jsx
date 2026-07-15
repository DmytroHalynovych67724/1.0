import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ComparePanel from '../components/ComparePanel';
import ProductCard from '../components/ProductCard';
import QuickView from '../components/QuickView';
import { useStore } from '../store';

const categories = [
  ['', { pl: 'Wszystkie', uk: 'Усі', en: 'All' }],
  ['Smartfony', { pl: 'Smartfony', uk: 'Смартфони', en: 'Smartphones' }],
  ['Laptopy', { pl: 'Laptopy', uk: 'Ноутбуки', en: 'Laptops' }],
  ['Tablety', { pl: 'Tablety', uk: 'Планшети', en: 'Tablets' }],
  ['Gaming', { pl: 'Gaming', uk: 'Геймінг', en: 'Gaming' }],
  ['Audio', { pl: 'Audio', uk: 'Аудіо', en: 'Audio' }],
  ['Monitory', { pl: 'TV i monitory', uk: 'TV і монітори', en: 'TV & monitors' }],
  ['Foto', { pl: 'Foto', uk: 'Фото', en: 'Photo' }],
  ['Akcesoria', { pl: 'Akcesoria', uk: 'Аксесуари', en: 'Accessories' }],
];

const labels = {
  screen: { pl: 'Przekątna ekranu', uk: 'Діагональ екрана', en: 'Screen size' },
  processor: { pl: 'Procesor', uk: 'Процесор', en: 'Processor' },
  ram: { pl: 'Pamięć RAM', uk: 'Оперативна пам’ять', en: 'RAM' },
  storage: { pl: 'Pamięć urządzenia', uk: 'Накопичувач', en: 'Storage' },
  gpu: { pl: 'Karta graficzna', uk: 'Відеокарта', en: 'Graphics' },
  os: { pl: 'System operacyjny', uk: 'Операційна система', en: 'Operating system' },
  platform: { pl: 'Platforma', uk: 'Платформа', en: 'Platform' },
  resolution: { pl: 'Rozdzielczość', uk: 'Роздільна здатність', en: 'Resolution' },
  refreshRate: { pl: 'Odświeżanie', uk: 'Частота оновлення', en: 'Refresh rate' },
  connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
  accessoryType: { pl: 'Rodzaj akcesorium', uk: 'Тип аксесуара', en: 'Accessory type' },
  audioType: { pl: 'Rodzaj audio', uk: 'Тип аудіо', en: 'Audio type' },
  color: { pl: 'Kolor', uk: 'Колір', en: 'Color' },
  displayType: { pl: 'Matryca ekranu', uk: 'Матриця екрана', en: 'Display type' },
  battery: { pl: 'Pojemność baterii', uk: 'Ємність акумулятора', en: 'Battery capacity' },
  charging: { pl: 'Moc ładowania', uk: 'Потужність заряджання', en: 'Charging power' },
  mainCamera: { pl: 'Aparat główny', uk: 'Основна камера', en: 'Main camera' },
  frontCamera: { pl: 'Aparat przedni', uk: 'Фронтальна камера', en: 'Front camera' },
  cameraFeatures: { pl: 'Funkcje aparatu', uk: 'Особливості камери', en: 'Camera features' },
  features: { pl: 'Funkcje i możliwości', uk: 'Функції та можливості', en: 'Features' },
  sim: { pl: 'Karty SIM', uk: 'SIM-карти', en: 'SIM cards' },
  wifi: { pl: 'Wi‑Fi', uk: 'Wi‑Fi', en: 'Wi-Fi' },
  bluetooth: { pl: 'Wersja Bluetooth', uk: 'Версія Bluetooth', en: 'Bluetooth version' },
  displayFeatures: { pl: 'Funkcje wyświetlacza', uk: 'Особливості дисплея', en: 'Display features' },
  ramType: { pl: 'Typ pamięci RAM', uk: 'Тип оперативної пам’яті', en: 'RAM type' },
  weight: { pl: 'Waga', uk: 'Вага', en: 'Weight' },
};

const categorySpecs = {
  Smartfony: ['screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures', 'processor', 'ram', 'ramType', 'storage', 'battery', 'charging', 'mainCamera', 'frontCamera', 'cameraFeatures', 'features', 'sim', 'os', 'connectivity', 'wifi', 'bluetooth', 'color', 'weight'],
  Laptopy: ['color', 'screen', 'processor', 'ram', 'storage', 'gpu', 'os'],
  Tablety: ['color', 'screen', 'processor', 'ram', 'storage', 'os'],
  Gaming: ['color', 'platform', 'storage'],
  Audio: ['color', 'audioType', 'connectivity'],
  Monitory: ['color', 'screen', 'resolution', 'refreshRate'],
  Foto: ['color', 'resolution', 'connectivity'],
  Akcesoria: ['color', 'accessoryType', 'connectivity'],
};

const copy = {
  pl: {
    reset: 'Wyczyść',
    safe: 'NaShary safe',
    note: 'Sprawdź opis stanu, profil sprzedawcy i historię ocen przed zakupem.',
    only: 'Pokazujemy wyłącznie oferty z rynku',
    brand: 'Marka',
    popular: 'Popularne marki',
    popularNote: 'Szybki wybór w tej kategorii',
    price: 'Przedział cenowy',
    grade: 'Klasa stanu',
    from: 'Od',
    to: 'Do',
    available: 'Tylko dostępne',
    details: 'Parametry techniczne',
    any: 'Dowolny',
    oldest: 'Najstarsze',
    rating: 'Najlepiej oceniane',
    stock: 'Największa dostępność',
    alphabetic: 'Nazwa A–Z',
    active: 'Aktywne filtry',
    showFilters: 'Filtry',
    close: 'Zamknij',
    view: 'Widok',
    grid: 'Kafelki',
    compact: 'Kompaktowy',
    list: 'Lista',
    compare: 'Porównaj',
    selected: 'wybrano',
    models: 'Popularne modele', saveSearch: 'Zapisz wyszukiwanie', savedSearch: 'Wyszukiwanie zapisane', more: 'Pokaż więcej', seller: 'Sprzedawca', private: 'Osoba prywatna', store: 'Sklep', delivery: 'Odbiór i dostawa', shipping: 'Dostawa', pickup: 'Odbiór osobisty', trust: 'Wiarygodność i oferta', verified: 'Zweryfikowany sprzedawca', negotiable: 'Możliwa negocjacja', warranty: 'Z gwarancją', urgent: 'Pilne', city: 'Miasto', anyCity: 'Wszystkie miasta', promo: 'Graj, odbieraj kody i kupuj taniej w swoim regionie.', play: 'Mini-gry',
  },
  uk: {
    reset: 'Очистити',
    safe: 'Безпека NaShary',
    note: 'Перевірте опис стану, профіль продавця та історію оцінок перед покупкою.',
    only: 'Показуємо лише пропозиції з ринку',
    brand: 'Бренд',
    popular: 'Популярні бренди',
    popularNote: 'Швидкий вибір у цій категорії',
    price: 'Діапазон цін',
    grade: 'Клас стану',
    from: 'Від',
    to: 'До',
    available: 'Лише в наявності',
    details: 'Технічні характеристики',
    any: 'Будь-який',
    oldest: 'Найстаріші',
    rating: 'За рейтингом',
    stock: 'Найбільше в наявності',
    alphabetic: 'Назва А–Я',
    active: 'Активні фільтри',
    showFilters: 'Фільтри',
    close: 'Закрити',
    view: 'Вигляд',
    grid: 'Плитка',
    compact: 'Компактно',
    list: 'Список',
    compare: 'Порівняти',
    selected: 'вибрано',
    models: 'Популярні моделі', saveSearch: 'Зберегти пошук', savedSearch: 'Пошук збережено', more: 'Показати більше', seller: 'Продавець', private: 'Приватна особа', store: 'Магазин', delivery: 'Отримання і доставка', shipping: 'Доставка', pickup: 'Самовивіз', trust: 'Довіра та пропозиція', verified: 'Перевірений продавець', negotiable: 'Можливий торг', warranty: 'З гарантією', urgent: 'Терміново', city: 'Місто', anyCity: 'Усі міста', promo: 'Грайте, отримуйте коди та купуйте дешевше у своєму регіоні.', play: 'Мініігри',
  },
  en: {
    reset: 'Clear',
    safe: 'NaShary safe',
    note: 'Review the condition, seller profile and rating history before buying.',
    only: 'Showing offers only from the',
    brand: 'Brand',
    popular: 'Popular brands',
    popularNote: 'Quick choice in this category',
    price: 'Price range',
    grade: 'Condition grade',
    from: 'From',
    to: 'To',
    available: 'In stock only',
    details: 'Technical specifications',
    any: 'Any',
    oldest: 'Oldest',
    rating: 'Best rated',
    stock: 'Most stock',
    alphabetic: 'Name A–Z',
    active: 'Active filters',
    showFilters: 'Filters',
    close: 'Close',
    view: 'View',
    grid: 'Grid',
    compact: 'Compact',
    list: 'List',
    compare: 'Compare',
    selected: 'selected',
    models: 'Popular models', saveSearch: 'Save search', savedSearch: 'Search saved', more: 'Show more', seller: 'Seller', private: 'Private seller', store: 'Store', delivery: 'Delivery & pickup', shipping: 'Shipping', pickup: 'Pickup', trust: 'Trust & offer', verified: 'Verified seller', negotiable: 'Negotiable', warranty: 'With warranty', urgent: 'Urgent', city: 'City', anyCity: 'All cities', promo: 'Play, earn codes and buy for less in your region.', play: 'Mini-games',
  },
};

function countsFor(items, selector) {
  return items.reduce((counts, item) => {
    const value = selector(item);
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function FilterSection({ title, children, open = true }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <section className={`filter-group${expanded ? ' is-open' : ''}`}>
      <button
        className="filter-group__toggle"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <b>{title}</b>
        <span>{expanded ? '−' : '+'}</span>
      </button>
      <div className="filter-group__content" hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}

export default function Catalog() {
  const { t, region, regions, language, comparison, user, flash } = useStore();
  const navigate = useNavigate();
  const c = copy[language] || copy.pl;
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [sourceProducts, setSourceProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [visible, setVisible] = useState(12);
  const [view, setViewState] = useState(
    () => localStorage.getItem('nashary-catalog-view') || 'grid'
  );
  const signature = params.toString();
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const condition = params.get('condition') || '';
  const sort = params.get('sort') || 'newest';
  const specKeys = categorySpecs[category] || [];

  useEffect(() => {
    const search = new URLSearchParams(signature);
    search.set('region', region);
    if (sort === 'price-asc') search.set('sort', 'price_asc');
    else if (sort === 'price-desc') search.set('sort', 'price_desc');
    api(`/products?${search}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [region, signature, sort]);

  useEffect(() => {
    const search = new URLSearchParams(signature);
    search.set('region', region);
    ['sort', 'brand', 'model', 'condition', 'grade', ...Object.keys(labels)].forEach((key) => search.delete(key));
    api(`/products?${search}`)
      .then(setSourceProducts)
      .catch(() => setSourceProducts([]));
  }, [signature, region]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === 'category') Object.keys(labels).forEach((name) => next.delete(name));
    setParams(next);
  };
  const setView = (value) => {
    localStorage.setItem('nashary-catalog-view', value);
    setViewState(value);
  };
  const reset = () => setParams(query ? { q: query } : {});
  const unique = (key, source = sourceProducts.map((item) => item.specs?.[key])) =>
    [...new Set(source.filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  const brandCounts = useMemo(
    () => countsFor(sourceProducts, (product) => product.brand),
    [sourceProducts]
  );
  const conditionCounts = useMemo(
    () => countsFor(sourceProducts, (product) => product.condition),
    [sourceProducts]
  );
  const gradeCounts = useMemo(
    () => countsFor(sourceProducts, (product) => product.deviceDetails?.grade),
    [sourceProducts]
  );
  const brands = Object.keys(brandCounts).sort(
    (a, b) => brandCounts[b] - brandCounts[a] || a.localeCompare(b)
  );
  const modelCounts = useMemo(() => countsFor(sourceProducts.filter((item) => !params.get('brand') || item.brand === params.get('brand')), (product) => product.model), [sourceProducts, params]);
  const models = Object.keys(modelCounts).sort((a, b) => modelCounts[b] - modelCounts[a]).slice(0, 12);
  const cities = unique('location', sourceProducts.map((item) => item.location));
  const active = [...params.entries()].filter(([key]) => !['q', 'sort'].includes(key));
  const title = useMemo(
    () => (query ? `“${query}”` : category || t('catalog')),
    [query, category, t]
  );
  const activeName = (key) => {
    if (labels[key]) return labels[key][language] || labels[key].pl;
    if (key === 'category') return t('category');
    if (key === 'condition') return t('condition');
    if (key === 'grade') return c.grade;
    if (key === 'brand') return c.brand;
    if (key === 'model') return c.models;
    if (key === 'location') return c.city;
    if (key === 'minPrice' || key === 'maxPrice') return c.price;
    if (key === 'inStock') return c.available;
    return key;
  };
  const saveSearch = async () => {
    if (!user) return navigate('/auth', { state: { from: `/catalog?${signature}` } });
    const queryData = Object.fromEntries([...params.entries()].filter(([key]) => key !== 'sort'));
    await api('/marketplace/searches', { method: 'POST', body: JSON.stringify({ name: title, region, query: queryData }) });
    flash(c.savedSearch);
  };

  return (
    <div className="catalog-page">
      <div className="shell page-heading">
        <span className="section-label">NaShary market</span>
        <h1>{title}</h1>
        <p>{loading ? '…' : `${products.length} ${t('results')}`}</p>
        <div className="region-chip">
          <span>{region.toUpperCase()}</span>
          {c.only} {regions[region].label[language]}
        </div>
      </div>

      <div className="shell catalog-promo-strip"><span>{region.toUpperCase()}</span><p>{c.promo}</p><button type="button" onClick={() => navigate('/games')}>{c.play}</button></div>

      {brands.length > 0 && (
        <section className="shell brand-rail">
          <header>
            <div>
              <b>{c.popular}</b>
              <span>{c.popularNote}</span>
            </div>
          </header>
          <div className="brand-rail__track">
            {brands.map((brand) => (
              <button
                className={params.get('brand') === brand ? 'is-active' : ''}
                type="button"
                key={brand}
                onClick={() => set('brand', params.get('brand') === brand ? '' : brand)}
              >
                <span>{brand.slice(0, 2).toUpperCase()}</span>
                <b>{brand}</b>
                <small>{brandCounts[brand]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {models.length > 0 && (
        <section className="shell model-rail"><b>{c.models}</b><div>{models.map((model) => { const sample = sourceProducts.find((item) => item.model === model); return <button type="button" key={model} onClick={() => navigate(`/model/${encodeURIComponent(sample?.brand || '')}/${encodeURIComponent(model)}`)}>{model}<small>{modelCounts[model]}</small></button>; })}</div></section>
      )}

      <div className="shell catalog-react-layout">
        {filtersOpen && (
          <button
            className="filter-backdrop"
            type="button"
            aria-label={c.close}
            onClick={() => setFiltersOpen(false)}
          />
        )}
        <aside className={`filter-card${filtersOpen ? ' is-open' : ''}`}>
          <div className="filter-title">
            <b>{t('filters')}</b>
            <span>
              <button type="button" onClick={reset}>
                {c.reset}
              </button>
              <button
                className="filter-close"
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label={c.close}
              >
                ×
              </button>
            </span>
          </div>

          <FilterSection title={t('category')}>
            <label className="filter-select-label">
              <select value={category} onChange={(event) => set('category', event.target.value)}>
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label[language] || label.pl}
                  </option>
                ))}
              </select>
            </label>
          </FilterSection>

          <FilterSection title={t('condition')}>
            <div className="filter-option-list filter-option-list--two">
              {['new', 'used'].map((value) => (
                <button
                  className={condition === value ? 'is-active' : ''}
                  type="button"
                  key={value}
                  onClick={() => set('condition', condition === value ? '' : value)}
                >
                  <span>{t(value)}</span>
                  <small>{conditionCounts[value] || 0}</small>
                </button>
              ))}
            </div>
          </FilterSection>

          {category === 'Smartfony' && <FilterSection title={c.grade}>
            <div className="filter-option-list">
              {[
                ['N', { pl: 'A+ · jak nowy', uk: 'A+ · як новий', en: 'A+ · like new' }],
                ['A', { pl: 'A · doskonały', uk: 'A · відмінний', en: 'A · excellent' }],
                ['B', { pl: 'B · dobry', uk: 'B · добрий', en: 'B · good' }],
                ['C', { pl: 'C · zadowalający', uk: 'C · задовільний', en: 'C · fair' }],
                ['D', { pl: 'D · z wadą', uk: 'D · з дефектом', en: 'D · defective' }],
              ].map(([value, label]) => <button className={params.get('grade') === value ? 'is-active' : ''} type="button" key={value} onClick={() => set('grade', params.get('grade') === value ? '' : value)}><span>{label[language] || label.pl}</span><small>{gradeCounts[value] || 0}</small></button>)}
            </div>
          </FilterSection>}

          <FilterSection title={c.brand}>
            <div className="filter-option-list">
              {brands.map((brand) => (
                <button
                  className={params.get('brand') === brand ? 'is-active' : ''}
                  type="button"
                  key={brand}
                  onClick={() => set('brand', params.get('brand') === brand ? '' : brand)}
                >
                  <span>{brand}</span>
                  <small>{brandCounts[brand]}</small>
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={c.city} open={false}>
            <select value={params.get('location') || ''} onChange={(event) => set('location', event.target.value)}><option value="">{c.anyCity}</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
          </FilterSection>

          <FilterSection title={c.seller} open={false}>
            <div className="filter-option-list filter-option-list--two">{[['private', c.private], ['store', c.store]].map(([value, label]) => <button className={params.get('sellerType') === value ? 'is-active' : ''} type="button" key={value} onClick={() => set('sellerType', params.get('sellerType') === value ? '' : value)}><span>{label}</span></button>)}</div>
          </FilterSection>

          <FilterSection title={c.delivery} open={false}>
            <div className="filter-option-list filter-option-list--two">{[['shipping', c.shipping], ['pickup', c.pickup]].map(([value, label]) => <button className={params.get('delivery') === value ? 'is-active' : ''} type="button" key={value} onClick={() => set('delivery', params.get('delivery') === value ? '' : value)}><span>{label}</span></button>)}</div>
          </FilterSection>

          <FilterSection title={c.trust} open={false}>
            <div className="filter-check-stack">{[['verified', c.verified], ['negotiable', c.negotiable], ['warranty', c.warranty], ['urgent', c.urgent]].map(([key, label]) => <label className="check-filter" key={key}><input type="checkbox" checked={Boolean(params.get(key))} onChange={(event) => set(key, event.target.checked ? (key === 'warranty' ? 'seller' : 'true') : '')}/><span>{label}</span></label>)}</div>
          </FilterSection>

          <FilterSection title={c.price}>
            <div className="price-filter">
              <input
                type="number"
                min="0"
                placeholder={c.from}
                value={params.get('minPrice') || ''}
                onChange={(event) => set('minPrice', event.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min="0"
                placeholder={c.to}
                value={params.get('maxPrice') || ''}
                onChange={(event) => set('maxPrice', event.target.value)}
              />
            </div>
            <label className="check-filter">
              <input
                type="checkbox"
                checked={params.get('inStock') === 'true'}
                onChange={(event) => set('inStock', event.target.checked ? 'true' : '')}
              />
              <span>{c.available}</span>
            </label>
          </FilterSection>

          {specKeys.length > 0 && specKeys.map((key, index) => {
                  const values = unique(key);
                  const counts = countsFor(sourceProducts, (product) => product.specs?.[key]);
                  if (!values.length) return null;
                  return (
                    <FilterSection key={key} title={labels[key][language] || labels[key].pl} open={index < 4}>
                      <label className="filter-select-label">
                      <select
                        value={params.get(key) || ''}
                        onChange={(event) => set(key, event.target.value)}
                      >
                        <option value="">{c.any}</option>
                        {values.map((value) => (
                          <option key={value} value={value}>
                            {value} ({counts[value]})
                          </option>
                        ))}
                      </select>
                      </label>
                    </FilterSection>
                  );
                })}

          <div className="filter-note">
            <b>{c.safe}</b>
            <p>{c.note}</p>
          </div>
        </aside>

        <section className="catalog-results">
          {active.length > 0 && (
            <div className="active-filters">
              <span>{c.active}</span>
              {active.map(([key, value]) => (
                <button type="button" key={key} onClick={() => set(key, '')}>
                  {activeName(key)}: {value} ×
                </button>
              ))}
              <button type="button" onClick={reset}>
                {c.reset}
              </button>
            </div>
          )}
          <div className="catalog-toolbar">
            <button className="save-search-button" type="button" onClick={saveSearch}>♡ {c.saveSearch}</button>
            <button
              className="filter-mobile-button"
              type="button"
              onClick={() => setFiltersOpen(true)}
            >
              {c.showFilters}
              <span>{active.length}</span>
            </button>
            <label>
              <span>{t('sort')}</span>
              <select value={sort} onChange={(event) => set('sort', event.target.value)}>
                <option value="newest">{t('newest')}</option>
                <option value="oldest">{c.oldest}</option>
                <option value="price_asc">{t('low')}</option>
                <option value="price_desc">{t('high')}</option>
                <option value="rating_desc">{c.rating}</option>
                <option value="stock_desc">{c.stock}</option>
                <option value="title_asc">{c.alphabetic}</option>
              </select>
            </label>
            <div className="view-switch" aria-label={c.view}>
              {[
                ['grid', '▦', c.grid],
                ['compact', '▦', c.compact],
                ['list', '☰', c.list],
              ].map(([value, icon, title]) => (
                <button
                  className={view === value ? 'is-active' : ''}
                  type="button"
                  title={title}
                  aria-label={title}
                  key={value}
                  onClick={() => setView(value)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="loading-grid">
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          ) : products.length ? (
            <div className={`product-grid-react product-grid-react--${view}`} key={signature}>
              {products.slice(0, visible).map((product) => (
                <ProductCard key={product.id} product={product} view={view} onQuickView={setQuickView} />
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <b>{t('empty')}</b>
              <button className="quiet-button" type="button" onClick={reset}>
                {c.reset}
              </button>
            </div>
          )}
          {products.length > visible && <button className="load-more-button" type="button" onClick={() => setVisible((value) => value + 12)}>{c.more}<span>{products.length - visible}</span></button>}
        </section>
      </div>

      {comparison.length > 0 && (
        <div className="compare-dock">
          <span>
            <b>{comparison.length}</b> {c.selected}
          </span>
          <button type="button" onClick={() => setCompareOpen(true)}>
            {c.compare}
          </button>
        </div>
      )}
      {compareOpen && <ComparePanel onClose={() => setCompareOpen(false)} />}
      {quickView && <QuickView product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
