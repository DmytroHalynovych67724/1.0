(() => {
  'use strict';

  const TM = window.NaShary;
  const detail = document.getElementById('productDetail');
  const loading = document.getElementById('productLoading');
  const notFound = document.getElementById('productNotFound');
  const infoSection = document.getElementById('productInfoSection');
  const infoContent = document.getElementById('productInfoContent');
  const relatedSection = document.getElementById('relatedSection');
  const relatedContainer = document.getElementById('relatedProducts');
  const cartDrawer = document.getElementById('productCartDrawer');
  const cartContent = document.getElementById('productCartContent');
  const cartFooter = document.getElementById('productCartFooter');
  const overlay = document.getElementById('productOverlay');

  let product = null;
  let products = [];
  let selectedQuantity = 1;
  let activeTab = 'description';
  let activeConversationId = '';
  let chatTimer = null;

  function makeButton(text, className, handler, ariaLabel = '') {
    return TM.el('button', {
      type: 'button',
      text,
      className,
      onclick: handler,
      attributes: ariaLabel ? { 'aria-label': ariaLabel } : {}
    });
  }

  function renderBreadcrumbs() {
    const breadcrumbs = document.getElementById('breadcrumbs');
    TM.clearNode(breadcrumbs);
    breadcrumbs.append(
      TM.el('a', { href: 'index.html', text: 'Головна' }),
      TM.el('span', { text: '›', attributes: { 'aria-hidden': 'true' } }),
      TM.el('a', { href: `index.html?category=${encodeURIComponent(product.category)}#catalogSection`, text: product.category }),
      TM.el('span', { text: '›', attributes: { 'aria-hidden': 'true' } }),
      TM.el('span', { text: product.title })
    );
  }

  function renderGallery() {
    const mainImage = TM.createProductImage(product, 'product-gallery__main-image');
    mainImage.loading = 'eager';
    const main = TM.el('div', { className: 'product-gallery__main' }, [mainImage]);
    main.append(TM.el('span', {
      className: `badge product-gallery__condition ${product.condition === 'used' ? 'badge--used' : 'badge--new'}`,
      text: TM.conditionLabel(product.condition)
    }));

    const thumbnails = TM.el('div', { className: 'product-gallery__thumbs', attributes: { 'aria-label': 'Зображення товару' } });
    product.images.slice(0, 5).forEach((source, index) => {
      const thumbnailImage = TM.el('img', { src: TM.safeImageUrl(source), alt: `${product.title}, фото ${index + 1}` });
      thumbnailImage.addEventListener('error', () => { thumbnailImage.src = 'assets/product-placeholder.svg'; });
      const button = makeButton('', `product-gallery__thumb${index === 0 ? ' is-active' : ''}`, () => {
        mainImage.src = TM.safeImageUrl(source);
        thumbnails.querySelectorAll('button').forEach((thumb) => thumb.classList.remove('is-active'));
        button.classList.add('is-active');
      }, `Показати фото ${index + 1}`);
      button.append(thumbnailImage);
      thumbnails.append(button);
    });
    return TM.el('div', { className: 'product-gallery' }, [main, thumbnails]);
  }

  function renderPurchaseCard() {
    const soldOut = product.stock <= 0;
    const isFavorite = TM.getFavorites().includes(product.id);
    const price = TM.el('div', { className: 'product-summary__price' }, [
      TM.el('strong', { text: TM.formatPrice(product.price, product.currency) })
    ]);
    if (product.oldPrice) price.append(TM.el('del', { text: TM.formatPrice(product.oldPrice, product.currency) }));

    const quantityValue = TM.el('span', { className: 'quantity-value', text: selectedQuantity });
    const quantityControl = TM.el('div', { className: 'product-quantity' }, [
      makeButton('−', 'quantity-button', () => {
        selectedQuantity = Math.max(1, selectedQuantity - 1);
        quantityValue.textContent = String(selectedQuantity);
      }, 'Зменшити кількість'),
      quantityValue,
      makeButton('+', 'quantity-button', () => {
        selectedQuantity = Math.min(product.stock, selectedQuantity + 1);
        quantityValue.textContent = String(selectedQuantity);
      }, 'Збільшити кількість')
    ]);

    const addButton = makeButton(
      soldOut ? 'Немає в наявності' : 'Додати до кошика',
      'button button--primary button--large product-add-button',
      () => {
        if (soldOut) return;
        const already = TM.getCart().find((item) => item.id === product.id)?.qty || 0;
        if (already + selectedQuantity > product.stock) {
          TM.showToast(`Доступно лише ${product.stock} шт.`, 'error');
          return;
        }
        TM.addToCart(product.id, selectedQuantity);
        renderCart();
        TM.showToast('Товар додано до кошика');
      }
    );
    addButton.disabled = soldOut;

    const favoriteButton = makeButton(
      isFavorite ? '♥ В обраному' : '♡ Додати в обране',
      `button button--secondary button--large product-favorite${isFavorite ? ' is-active' : ''}`,
      () => {
        const added = TM.toggleFavorite(product.id);
        favoriteButton.textContent = added ? '♥ В обраному' : '♡ Додати в обране';
        favoriteButton.classList.toggle('is-active', added);
        TM.showToast(added ? 'Додано до обраного' : 'Видалено з обраного');
      }
    );

    const summary = TM.el('div', { className: 'product-summary' }, [
      TM.el('div', { className: 'product-summary__topline' }, [
        TM.el('span', { className: 'product-summary__category', text: product.category }),
        TM.el('span', { className: `stock-label ${soldOut ? 'stock-label--out' : ''}`, text: soldOut ? 'Немає в наявності' : `В наявності: ${product.stock} шт.` })
      ]),
      TM.el('h1', { id: 'productTitle', text: product.title }),
      TM.el('div', { className: 'product-summary__meta' }, [
        TM.el('span', { text: `⌖ ${product.location}` }),
        TM.el('span', { text: `Оновлено ${TM.formatDate(product.updatedAt || product.createdAt)}` }),
        TM.el('span', { text: `Код: ${product.id.slice(0, 10)}` })
      ]),
      price,
      TM.el('div', { className: 'product-summary__availability' }, [
        TM.el('span', { className: 'availability-icon', text: product.delivery === 'pickup' ? '⌖' : '⇄' }),
        TM.el('span', {}, [TM.el('strong', { text: TM.deliveryLabel(product.delivery) }), TM.el('small', { text: 'Умови узгоджуються під час замовлення' })])
      ]),
      TM.el('div', { className: 'product-summary__actions' }, [quantityControl, addButton]),
      favoriteButton,
      TM.el('div', { className: 'safe-note' }, [TM.el('span', { text: '♢' }), TM.el('p', {}, [TM.el('strong', { text: 'Купуйте безпечно' }), TM.el('small', { text: 'Не переказуйте гроші поза сервісом до перевірки товару.' })])])
    ]);
    return summary;
  }

  function renderSellerCard() {
    const seller = TM.el('aside', { className: 'seller-card' }, [
      TM.el('div', { className: 'seller-card__head' }, [
        TM.el('span', { className: 'seller-avatar', text: TM.initials(product.seller) }),
        TM.el('div', {}, [
          TM.el('span', { className: 'seller-card__label', text: 'Продавець' }),
          TM.el('strong', { text: product.seller }),
          TM.el('small', { text: product.sellerVerified ? '✓ Профіль верифіковано' : 'Профіль не верифіковано' })
        ])
      ]),
      TM.el('div', { className: 'seller-card__stats' }, [
        TM.el('span', {}, [TM.el('strong', { text: product.sellerRating ?? '—' }), TM.el('small', { text: 'рейтинг' })]),
        TM.el('span', {}, [TM.el('strong', { text: String(product.sellerReviewCount || 0) }), TM.el('small', { text: 'відгуків' })]),
        TM.el('span', {}, [TM.el('strong', { text: product.sellerVerified ? '✓' : '—' }), TM.el('small', { text: 'верифікація' })])
      ]),
      makeButton('Написати продавцю', 'button button--primary button--full', openSellerChat),
      makeButton('Показати контакти', 'button button--secondary button--full', () => TM.showToast('Контакти продавця доступні після оформлення замовлення')),
      makeButton('Поділитися оголошенням', 'button-link button-link--center', shareProduct)
    ]);
    return seller;
  }

  function ensureChatModal() {
    let modal = document.getElementById('sellerChatModal');
    if (modal) return modal;
    const messages = TM.el('div', { id: 'sellerChatMessages', className: 'chat-messages' });
    const input = TM.el('textarea', {
      id: 'sellerChatInput',
      attributes: { maxlength: '1000', rows: '2', placeholder: 'Напишіть повідомлення…', required: '' }
    });
    const form = TM.el('form', { className: 'chat-compose', id: 'sellerChatForm' }, [
      input,
      makeButton('Надіслати', 'button button--primary', () => {}, 'Надіслати повідомлення')
    ]);
    form.querySelector('button').type = 'submit';
    form.addEventListener('submit', sendChatMessage);
    const offerInput = TM.el('input', {
      id: 'sellerOfferAmount',
      type: 'number',
      attributes: { min: '0.01', step: '0.01', placeholder: 'Ваша ціна' }
    });
    const offerForm = TM.el('form', { className: 'chat-offer-compose', id: 'sellerOfferForm' }, [
      offerInput,
      makeButton('Запропонувати ціну', 'button button--secondary', () => {})
    ]);
    offerForm.querySelector('button').type = 'submit';
    offerForm.addEventListener('submit', sendPriceOffer);
    const close = makeButton('×', 'icon-button modal__close', closeSellerChat, 'Закрити чат');
    modal = TM.el('div', {
      id: 'sellerChatModal',
      className: 'modal chat-modal',
      attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sellerChatTitle' }
    }, [TM.el('div', { className: 'modal__card chat-card' }, [
      close,
      TM.el('span', { className: 'chat-card__eyebrow', text: 'Чат щодо оголошення' }),
      TM.el('h2', { id: 'sellerChatTitle', text: product.title }),
      TM.el('p', { text: `Продавець: ${product.seller}` }),
      messages,
      offerForm,
      form,
      TM.el('p', { id: 'sellerChatError', className: 'form-message', attributes: { role: 'alert' } })
    ])]);
    modal.hidden = true;
    modal.addEventListener('click', (event) => { if (event.target === modal) closeSellerChat(); });
    document.body.append(modal);
    return modal;
  }

  async function loadChatMessages() {
    if (!activeConversationId) return;
    const result = await TM.apiRequest(`/chats/${encodeURIComponent(activeConversationId)}/messages`);
    const container = document.getElementById('sellerChatMessages');
    const currentUser = TM.getStoredUser();
    TM.clearNode(container);
    const events = [
      ...result.messages.map((message) => ({ ...message, eventType: 'message' })),
      ...(result.offers || []).map((offer) => ({ ...offer, eventType: 'offer' }))
    ].sort((a, b) => a.createdAt - b.createdAt);
    if (!events.length) {
      container.append(TM.el('div', { className: 'chat-empty', text: 'Почніть розмову з продавцем про стан, комплект або ціну.' }));
    } else {
      events.forEach((event) => {
        if (event.eventType === 'message') {
          container.append(TM.el('div', {
            className: `chat-message${event.senderId === currentUser?.id ? ' chat-message--mine' : ''}`
          }, [
            TM.el('small', { text: event.senderName }),
            TM.el('p', { text: event.body }),
            TM.el('time', { text: TM.formatDate(event.createdAt) })
          ]));
          return;
        }
        container.append(renderPriceOffer(event, currentUser));
      });
      container.scrollTop = container.scrollHeight;
    }
  }

  function renderPriceOffer(offer, currentUser) {
    const labels = {
      pending: 'Очікує відповіді', accepted: 'Прийнято', rejected: 'Відхилено',
      countered: 'Є зустрічна пропозиція', expired: 'Термін минув', redeemed: 'Використано в замовленні'
    };
    const card = TM.el('div', {
      className: `chat-offer chat-offer--${offer.status}`
    }, [
      TM.el('small', { text: `${offer.creatorName}: пропозиція ціни` }),
      TM.el('strong', { text: TM.formatPrice(offer.amount, offer.currency) }),
      TM.el('span', { text: labels[offer.status] || offer.status })
    ]);
    if (offer.status === 'pending' && offer.recipientId === currentUser?.id) {
      card.append(TM.el('div', { className: 'chat-offer__actions' }, [
        makeButton('Прийняти', 'button-link', () => respondToPriceOffer(offer.id, 'accept')),
        makeButton('Відхилити', 'button-link button-link--danger', () => respondToPriceOffer(offer.id, 'reject')),
        makeButton('Зустрічна ціна', 'button-link', () => counterPriceOffer(offer.id))
      ]));
    }
    return card;
  }

  async function sendPriceOffer(event) {
    event.preventDefault();
    const input = document.getElementById('sellerOfferAmount');
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0 || !activeConversationId) return;
    try {
      await TM.apiRequest(`/chats/${encodeURIComponent(activeConversationId)}/offers`, {
        method: 'POST', body: JSON.stringify({ amount })
      });
      input.value = '';
      await loadChatMessages();
    } catch (error) {
      document.getElementById('sellerChatError').textContent = error.message || 'Не вдалося надіслати пропозицію.';
    }
  }

  async function respondToPriceOffer(offerId, action) {
    await TM.apiRequest(`/chats/${encodeURIComponent(activeConversationId)}/offers/${encodeURIComponent(offerId)}`, {
      method: 'PATCH', body: JSON.stringify({ action })
    });
    await loadChatMessages();
  }

  async function counterPriceOffer(parentOfferId) {
    const raw = window.prompt('Вкажіть зустрічну ціну');
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await TM.apiRequest(`/chats/${encodeURIComponent(activeConversationId)}/offers`, {
      method: 'POST', body: JSON.stringify({ amount, parentOfferId })
    });
    await loadChatMessages();
  }

  async function openSellerChat() {
    if (!TM.getToken()) {
      location.href = `auth.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    const modal = ensureChatModal();
    const error = document.getElementById('sellerChatError');
    error.textContent = '';
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    try {
      const conversation = await TM.apiRequest('/chats', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id })
      });
      activeConversationId = conversation.id;
      await loadChatMessages();
      document.getElementById('sellerChatInput').focus();
      chatTimer = window.setInterval(() => loadChatMessages().catch(() => {}), 5000);
    } catch (requestError) {
      error.textContent = requestError.message || 'Не вдалося відкрити чат.';
    }
  }

  function closeSellerChat() {
    const modal = document.getElementById('sellerChatModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    window.clearInterval(chatTimer);
    chatTimer = null;
    window.setTimeout(() => { modal.hidden = true; }, 220);
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('sellerChatInput');
    const body = input.value.trim();
    if (!body || !activeConversationId) return;
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      await TM.apiRequest(`/chats/${encodeURIComponent(activeConversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body })
      });
      input.value = '';
      await loadChatMessages();
    } catch (error) {
      document.getElementById('sellerChatError').textContent = error.message || 'Не вдалося надіслати повідомлення.';
    } finally {
      button.disabled = false;
    }
  }

  async function shareProduct() {
    const shareData = { title: product.title, text: `${product.title} на NaShary`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        TM.showToast('Посилання скопійовано');
      }
    } catch (error) {
      if (error.name !== 'AbortError') TM.showToast('Не вдалося скопіювати посилання', 'error');
    }
  }

  function renderProduct() {
    document.title = `${product.title} — NaShary`;
    renderBreadcrumbs();
    TM.clearNode(detail);
    const purchase = TM.el('div', { className: 'product-purchase' }, [renderPurchaseCard(), renderSellerCard()]);
    detail.append(renderGallery(), purchase);
    loading.hidden = true;
    detail.hidden = false;
    infoSection.hidden = false;
    renderInfo();
  }

  function renderInfo() {
    TM.clearNode(infoContent);
    if (activeTab === 'description') {
      infoContent.append(
        TM.el('h2', { text: 'Опис товару' }),
        TM.el('p', { className: 'product-description', text: product.description }),
        TM.el('div', { className: 'description-note' }, [TM.el('span', { text: 'i' }), TM.el('p', { text: 'Уточнюйте комплектацію та стан товару в продавця перед покупкою.' })])
      );
    } else if (activeTab === 'details') {
      const specs = [
        ['Категорія', product.category],
        ['Бренд', product.brand],
        ['Стан', TM.conditionLabel(product.condition)],
        ['Наявність', product.stock > 0 ? `${product.stock} шт.` : 'Немає'],
        ['Місто', product.location],
        ['Продавець', product.seller]
      ];
      const list = TM.el('dl', { className: 'spec-list' });
      specs.forEach(([term, value]) => list.append(TM.el('div', {}, [TM.el('dt', { text: term }), TM.el('dd', { text: value })])));
      infoContent.append(TM.el('h2', { text: 'Основні характеристики' }), list);
    } else {
      infoContent.append(
        TM.el('h2', { text: 'Доставка й оплата' }),
        TM.el('div', { className: 'delivery-grid' }, [
          TM.el('div', {}, [TM.el('span', { text: '⇄' }), TM.el('h3', { text: TM.deliveryLabel(product.delivery) }), TM.el('p', { text: 'Строк та вартість залежать від міста й обраного перевізника.' })]),
          TM.el('div', {}, [TM.el('span', { text: '▤' }), TM.el('h3', { text: 'Прозора оплата' }), TM.el('p', { text: 'Остаточна сума розраховується сервером під час створення замовлення.' })]),
          TM.el('div', {}, [TM.el('span', { text: '♢' }), TM.el('h3', { text: 'Перевірка товару' }), TM.el('p', { text: 'Огляньте комплектацію та стан до завершення отримання.' })])
        ])
      );
    }
  }

  function relatedCard(item) {
    const imageLink = TM.el('a', { className: 'product-card__image-link', href: TM.productLink(item.id) }, TM.createProductImage(item, 'product-card__image'));
    const media = TM.el('div', { className: 'product-card__media' }, [imageLink, TM.el('span', { className: `badge product-card__single-badge ${item.condition === 'used' ? 'badge--used' : 'badge--new'}`, text: TM.conditionLabel(item.condition) })]);
    return TM.el('article', { className: 'product-card' }, [media, TM.el('div', { className: 'product-card__body' }, [
      TM.el('div', { className: 'product-card__category', text: item.category }),
      TM.el('h3', { className: 'product-card__title' }, TM.el('a', { href: TM.productLink(item.id), text: item.title })),
      TM.el('div', { className: 'product-card__meta' }, [TM.el('span', { text: `⌖ ${item.location}` })]),
      TM.el('div', { className: 'product-card__price' }, TM.el('strong', { text: TM.formatPrice(item.price, item.currency) }))
    ])]);
  }

  function renderRelated() {
    const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
    const fallback = products.filter((item) => item.id !== product.id && !related.includes(item)).slice(0, 4 - related.length);
    const list = [...related, ...fallback];
    if (!list.length) return;
    TM.clearNode(relatedContainer);
    list.forEach((item) => relatedContainer.append(relatedCard(item)));
    relatedSection.hidden = false;
  }

  function emptyCart() {
    return TM.el('div', { className: 'drawer-empty' }, [
      TM.el('span', { className: 'drawer-empty__icon', text: '▱' }),
      TM.el('h3', { text: 'Кошик порожній' }),
      TM.el('p', { text: 'Додайте товар, який вам сподобався.' }),
      TM.el('a', { className: 'button button--secondary', href: 'index.html#catalogSection', text: 'До каталогу' })
    ]);
  }

  function renderCart() {
    TM.clearNode(cartContent);
    const items = TM.getCart().map((entry) => ({ entry, item: products.find((candidate) => candidate.id === entry.id) })).filter(({ item }) => item);
    if (!items.length) {
      cartContent.append(emptyCart());
      cartFooter.hidden = true;
      return;
    }
    const list = TM.el('div', { className: 'drawer-list' });
    items.forEach(({ entry, item }) => {
      const quantity = TM.el('div', { className: 'quantity-control' }, [
        makeButton('−', 'quantity-button', () => { TM.updateCartItem(item.id, entry.qty - 1); renderCart(); }),
        TM.el('span', { text: entry.qty }),
        makeButton('+', 'quantity-button', () => {
          if (entry.qty >= item.stock) return TM.showToast('Більше немає в наявності', 'error');
          TM.updateCartItem(item.id, entry.qty + 1); renderCart();
        })
      ]);
      const remove = makeButton('Видалити', 'button-link button-link--danger', () => { TM.removeFromCart(item.id); renderCart(); });
      list.append(TM.el('div', { className: 'drawer-product' }, [
        TM.el('a', { href: TM.productLink(item.id), className: 'drawer-product__media' }, TM.createProductImage(item, 'drawer-product__image')),
        TM.el('div', { className: 'drawer-product__info' }, [
          TM.el('a', { href: TM.productLink(item.id), className: 'drawer-product__title', text: item.title }),
          TM.el('strong', { text: TM.formatPrice(item.price, item.currency) }),
          TM.el('div', { className: 'drawer-product__actions' }, [quantity, remove])
        ])
      ]));
    });
    cartContent.append(list);
    const total = items.reduce((sum, { entry, item }) => sum + item.price * entry.qty, 0);
    document.getElementById('productCartTotal').textContent = TM.formatPrice(total, items[0]?.item.currency);
    cartFooter.hidden = false;
  }

  function openCart() {
    renderCart();
    cartDrawer.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(() => { cartDrawer.classList.add('is-open'); overlay.classList.add('is-visible'); });
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeCart() {
    cartDrawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    window.setTimeout(() => { cartDrawer.hidden = true; overlay.hidden = true; }, 250);
  }

  function bindEvents() {
    document.getElementById('productHeaderSearch').addEventListener('submit', (event) => {
      event.preventDefault();
      const query = document.getElementById('productSearchInput').value.trim();
      window.location.href = `index.html?q=${encodeURIComponent(query)}#catalogSection`;
    });
    document.getElementById('openProductCart').addEventListener('click', openCart);
    document.getElementById('closeProductCart').addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!document.getElementById('sellerChatModal')?.hidden) closeSellerChat();
      else closeCart();
    });
    document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      renderInfo();
    }));
  }

  async function initialize() {
    bindEvents();
    document.getElementById('currentYear').textContent = String(new Date().getFullYear());
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      loading.hidden = true;
      notFound.hidden = false;
      return;
    }
    [product, products] = await Promise.all([TM.fetchProduct(id), TM.fetchProducts()]);
    if (!product) {
      loading.hidden = true;
      notFound.hidden = false;
      return;
    }
    if (!products.some((item) => item.id === product.id)) products.unshift(product);
    renderProduct();
    renderRelated();
    renderCart();
    TM.updateHeaderCounters();
  }

  initialize().catch((error) => {
    console.error(error);
    loading.hidden = true;
    notFound.hidden = false;
  });
})();
