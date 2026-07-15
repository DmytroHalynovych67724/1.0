import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';

const words = {
  pl: { eyebrow: 'NaShary Circular', title: 'Wyceń swój stary sprzęt', text: 'Trzy krótkie kroki: urządzenie, stan i sprawność. Otrzymasz orientacyjną cenę dla swojego regionu.', category: 'Rodzaj urządzenia', brand: 'Marka', model: 'Dokładny model', brandHint: 'np. Apple', modelHint: 'np. iPhone 15 Pro 256 GB', condition: 'Stan wizualny', excellent: 'Jak nowy', excellentNote: 'Bez widocznych śladów', good: 'Dobry', goodNote: 'Lekkie ślady używania', fair: 'Zużyty', fairNote: 'Rysy i wyraźne ślady', damaged: 'Uszkodzony', damagedNote: 'Wymaga naprawy', check: 'Co działa poprawnie?', submit: 'Oblicz wycenę', calculating: 'Obliczam…', result: 'Szacowana wartość', waiting: 'Uzupełnij formularz, aby zobaczyć wycenę.', create: 'Wystaw urządzenie', disclaimer: 'Wycena jest orientacyjna. Dokładna cena zależy od pamięci, zdjęć, kompletu i popytu.', checks: { screen: 'Ekran i dotyk', battery: 'Bateria', cameras: 'Aparaty', buttons: 'Przyciski', connectivity: 'Wi‑Fi i sieć', serialNumber: 'IMEI / numer seryjny' } },
  uk: { eyebrow: 'NaShary Circular', title: 'Оцініть стару техніку', text: 'Три короткі кроки: пристрій, стан і справність. Ви отримаєте орієнтовну ціну для свого регіону.', category: 'Тип пристрою', brand: 'Бренд', model: 'Точна модель', brandHint: 'наприклад Apple', modelHint: 'наприклад iPhone 15 Pro 256 GB', condition: 'Зовнішній стан', excellent: 'Як новий', excellentNote: 'Без помітних слідів', good: 'Добрий', goodNote: 'Легкі сліди використання', fair: 'Зношений', fairNote: 'Подряпини та помітні сліди', damaged: 'Пошкоджений', damagedNote: 'Потребує ремонту', check: 'Що працює правильно?', submit: 'Розрахувати оцінку', calculating: 'Розраховую…', result: 'Орієнтовна вартість', waiting: 'Заповніть форму, щоб побачити оцінку.', create: 'Створити оголошення', disclaimer: 'Оцінка орієнтовна. Точна ціна залежить від пам’яті, фотографій, комплекту та попиту.', checks: { screen: 'Екран і сенсор', battery: 'Батарея', cameras: 'Камери', buttons: 'Кнопки', connectivity: 'Wi‑Fi і мережа', serialNumber: 'IMEI / серійний номер' } },
  en: { eyebrow: 'NaShary Circular', title: 'Value your old device', text: 'Three short steps: device, condition and functionality. You will get an estimated regional value.', category: 'Device type', brand: 'Brand', model: 'Exact model', brandHint: 'e.g. Apple', modelHint: 'e.g. iPhone 15 Pro 256 GB', condition: 'Cosmetic condition', excellent: 'Like new', excellentNote: 'No visible wear', good: 'Good', goodNote: 'Light signs of use', fair: 'Worn', fairNote: 'Scratches and visible wear', damaged: 'Damaged', damagedNote: 'Needs repair', check: 'What works correctly?', submit: 'Calculate estimate', calculating: 'Calculating…', result: 'Estimated value', waiting: 'Complete the form to see an estimate.', create: 'List this device', disclaimer: 'This is an estimate. Final value depends on storage, photos, included items and demand.', checks: { screen: 'Display and touch', battery: 'Battery', cameras: 'Cameras', buttons: 'Buttons', connectivity: 'Wi-Fi and network', serialNumber: 'IMEI / serial number' } },
};

const checks = ['screen', 'battery', 'cameras', 'buttons', 'connectivity', 'serialNumber'];
const categories = [['Smartfony', '▯'], ['Laptopy', '⌨'], ['Tablety', '▭'], ['Gaming', '◇'], ['Audio', '◉']];

export default function TradeIn() {
  const { user, language, region, regions, formatPrice } = useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: 'Smartfony', brand: '', model: '', condition: 'good', answers: Object.fromEntries(checks.map((key) => [key, true])) });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { document.title = `${c.title} — NaShary`; }, [c.title]);
  if (!user) return <Navigate to="/auth" state={{ from: '/trade-in' }} replace />;
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { setResult(await api('/marketplace/trade-in', { method: 'POST', body: JSON.stringify({ ...form, region }) })); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return (
    <main className="shell trade-in-page">
      <header><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.text}</p></header>
      <div className="trade-in-layout">
        <form onSubmit={submit}>
          <section className="trade-step"><header><span>01</span><div><b>{c.category}</b><small>{c.brand} · {c.model}</small></div></header><div className="trade-category-grid">{categories.map(([value, icon]) => <button className={form.category === value ? 'is-active' : ''} type="button" onClick={() => setForm({ ...form, category: value })} key={value}><i>{icon}</i><span>{value}</span></button>)}</div><div className="trade-device-fields"><label><span>{c.brand}</span><input required placeholder={c.brandHint} value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></label><label><span>{c.model}</span><input required placeholder={c.modelHint} value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label></div></section>
          <section className="trade-step"><header><span>02</span><div><b>{c.condition}</b><small>{form.condition ? c[form.condition] : ''}</small></div></header><div className="trade-condition-grid">{['excellent', 'good', 'fair', 'damaged'].map((value) => <label className={form.condition === value ? 'is-active' : ''} key={value}><input type="radio" name="condition" value={value} checked={form.condition === value} onChange={() => setForm({ ...form, condition: value })} /><b>{c[value]}</b><small>{c[`${value}Note`]}</small></label>)}</div></section>
          <section className="trade-step"><header><span>03</span><div><b>{c.check}</b><small>{Object.values(form.answers).filter(Boolean).length} / {checks.length}</small></div></header><div className="trade-check-grid">{checks.map((key) => <label className={form.answers[key] ? 'is-active' : ''} key={key}><input type="checkbox" checked={form.answers[key]} onChange={(event) => setForm({ ...form, answers: { ...form.answers, [key]: event.target.checked } })} /><i>{form.answers[key] ? '✓' : '×'}</i><span>{c.checks[key]}</span></label>)}</div></section>
          {error && <p className="trade-error">{error}</p>}
          <button className="primary-button trade-submit" type="submit" disabled={busy}>{busy ? c.calculating : c.submit}</button>
        </form>
        <aside className={result ? 'has-result' : ''}><span className="trade-result-label">{c.result}</span><strong>{result ? formatPrice(result.estimate, result.currency) : '—'}</strong><small>{regions[region].label[language]} · {form.brand || '—'} {form.model}</small><div className="trade-result-meter"><i style={{ width: result ? `${Math.min(100, 35 + Object.values(form.answers).filter(Boolean).length * 10)}%` : '0%' }} /></div><p>{result ? c.disclaimer : c.waiting}</p>{result && <button className="quiet-button" type="button" onClick={() => navigate('/sell')}>{c.create}</button>}</aside>
      </div>
    </main>
  );
}
