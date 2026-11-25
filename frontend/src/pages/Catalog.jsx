import { CATALOG_PAGE_SIZE, catalogPage, mergeCatalogItems } from '../catalogPaging.mjs';
import { specLabels as labels } from '../specLabels.mjs';
import { safeStorage, safeSessionStorage } from '../browserStorage.mjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, catalogPreview } from '../api';
import ComparePanel from '../components/ComparePanel';
import ProductCard from '../components/ProductCard';
import QuickView from '../components/QuickView';
import ManufacturerLogo from '../components/ManufacturerLogo';
import { useStore } from '../store';
import { categoryLabel } from '../catalogTaxonomy';
import { sectionCopy, sectionPath, sectionQuery, legacySectionRedirect } from '../catalogSections.mjs';

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



const categorySpecs = {
  Smartfony: ['screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures', 'processor', 'ram', 'ramType', 'storage', 'battery', 'charging', 'mainCamera', 'frontCamera', 'cameraFeatures', 'features', 'sim', 'os', 'connectivity', 'wifi', 'bluetooth', 'color', 'weight'],
  Laptopy: ['screen', 'displayType', 'resolution', 'refreshRate', 'processor', 'ram', 'ramType', 'storage', 'gpu', 'battery', 'os', 'connectivity', 'wifi', 'bluetooth', 'color', 'weight'],
  Tablety: ['screen', 'displayType', 'resolution', 'refreshRate', 'processor', 'ram', 'storage', 'battery', 'charging', 'os', 'connectivity', 'wifi', 'bluetooth', 'color', 'weight'],
  Gaming: ['platform', 'processor', 'ram', 'storage', 'gpu', 'resolution', 'refreshRate', 'connectivity', 'wifi', 'color'],
  Audio: ['audioType', 'connectivity', 'bluetooth', 'battery', 'charging', 'features', 'color', 'weight'],
  Monitory: ['screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures', 'connectivity', 'features', 'color'],
  Foto: ['resolution', 'displayType', 'connectivity', 'wifi', 'bluetooth', 'features', 'color', 'weight'],
  Akcesoria: ['accessoryType', 'connectivity', 'bluetooth', 'features', 'color', 'weight'],
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
    favorites: 'Ulubione', favoriteEmpty: 'Nie masz jeszcze ulubionych ofert w tym regionie.', allOffers: 'Wszystkie oferty', discovery: 'Szybki wybór',
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
    favorites: 'Обране', favoriteEmpty: 'У цьому регіоні ще немає обраних оголошень.', allOffers: 'Усі оголошення', discovery: 'Швидкий вибір',
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
    favorites: 'Favourites', favoriteEmpty: 'You have no favourite listings in this region yet.', allOffers: 'All listings', discovery: 'Quick choice',
  },
};

function countsFor(items, selector) {
  return items.reduce((counts, item) => {
    const value = selector(item);
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function readCatalogCache(key, metadata = false) {
  try {
    const cached = JSON.parse(safeSessionStorage.getItem(key + ':accounts-v3'));
    if (!cached || !Array.isArray(cached.items) || Date.now() - cached.savedAt > 30_000) return null;
    return metadata ? cached : cached.items;
  } catch {
    return null;
  }
}

function writeCatalogCache(key, items, total = items.length) {
  try {
    const snapshot = JSON.stringify({ savedAt: Date.now(), items, total });
    if (snapshot.length < 200000) safeSessionStorage.setItem(key + ':accounts-v3', snapshot);
  } catch {
    // A full or disabled storage must never block the live catalogue.
  }
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

function FilterValues({ values, counts, selected, onSelect, more }) {
  const [expanded, setExpanded] = useState(false);
  const selectedValue = values.find((value) => String(value) === String(selected));
  const visible = expanded ? values : values.slice(0, 6);
  const options = selectedValue && !visible.includes(selectedValue)
    ? [selectedValue, ...visible.slice(0, 5)]
    : visible;
  return (
    <div className="filter-values">
      <div className="filter-option-list">
        {options.map((value) => (
          <button
            className={String(selected) === String(value) ? 'is-active' : ''}
            type="button"
            key={value}
            onClick={() => onSelect(String(selected) === String(value) ? '' : value)}
          >
            <span title={value}>{value}</span>
            <small>{counts[value] || 0}</small>
          </button>
        ))}
      </div>
      {values.length > 6 && (
        <button className="filter-values__more" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '−' : `${more} +${values.length - 6}`}
        </button>
      )}
    </div>
  );
}

export default function Catalog({ favoritesOnly = false, section = 'new' }) {
  const [params] = useSearchParams();
  const redirect = !favoritesOnly && section === 'new' && legacySectionRedirect(params.toString());
  if (redirect) return <Navigate to={redirect} replace />;
  return <CatalogContent key={`${section}-${favoritesOnly}`} favoritesOnly={favoritesOnly} section={favoritesOnly ? null : section} />;
}

function CatalogContent({ favoritesOnly, section }) {
  const { t, region, regions, language, comparison, favorites, user, flash } = useStore();
  const navigate = useNavigate();
  const c = copy[language] || copy.pl;
  const sc = sectionCopy[language] || sectionCopy.pl;
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [sourceProducts, setSourceProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('live');
  const [attempt, setAttempt] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [visible, setVisible] = useState(12);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState('');
  const requestVersion = useRef(0);
  const moreGate = useRef(false);
  const favoriteSignature = favoritesOnly ? [...new Set(favorites)].join(',') : '';
  const [view, setViewState] = useState(
    () => safeStorage.getItem('nashary-catalog-view') || 'grid'
  );
  const signature = params.toString();
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const condition = section || params.get('condition') || '';
  const sort = params.get('sort') || 'newest';
  const specKeys = categorySpecs[category] || [];

  useEffect(() => {
    const version = ++requestVersion.current;
    moreGate.current = false;
    const search = sectionQuery(favoritesOnly ? '' : signature, section, region);
    if (!favoritesOnly && sort === 'price-asc') search.set('sort', 'price_asc');
    else if (!favoritesOnly && sort === 'price-desc') search.set('sort', 'price_desc');
    search.set('view', 'cards'); search.set('limit', String(CATALOG_PAGE_SIZE)); search.delete('offset');
    if (favoritesOnly) search.set('ids', favoriteSignature);
    const path = `/products?${search}`;
    const cacheKey = `nashary:catalog:${path}`;
    const cached = readCatalogCache(cacheKey, true);
    let cancelled = false;
    let liveFinished = false;
    let previewLoaded = false;
    const apply = (payload, origin) => {
      if (cancelled || version !== requestVersion.current) return;
      const page = catalogPage(payload);
      setProducts(page.items); setTotal(page.total); setNextOffset(page.offset + page.items.length); setSource(origin);
    };
    const previewTimer = cached ? null : window.setTimeout(() => {
      catalogPreview(path).then((items) => {
        if (cancelled || liveFinished) return;
        previewLoaded = true; apply(items, 'preview'); setLoading(false);
      }).catch(() => {});
    }, 900);
    queueMicrotask(() => {
      if (cancelled) return;
      setVisible(CATALOG_PAGE_SIZE); setMoreBusy(false); setMoreError('');
      if (cached) { apply({ ...cached, total: Number.isInteger(cached.total) ? cached.total : cached.items.length, offset: 0 }, 'cached'); setLoading(false); }
      else { setLoading(true); setSource('live'); }
    });
    const fetchItems = async () => {
      if (!favoritesOnly) return api(path);
      const ids = favoriteSignature ? favoriteSignature.split(',') : [];
      const requests = [];
      for (let index = 0; index < ids.length; index += 48) {
        const batch = new URLSearchParams({ region, ids: ids.slice(index, index + 48).join(','), view: 'cards', limit: '48' });
        requests.push(api(`/products?${batch}`).then((data) => catalogPage(data).items));
      }
      const results = await Promise.all(requests);
      return results.reduce((all, items) => mergeCatalogItems(all, items), []);
    };
    fetchItems().then((payload) => {
      if (cancelled) return;
      liveFinished = true;
      const page = catalogPage(payload); apply(page, 'live'); writeCatalogCache(cacheKey, page.items, page.total);
    }).catch(() => {
      if (!cancelled) { if (!cached && !previewLoaded) { setProducts([]); setTotal(0); setSource('error'); } else setSource('preview'); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; if (previewTimer) window.clearTimeout(previewTimer); };
  }, [favoritesOnly, favoriteSignature, region, signature, sort, section, attempt]);

  const loadMore = async () => {
    if (moreGate.current) return;
    const version = requestVersion.current;
    moreGate.current = true; setMoreBusy(true); setMoreError('');
    const search = sectionQuery(signature, section, region);
    if (sort === 'price-asc') search.set('sort', 'price_asc');
    else if (sort === 'price-desc') search.set('sort', 'price_desc');
    search.set('view', 'cards'); search.set('limit', String(CATALOG_PAGE_SIZE)); search.set('offset', String(nextOffset));
    try {
      const page = catalogPage(await api(`/products?${search}`));
      if (version !== requestVersion.current) return;
      setProducts((current) => mergeCatalogItems(current, page.items)); setTotal(page.total);
      setNextOffset(page.items.length ? page.offset + page.items.length : page.total);
    } catch { if (version === requestVersion.current) setMoreError(sc.error); }
    finally { if (version === requestVersion.current) { moreGate.current = false; setMoreBusy(false); } }
  };

  useEffect(() => {
    if (favoritesOnly) {
      queueMicrotask(() => setSourceProducts([]));
      return undefined;
    }
    const search = sectionQuery(signature, section, region);
    ['sort', 'brand', 'model', 'grade', ...Object.keys(labels)].forEach((key) => search.delete(key));
    search.set('view', 'facets'); search.delete('limit'); search.delete('offset');
    const path = `/products?${search}`;
    const cacheKey = `nashary:catalog-source:${path}`;
    const cached = readCatalogCache(cacheKey);
    let cancelled = false;
    let liveFinished = false;
    let previewLoaded = false;
    const previewTimer = cached ? null : window.setTimeout(() => {
      catalogPreview(path)
        .then((items) => {
          if (!cancelled && !liveFinished) {
            previewLoaded = true;
            setSourceProducts(items);
          }
        })
        .catch(() => {});
    }, 900);
    if (cached) queueMicrotask(() => { if (!cancelled) setSourceProducts(cached); });
    api(path)
      .then((items) => {
        if (cancelled) return;
        liveFinished = true;
        setSourceProducts(items);
        writeCatalogCache(cacheKey, items);
      })
      .catch(() => { if (!cancelled && !cached && !previewLoaded) setSourceProducts([]); });
    return () => {
      cancelled = true;
      if (previewTimer) window.clearTimeout(previewTimer);
    };
  }, [favoritesOnly, signature, region, section, attempt]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === 'category') [...Object.keys(labels), 'brand', 'model', 'grade'].forEach((name) => next.delete(name));
    if (key === 'brand') next.delete('model');
    setVisible(12);
    setParams(next);
  };
  const setView = (value) => {
    safeStorage.setItem('nashary-catalog-view', value);
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
  const active = [...params.entries()].filter(([key]) => !['q', 'sort', 'condition'].includes(key));
  const title = useMemo(
    () => (favoritesOnly ? c.favorites : query ? `“${query}”` : categoryLabel(category, language) || sc[section]),
    [favoritesOnly, c.favorites, query, category, language, sc, section]
  );
  const visibleProducts = useMemo(
    () => (favoritesOnly ? products.filter((product) => favorites.includes(product.id)) : products),
    [favoritesOnly, favorites, products]
  );
  const effectiveView = favoritesOnly ? 'grid' : view;
  const paginated = !favoritesOnly && ['live', 'cached'].includes(source);
  const resultCount = paginated ? total : visibleProducts.length;
  const remaining = paginated ? Math.max(0, total - nextOffset) : Math.max(0, visibleProducts.length - visible);
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
    if (!user) return navigate('/auth', { state: { from: `${sectionPath(section)}?${signature}` } });
    const queryData = Object.fromEntries([...sectionQuery(signature, section, region).entries()].filter(([key]) => key !== 'sort'));
    try {
      await api('/marketplace/searches', { method: 'POST', body: JSON.stringify({ name: title, region, query: queryData }) });
      flash(c.savedSearch);
    } catch (error) { flash(error.message); }
  };

  return (
    <div className={`catalog-page${favoritesOnly ? ' catalog-page--favorites' : ''}`}>
      <div className="shell page-heading catalog-heading">
        <span className="section-label">NaShary · {favoritesOnly ? c.favorites : sc[section]}</span>
        <h1>{title}</h1>
        {!favoritesOnly && <p className="catalog-section-lead">{section === 'used' ? sc.usedLead : sc.newLead}</p>}
        <p>{loading ? '…' : `${resultCount} ${t('results')}`}</p>
        <div className="region-chip">
          <span>{region.toUpperCase()}</span>
          {c.only} {regions[region].label[language]}
        </div>
      </div>

      {!favoritesOnly && <nav className="shell catalog-section-switch" aria-label={t('catalog')}><Link className={section === 'new' ? 'is-active' : ''} aria-current={section === 'new' ? 'page' : undefined} to="/catalog">{sc.new}</Link><Link className={section === 'used' ? 'is-active' : ''} aria-current={section === 'used' ? 'page' : undefined} to="/marketplace">{sc.used}</Link></nav>}
      {source !== 'live' && <div className="shell catalog-source-note" role="status"><p>{source === 'error' ? sc.error : sc.preview}</p><button className="quiet-button" type="button" onClick={() => setAttempt((n) => n + 1)}>{sc.retry}</button></div>}

      {!favoritesOnly && <div className="shell catalog-promo-strip"><span>{region.toUpperCase()}</span><p>{c.promo}</p><button type="button" onClick={() => navigate('/games')}>{c.play}</button></div>}

      {!favoritesOnly && (brands.length > 0 || models.length > 0) && (
        <section className="shell catalog-discovery">
          {brands.length > 0 && (
            <div className="brand-rail">
              <header>
                <div>
                  <b>{c.popular}</b>
                  <span>{c.popularNote}</span>
                </div>
              </header>
              <div className="brand-rail__track">
                {brands.slice(0, 4).map((brand) => (
                  <button
                    className={params.get('brand') === brand ? 'is-active' : ''}
                    type="button"
                    key={brand}
                    aria-label={`${brand} (${brandCounts[brand]})`}
                    aria-pressed={params.get('brand') === brand}
                    onClick={() => set('brand', params.get('brand') === brand ? '' : brand)}
                  >
                    <ManufacturerLogo brand={brand} />
                    <small>{brandCounts[brand]}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {models.length > 0 && (
            <div className="model-rail">
              <b>{c.models}</b>
              <div>{models.slice(0, 4).map((model) => { const sample = sourceProducts.find((item) => item.model === model); return <button type="button" title={model} key={model} onClick={() => navigate(`/model/${encodeURIComponent(sample?.brand || '')}/${encodeURIComponent(model)}`)}><span>{model}</span><small>{modelCounts[model]}</small></button>; })}</div>
            </div>
          )}
        </section>
      )}

      <div className={`shell catalog-react-layout${favoritesOnly ? ' catalog-react-layout--favorites' : ''}`}>
        {!favoritesOnly && filtersOpen && (
          <button
            className="filter-backdrop"
            type="button"
            aria-label={c.close}
            onClick={() => setFiltersOpen(false)}
          />
        )}
        {!favoritesOnly && <aside className={`filter-card${filtersOpen ? ' is-open' : ''}`}>
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

          <div className="catalog-condition-note"><b>{sc[section]}</b><span>{conditionCounts[condition] || 0} {t('results')}</span></div>

          {condition === 'used' && category === 'Smartfony' && <FilterSection title={c.grade}>
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
                    <FilterSection key={key} title={labels[key][language] || labels[key].pl} open={index < 5}>
                      <FilterValues
                        values={values}
                        counts={counts}
                        selected={params.get(key) || ''}
                        onSelect={(value) => set(key, value)}
                        more={c.more}
                      />
                    </FilterSection>
                  );
                })}

          <div className="filter-note">
            <b>{c.safe}</b>
            <p>{c.note}</p>
          </div>
        </aside>}

        <section className="catalog-results">
          {!favoritesOnly && active.length > 0 && (
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
          {!favoritesOnly && <div className="catalog-toolbar">
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
          </div>}
          {loading ? (
            <div className="loading-grid">
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          ) : visibleProducts.length ? (
            <div className={`product-grid-react product-grid-react--${effectiveView}`} key={signature}>
              {(paginated ? visibleProducts : visibleProducts.slice(0, visible)).map((product) => (
                <ProductCard key={product.id} product={product} view={effectiveView} onQuickView={setQuickView} />
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <b>{favoritesOnly ? c.favoriteEmpty : t('empty')}</b>
              <button className="quiet-button" type="button" onClick={() => favoritesOnly ? navigate('/catalog') : reset()}>
                {favoritesOnly ? c.allOffers : c.reset}
              </button>
            </div>
          )}
          {moreError && <p className="sales-error" role="alert">{moreError}</p>}
          {!loading && remaining > 0 && <button className="load-more-button" type="button" disabled={moreBusy} aria-busy={moreBusy} onClick={() => paginated ? loadMore() : setVisible((value) => value + CATALOG_PAGE_SIZE)}>{moreBusy ? '…' : c.more}<span>{remaining}</span></button>}
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
