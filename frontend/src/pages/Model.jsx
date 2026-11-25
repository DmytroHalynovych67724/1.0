import { listingCount } from '../listingCount.mjs';
import { specLabels } from '../specLabels.mjs';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import ProductCard from '../components/ProductCard';
import ModelOffer from '../components/ModelOffer';
import { conditionCopy } from '../deviceCondition.mjs';
import { filterModelOffers, variantOptions } from '../modelOffers.mjs';
import { categoryLabel } from '../catalogTaxonomy';
import { useStore } from '../store';

const words = {
  pl: { offers: 'Oferty', specs: 'Parametry', reviews: 'Opinie', questions: 'Pytania', accessories: 'Akcesoria', from: 'od', found: 'dostępne oferty', all: 'Wszystkie', color: 'Kolor', storage: 'Pamięć', condition: 'Stan urządzenia', battery: 'Bateria', display: 'Ekran', body: 'Obudowa', completeness: 'Zestaw', defects: 'Wady', warranty: 'Gwarancja', seller: 'Sprzedawca', details: 'Zobacz ogłoszenie', add: 'Do koszyka', share: 'Udostępnij', copied: 'Link skopiowany', ask: 'Zadaj pytanie o ten model', placeholder: 'Np. czy wszystkie oferty mają sprawdzony numer seryjny?', send: 'Wyślij pytanie', login: 'Zaloguj się, aby zapytać', noQuestions: 'Nie ma jeszcze pytań.', answer: 'Odpowiedź sprzedawcy', answerNow: 'Odpowiedz', choose: 'Wybierz wariant', compare: 'Porównaj oferty jednego modelu' },
  uk: { offers: 'Пропозиції', specs: 'Характеристики', reviews: 'Відгуки', questions: 'Питання', accessories: 'Аксесуари', from: 'від', found: 'доступних пропозицій', all: 'Усі', color: 'Колір', storage: 'Пам’ять', condition: 'Стан пристрою', battery: 'Батарея', display: 'Екран', body: 'Корпус', completeness: 'Комплектація', defects: 'Дефекти', warranty: 'Гарантія', seller: 'Продавець', details: 'Відкрити оголошення', add: 'До кошика', share: 'Поділитися', copied: 'Посилання скопійовано', ask: 'Поставити питання про модель', placeholder: 'Наприклад, чи всі пропозиції мають перевірений серійний номер?', send: 'Надіслати питання', login: 'Увійдіть, щоб запитати', noQuestions: 'Питань поки немає.', answer: 'Відповідь продавця', answerNow: 'Відповісти', choose: 'Оберіть варіант', compare: 'Порівняйте пропозиції однієї моделі' },
  en: { offers: 'Offers', specs: 'Specifications', reviews: 'Reviews', questions: 'Questions', accessories: 'Accessories', from: 'from', found: 'available offers', all: 'All', color: 'Color', storage: 'Storage', condition: 'Device condition', battery: 'Battery', display: 'Display', body: 'Body', completeness: 'Included', defects: 'Defects', warranty: 'Warranty', seller: 'Seller', details: 'View listing', add: 'Add to cart', share: 'Share', copied: 'Link copied', ask: 'Ask about this model', placeholder: 'For example, do all offers have a checked serial number?', send: 'Send question', login: 'Sign in to ask', noQuestions: 'No questions yet.', answer: 'Seller answer', answerNow: 'Answer', choose: 'Choose variant', compare: 'Compare offers for one model' },
};

function ModelContent() {
  const { brand, model } = useParams();
  const { region, language, formatPrice, user, flash, t } = useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [question, setQuestion] = useState('');
  const [filters, setFilters] = useState({ color: '', storage: '', condition: '' });
  const [busy, setBusy] = useState(false);
  const dc = conditionCopy[language] || conditionCopy.pl;
  const [answering, setAnswering] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const decodedBrand = decodeURIComponent(brand || '');
  const decodedModel = decodeURIComponent(model || '');
  useEffect(() => {
    let active = true;
    const search = new URLSearchParams({ brand: decodedBrand, model: decodedModel, region });
    Promise.all([api(`/products/model?${search}`), api(`/marketplace/questions?${search}`).catch(() => [])])
      .then(([modelData, questionData]) => { if (!active) return; setData(modelData); setQuestions(questionData); document.title = `${modelData.brand} ${modelData.model} — NaShary`; })
      .catch(() => { if (active) setData(false); });
    return () => { active = false; };
  }, [decodedBrand, decodedModel, region]);
  const offers = useMemo(() => filterModelOffers(data?.offers || [], filters), [data, filters]);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const share = async () => {
    const payload = { title: `${decodedBrand} ${decodedModel}`, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => {});
    else { await navigator.clipboard.writeText(payload.url); flash(c.copied); }
  };
  const ask = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth', { state: { from: window.location.pathname } });
    if (busy) return;
    setBusy(true);
    try {
    const saved = await api('/marketplace/questions', { method: 'POST', body: JSON.stringify({ productId: data.offers[0].id, question }) });
    setQuestions((items) => [saved, ...items]); setQuestion('');
    } catch (error) { flash(error.message); } finally { setBusy(false); }
  };
  const canAnswer = Boolean(user && (user.role === 'admin' || data?.offers?.some((item) => item.sellerId === user.id)));
  const answerQuestion = async (event, id) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
    const saved = await api(`/marketplace/questions/${id}/answer`, { method: 'PATCH', body: JSON.stringify({ answer: answerText }) });
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, ...saved } : item)); setAnswering(null); setAnswerText('');
    } catch (error) { flash(error.message); } finally { setBusy(false); }
  };
  if (data === null) return <div className="shell page-loader">…</div>;
  if (data === false) return <div className="shell empty-panel"><h1>{language === 'uk' ? 'Модель не знайдено' : language === 'en' ? 'Model not found' : 'Nie znaleziono modelu'}</h1><Link to="/catalog">{t('catalog')}</Link></div>;
  return <main className="model-page">
    <div className="shell breadcrumbs"><Link to="/catalog">{t('catalog')}</Link><span>/</span><span>{categoryLabel(data.category, language)}</span><span>/</span><b>{data.model}</b></div>
    <section className="shell model-hero">
      <div className="model-hero__image"><img src={imageUrl(data.image)} alt={`${data.brand} ${data.model}`} /><span>{listingCount(data.offers.length, language)}</span></div>
      <div className="model-hero__info"><span className="eyebrow">{data.brand} · {categoryLabel(data.category, language)}</span><h1>{data.brand} {data.model}</h1><p>{language === 'uk' ? 'Порівняйте конкретні пропозиції: комплектація, стан і характеристики можуть відрізнятися.' : language === 'en' ? 'Compare individual offers: configurations, condition and specifications may differ.' : 'Porównaj konkretne oferty: konfiguracja, stan i parametry mogą się różnić.'}</p><div className="model-price-from"><small>{c.from}</small><strong>{formatPrice(data.price.min, data.price.currency)}</strong></div><div className="model-hero__actions"><button className="primary-button" type="button" onClick={() => jump('model-offers')}>{c.offers}</button><button className="quiet-button" type="button" onClick={share}>↗ {c.share}</button></div></div>
    </section>
    <nav className="model-tabs"><div className="shell">{[['model-offers', c.offers, data.offers.length], ['model-specs', c.specs, ''], ['model-reviews', c.reviews, data.reviews.length], ['model-questions', c.questions, questions.length], ['model-accessories', c.accessories, data.accessories.length]].map(([id, label, count]) => <button type="button" key={id} onClick={() => jump(id)}>{label}{count !== '' && <span>{count}</span>}</button>)}</div></nav>
    <section className="shell model-offers-section" id="model-offers"><header><div><span className="section-label">NaShary Market</span><h2>{c.compare}</h2></div><p>{listingCount(offers.length, language)}</p></header><div className="model-variant-filter"><b>{c.choose}</b>
        <div><span>{c.condition}</span>{['', 'new', 'used'].map((value) => <button type="button" aria-pressed={filters.condition === value} className={filters.condition === value ? 'is-active' : ''} key={value} onClick={() => setFilters({ condition: value, color: '', storage: '' })}>{value ? t(value) : c.all}</button>)}</div>
        {['color', 'storage'].map((key) => { const options = variantOptions(data.offers, filters, key); return options.length > 0 && <div key={key} role="group" aria-label={c[key]}><span>{c[key]}</span><button type="button" aria-pressed={!filters[key]} className={!filters[key] ? 'is-active' : ''} onClick={() => setFilters({ ...filters, [key]: '' })}>{c.all}</button>{options.map(({ value, count }) => <button type="button" disabled={!count} aria-pressed={filters[key] === value} className={filters[key] === value ? 'is-active' : ''} key={value} onClick={() => setFilters({ ...filters, [key]: value })}>{value} ({count})</button>)}</div>; })}
      </div>
      <div className="model-offer-list">{offers.map((offer) => <ModelOffer key={offer.id} offer={offer} words={c}/>)}</div>
      {!offers.length && <p className="soft-empty">{language === 'uk' ? 'Для цієї комбінації немає оголошень. Змініть фільтри.' : language === 'en' ? 'No listings for this combination. Change the filters.' : 'Brak ofert dla tej kombinacji. Zmień filtry.'}</p>}
      <p className="model-condition-note">{dc.hint}</p>
    </section>
    <section className="shell model-specs-section" id="model-specs"><span className="section-label">Tech</span><h2>{c.specs}</h2><p className="model-condition-note">{language === 'uk' ? 'Приклад характеристик однієї пропозиції. Точну конфігурацію дивіться в обраному оголошенні.' : language === 'en' ? 'Example specifications from one offer. Check the selected listing for its exact configuration.' : 'Przykładowe parametry jednej oferty. Dokładną konfigurację sprawdź w wybranym ogłoszeniu.'}</p><dl>{Object.entries(data.specs || {}).map(([key, value]) => <div key={key}><dt>{specLabels[key]?.[language] || key}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="shell model-community" id="model-reviews"><header><h2>{c.reviews}</h2><strong>{data.reviews.length ? `${(data.reviews.reduce((sum, item) => sum + item.rating, 0) / data.reviews.length).toFixed(1)} ★` : '—'}</strong></header><div>{data.reviews.length ? data.reviews.map((review) => <article key={review.id}><b>{review.username}</b><span>{'★'.repeat(review.rating)}</span><p>{review.comment}</p></article>) : <p className="soft-empty">—</p>}</div></section>
    <section className="shell model-questions" id="model-questions"><header><h2>{c.questions}</h2><span>{questions.length}</span></header><div className="model-question-layout"><div>{questions.length ? questions.map((item) => <article key={item.id}><b>{item.username}</b><p>{item.question}</p>{item.answer && <blockquote><small>{c.answer}</small>{item.answer}</blockquote>}{canAnswer && !item.answer && (answering === item.id ? <form className="inline-answer" onSubmit={(event) => answerQuestion(event, item.id)}><input required minLength="2" value={answerText} onChange={(event) => setAnswerText(event.target.value)}/><button type="submit" disabled={busy}>{c.send}</button></form> : <button className="text-button" type="button" onClick={() => setAnswering(item.id)}>{c.answerNow}</button>)}</article>) : <p className="soft-empty">{c.noQuestions}</p>}</div><form onSubmit={ask}><b>{c.ask}</b><textarea required minLength="5" maxLength="600" placeholder={c.placeholder} value={question} onChange={(event) => setQuestion(event.target.value)}/><button className="primary-button" type="submit" disabled={busy}>{user ? c.send : c.login}</button></form></div></section>
    {data.accessories.length > 0 && <section className="shell product-recommendations" id="model-accessories"><header><h2>{c.accessories}</h2></header><div className="product-grid-react">{data.accessories.slice(0, 4).map((item) => <ProductCard key={item.id} product={item}/>)}</div></section>}
  </main>;
}

export default function Model() {
  const { brand, model } = useParams();
  const { region } = useStore();
  return <ModelContent key={`${brand}:${model}:${region}`}/>;
}
