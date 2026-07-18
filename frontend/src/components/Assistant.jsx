import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';

const copy = {
  pl: {
    title: 'Pomocnik NaShary', beta: 'smart search',
    lead: 'Opisz sprzęt własnymi słowami — rozpoznam budżet, stan i kategorię.',
    welcome: 'Cześć! Mogę znaleźć ofertę w Twoim regionie. Napisz np. „używany iPhone do 2000 zł” albo wybierz podpowiedź.',
    placeholder: 'Czego szukasz?', send: 'Wyślij', clear: 'Wyczyść rozmowę', close: 'Zamknij',
    showAll: 'Pokaż wszystkie wyniki', error: 'Nie udało się teraz przeszukać katalogu. Spróbuj ponownie.',
    region: 'Oferty tylko z regionu', used: 'Używane', new: 'Nowe', verified: 'Zweryfikowany',
    quick: ['Telefon do 2000 zł', 'Używany laptop do 3000 zł', 'Gaming z dostawą', 'Nowe słuchawki'],
  },
  uk: {
    title: 'Помічник NaShary', beta: 'розумний пошук',
    lead: 'Опиши техніку своїми словами — я визначу бюджет, стан і категорію.',
    welcome: 'Привіт! Я знайду пропозиції у твоєму регіоні. Напиши, наприклад, «вживаний iPhone до 2000» або вибери підказку.',
    placeholder: 'Що шукаєш?', send: 'Надіслати', clear: 'Очистити розмову', close: 'Закрити',
    showAll: 'Показати всі результати', error: 'Зараз не вдалося перевірити каталог. Спробуй ще раз.',
    region: 'Пропозиції лише з регіону', used: 'Вживане', new: 'Нове', verified: 'Перевірений',
    quick: ['Телефон до 2000', 'Вживаний ноутбук до 3000', 'Геймінг з доставкою', 'Нові навушники'],
  },
  en: {
    title: 'NaShary assistant', beta: 'smart search',
    lead: 'Describe the device naturally — I will identify budget, condition and category.',
    welcome: 'Hi! I can find offers in your region. Try “pre-owned iPhone under 2000” or choose a suggestion.',
    placeholder: 'What are you looking for?', send: 'Send', clear: 'Clear conversation', close: 'Close',
    showAll: 'Show all results', error: 'I could not search the catalog right now. Please try again.',
    region: 'Offers only from', used: 'Pre-owned', new: 'New', verified: 'Verified',
    quick: ['Phone under 2000', 'Used laptop under 3000', 'Gaming with delivery', 'New headphones'],
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
  const { language, region, regions, formatPrice } = useStore();
  const c = copy[language] || copy.pl;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef(null);
  const requestRef = useRef(0);

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
    if (text.length < 2) return;
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

  return (
    <div className={`assistant${open ? ' is-open' : ''}`}>
      <button className="assistant-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label={c.title} aria-expanded={open} aria-controls="nashary-assistant">
        <span>Na</span><b>?</b>
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
            <div className="assistant-bubble assistant-bubble--assistant"><span className="assistant-avatar">Na</span><p>{c.welcome}</p></div>
            {messages.map((message) => message.role === 'user' ? (
              <div className="assistant-bubble assistant-bubble--user" key={message.id}><p>{message.text}</p></div>
            ) : (
              <div className="assistant-bubble assistant-bubble--assistant" key={message.id}>
                <span className="assistant-avatar">Na</span>
                <div className="assistant-answer">
                  <p>{message.reply}</p>
                  {message.results?.length > 0 && <div className="assistant-products">{message.results.map((product) => <AssistantProduct product={product} language={language} formatPrice={formatPrice} close={() => setOpen(false)} key={product.id} />)}</div>}
                  {message.catalogQuery && <Link className="assistant-show-all" to={`/catalog?${message.catalogQuery}`} onClick={() => setOpen(false)}>{c.showAll}<span>→</span></Link>}
                </div>
              </div>
            ))}
            {busy && <div className="assistant-bubble assistant-bubble--assistant"><span className="assistant-avatar">Na</span><span className="assistant-typing"><i /><i /><i /></span></div>}
          </div>

          <div className="assistant-quick-react">{c.quick.map((item) => <button type="button" onClick={() => runSearch(item)} disabled={busy} key={item}>{item}</button>)}</div>
          <form className="assistant-form-react" onSubmit={submit}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.placeholder} autoComplete="off" />
            <button type="submit" disabled={busy || query.trim().length < 2} aria-label={c.send}>↑</button>
          </form>
          <p className="assistant-disclaimer">{c.lead}</p>
        </section>
      )}
    </div>
  );
}
