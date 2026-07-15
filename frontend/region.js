(() => {
  'use strict';

  const KEY = 'nashary-region';
  const REGIONS = Object.freeze({
    pl: { currency: 'PLN', flag: '🇵🇱', names: { pl: 'Polska', uk: 'Польща', en: 'Poland' } },
    ua: { currency: 'UAH', flag: '🇺🇦', names: { pl: 'Ukraina', uk: 'Україна', en: 'Ukraine' } },
    eu: { currency: 'EUR', flag: '🇪🇺', names: { pl: 'Europa', uk: 'Європа', en: 'Europe' } },
  });
  const language = window.NaSharyI18n?.language || 'pl';
  let region = 'pl';

  try {
    const saved = localStorage.getItem(KEY);
    if (REGIONS[saved]) region = saved;
    const requested = new URLSearchParams(location.search).get('region')?.toLowerCase();
    if (REGIONS[requested]) {
      region = requested;
      localStorage.setItem(KEY, requested);
    }
  } catch (_error) { /* storage may be unavailable */ }

  function regionName(code = region) {
    return REGIONS[code]?.names[language] || REGIONS[code]?.names.pl || '';
  }

  function installSwitcher() {
    const host = document.querySelector('.header-actions, .cabinet-header__actions');
    if (!host) return;

    const labels = {
      pl: { menu: 'Język i region', language: 'Język', region: 'Region' },
      uk: { menu: 'Мова та регіон', language: 'Мова', region: 'Регіон' },
      en: { menu: 'Language and region', language: 'Language', region: 'Region' },
    }[language];
    const languageNames = { pl: 'Polski', uk: 'Українська', en: 'English' };
    const control = document.createElement('div');
    control.className = 'locale-menu';
    const trigger = document.createElement('button');
    trigger.className = 'locale-menu__trigger';
    trigger.type = 'button';
    trigger.title = labels.menu;
    trigger.setAttribute('aria-label', labels.menu);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z"/></svg>';

    const panel = document.createElement('div');
    panel.className = 'locale-menu__panel';
    panel.hidden = true;
    const makeGroup = (title) => {
      const group = document.createElement('div');
      group.className = 'locale-menu__group';
      const heading = document.createElement('span');
      heading.className = 'locale-menu__label';
      heading.textContent = title;
      group.append(heading);
      return group;
    };
    const languageGroup = makeGroup(labels.language);
    Object.entries(languageNames).forEach(([code, name]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('is-active', code === language);
      button.textContent = name;
      button.addEventListener('click', () => {
        if (code === language) return;
        try { localStorage.setItem('nashary-language', code); } catch (_error) { /* no-op */ }
        location.reload();
      });
      languageGroup.append(button);
    });
    const regionGroup = makeGroup(labels.region);
    Object.entries(REGIONS).forEach(([code, details]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('is-active', code === region);
      button.textContent = `${details.names[language]} · ${details.currency}`;
      button.addEventListener('click', () => {
        if (code === region) return;
        try {
          localStorage.setItem(KEY, code);
          localStorage.removeItem('nashary-cart');
        } catch (_error) { /* no-op */ }
        const url = new URL(location.href);
        url.searchParams.set('region', code);
        location.href = url.toString();
      });
      regionGroup.append(button);
    });
    panel.append(languageGroup, regionGroup);
    control.append(trigger, panel);
    host.prepend(control);

    const close = () => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };
    trigger.addEventListener('click', () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', (event) => { if (!control.contains(event.target)) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  function updateRegionalLabels() {
    const locationOption = document.querySelector('#locationFilter option[value=""]');
    if (locationOption) {
      const prefixes = { pl: 'Cała', uk: 'Уся', en: 'All of' };
      locationOption.textContent = `${prefixes[language]} ${regionName()}`;
    }
    const priceCurrency = document.querySelector('#price')?.closest('.input-suffix')?.querySelector('b');
    if (priceCurrency) priceCurrency.textContent = REGIONS[region].currency;
  }

  function start() {
    installSwitcher();
    updateRegionalLabels();
  }

  window.NaSharyRegion = Object.freeze({
    region,
    currency: REGIONS[region].currency,
    regions: REGIONS,
    name: regionName,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
