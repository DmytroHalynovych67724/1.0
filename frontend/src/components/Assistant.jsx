import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';
import BrandMark from './BrandMark';
import { sectionPath } from '../catalogSections.mjs';

const copy = {
  pl: {
    title: 'Doradca NaShary', beta: 'elektronika · dobór ofert', ai: 'AI · Groq', local: 'Wyszukiwanie', restricted: 'Tylko elektronika', setup: 'AI nie jest jeszcze podłączone. Wyszukiwanie ofert działa.',
    lead: 'AI przez Groq może się mylić. Sprawdzaj dokładny wariant; ceny i dostępność są w kartach ofert.',
    welcome: 'Cześć! Zapytaj o parametry, porównanie lub zgodność sprzętu. Podaj model i budżet, a znajdę rzeczywiste oferty NaShary w Twoim regionie.',
    placeholder: 'Czego szukasz?', send: 'Wyślij', clear: 'Wyczyść rozmowę', close: 'Zamknij',
    showAll: 'Pokaż wszystkie wyniki', error: 'Nie udało się teraz przeszukać katalogu. Spróbuj ponownie.',
    region: 'Oferty tylko z regionu', used: 'Używane', new: 'Nowe', verified: 'Zweryfikowany',
    quick: ['Czym OLED różni się od IPS?', 'Ile RAM potrzebuje laptop?', 'Używany iPhone do 2000 zł'],
  },
  uk: {
    title: 'Техноконсультант NaShary', beta: 'техніка · підбір товарів', ai: 'AI · Groq', local: 'Пошук каталогу', restricted: 'Лише про техніку', setup: 'AI-консультації ще не підключені. Пошук товарів працює.',
    lead: 'AI через Groq може помилятися. Перевіряй точну версію пристрою; ціни й наявність — у картках товарів.',
    welcome: 'Привіт! Запитай про характеристики, порівняння чи сумісність техніки. Або напиши модель і бюджет — підберу реальні оголошення NaShary у твоєму регіоні.',
    placeholder: 'Що шукаєш?', send: 'Надіслати', clear: 'Очистити розмову', close: 'Закрити',
    showAll: 'Показати всі результати', error: 'Зараз не вдалося перевірити каталог. Спробуй ще раз.',
    region: 'Пропозиції лише з регіону', used: 'Вживане', new: 'Нове', verified: 'Позначений акаунт продавця',
    quick: ['Чим OLED відрізняється від IPS?', 'Скільки RAM потрібно ноутбуку?', 'Вживаний iPhone до 2000'],
  },
  en: {
    title: 'NaShary tech adviser', beta: 'electronics · product finder', ai: 'AI · Groq', local: 'Catalog search', restricted: 'Electronics only', setup: 'AI is not connected yet. Product search still works.',
    lead: 'AI via Groq can make mistakes. Verify the exact device version; prices and availability appear in product cards.',
    welcome: 'Hi! Ask about device specifications, comparisons or compatibility. Give me a model and budget to find real NaShary offers in your region.',
    placeholder: 'What are you looking for?', send: 'Send', clear: 'Clear conversation', close: 'Close',
    showAll: 'Show all results', error: 'I could not search the catalog right now. Please try again.',
    region: 'Offers only from', used: 'Pre-owned', new: 'New', verified: 'Verified',
    quick: ['How does OLED differ from IPS?', 'How much RAM does a laptop need?', 'Used iPhone under 2000'],
  },
};

function AssistantProduct({ product, language, formatPrice, close }) {
  const c = copy[language] || copy.pl;
  return (
    <Link className="assistant-product" to={`/product/${product.id}`} onClick={close}>
      <img src={imageUrl(product.images?.[0])} alt="" />
      <span>
        <b>{product.title}</b>
        <small>{product.location} · {product.condition === 'new' ? c.new : c.used}{product.sellerVerified ? ` · ${c.verified}` : ''}</small>
      </span>
      <strong>{formatPrice(product.price, product.currency)}</strong>
    </Link>
  );
}

export default function Assistant() {
  const { region, language } = useStore();
  return <CatalogSearchAssistant key={`${region}:${language}`} />;
}

function CatalogSearchAssistant() {
  const { language, region, regions, formatPrice } = useStore();
  const { pathname } = useLocation();
  const c = copy[language] || copy.pl;
  const [open, setOpen] = useState(false);
  const [aiConfigured, setAIConfigured] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef(null);
  const requestRef = useRef(0);
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api('/marketplace/assistant/status').then(data => { if (active) setAIConfigured(data.configured); }).catch(() => {});
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, busy, open]);

  const runSearch = async (value) => {
    const text = String(value || '').trim();
    if (text.length < 2 || busy) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const messageId = `assistant-${requestId}`;
    setMessages((current) => [...current, { id: `${messageId}-user`, role: 'user', text }]);
    setQuery('');
    setBusy(true);
    try {
      const history = messages
        .slice(-6)
        .map((message) => ({
          role: message.role,
          content: message.role === 'user' ? message.text : message.reply,
        }))
        .filter((message) => message.content);
      const response = await api('/marketplace/assistant', {
        method: 'POST',
        body: JSON.stringify({ q: text, region, language, history }),
      });
      if (requestId !== requestRef.current) return;
      setMessages((current) => [...current, { id: `${messageId}-assistant`, role: 'assistant', ...response }]);
    } catch (_error) {
      if (requestId !== requestRef.current) return;
      setMessages((current) => [...current, { id: `${messageId}-error`, role: 'assistant', reply: c.error, results: [] }]);
    } finally {
      if (requestId === requestRef.current) setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  const clearConversation = () => {
    requestRef.current += 1;
    setBusy(false);
    setMessages([]);
    setQuery('');
  };

  if (pathname.startsWith('/games') || pathname === '/cart' || pathname === '/auth') return null;
  return (
    <div className={`assistant${open ? ' is-open' : ''}`}>
      <button className="assistant-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label={c.title} aria-expanded={open} aria-controls="nashary-assistant">
        <BrandMark /><b>?</b>
      </button>
      {open && (
        <section className="assistant-panel" id="nashary-assistant" role="dialog" aria-label={c.title}>
          <header className="assistant-panel__header">
            <div><span className="eyebrow">{c.beta}</span><h3>{c.title}</h3><small>{c.region}: {regions[region].label[language]}</small></div>
            <div className="assistant-header-actions">
              {messages.length > 0 && <button type="button" onClick={clearConversation} aria-label={c.clear} title={c.clear}>↺</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label={c.close}>×</button>
            </div>
          </header>

          <div className="assistant-messages-react" ref={messagesRef} aria-live="polite">
            {aiConfigured === false && <p className="assistant-connection-note">{c.setup}</p>}
            <div className="assistant-bubble assistant-bubble--assistant"><span className="assistant-avatar"><BrandMark /></span><p>{c.welcome}</p></div>
            {messages.map((message) => message.role === 'user' ? (
              <div className="assistant-bubble assistant-bubble--user" key={message.id}><p>{message.text}</p></div>
            ) : (
              <div className="assistant-bubble assistant-bubble--assistant" key={message.id}>
                <span className="assistant-avatar"><BrandMark /></span>
                <div className="assistant-answer">
                  {message.assistantMode && <small className="assistant-mode">{message.assistantMode === 'ai' ? c.ai : message.assistantMode === 'restricted' ? c.restricted : c.local}</small>}
                  <p>{message.reply}</p>
                  {message.results?.length > 0 && <div className="assistant-products">{message.results.map((product) => <AssistantProduct product={product} language={language} formatPrice={formatPrice} close={() => setOpen(false)} key={product.id} />)}</div>}
                  {message.catalogQuery && <Link className="assistant-show-all" to={`${sectionPath(message.filters?.condition === 'used' ? 'used' : 'new')}?${message.catalogQuery}`} onClick={() => setOpen(false)}>{c.showAll}<span>→</span></Link>}
                </div>
              </div>
            ))}
            {busy && <div className="assistant-bubble assistant-bubble--assistant"><span className="assistant-avatar"><BrandMark /></span><span className="assistant-typing"><i /><i /><i /></span></div>}
          </div>

          <div className="assistant-quick-react">{c.quick.map((item) => <button type="button" onClick={() => runSearch(item)} disabled={busy} key={item}>{item}</button>)}</div>
          <form className="assistant-form-react" onSubmit={submit}>
            <input maxLength={600} aria-label={c.placeholder} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.placeholder} autoComplete="off" />
            <button type="submit" disabled={busy || query.trim().length < 2} aria-label={c.send}>↑</button>
          </form>
          <p className="assistant-disclaimer">{c.lead}</p>
        </section>
      )}
    </div>
  );
}
