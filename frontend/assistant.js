(() => {
  'use strict';

  const TM = window.NaShary;
  if (!TM) return;
  const language = window.NaSharyI18n?.language || 'pl';
  const copy = {
    pl: {
      title: 'Pomocnik NaShary', subtitle: 'Wyszukuje tylko w aktualnym katalogu',
      greeting: 'Cześć! Napisz, jakiego sprzętu szukasz i jaki masz budżet.',
      placeholder: 'Np. laptop do 3000 PLN', send: 'Wyślij', open: 'Otwórz pomocnika',
      empty: 'Nie znalazłem pasujących ofert. Spróbuj zwiększyć budżet lub zmienić kategorię.',
      found: 'Te oferty najlepiej pasują do zapytania:', error: 'Nie udało się teraz odczytać katalogu.',
      quick: ['Telefon do 2000', 'Laptop używany', 'Sprzęt gamingowy'],
    },
    uk: {
      title: 'Помічник NaShary', subtitle: 'Шукає лише в актуальному каталозі',
      greeting: 'Привіт! Напишіть, яку техніку шукаєте та який маєте бюджет.',
      placeholder: 'Наприклад, ноутбук до 30000 UAH', send: 'Надіслати', open: 'Відкрити помічника',
      empty: 'Не знайшов відповідних пропозицій. Спробуйте збільшити бюджет або змінити категорію.',
      found: 'Ці пропозиції найкраще відповідають запиту:', error: 'Зараз не вдалося прочитати каталог.',
      quick: ['Телефон до 20000', 'Ноутбук б/в', 'Техніка для ігор'],
    },
    en: {
      title: 'NaShary helper', subtitle: 'Searches only the current catalogue',
      greeting: 'Hi! Tell me what device you need and your budget.',
      placeholder: 'For example, laptop under 1000 EUR', send: 'Send', open: 'Open helper',
      empty: 'I found no matching listings. Try a higher budget or another category.',
      found: 'These listings best match your request:', error: 'I could not read the catalogue right now.',
      quick: ['Phone under 500', 'Used laptop', 'Gaming gear'],
    },
  }[language];

  let cachedProducts = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function message(text, own = false) {
    const element = node('div', `assistant-message${own ? ' assistant-message--own' : ''}`, text);
    document.getElementById('assistantMessages').append(element);
    element.scrollIntoView({ block: 'nearest' });
    return element;
  }

  function categoryFrom(query) {
    const rules = [
      [/telefon|phone|smartfon|смартф|телефон/i, 'Смартфони'],
      [/laptop|notebook|ноутбук/i, 'Ноутбуки'],
      [/gaming|game|gr|консол|ігров/i, 'Gaming'],
      [/audio|słuch|headphone|навуш/i, 'Аудіо'],
      [/monitor|tv|телевіз/i, 'TV'],
      [/camera|aparat|камер|фото/i, 'Фото'],
      [/access|akces|аксес/i, 'Аксесуари'],
    ];
    return rules.find(([pattern]) => pattern.test(query))?.[1] || '';
  }

  async function answer(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return;
    message(query, true);
    const lowered = query.toLocaleLowerCase(language);
    try {
      cachedProducts ||= await TM.fetchProducts();
      const category = categoryFrom(lowered);
      const condition = /used|używan|б\/в|вжив/i.test(lowered) ? 'used' : /new|now|нов/i.test(lowered) ? 'new' : '';
      const numbers = lowered.match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || [];
      const budget = numbers.length ? Math.max(...numbers) : null;
      const words = lowered.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2);
      const ranked = cachedProducts
        .filter((product) => (!category || product.category === category) && (!condition || product.condition === condition) && (budget == null || product.price <= budget))
        .map((product) => ({
          product,
          score: words.reduce((score, word) => `${product.title} ${product.brand} ${product.category}`.toLocaleLowerCase(language).includes(word) ? score + 1 : score, 0)
        }))
        .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
        .slice(0, 3);
      if (!ranked.length) return message(copy.empty);
      const wrapper = node('div', 'assistant-message');
      wrapper.append(node('p', '', copy.found));
      ranked.forEach(({ product }) => {
        const link = node('a', 'assistant-result');
        link.href = TM.productLink(product.id);
        link.append(node('strong', '', product.title), node('span', '', TM.formatPrice(product.price, product.currency)));
        wrapper.append(link);
      });
      document.getElementById('assistantMessages').append(wrapper);
      wrapper.scrollIntoView({ block: 'nearest' });
    } catch (_error) {
      message(copy.error);
    }
  }

  function install() {
    const toggle = node('button', 'assistant-toggle', 'AI');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', copy.open);
    const panel = node('section', 'assistant-panel');
    panel.hidden = true;
    const close = node('button', 'assistant-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    const header = node('header', 'assistant-header');
    const heading = node('div');
    heading.append(node('strong', '', copy.title), node('small', '', copy.subtitle));
    header.append(heading, close);
    const messages = node('div', 'assistant-messages');
    messages.id = 'assistantMessages';
    const quick = node('div', 'assistant-quick');
    copy.quick.forEach((label) => {
      const button = node('button', '', label);
      button.type = 'button';
      button.addEventListener('click', () => answer(label));
      quick.append(button);
    });
    const input = node('input');
    input.placeholder = copy.placeholder;
    input.required = true;
    const submit = node('button', 'button button--primary', copy.send);
    submit.type = 'submit';
    const form = node('form', 'assistant-form');
    form.append(input, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value;
      input.value = '';
      answer(value);
    });
    panel.append(header, messages, quick, form);
    document.body.append(toggle, panel);
    message(copy.greeting);
    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) input.focus();
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
