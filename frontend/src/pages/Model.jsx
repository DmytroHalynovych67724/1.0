import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import ProductCard from '../components/ProductCard';
import { useStore } from '../store';

const words = {
  pl: { offers: 'Oferty', specs: 'Parametry', reviews: 'Opinie', questions: 'Pytania', accessories: 'Akcesoria', from: 'od', found: 'dostępne oferty', all: 'Wszystkie', color: 'Kolor', storage: 'Pamięć', condition: 'Stan urządzenia', battery: 'Bateria', display: 'Ekran', body: 'Obudowa', completeness: 'Zestaw', defects: 'Wady', warranty: 'Gwarancja', seller: 'Sprzedawca', details: 'Zobacz ogłoszenie', add: 'Do koszyka', share: 'Udostępnij', copied: 'Link skopiowany', index: 'NaShary Index', indexText: 'Czytelna ocena stanu na podstawie baterii, ekranu, obudowy i kompletu.', ask: 'Zadaj pytanie o ten model', placeholder: 'Np. czy wszystkie oferty mają sprawdzony numer seryjny?', send: 'Wyślij pytanie', login: 'Zaloguj się, aby zapytać', noQuestions: 'Nie ma jeszcze pytań.', answer: 'Odpowiedź sprzedawcy', answerNow: 'Odpowiedz', choose: 'Wybierz wariant', compare: 'Porównaj oferty jednego modelu' },
  uk: { offers: 'Пропозиції', specs: 'Характеристики', reviews: 'Відгуки', questions: 'Питання', accessories: 'Аксесуари', from: 'від', found: 'доступних пропозицій', all: 'Усі', color: 'Колір', storage: 'Пам’ять', condition: 'Стан пристрою', battery: 'Батарея', display: 'Екран', body: 'Корпус', completeness: 'Комплектація', defects: 'Дефекти', warranty: 'Гарантія', seller: 'Продавець', details: 'Відкрити оголошення', add: 'До кошика', share: 'Поділитися', copied: 'Посилання скопійовано', index: 'NaShary Index', indexText: 'Зрозуміла оцінка стану на основі батареї, екрана, корпусу та комплектації.', ask: 'Поставити питання про модель', placeholder: 'Наприклад, чи всі пропозиції мають перевірений серійний номер?', send: 'Надіслати питання', login: 'Увійдіть, щоб запитати', noQuestions: 'Питань поки немає.', answer: 'Відповідь продавця', answerNow: 'Відповісти', choose: 'Оберіть варіант', compare: 'Порівняйте пропозиції однієї моделі' },
  en: { offers: 'Offers', specs: 'Specifications', reviews: 'Reviews', questions: 'Questions', accessories: 'Accessories', from: 'from', found: 'available offers', all: 'All', color: 'Color', storage: 'Storage', condition: 'Device condition', battery: 'Battery', display: 'Display', body: 'Body', completeness: 'Included', defects: 'Defects', warranty: 'Warranty', seller: 'Seller', details: 'View listing', add: 'Add to cart', share: 'Share', copied: 'Link copied', index: 'NaShary Index', indexText: 'A clear condition score based on battery, display, body and included items.', ask: 'Ask about this model', placeholder: 'For example, do all offers have a checked serial number?', send: 'Send question', login: 'Sign in to ask', noQuestions: 'No questions yet.', answer: 'Seller answer', answerNow: 'Answer', choose: 'Choose variant', compare: 'Compare offers for one model' },
};

function offerScore(offer) {
  if (offer.condition === 'new') return 100;
  const details = offer.deviceDetails || {};
  let score = Number(details.batteryHealth) || 80;
  if (/bardzo|excellent|відмін/i.test(details.display || '')) score += 4;
  if (/bardzo|excellent|відмін/i.test(details.body || '')) score += 3;
  if (/pełny|full|повн/i.test(details.completeness || '')) score += 3;
  return Math.min(99, Math.round(score));
}

export default function Model() {
  const { brand, model } = useParams();
  const { region, language, formatPrice, addToCart, user, flash } = useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [question, setQuestion] = useState('');
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('');
  const [answering, setAnswering] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const decodedBrand = decodeURIComponent(brand || '');
  const decodedModel = decodeURIComponent(model || '');
  useEffect(() => {
    const search = new URLSearchParams({ brand: decodedBrand, model: decodedModel, region });
    Promise.all([api(`/products/model?${search}`), api(`/marketplace/questions?${search}`).catch(() => [])])
      .then(([modelData, questionData]) => { setData(modelData); setQuestions(questionData); document.title = `${modelData.brand} ${modelData.model} — NaShary`; })
      .catch(() => setData(false));
  }, [decodedBrand, decodedModel, region]);
  const offers = useMemo(() => data?.offers?.filter((item) => (!color || item.specs?.color === color) && (!storage || item.specs?.storage === storage)) || [], [data, color, storage]);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const share = async () => {
    const payload = { title: `${decodedBrand} ${decodedModel}`, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => {});
    else { await navigator.clipboard.writeText(payload.url); flash(c.copied); }
  };
  const ask = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth', { state: { from: window.location.pathname } });
    const saved = await api('/marketplace/questions', { method: 'POST', body: JSON.stringify({ productId: data.offers[0].id, question }) });
    setQuestions((items) => [saved, ...items]); setQuestion('');
  };
  const canAnswer = Boolean(user && (user.role === 'admin' || data?.offers?.some((item) => item.sellerId === user.id)));
  const answerQuestion = async (event, id) => {
    event.preventDefault();
    const saved = await api(`/marketplace/questions/${id}/answer`, { method: 'PATCH', body: JSON.stringify({ answer: answerText }) });
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, ...saved } : item)); setAnswering(null); setAnswerText('');
  };
  if (data === null) return <div className="shell page-loader">…</div>;
  if (data === false) return <div className="shell empty-panel"><h1>Model not found</h1><Link to="/catalog">Catalog</Link></div>;
  return <main className="model-page">
    <div className="shell breadcrumbs"><Link to="/catalog">Catalog</Link><span>/</span><span>{data.category}</span><span>/</span><b>{data.model}</b></div>
    <section className="shell model-hero">
      <div className="model-hero__image"><img src={imageUrl(data.image)} alt={`${data.brand} ${data.model}`} /><span>{data.offers.length} {c.found}</span></div>
      <div className="model-hero__info"><span className="eyebrow">{data.brand} · {data.category}</span><h1>{data.brand} {data.model}</h1><p>{data.description}</p><div className="model-price-from"><small>{c.from}</small><strong>{formatPrice(data.price.min, data.price.currency)}</strong></div><div className="model-hero__actions"><button className="primary-button" type="button" onClick={() => jump('model-offers')}>{c.offers}</button><button className="quiet-button" type="button" onClick={share}>↗ {c.share}</button></div></div>
    </section>
    <nav className="model-tabs"><div className="shell">{[['model-offers', c.offers, data.offers.length], ['model-specs', c.specs, ''], ['model-reviews', c.reviews, data.reviews.length], ['model-questions', c.questions, questions.length], ['model-accessories', c.accessories, data.accessories.length]].map(([id, label, count]) => <button type="button" key={id} onClick={() => jump(id)}>{label}{count !== '' && <span>{count}</span>}</button>)}</div></nav>
    <section className="shell model-offers-section" id="model-offers"><header><div><span className="section-label">NaShary Market</span><h2>{c.compare}</h2></div><p>{offers.length} {c.found}</p></header><div className="model-variant-filter"><b>{c.choose}</b>{data.variants.colors.length > 1 && <div><span>{c.color}</span><button className={!color ? 'is-active' : ''} type="button" onClick={() => setColor('')}>{c.all}</button>{data.variants.colors.map((item) => <button className={color === item ? 'is-active' : ''} type="button" key={item} onClick={() => setColor(item)}>{item}</button>)}</div>}{data.variants.storage.length > 1 && <div><span>{c.storage}</span><button className={!storage ? 'is-active' : ''} type="button" onClick={() => setStorage('')}>{c.all}</button>{data.variants.storage.map((item) => <button className={storage === item ? 'is-active' : ''} type="button" key={item} onClick={() => setStorage(item)}>{item}</button>)}</div>}</div>
      <div className="model-offer-list">{offers.map((offer) => { const details = offer.deviceDetails || {}; const score = offerScore(offer); return <article key={offer.id} className="model-offer-card"><div className={`offer-score offer-score--${score >= 90 ? 'a' : score >= 80 ? 'b' : 'c'}`}><strong>{score}</strong><span>{c.index}</span></div><img src={imageUrl(offer.images?.[0])} alt=""/><div className="offer-core"><div><span className={`condition condition--${offer.condition}`}>{offer.condition}</span>{offer.urgent && <span className="offer-urgent">Urgent</span>}</div><h3>{offer.title}</h3><p>{offer.location} · {offer.delivery}</p><dl><div><dt>{c.battery}</dt><dd>{details.batteryHealth ? `${details.batteryHealth}%` : '—'}</dd></div><div><dt>{c.display}</dt><dd>{details.display || '—'}</dd></div><div><dt>{c.body}</dt><dd>{details.body || '—'}</dd></div><div><dt>{c.completeness}</dt><dd>{details.completeness || '—'}</dd></div><div><dt>{c.defects}</dt><dd>{details.defects || '—'}</dd></div></dl></div><div className="offer-seller"><small>{c.seller}</small><b>{offer.seller}</b>{offer.sellerVerified && <span>✓ verified</span>}<strong>{formatPrice(offer.price, offer.currency)}</strong><button className="primary-button" type="button" onClick={() => addToCart(offer)}>{c.add}</button><Link to={`/product/${offer.id}`}>{c.details}</Link></div></article>; })}</div>
      <aside className="index-explainer"><b>{c.index}</b><p>{c.indexText}</p><div><span>90–100 A</span><span>80–89 B</span><span>70–79 C</span></div></aside>
    </section>
    <section className="shell model-specs-section" id="model-specs"><span className="section-label">Tech</span><h2>{c.specs}</h2><dl>{Object.entries(data.specs || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="shell model-community" id="model-reviews"><header><h2>{c.reviews}</h2><strong>{data.reviews.length ? `${(data.reviews.reduce((sum, item) => sum + item.rating, 0) / data.reviews.length).toFixed(1)} ★` : '—'}</strong></header><div>{data.reviews.length ? data.reviews.map((review) => <article key={review.id}><b>{review.username}</b><span>{'★'.repeat(review.rating)}</span><p>{review.comment}</p></article>) : <p className="soft-empty">—</p>}</div></section>
    <section className="shell model-questions" id="model-questions"><header><h2>{c.questions}</h2><span>{questions.length}</span></header><div className="model-question-layout"><div>{questions.length ? questions.map((item) => <article key={item.id}><b>{item.username}</b><p>{item.question}</p>{item.answer && <blockquote><small>{c.answer}</small>{item.answer}</blockquote>}{canAnswer && !item.answer && (answering === item.id ? <form className="inline-answer" onSubmit={(event) => answerQuestion(event, item.id)}><input required minLength="2" value={answerText} onChange={(event) => setAnswerText(event.target.value)}/><button type="submit">{c.send}</button></form> : <button className="text-button" type="button" onClick={() => setAnswering(item.id)}>{c.answerNow}</button>)}</article>) : <p className="soft-empty">{c.noQuestions}</p>}</div><form onSubmit={ask}><b>{c.ask}</b><textarea required minLength="5" maxLength="600" placeholder={c.placeholder} value={question} onChange={(event) => setQuestion(event.target.value)}/><button className="primary-button" type="submit">{user ? c.send : c.login}</button></form></div></section>
    {data.accessories.length > 0 && <section className="shell product-recommendations" id="model-accessories"><header><h2>{c.accessories}</h2></header><div className="product-grid-react">{data.accessories.slice(0, 4).map((item) => <ProductCard key={item.id} product={item}/>)}</div></section>}
  </main>;
}
