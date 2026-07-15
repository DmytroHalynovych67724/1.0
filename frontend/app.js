(() => {
  'use strict';

  const TM = window.NaShary;
  const catalog = document.getElementById('catalog');
  const emptyState = document.getElementById('emptyState');
  const resultCount = document.getElementById('resultCount');
  const activeFilters = document.getElementById('activeFilters');
  const loadMoreButton = document.getElementById('loadMore');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sortProducts');
  const locationFilter = document.getElementById('locationFilter');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const inStockOnly = document.getElementById('inStockOnly');
  const filtersPanel = document.getElementById('filtersPanel');
  const pageOverlay = document.getElementById('pageOverlay');
  const favoritesDrawer = document.getElementById('favoritesDrawer');
  const cartDrawer = document.getElementById('cartDrawer');
  const favoritesContent = document.getElementById('favoritesContent');
  const cartContent = document.getElementById('cartContent');
  const cartFooter = document.getElementById('cartFooter');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutModal = document.getElementById('checkoutModal');
  const promoCode = { pl: 'STARTPL10', ua: 'STARTUA10', eu: 'STARTEU10' }[TM.currentRegion] || 'STARTPL10';

  const state = {
    products: [],
    query: '',
    category: '',
    conditions: new Set(),
    min: null,
    max: null,
    location: '',
    inStock: false,
    sort: 'newest',
    visible: 8
  };

  let activeLayer = null;
  let lastFocused = null;

  function makeButton(label, className, handler, ariaLabel = '') {
    return TM.el('button', {
      type: 'button',
      className,
      text: label,
      attributes: ariaLabel ? { 'aria-label': ariaLabel } : {},
      onclick: handler
    });
  }

  function productCard(product) {
    const isFavorite = TM.getFavorites().includes(product.id);
    const soldOut = product.stock <= 0;
    const imageLink = TM.el('a', {
      className: 'product-card__image-link',
      href: TM.productLink(product.id),
      attributes: { 'aria-label': `Переглянути ${product.title}` }
    }, TM.createProductImage(product, 'product-card__image'));

    const media = TM.el('div', { className: 'product-card__media' }, [imageLink]);
    const badges = TM.el('div', { className: 'product-card__badges' }, [
      TM.el('span', {
        className: `badge ${product.condition === 'used' ? 'badge--used' : 'badge--new'}`,
        text: TM.conditionLabel(product.condition)
      })
    ]);
    if (product.oldPrice) badges.append(TM.el('span', { className: 'badge badge--sale', text: 'Вигідно' }));
    media.append(badges);

    const favoriteButton = makeButton(
      isFavorite ? '♥' : '♡',
      `favorite-button${isFavorite ? ' is-active' : ''}`,
      () => {
        const added = TM.toggleFavorite(product.id);
        favoriteButton.textContent = added ? '♥' : '♡';
        favoriteButton.classList.toggle('is-active', added);
        favoriteButton.setAttribute('aria-pressed', String(added));
        favoriteButton.setAttribute('aria-label', added ? 'Видалити з обраного' : 'Додати в обране');
        TM.showToast(added ? 'Додано до обраного' : 'Видалено з обраного');
        if (favoritesDrawer.classList.contains('is-open')) renderFavorites();
      },
      isFavorite ? 'Видалити з обраного' : 'Додати в обране'
    );
    favoriteButton.setAttribute('aria-pressed', String(isFavorite));
    media.append(favoriteButton);

    const title = TM.el('h3', { className: 'product-card__title' }, [
      TM.el('a', { href: TM.productLink(product.id), text: product.title })
    ]);
    const meta = TM.el('div', { className: 'product-card__meta' }, [
      TM.el('span', { text: `⌖ ${product.location}` }),
      TM.el('span', { text: product.brand })
    ]);
    const price = TM.el('div', { className: 'product-card__price' }, [
      TM.el('strong', { text: TM.formatPrice(product.price, product.currency) })
    ]);
    if (product.oldPrice) price.append(TM.el('del', { text: TM.formatPrice(product.oldPrice, product.currency) }));

    const cartButton = makeButton(
      soldOut ? 'Немає в наявності' : 'До кошика',
      'button button--card',
      () => {
        if (soldOut) return;
        const current = TM.getCart().find((item) => item.id === product.id)?.qty || 0;
        if (current >= product.stock) {
          TM.showToast('У кошику вже максимальна доступна кількість', 'error');
          return;
        }
        TM.addToCart(product.id);
        TM.showToast('Товар додано до кошика');
        renderCart();
      }
    );
    cartButton.disabled = soldOut;
    cartButton.setAttribute('aria-label', soldOut ? `${product.title}: немає в наявності` : `Додати ${product.title} до кошика`);

    const body = TM.el('div', { className: 'product-card__body' }, [
      TM.el('div', { className: 'product-card__category', text: product.category }),
      title,
      meta,
      TM.el('div', { className: 'product-card__bottom' }, [price, cartButton])
    ]);
    return TM.el('article', { className: 'product-card' }, [media, body]);
  }

  function getFilteredProducts() {
    const query = state.query.trim().toLocaleLowerCase('uk');
    const filtered = state.products.filter((product) => {
      const haystack = `${product.title} ${product.description} ${product.brand} ${product.location} ${product.seller}`.toLocaleLowerCase('uk');
      return (
        (!query || haystack.includes(query)) &&
        (!state.category || product.category === state.category) &&
        (!state.conditions.size || state.conditions.has(product.condition)) &&
        (state.min == null || product.price >= state.min) &&
        (state.max == null || product.price <= state.max) &&
        (!state.location || product.location === state.location) &&
        (!state.inStock || product.stock > 0)
      );
    });

    return filtered.sort((a, b) => {
      if (state.sort === 'price-asc') return a.price - b.price;
      if (state.sort === 'price-desc') return b.price - a.price;
      if (state.sort === 'title') return a.title.localeCompare(b.title, 'uk');
      return b.createdAt - a.createdAt;
    });
  }

  function renderCatalog() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, state.visible);
    TM.clearNode(catalog);
    visible.forEach((product) => catalog.append(productCard(product)));
    catalog.setAttribute('aria-busy', 'false');
    resultCount.textContent = `${filtered.length} ${pluralizeProducts(filtered.length)}`;
    emptyState.hidden = filtered.length !== 0;
    catalog.hidden = filtered.length === 0;
    loadMoreButton.hidden = state.visible >= filtered.length;
    renderActiveFilters();
  }

  function pluralizeProducts(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'товар';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'товари';
    return 'товарів';
  }

  function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const options = document.getElementById('categoryOptions');
    TM.clearNode(grid);
    TM.clearNode(options);

    TM.CATEGORIES.forEach((category) => {
      const count = state.products.filter((product) => product.category === category.value).length;
      const card = makeButton('', 'category-card', () => selectCategory(category.value));
      card.append(
        TM.el('span', { className: 'category-card__icon', text: category.icon }),
        TM.el('span', { className: 'category-card__label', text: category.label }),
        TM.el('small', { text: `${count || '—'} пропозицій` }),
        TM.el('span', { className: 'category-card__arrow', text: '→' })
      );
      grid.append(card);

      const radio = TM.el('input', { type: 'radio', name: 'category', value: category.value });
      radio.checked = state.category === category.value;
      radio.addEventListener('change', () => selectCategory(category.value, false));
      options.append(TM.el('label', { className: 'radio-row' }, [
        radio,
        TM.el('span', { text: category.label }),
        TM.el('small', { text: count })
      ]));
    });
  }

  function populateLocations() {
    const locations = [...new Set(state.products.map((product) => product.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'));
    const selected = state.location;
    while (locationFilter.options.length > 1) locationFilter.remove(1);
    locations.forEach((location) => locationFilter.add(new Option(location, location)));
    locationFilter.value = selected;
  }

  function updateConditionCounts() {
    document.getElementById('newCount').textContent = String(state.products.filter((product) => product.condition === 'new').length);
    document.getElementById('usedCount').textContent = String(state.products.filter((product) => product.condition === 'used').length);
  }

  function selectCategory(category, scroll = true) {
    state.category = category;
    state.visible = 8;
    document.querySelectorAll('input[name="category"]').forEach((input) => {
      input.checked = input.value === category;
    });
    renderCatalog();
    if (scroll) document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileMenu();
  }

  function renderActiveFilters() {
    TM.clearNode(activeFilters);
    const filters = [];
    if (state.query) filters.push({ label: `Пошук: ${state.query}`, clear: () => setQuery('') });
    if (state.category) filters.push({ label: state.category, clear: () => selectCategory('', false) });
    state.conditions.forEach((condition) => filters.push({
      label: TM.conditionLabel(condition),
      clear: () => {
        state.conditions.delete(condition);
        const checkbox = document.querySelector(`input[name="condition"][value="${condition}"]`);
        if (checkbox) checkbox.checked = false;
        renderCatalog();
      }
    }));
    if (state.min != null) filters.push({ label: `від ${TM.formatPrice(state.min)}`, clear: () => { state.min = null; priceMin.value = ''; renderCatalog(); } });
    if (state.max != null) filters.push({ label: `до ${TM.formatPrice(state.max)}`, clear: () => { state.max = null; priceMax.value = ''; renderCatalog(); } });
    if (state.location) filters.push({ label: state.location, clear: () => { state.location = ''; locationFilter.value = ''; renderCatalog(); } });
    if (state.inStock) filters.push({ label: 'В наявності', clear: () => { state.inStock = false; inStockOnly.checked = false; renderCatalog(); } });

    filters.forEach((filter) => {
      activeFilters.append(makeButton(`${filter.label}  ×`, 'filter-chip', filter.clear, `Видалити фільтр ${filter.label}`));
    });
  }

  function setQuery(value) {
    state.query = String(value || '').trim();
    searchInput.value = state.query;
    state.visible = 8;
    renderCatalog();
  }

  function resetFilters() {
    state.query = '';
    state.category = '';
    state.conditions.clear();
    state.min = null;
    state.max = null;
    state.location = '';
    state.inStock = false;
    state.visible = 8;
    searchInput.value = '';
    priceMin.value = '';
    priceMax.value = '';
    locationFilter.value = '';
    inStockOnly.checked = false;
    document.querySelectorAll('.filters-panel input[type="checkbox"], .filters-panel input[type="radio"]').forEach((input) => { input.checked = false; });
    renderCatalog();
  }

  function openLayer(layer) {
    closeLayers(false);
    lastFocused = document.activeElement;
    activeLayer = layer;
    layer.hidden = false;
    pageOverlay.hidden = false;
    requestAnimationFrame(() => {
      layer.classList.add('is-open');
      pageOverlay.classList.add('is-visible');
    });
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const focusable = layer.querySelector('button, a, input, select');
    if (focusable) focusable.focus();
  }

  function closeLayers(restoreFocus = true) {
    [favoritesDrawer, cartDrawer, filtersPanel].forEach((layer) => {
      layer.classList.remove('is-open');
      if (layer.hasAttribute('aria-hidden')) layer.setAttribute('aria-hidden', 'true');
    });
    pageOverlay.classList.remove('is-visible');
    document.body.classList.remove('no-scroll');
    window.setTimeout(() => {
      if (!pageOverlay.classList.contains('is-visible')) pageOverlay.hidden = true;
      if (!favoritesDrawer.classList.contains('is-open')) favoritesDrawer.hidden = true;
      if (!cartDrawer.classList.contains('is-open')) cartDrawer.hidden = true;
    }, 250);
    activeLayer = null;
    if (restoreFocus && lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  function emptyDrawer(icon, title, description, actionText) {
    return TM.el('div', { className: 'drawer-empty' }, [
      TM.el('span', { className: 'drawer-empty__icon', text: icon }),
      TM.el('h3', { text: title }),
      TM.el('p', { text: description }),
      makeButton(actionText, 'button button--secondary', () => {
        closeLayers();
        document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' });
      })
    ]);
  }

  function drawerProduct(product, extra = []) {
    const image = TM.createProductImage(product, 'drawer-product__image');
    return TM.el('div', { className: 'drawer-product' }, [
      TM.el('a', { href: TM.productLink(product.id), className: 'drawer-product__media' }, image),
      TM.el('div', { className: 'drawer-product__info' }, [
        TM.el('a', { href: TM.productLink(product.id), className: 'drawer-product__title', text: product.title }),
        TM.el('small', { text: `${TM.conditionLabel(product.condition)} · ${product.location}` }),
        TM.el('strong', { text: TM.formatPrice(product.price, product.currency) }),
        ...extra
      ])
    ]);
  }

  function renderFavorites() {
    TM.clearNode(favoritesContent);
    const favoriteIds = TM.getFavorites();
    const products = favoriteIds.map((id) => state.products.find((product) => product.id === id)).filter(Boolean);
    if (!products.length) {
      favoritesContent.append(emptyDrawer('♡', 'Тут поки порожньо', 'Натискайте на сердечко біля товарів, щоб не загубити цікаві пропозиції.', 'Перейти до каталогу'));
      return;
    }
    const list = TM.el('div', { className: 'drawer-list' });
    products.forEach((product) => {
      const remove = makeButton('Видалити', 'button-link button-link--danger', () => {
        TM.toggleFavorite(product.id);
        renderFavorites();
        renderCatalog();
      });
      const add = makeButton(product.stock ? 'До кошика' : 'Немає в наявності', 'button-link', () => {
        if (!product.stock) return;
        TM.addToCart(product.id);
        renderCart();
        TM.showToast('Товар додано до кошика');
      });
      add.disabled = !product.stock;
      list.append(drawerProduct(product, [TM.el('div', { className: 'drawer-product__actions' }, [add, remove])]));
    });
    favoritesContent.append(list);
  }

  function resolveCart() {
    return TM.getCart().map((entry) => ({
      entry,
      product: state.products.find((product) => product.id === entry.id)
    })).filter((item) => item.product);
  }

  function renderCart() {
    TM.clearNode(cartContent);
    const items = resolveCart();
    if (!items.length) {
      cartContent.append(emptyDrawer('▱', 'Кошик порожній', 'Додайте техніку, яка вам сподобалась, і поверніться до оформлення.', 'Обрати товари'));
      cartFooter.hidden = true;
      return;
    }

    const list = TM.el('div', { className: 'drawer-list' });
    items.forEach(({ entry, product }) => {
      const minus = makeButton('−', 'quantity-button', () => {
        TM.updateCartItem(product.id, entry.qty - 1);
        renderCart();
      }, `Зменшити кількість ${product.title}`);
      const plus = makeButton('+', 'quantity-button', () => {
        if (entry.qty >= product.stock) {
          TM.showToast('Це максимальна доступна кількість', 'error');
          return;
        }
        TM.updateCartItem(product.id, entry.qty + 1);
        renderCart();
      }, `Збільшити кількість ${product.title}`);
      plus.disabled = entry.qty >= product.stock;
      const quantity = TM.el('div', { className: 'quantity-control' }, [minus, TM.el('span', { text: entry.qty }), plus]);
      const remove = makeButton('Видалити', 'button-link button-link--danger', () => {
        TM.removeFromCart(product.id);
        renderCart();
      });
      list.append(drawerProduct(product, [TM.el('div', { className: 'drawer-product__actions' }, [quantity, remove])]));
    });
    cartContent.append(list);
    const total = items.reduce((sum, item) => sum + item.product.price * item.entry.qty, 0);
    const currency = items[0]?.product.currency;
    cartTotal.textContent = TM.formatPrice(total, currency);
    cartFooter.hidden = false;
  }

  function openFavorites() {
    renderFavorites();
    openLayer(favoritesDrawer);
  }

  function openCart() {
    renderCart();
    openLayer(cartDrawer);
  }

  function renderCheckout() {
    const items = resolveCart();
    const summary = document.getElementById('checkoutSummary');
    TM.clearNode(summary);
    items.forEach(({ entry, product }) => summary.append(TM.el('div', {}, [
      TM.el('span', { text: `${product.title} × ${entry.qty}` }),
      TM.el('strong', { text: TM.formatPrice(product.price * entry.qty, product.currency) })
    ])));
    const total = items.reduce((sum, item) => sum + item.product.price * item.entry.qty, 0);
    summary.append(TM.el('div', { className: 'checkout-summary__total' }, [
      TM.el('span', { text: 'Орієнтовно разом' }),
      TM.el('strong', { text: TM.formatPrice(total, items[0]?.product.currency) })
    ]));
    const loggedIn = Boolean(TM.getToken());
    document.getElementById('confirmOrder').hidden = !loggedIn;
    document.getElementById('checkoutLogin').hidden = loggedIn;
    document.getElementById('checkoutMessage').textContent = loggedIn ? '' : 'Для створення замовлення потрібно увійти або зареєструватися.';
  }

  function openCheckout() {
    if (!resolveCart().length) return;
    closeLayers(false);
    renderCheckout();
    document.getElementById('checkoutFormView').hidden = false;
    document.getElementById('orderSuccess').hidden = true;
    const storedUser = TM.getStoredUser();
    if (!document.getElementById('checkoutName').value && storedUser?.username) {
      document.getElementById('checkoutName').value = storedUser.username;
    }
    checkoutModal.hidden = false;
    pageOverlay.hidden = false;
    requestAnimationFrame(() => {
      checkoutModal.classList.add('is-open');
      pageOverlay.classList.add('is-visible');
    });
    document.body.classList.add('no-scroll');
  }

  function closeCheckout() {
    checkoutModal.classList.remove('is-open');
    pageOverlay.classList.remove('is-visible');
    document.body.classList.remove('no-scroll');
    window.setTimeout(() => {
      checkoutModal.hidden = true;
      pageOverlay.hidden = true;
    }, 250);
  }

  async function confirmOrder() {
    const button = document.getElementById('confirmOrder');
    const message = document.getElementById('checkoutMessage');
    const items = TM.getCart().map(({ id, qty }) => ({ id, qty }));
    if (!items.length) return;
    const detailsForm = document.getElementById('checkoutDetails');
    if (!detailsForm.reportValidity()) return;
    const payload = {
      items,
      customerName: document.getElementById('checkoutName').value.trim(),
      phone: document.getElementById('checkoutPhone').value.trim(),
      email: document.getElementById('checkoutEmail').value.trim(),
      deliveryMethod: document.getElementById('checkoutDelivery').value,
      promoCode: document.getElementById('checkoutPromo').value.trim(),
      comment: document.getElementById('checkoutComment').value.trim()
    };
    if (payload.deliveryMethod === 'shipping') {
      payload.address = document.getElementById('checkoutAddress').value.trim();
    }
    button.disabled = true;
    button.textContent = 'Створюємо замовлення…';
    message.textContent = '';
    try {
      const order = await TM.apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) });
      TM.clearCart();
      renderCart();
      document.getElementById('checkoutFormView').hidden = true;
      document.getElementById('orderSuccess').hidden = false;
      const language = window.NaSharyI18n?.language || 'pl';
      const number = order?.id ? ` #${order.id}` : '';
      const formattedTotal = order?.total != null ? TM.formatPrice(order.total, order.currency) : '';
      const formattedDiscount = order?.discount > 0 ? TM.formatPrice(order.discount, order.currency) : '';
      const successText = language === 'uk'
        ? `Ваше замовлення${number}${formattedTotal ? ` на суму ${formattedTotal}` : ''} успішно прийнято.${formattedDiscount ? ` Знижка: ${formattedDiscount}.` : ''}`
        : language === 'en'
          ? `Your order${number}${formattedTotal ? ` for ${formattedTotal}` : ''} was accepted.${formattedDiscount ? ` Discount: ${formattedDiscount}.` : ''}`
          : `Twoje zamówienie${number}${formattedTotal ? ` na kwotę ${formattedTotal}` : ''} zostało przyjęte.${formattedDiscount ? ` Rabat: ${formattedDiscount}.` : ''}`;
      document.getElementById('orderSuccessText').textContent = successText;
    } catch (error) {
      if (error.status === 401) {
        TM.clearSession();
        button.hidden = true;
        document.getElementById('checkoutLogin').hidden = false;
        message.textContent = 'Сесія завершилась. Увійдіть знову, щоб оформити замовлення.';
      } else if (error.status === 409 || error.status === 400) {
        message.textContent = error.message || 'Деяких товарів уже немає в наявності. Оновіть кошик.';
      } else {
        message.textContent = error.message || 'Не вдалося створити замовлення. Спробуйте ще раз.';
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Підтвердити замовлення';
    }
  }

  function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.remove('is-open');
    document.getElementById('mobileMenuButton').setAttribute('aria-expanded', 'false');
  }

  function bindEvents() {
    document.getElementById('headerSearch').addEventListener('submit', (event) => {
      event.preventDefault();
      setQuery(searchInput.value);
      document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' });
    });
    searchInput.addEventListener('input', () => {
      state.query = searchInput.value.trim();
      state.visible = 8;
      renderCatalog();
    });
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderCatalog(); });
    locationFilter.addEventListener('change', () => { state.location = locationFilter.value; state.visible = 8; renderCatalog(); });
    inStockOnly.addEventListener('change', () => { state.inStock = inStockOnly.checked; state.visible = 8; renderCatalog(); });
    document.querySelectorAll('input[name="condition"]').forEach((checkbox) => checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.conditions.add(checkbox.value);
      else state.conditions.delete(checkbox.value);
      state.visible = 8;
      renderCatalog();
    }));
    [priceMin, priceMax].forEach((input) => input.addEventListener('change', () => {
      state.min = priceMin.value === '' ? null : Math.max(0, Number(priceMin.value));
      state.max = priceMax.value === '' ? null : Math.max(0, Number(priceMax.value));
      state.visible = 8;
      renderCatalog();
    }));
    document.getElementById('applyFilters').addEventListener('click', () => { renderCatalog(); closeLayers(); });
    document.getElementById('clearFilters').addEventListener('click', resetFilters);
    document.getElementById('emptyReset').addEventListener('click', resetFilters);
    document.getElementById('showAllCategories').addEventListener('click', () => { resetFilters(); document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' }); });
    document.getElementById('catalogTrigger').addEventListener('click', () => document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' }));
    document.querySelectorAll('[data-category-link]').forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.categoryLink)));
    loadMoreButton.addEventListener('click', () => { state.visible += 8; renderCatalog(); });

    document.getElementById('openFavorites').addEventListener('click', openFavorites);
    document.querySelector('[data-footer-favorites]').addEventListener('click', openFavorites);
    document.getElementById('openCart').addEventListener('click', openCart);
    document.querySelector('[data-footer-cart]').addEventListener('click', openCart);
    document.querySelectorAll('.drawer-close').forEach((button) => button.addEventListener('click', () => closeLayers()));
    pageOverlay.addEventListener('click', () => {
      if (!checkoutModal.hidden) closeCheckout();
      else closeLayers();
    });
    document.getElementById('checkoutButton').addEventListener('click', openCheckout);
    document.getElementById('closeCheckout').addEventListener('click', closeCheckout);
    document.getElementById('continueShopping').addEventListener('click', closeCheckout);
    document.getElementById('confirmOrder').addEventListener('click', confirmOrder);
    document.getElementById('checkoutDelivery').addEventListener('change', (event) => {
      const address = document.getElementById('checkoutAddress');
      const pickup = event.target.value === 'pickup';
      address.required = !pickup;
      address.disabled = pickup;
      if (pickup) address.value = '';
    });
    document.getElementById('promoCopyButton').addEventListener('click', async () => {
      document.getElementById('checkoutPromo').value = promoCode;
      try { await navigator.clipboard.writeText(promoCode); } catch (_error) { /* field is still filled */ }
      TM.showToast(window.NaSharyI18n?.t('Промокод скопійовано') || 'Промокод скопійовано');
    });

    document.getElementById('openFilters').addEventListener('click', () => openLayer(filtersPanel));
    document.getElementById('closeFilters').addEventListener('click', () => closeLayers());
    document.getElementById('mobileMenuButton').addEventListener('click', () => {
      const menu = document.getElementById('mobileMenu');
      const open = menu.classList.toggle('is-open');
      document.getElementById('mobileMenuButton').setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMobileMenu(); });
    window.addEventListener('nashary:statechange', () => {
      if (favoritesDrawer.classList.contains('is-open')) renderFavorites();
      if (cartDrawer.classList.contains('is-open')) renderCart();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!checkoutModal.hidden) closeCheckout();
      else if (activeLayer) closeLayers();
      else closeMobileMenu();
    });
  }

  async function initialize() {
    bindEvents();
    document.querySelectorAll('[data-region-promo]').forEach((element) => { element.textContent = promoCode; });
    document.getElementById('currentYear').textContent = String(new Date().getFullYear());
    const params = new URLSearchParams(window.location.search);
    state.query = params.get('q') || '';
    state.category = TM.normalizeCategory(params.get('category') || '');
    if (!params.get('category')) state.category = '';
    searchInput.value = state.query;
    state.products = await TM.fetchProducts();
    renderCategories();
    populateLocations();
    updateConditionCounts();
    renderCatalog();
    renderCart();
    TM.updateHeaderCounters();
    if (params.get('cart') === 'open') openCart();
    if (TM.getToken()) {
      TM.getCurrentUser(true).then(TM.updateHeaderCounters).catch((error) => {
        if (!error.isNetworkError) console.warn('Не вдалося оновити профіль', error);
      });
    }
  }

  initialize();
})();
