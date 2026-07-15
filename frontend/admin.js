(() => {
  'use strict';

  const TM = window.NaShary;
  const loading = document.getElementById('cabinetLoading');
  const authSection = document.getElementById('cabinetAuth');
  const cabinetApp = document.getElementById('cabinetApp');
  const loginForm = document.getElementById('cabinetLoginForm');
  const productForm = document.getElementById('productForm');
  const productList = document.getElementById('productList');
  const listingsEmpty = document.getElementById('listingsEmpty');
  const ordersList = document.getElementById('ordersList');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const networkBanner = document.getElementById('networkBanner');
  const deleteModal = document.getElementById('deleteModal');

  let user = null;
  let products = [];
  let orders = [];
  let chats = [];
  let activeChatId = '';
  let marketplaceUsers = [];
  let pendingDeleteId = '';
  let currentView = 'listings';

  function isAdmin() {
    return user?.role === 'admin';
  }

  function showAuth(message = '') {
    loading.hidden = true;
    cabinetApp.hidden = true;
    authSection.hidden = false;
    document.getElementById('headerLogout').hidden = true;
    document.getElementById('cabinetLoginMessage').textContent = message;
  }

  function showApp() {
    loading.hidden = true;
    authSection.hidden = true;
    cabinetApp.hidden = false;
    document.getElementById('headerLogout').hidden = false;
    const username = user.username || user.name || 'Користувач';
    document.getElementById('cabinetUsernameLabel').textContent = username;
    document.getElementById('cabinetAvatar').textContent = TM.initials(username);
    document.getElementById('cabinetRoleLabel').textContent = isAdmin() ? 'Адміністратор' : 'Продавець';
    document.getElementById('listingsEyebrow').textContent = isAdmin() ? 'Модерація каталогу' : 'Ваші пропозиції';
    document.getElementById('listingsTitle').textContent = isAdmin() ? 'Усі оголошення' : 'Мої оголошення';
    document.getElementById('listingsSubtitle').textContent = isAdmin()
      ? 'Переглядайте та модернуйте всі пропозиції маркетплейсу.'
      : 'Керуйте технікою, яку продаєте на NaShary.';
    document.getElementById('ordersTitle').textContent = isAdmin() ? 'Усі замовлення' : 'Мої замовлення';
    document.title = `${isAdmin() ? 'Адміністрування' : 'Кабінет продавця'} — NaShary`;
    document.querySelectorAll('[data-admin-only]').forEach((element) => { element.hidden = !isAdmin(); });
  }

  function showNetworkError(error) {
    networkBanner.hidden = false;
    const message = networkBanner.querySelector('small');
    message.textContent = error?.message || 'Сервер недоступний. Зміни не зберігаються локально.';
  }

  function hideNetworkError() {
    networkBanner.hidden = true;
  }

  function showView(view) {
    currentView = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== view; });
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
    if (view === 'editor' && !document.getElementById('editingId').value) resetEditor();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function normalizeList(body) {
    const list = Array.isArray(body) ? body : body?.products;
    return Array.isArray(list) ? list.map(TM.normalizeProduct) : [];
  }

  async function loadProducts() {
    try {
      const body = await TM.apiRequest(isAdmin() ? '/products' : '/products/mine');
      products = normalizeList(body);
      hideNetworkError();
      renderProducts();
      updateStats();
    } catch (error) {
      if (error.status === 401) return handleExpiredSession();
      if (error.status === 403 && !isAdmin()) {
        productList.replaceChildren(TM.el('div', { className: 'inline-error', text: 'Сервер не дозволив завантажити ваші оголошення.' }));
        return;
      }
      showNetworkError(error);
    }
  }

  async function loadOrders() {
    try {
      const body = await TM.apiRequest('/orders');
      orders = Array.isArray(body) ? body : Array.isArray(body?.orders) ? body.orders : [];
      hideNetworkError();
      renderOrders();
      updateStats();
    } catch (error) {
      if (error.status === 401) return handleExpiredSession();
      orders = [];
      renderOrders(error);
      if (error.isNetworkError) showNetworkError(error);
    }
  }

  async function loadChats() {
    try {
      const body = await TM.apiRequest('/chats');
      chats = Array.isArray(body) ? body : [];
      renderChats();
    } catch (error) {
      if (error.status === 401) return handleExpiredSession();
      chats = [];
      renderChats(error);
    }
  }

  async function loadUsers() {
    if (!isAdmin()) return;
    try {
      const body = await TM.apiRequest('/trust/users');
      marketplaceUsers = Array.isArray(body) ? body : [];
      renderUsers();
    } catch (error) {
      document.getElementById('userVerificationList').replaceChildren(
        TM.el('p', { className: 'inline-error', text: error.message || 'Не вдалося завантажити користувачів.' })
      );
    }
  }

  function renderUsers() {
    const list = document.getElementById('userVerificationList');
    TM.clearNode(list);
    marketplaceUsers.forEach((account) => {
      const verified = account.verificationStatus === 'verified';
      const button = makeActionButton(
        verified ? 'Скасувати верифікацію' : 'Верифікувати',
        verified ? 'button button--secondary' : 'button button--primary',
        async () => {
          await TM.apiRequest(`/trust/users/${encodeURIComponent(account.id)}/verification`, {
            method: 'PATCH', body: JSON.stringify({ verified: !verified })
          });
          await loadUsers();
        },
        verified ? `Скасувати верифікацію ${account.username}` : `Верифікувати ${account.username}`
      );
      list.append(TM.el('article', { className: 'user-verification-item' }, [
        TM.el('span', { className: 'seller-avatar', text: TM.initials(account.username) }),
        TM.el('div', {}, [TM.el('strong', { text: account.username }), TM.el('small', { text: account.role === 'admin' ? 'Адміністратор' : 'Користувач' })]),
        TM.el('span', { className: `status-pill ${verified ? 'status-pill--active' : 'status-pill--pending'}`, text: verified ? '✓ Верифіковано' : 'Не верифіковано' }),
        button
      ]));
    });
  }

  function renderChats(error = null) {
    const list = document.getElementById('cabinetChatList');
    TM.clearNode(list);
    document.getElementById('sidebarMessageCount').textContent = String(chats.length);
    if (error) {
      list.append(TM.el('p', { className: 'inline-error', text: error.message || 'Не вдалося завантажити повідомлення.' }));
      return;
    }
    if (!chats.length) {
      list.append(TM.el('div', { className: 'cabinet-chat-empty', text: 'Діалогів поки немає.' }));
      return;
    }
    chats.forEach((chat) => {
      const other = chat.buyerId === user.id ? chat.sellerName : chat.buyerName;
      list.append(TM.el('button', {
        type: 'button',
        className: `cabinet-chat-preview${chat.id === activeChatId ? ' is-active' : ''}`,
        onclick: () => openCabinetChat(chat.id)
      }, [
        TM.el('span', { className: 'seller-avatar', text: TM.initials(other) }),
        TM.el('span', {}, [TM.el('strong', { text: other }), TM.el('small', { text: chat.productTitle }), TM.el('em', { text: chat.lastMessage || 'Новий діалог' })])
      ]));
    });
  }

  async function openCabinetChat(id) {
    activeChatId = id;
    renderChats();
    document.getElementById('cabinetChatPlaceholder').hidden = true;
    document.getElementById('cabinetChatActive').hidden = false;
    const chat = chats.find((item) => item.id === id);
    const other = chat?.buyerId === user.id ? chat?.sellerName : chat?.buyerName;
    document.getElementById('cabinetChatPerson').textContent = other || '';
    document.getElementById('cabinetChatTitle').textContent = chat?.productTitle || '';
    await loadCabinetMessages();
  }

  function offerStatusLabel(status) {
    return {
      pending: 'Очікує відповіді', accepted: 'Прийнято', rejected: 'Відхилено',
      countered: 'Зустрічна пропозиція', expired: 'Термін минув', redeemed: 'Використано в замовленні'
    }[status] || status;
  }

  function cabinetOfferCard(offer) {
    const card = TM.el('div', { className: `chat-offer chat-offer--${offer.status}` }, [
      TM.el('small', { text: `${offer.creatorName}: пропозиція ціни` }),
      TM.el('strong', { text: TM.formatPrice(offer.amount, offer.currency) }),
      TM.el('span', { text: offerStatusLabel(offer.status) })
    ]);
    if (offer.status === 'pending' && offer.recipientId === user.id) {
      card.append(TM.el('div', { className: 'chat-offer__actions' }, [
        makeActionButton('Прийняти', 'button-link', () => respondCabinetOffer(offer.id, 'accept'), 'Прийняти пропозицію'),
        makeActionButton('Відхилити', 'button-link button-link--danger', () => respondCabinetOffer(offer.id, 'reject'), 'Відхилити пропозицію'),
        makeActionButton('Зустрічна ціна', 'button-link', () => counterCabinetOffer(offer.id), 'Запропонувати зустрічну ціну')
      ]));
    }
    return card;
  }

  async function loadCabinetMessages() {
    if (!activeChatId) return;
    const result = await TM.apiRequest(`/chats/${encodeURIComponent(activeChatId)}/messages`);
    const container = document.getElementById('cabinetChatMessages');
    TM.clearNode(container);
    const events = [
      ...result.messages.map((message) => ({ ...message, eventType: 'message' })),
      ...(result.offers || []).map((offer) => ({ ...offer, eventType: 'offer' }))
    ].sort((a, b) => a.createdAt - b.createdAt);
    if (!events.length) container.append(TM.el('div', { className: 'chat-empty', text: 'Почніть розмову.' }));
    events.forEach((event) => {
      if (event.eventType === 'offer') container.append(cabinetOfferCard(event));
      else container.append(TM.el('div', { className: `chat-message${event.senderId === user.id ? ' chat-message--mine' : ''}` }, [
        TM.el('small', { text: event.senderName }), TM.el('p', { text: event.body }), TM.el('time', { text: TM.formatDate(event.createdAt) })
      ]));
    });
    container.scrollTop = container.scrollHeight;
  }

  async function sendCabinetMessage(event) {
    event.preventDefault();
    const input = document.getElementById('cabinetMessageInput');
    const body = input.value.trim();
    if (!body || !activeChatId) return;
    await TM.apiRequest(`/chats/${encodeURIComponent(activeChatId)}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
    input.value = '';
    await Promise.all([loadCabinetMessages(), loadChats()]);
  }

  async function sendCabinetOffer(event, parentOfferId = null) {
    event?.preventDefault();
    const input = document.getElementById('cabinetOfferAmount');
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0 || !activeChatId) return;
    await TM.apiRequest(`/chats/${encodeURIComponent(activeChatId)}/offers`, {
      method: 'POST', body: JSON.stringify({ amount, parentOfferId })
    });
    input.value = '';
    await loadCabinetMessages();
  }

  async function respondCabinetOffer(offerId, action) {
    await TM.apiRequest(`/chats/${encodeURIComponent(activeChatId)}/offers/${encodeURIComponent(offerId)}`, {
      method: 'PATCH', body: JSON.stringify({ action })
    });
    await loadCabinetMessages();
  }

  async function counterCabinetOffer(parentOfferId) {
    const raw = window.prompt('Вкажіть зустрічну ціну');
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    document.getElementById('cabinetOfferAmount').value = String(amount);
    await sendCabinetOffer(null, parentOfferId);
  }

  function handleExpiredSession() {
    TM.clearSession();
    user = null;
    showAuth('Сесія завершилась. Увійдіть знову.');
  }

  function listingStatus(product) {
    return product.stock > 0
      ? TM.el('span', { className: 'status-pill status-pill--active', text: '● Активне' })
      : TM.el('span', { className: 'status-pill status-pill--out', text: '● Немає в наявності' });
  }

  function makeActionButton(text, className, handler, label) {
    return TM.el('button', {
      type: 'button',
      className,
      text,
      onclick: handler,
      attributes: { 'aria-label': label }
    });
  }

  function renderProducts() {
    const query = document.getElementById('listingSearch').value.trim().toLocaleLowerCase('uk');
    const filtered = products.filter((product) => !query || `${product.title} ${product.brand} ${product.category}`.toLocaleLowerCase('uk').includes(query));
    TM.clearNode(productList);
    listingsEmpty.hidden = products.length !== 0 || Boolean(query);

    if (!filtered.length && (products.length || query)) {
      productList.append(TM.el('div', { className: 'listing-search-empty' }, [
        TM.el('span', { text: '⌕' }),
        TM.el('p', { text: query ? 'За цим запитом оголошень не знайдено.' : 'Оголошень немає.' })
      ]));
    }

    filtered.forEach((product) => {
      const image = TM.createProductImage(product, 'listing-item__image');
      const edit = makeActionButton('✎', 'table-action', () => openEditor(product), `Редагувати ${product.title}`);
      const remove = makeActionButton('×', 'table-action table-action--danger', () => openDeleteModal(product), `Видалити ${product.title}`);
      const view = TM.el('a', {
        className: 'table-action',
        href: TM.productLink(product.id),
        target: '_blank',
        rel: 'noopener',
        text: '↗',
        attributes: { 'aria-label': `Переглянути ${product.title} в каталозі` }
      });
      const sellerInfo = isAdmin() && product.seller
        ? TM.el('small', { className: 'listing-item__seller', text: `Продавець: ${product.seller}` })
        : null;
      const infoChildren = [
        TM.el('strong', { text: product.title }),
        TM.el('div', { className: 'listing-item__meta' }, [
          TM.el('span', { text: product.category }),
          TM.el('span', { text: TM.conditionLabel(product.condition) }),
          TM.el('span', { text: product.location })
        ])
      ];
      if (sellerInfo) infoChildren.push(sellerInfo);

      productList.append(TM.el('article', { className: 'listing-item' }, [
        TM.el('div', { className: 'listing-item__product' }, [TM.el('a', { href: TM.productLink(product.id) }, image), TM.el('div', {}, infoChildren)]),
        TM.el('div', { className: 'listing-item__price' }, [TM.el('strong', { text: TM.formatPrice(product.price, product.currency) }), TM.el('small', { text: `${product.stock} шт.` })]),
        listingStatus(product),
        TM.el('div', { className: 'listing-item__actions' }, [view, edit, remove])
      ]));
    });
    document.getElementById('listingCountText').textContent = `${filtered.length} ${pluralize(filtered.length, 'товар', 'товари', 'товарів')}`;
    document.getElementById('sidebarListingCount').textContent = String(products.length);
  }

  function parseOrderItems(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function orderStatus(value) {
    const statuses = {
      pending: ['Нове', 'status-pill--pending'],
      created: ['Створено', 'status-pill--pending'],
      paid: ['Оплачено', 'status-pill--active'],
      confirmed: ['Підтверджено', 'status-pill--active'],
      shipped: ['Відправлено', 'status-pill--active'],
      delivered: ['Доставлено', 'status-pill--active'],
      completed: ['Виконано', 'status-pill--active'],
      cancelled: ['Скасовано', 'status-pill--out']
    };
    return statuses[value] || [String(value || 'Нове'), 'status-pill--pending'];
  }

  function renderOrders(error = null) {
    TM.clearNode(ordersList);
    ordersEmpty.hidden = orders.length !== 0 || Boolean(error);
    if (error) {
      ordersList.append(TM.el('div', { className: 'inline-error' }, [
        TM.el('strong', { text: 'Не вдалося завантажити замовлення' }),
        TM.el('p', { text: error.message || 'Спробуйте оновити сторінку.' })
      ]));
    }
    orders.forEach((order) => {
      const items = parseOrderItems(order.items);
      const [statusText, statusClass] = orderStatus(order.status);
      const itemSummary = items.length
        ? items.slice(0, 2).map((item) => `${item.title || item.id || item.productId || 'Товар'} × ${item.qty || item.quantity || 1}`).join(', ')
        : 'Склад замовлення уточнюється';
      const actions = TM.el('div', { className: 'order-item__actions' });
      if (isAdmin()) {
        const transitions = {
          created: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'],
          shipped: ['delivered'], delivered: ['completed']
        }[order.status] || [];
        if (transitions.length) {
          const select = TM.el('select', { attributes: { 'aria-label': 'Змінити статус замовлення' } });
          select.append(new Option('Змінити статус…', ''));
          const labels = { confirmed: 'Підтвердити', shipped: 'Відправлено', delivered: 'Доставлено', completed: 'Завершити', cancelled: 'Скасувати' };
          transitions.forEach((status) => select.append(new Option(labels[status], status)));
          select.addEventListener('change', async () => {
            if (!select.value) return;
            await TM.apiRequest(`/orders/${encodeURIComponent(order.id)}/status`, {
              method: 'PATCH', body: JSON.stringify({ status: select.value })
            });
            await loadOrders();
          });
          actions.append(select);
        }
      } else if (order.status === 'completed' && items[0]) {
        actions.append(makeActionButton('★ Оцінити', 'button-link', () => reviewOrder(order, items[0]), 'Оцінити покупку'));
      }
      ordersList.append(TM.el('article', { className: 'order-item' }, [
        TM.el('div', { className: 'order-item__id' }, [TM.el('span', { text: 'Замовлення' }), TM.el('strong', { text: `#${String(order.id || '').slice(0, 12)}` }), TM.el('small', { text: TM.formatDate(order.createdAt) })]),
        TM.el('div', { className: 'order-item__content' }, [TM.el('strong', { text: itemSummary }), TM.el('small', { text: `${items.length} позицій` })]),
        TM.el('strong', { className: 'order-item__total', text: TM.formatPrice(order.total, order.currency) }),
        TM.el('span', { className: `status-pill ${statusClass}`, text: statusText }),
        actions
      ]));
    });
    document.getElementById('orderCountText').textContent = `${orders.length} ${pluralize(orders.length, 'замовлення', 'замовлення', 'замовлень')}`;
    document.getElementById('sidebarOrderCount').textContent = String(orders.length);
  }

  async function reviewOrder(order, item) {
    const rating = Number(window.prompt('Оцінка від 1 до 5'));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
    const comment = window.prompt('Короткий відгук (необов’язково)') || '';
    try {
      await TM.apiRequest('/trust/reviews', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, productId: item.productId || item.id, rating, comment })
      });
      TM.showToast('Дякуємо за відгук!');
      await loadOrders();
    } catch (error) {
      TM.showToast(error.message || 'Не вдалося зберегти відгук.', 'error');
    }
  }

  function pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;
    return many;
  }

  function updateStats() {
    document.getElementById('totalListings').textContent = String(products.length);
    document.getElementById('activeListings').textContent = String(products.filter((product) => product.stock > 0).length);
    document.getElementById('outOfStockListings').textContent = String(products.filter((product) => product.stock <= 0).length);
    document.getElementById('totalOrders').textContent = String(orders.length);
  }

  function resetEditor() {
    productForm.reset();
    document.getElementById('editingId').value = '';
    document.getElementById('editingRegion').value = window.NaSharyRegion?.region || 'pl';
    document.querySelector('#price + b, #price ~ b')?.replaceChildren(window.NaSharyRegion?.currency || 'PLN');
    document.getElementById('stock').value = '1';
    document.querySelector('input[name="productCondition"][value="new"]').checked = true;
    document.getElementById('editorEyebrow').textContent = 'Нова пропозиція';
    document.getElementById('editorTitle').textContent = 'Додати оголошення';
    document.getElementById('saveProduct').textContent = 'Опублікувати оголошення';
    document.getElementById('productFormMessage').textContent = '';
    document.getElementById('titleCounter').textContent = '0';
    document.getElementById('descriptionCounter').textContent = '0';
    renderImagePreview('');
  }

  function openEditor(product = null) {
    resetEditor();
    if (product) {
      document.getElementById('editingId').value = product.id;
      document.getElementById('editingRegion').value = product.region || 'pl';
      document.querySelector('#price + b, #price ~ b')?.replaceChildren(product.currency || 'PLN');
      document.getElementById('title').value = product.title;
      document.getElementById('category').value = product.category;
      document.getElementById('brand').value = product.brand;
      document.querySelector(`input[name="productCondition"][value="${product.condition}"]`).checked = true;
      document.getElementById('price').value = String(product.price);
      document.getElementById('stock').value = String(product.stock);
      document.getElementById('location').value = product.location;
      document.getElementById('delivery').value = product.delivery;
      document.getElementById('description').value = product.description;
      document.getElementById('images').value = product.images.filter((image) => /^https?:\/\//i.test(image)).join('\n');
      document.getElementById('editorEyebrow').textContent = 'Редагування';
      document.getElementById('editorTitle').textContent = 'Оновити оголошення';
      document.getElementById('saveProduct').textContent = 'Зберегти зміни';
      document.getElementById('titleCounter').textContent = String(product.title.length);
      document.getElementById('descriptionCounter').textContent = String(product.description.length);
      renderImagePreview(product.images[0]);
    }
    showView('editor');
  }

  function getImageUrls() {
    return document.getElementById('images').value
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//i.test(value))
      .slice(0, 8);
  }

  function renderImagePreview(source) {
    const preview = document.getElementById('imagePreview');
    TM.clearNode(preview);
    if (!source) {
      preview.append(TM.el('span', { className: 'image-preview__placeholder', text: '▧' }), TM.el('p', { text: 'Попередній перегляд першого фото' }));
      return;
    }
    const image = TM.el('img', { src: TM.safeImageUrl(source), alt: 'Попередній перегляд' });
    image.addEventListener('error', () => {
      TM.clearNode(preview);
      preview.append(TM.el('span', { className: 'image-preview__placeholder', text: '!' }), TM.el('p', { text: 'Не вдалося завантажити зображення' }));
    });
    preview.append(image);
  }

  function validateProduct() {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const price = Number(document.getElementById('price').value);
    const stock = Number(document.getElementById('stock').value);
    if (title.length < 4) return 'Назва має містити щонайменше 4 символи.';
    if (!document.getElementById('category').value) return 'Оберіть категорію.';
    if (!document.getElementById('brand').value.trim()) return 'Вкажіть бренд.';
    if (!Number.isFinite(price) || price <= 0) return 'Вкажіть коректну ціну.';
    if (!Number.isInteger(stock) || stock < 0) return 'Кількість має бути цілим невід’ємним числом.';
    if (!document.getElementById('location').value.trim()) return 'Вкажіть місто.';
    if (description.length < 20) return 'Опис має містити щонайменше 20 символів.';
    return '';
  }

  function collectProductPayload() {
    return {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      brand: document.getElementById('brand').value.trim(),
      condition: document.querySelector('input[name="productCondition"]:checked').value,
      price: Number(document.getElementById('price').value),
      region: document.getElementById('editingRegion').value || window.NaSharyRegion?.region || 'pl',
      stock: Number(document.getElementById('stock').value),
      location: document.getElementById('location').value.trim(),
      delivery: document.getElementById('delivery').value,
      description: document.getElementById('description').value.trim(),
      images: getImageUrls()
    };
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('productFormMessage');
    const validationError = validateProduct();
    if (validationError) {
      message.textContent = validationError;
      return;
    }
    const id = document.getElementById('editingId').value;
    const button = document.getElementById('saveProduct');
    button.disabled = true;
    button.textContent = id ? 'Зберігаємо…' : 'Публікуємо…';
    message.textContent = '';
    try {
      await TM.apiRequest(id ? `/products/${encodeURIComponent(id)}` : '/products', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(collectProductPayload())
      });
      hideNetworkError();
      TM.showToast(id ? 'Оголошення оновлено' : 'Оголошення опубліковано');
      resetEditor();
      await loadProducts();
      showView('listings');
    } catch (error) {
      if (error.status === 401) return handleExpiredSession();
      if (error.status === 403) message.textContent = 'У вас немає прав змінювати це оголошення.';
      else message.textContent = error.message || 'Не вдалося зберегти оголошення.';
      if (error.isNetworkError) showNetworkError(error);
    } finally {
      button.disabled = false;
      button.textContent = id ? 'Зберегти зміни' : 'Опублікувати оголошення';
    }
  });

  function openDeleteModal(product) {
    pendingDeleteId = product.id;
    document.getElementById('deleteModalText').textContent = `Оголошення «${product.title}» буде остаточно видалено з каталогу.`;
    document.getElementById('deleteMessage').textContent = '';
    deleteModal.hidden = false;
    requestAnimationFrame(() => deleteModal.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    document.getElementById('cancelDelete').focus();
  }

  function closeDeleteModal() {
    deleteModal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    window.setTimeout(() => { deleteModal.hidden = true; }, 200);
    pendingDeleteId = '';
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    const button = document.getElementById('confirmDelete');
    const message = document.getElementById('deleteMessage');
    button.disabled = true;
    button.textContent = 'Видаляємо…';
    try {
      await TM.apiRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      closeDeleteModal();
      TM.showToast('Оголошення видалено');
      await loadProducts();
    } catch (error) {
      if (error.status === 401) {
        closeDeleteModal();
        return handleExpiredSession();
      }
      message.textContent = error.status === 403 ? 'У вас немає прав видаляти це оголошення.' : error.message || 'Не вдалося видалити оголошення.';
      if (error.isNetworkError) showNetworkError(error);
    } finally {
      button.disabled = false;
      button.textContent = 'Так, видалити';
    }
  }

  async function login(username, password) {
    const body = await TM.apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (!body?.token) throw new Error('Сервер не повернув токен авторизації.');
    TM.setSession(body.token, body.user || null);
    user = await TM.getCurrentUser(true);
    if (!user) throw new Error('Не вдалося отримати профіль користувача.');
    TM.setSession(body.token, user);
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('cabinetUsername').value.trim();
    const password = document.getElementById('cabinetPassword').value;
    const message = document.getElementById('cabinetLoginMessage');
    if (username.length < 3 || !password) {
      message.textContent = 'Введіть логін і пароль.';
      return;
    }
    const button = document.getElementById('cabinetLoginButton');
    button.disabled = true;
    button.textContent = 'Входимо…';
    message.textContent = '';
    try {
      await login(username, password);
      showApp();
      await Promise.all([loadProducts(), loadOrders(), loadChats(), loadUsers()]);
    } catch (error) {
      TM.clearSession();
      if (error.status === 401) message.textContent = 'Неправильний логін або пароль.';
      else message.textContent = error.message || 'Не вдалося увійти.';
    } finally {
      button.disabled = false;
      button.textContent = 'Увійти';
    }
  });

  function logout() {
    TM.clearSession();
    user = null;
    products = [];
    orders = [];
    chats = [];
    activeChatId = '';
    loginForm.reset();
    showAuth('Ви вийшли з акаунта.');
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
    document.querySelectorAll('[data-open-editor]').forEach((button) => button.addEventListener('click', () => openEditor()));
    document.getElementById('cancelEdit').addEventListener('click', () => { resetEditor(); showView('listings'); });
    document.getElementById('cancelEditTop').addEventListener('click', () => { resetEditor(); showView('listings'); });
    document.getElementById('listingSearch').addEventListener('input', renderProducts);
    document.getElementById('title').addEventListener('input', (event) => { document.getElementById('titleCounter').textContent = String(event.target.value.length); });
    document.getElementById('description').addEventListener('input', (event) => { document.getElementById('descriptionCounter').textContent = String(event.target.value.length); });
    document.getElementById('images').addEventListener('input', () => renderImagePreview(getImageUrls()[0] || ''));
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    deleteModal.addEventListener('click', (event) => { if (event.target === deleteModal) closeDeleteModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !deleteModal.hidden) closeDeleteModal(); });
    document.getElementById('logoutButton').addEventListener('click', logout);
    document.getElementById('headerLogout').addEventListener('click', logout);
    document.getElementById('cabinetMessageForm').addEventListener('submit', sendCabinetMessage);
    document.getElementById('cabinetOfferForm').addEventListener('submit', sendCabinetOffer);
    document.getElementById('retryConnection').addEventListener('click', async () => {
      await Promise.all([loadProducts(), loadOrders(), loadChats(), loadUsers()]);
      if (currentView === 'orders') renderOrders();
    });
  }

  async function initialize() {
    bindEvents();
    if (!TM.getToken()) {
      showAuth();
      return;
    }
    try {
      user = await TM.getCurrentUser(true);
      if (!user) {
        showAuth('Увійдіть, щоб відкрити кабінет.');
        return;
      }
      showApp();
      await Promise.all([loadProducts(), loadOrders(), loadChats(), loadUsers()]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        TM.clearSession();
        showAuth('Сесія недійсна. Увійдіть знову.');
      } else {
        showAuth(error.message || 'Не вдалося з’єднатися із сервером.');
      }
    }
  }

  initialize();
})();
