import { specLabels } from '../specLabels.mjs';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { imageUrl } from '../api';
import { useStore } from '../store';
import { categoryLabel } from '../catalogTaxonomy';
import { availabilityFor, supplyCopy } from '../supplyDetails.mjs';
import { differentValues } from '../comparisonPolicy.mjs';

const copy = {
  uk: { title: 'Порівняння товарів', close: 'Закрити', clear: 'Очистити', remove: 'Видалити', price: 'Ціна', condition: 'Стан', stock: 'Наявність', region: 'Ринок продажу', new: 'Новий', used: 'Вживаний', differences: 'Лише відмінності', missing: 'Не вказано', empty: 'Додай щонайменше два товари однієї категорії, щоб порівняти їх поруч.', one: 'Додай ще товар цієї категорії для порівняння.', add: 'Додати товар', same: 'У вибраних характеристиках немає відмінностей.', feature: 'Характеристика', brand: 'Бренд', model: 'Модель' },
  pl: { title: 'Porównanie produktów', close: 'Zamknij', clear: 'Wyczyść', remove: 'Usuń', price: 'Cena', condition: 'Stan', stock: 'Dostępność', region: 'Rynek sprzedaży', new: 'Nowy', used: 'Używany', differences: 'Tylko różnice', missing: 'Nie podano', empty: 'Dodaj przynajmniej dwa produkty jednej kategorii, aby je porównać.', one: 'Dodaj kolejny produkt tej kategorii.', add: 'Dodaj produkt', same: 'Brak różnic w wybranych parametrach.', feature: 'Parametr', brand: 'Marka', model: 'Model' },
  en: { title: 'Product comparison', close: 'Close', clear: 'Clear', remove: 'Remove', price: 'Price', condition: 'Condition', stock: 'Availability', region: 'Sales market', new: 'New', used: 'Pre-owned', differences: 'Differences only', missing: 'Not specified', empty: 'Add at least two products from one category to compare them side by side.', one: 'Add another product from this category.', add: 'Add product', same: 'No differences in the selected specifications.', feature: 'Specification', brand: 'Brand', model: 'Model' },
};



export default function ComparePanel({ onClose }) {
  const { comparison, toggleCompare, clearComparison, formatPrice, language } = useStore();
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const c = copy[language] || copy.pl;
  const sc = supplyCopy[language] || supplyCopy.pl;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  const keys = [...new Set(comparison.flatMap((product) => Object.keys(product.specs || {})))];
  const rows = [
    [c.price, product => formatPrice(product.price, product.currency)],
    [c.condition, product => product.condition === 'new' ? c.new : c.used],
    [c.stock, product => sc[availabilityFor(product)]],
    [c.region, product => product.region?.toUpperCase()],
    [c.brand, product => product.brand], [c.model, product => product.model],
    ...['marketVersion', 'firmware', 'packageContents', 'warrantyTerms'].filter(key => comparison.some(p => p.supplyDetails?.[key])).map(key => [sc[key], product => product.supplyDetails?.[key]]),
    ...keys.map(key => [specLabels[key]?.[language] || key, product => product.specs?.[key]]),
  ].map(([label, getValue]) => ({ label, values: comparison.map(product => getValue(product) ?? c.missing) }));
  const visibleRows = rows.filter(row => !onlyDifferences || comparison.length < 2 || differentValues(row.values));
  const category = comparison[0]?.category;
  const addPath = `${comparison[0]?.condition === 'used' ? '/marketplace' : '/catalog'}${category ? `?category=${encodeURIComponent(category)}` : ''}`;
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled), a[href], input')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return createPortal(<div className="compare-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="compare-panel" role="dialog" aria-modal="true" aria-labelledby="compare-title" ref={panelRef} onKeyDown={onKeyDown}>
      <header><div><span className="section-label">NaShary compare {category && `· ${categoryLabel(category, language)}`}</span><h2 id="compare-title">{c.title} <small>{comparison.length}/4</small></h2></div><div className="compare-panel__actions"><button type="button" onClick={clearComparison} disabled={!comparison.length}>{c.clear}</button><button type="button" onClick={onClose} ref={closeRef} aria-label={c.close}>×</button></div></header>
      {!comparison.length ? <div className="comparison-empty"><p>{c.empty}</p><Link className="primary-button" to={addPath} onClick={onClose}>{c.add}</Link></div> : <>
        <div className="comparison-toolbar"><label><input type="checkbox" checked={onlyDifferences} onChange={event => setOnlyDifferences(event.target.checked)} disabled={comparison.length < 2}/>{c.differences}</label><Link to={addPath} onClick={onClose}>＋ {c.add}</Link></div>
        {comparison.length === 1 && <p className="comparison-hint">{c.one}</p>}
        <div className="compare-table-wrap" tabIndex={0} role="region" aria-label={c.title}>
          <table className="comparison-table" style={{ '--product-count': comparison.length }}><caption className="visually-hidden">{c.title}</caption>
            <thead><tr><th scope="col">{c.feature}</th>{comparison.map(product => <th scope="col" key={product.id}><article className="comparison-product"><button type="button" onClick={() => toggleCompare(product)} aria-label={`${c.remove}: ${product.title}`}>×</button><img src={imageUrl(product.images?.[0])} alt=""/><Link to={`/product/${product.id}`} onClick={onClose}>{product.title}</Link></article></th>)}</tr></thead>
            <tbody>{visibleRows.map((row,index) => <tr key={`${row.label}-${index}`} className={differentValues(row.values) ? 'has-difference' : ''}><th scope="row">{row.label}</th>{row.values.map((value,index) => <td key={comparison[index].id}>{value || c.missing}</td>)}</tr>)}{!visibleRows.length && <tr><td colSpan={comparison.length+1}>{c.same}</td></tr>}</tbody>
          </table>
        </div>
      </>}
    </section>
  </div>,document.body);
}
