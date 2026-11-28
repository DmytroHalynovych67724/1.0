import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { catalogImportTemplate, parseCatalogImport } from '../catalogImport.mjs';

const copy = {
  uk: { title: 'Імпорт асортименту', hint: 'CSV або JSON, до 50 нових товарів і 1 МБ. Спочатку перегляд, потім збереження чернеток. Наявні товари й залишки не змінюються.', template: 'Завантажити CSV-шаблон', file: 'Вибрати файл', save: 'Зберегти чернетки', done: 'Чернетки збережено', retry: 'Повторити незавершені рядки', busy: 'Зберігаємо чернетки…', row: 'Рядок', titleCol: 'Товар / SKU / партія', price: 'Ціна', stock: 'Кількість', status: 'Результат', ready: 'Готовий до перевірки', created: 'Чернетку створено', existing: 'Уже збережено', failed: 'Помилка запису — можна повторити', conflict: 'SKU і партія вже є. Відредагуй наявний товар.', review: 'Перевірити чернетку', market: 'Ринок імпорту', manual: 'Перевір кожну чернетку у «Мої товари». Імпорт не завантажує характеристики через AI й не публікує товари.', partial: 'Рядки зберігаються окремо. Успішні не дублюються при повторі; невдалі лишаються у цьому списку.', required: 'Обов’язкові колонки: title, brand, model, category, price, stock, location, delivery, sku. category: Smartfony, Laptopy, Tablety, Gaming, Audio, Monitory, Foto, Akcesoria. delivery: shipping, pickup, both. Ціна — у валюті обраного ринку; фото URL через |. Код виробника — productCode, складський артикул — sku. JSON — масив об’єктів з такими самими назвами полів.', errors: { size: 'Файл завеликий (до 1 МБ).', count: 'Потрібно від 1 до 50 товарів.', format: 'Перевір формат файлу, лапки та роздільники.', columns: 'Невідомі або повторені колонки. Використай шаблон.', value: 'Некоректне значення.', required: 'Заповни обов’язкове поле.', duplicate: 'Повтор SKU й партії у файлі.', server: 'Не вдалося завершити імпорт. Перевір з’єднання та повтори.' } },
  pl: { title: 'Import asortymentu', hint: 'CSV lub JSON, do 50 nowych produktów i 1 MB. Podgląd przed zapisem szkiców. Istniejące produkty i stany nie zmieniają się.', template: 'Pobierz szablon CSV', file: 'Wybierz plik', save: 'Zapisz szkice', done: 'Szkice zapisano', retry: 'Ponów niezapisane wiersze', busy: 'Zapisywanie szkiców…', row: 'Wiersz', titleCol: 'Produkt / SKU / partia', price: 'Cena', stock: 'Sztuki', status: 'Wynik', ready: 'Gotowy do sprawdzenia', created: 'Utworzono szkic', existing: 'Już zapisano', failed: 'Błąd zapisu — spróbuj ponownie', conflict: 'SKU i partia już istnieją. Edytuj istniejący produkt.', review: 'Sprawdź szkic', market: 'Rynek importu', manual: 'Sprawdź każdy szkic w swoich produktach. Import nie pobiera danych AI i nie publikuje produktów.', partial: 'Wiersze zapisują się osobno. Ponowienie nie powiela zapisanych pozycji; nieudane pozostają na liście.', required: 'Wymagane kolumny: title, brand, model, category, price, stock, location, delivery, sku. category: Smartfony, Laptopy, Tablety, Gaming, Audio, Monitory, Foto, Akcesoria. delivery: shipping, pickup, both. Cena w walucie rynku; adresy zdjęć oddziel |. Kod producenta: productCode; kod magazynowy: sku. JSON: tablica obiektów z takimi samymi nazwami pól.', errors: { size: 'Plik jest za duży (maks. 1 MB).', count: 'Wybierz 1–50 produktów.', format: 'Sprawdź format, cudzysłowy i separatory.', columns: 'Nieznane lub powtórzone kolumny. Użyj szablonu.', value: 'Nieprawidłowa wartość.', required: 'Uzupełnij wymagane pole.', duplicate: 'Powtórzony SKU i partia w pliku.', server: 'Nie ukończono importu. Sprawdź połączenie i ponów.' } },
  en: { title: 'Import inventory', hint: 'CSV or JSON, up to 50 new products and 1 MB. Preview before saving drafts. Existing products and stock remain unchanged.', template: 'Download CSV template', file: 'Choose file', save: 'Save drafts', done: 'Drafts saved', retry: 'Retry unfinished rows', busy: 'Saving drafts…', row: 'Row', titleCol: 'Product / SKU / batch', price: 'Price', stock: 'Units', status: 'Result', ready: 'Ready for review', created: 'Draft created', existing: 'Already saved', failed: 'Save failed — retry available', conflict: 'SKU and batch already exist. Edit the existing product.', review: 'Review draft', market: 'Import market', manual: 'Review each draft in your products. Import does not fetch AI data or publish products.', partial: 'Rows are saved individually. Retrying does not duplicate successful rows; failed rows remain listed.', required: 'Required columns: title, brand, model, category, price, stock, location, delivery, sku. category: Smartfony, Laptopy, Tablety, Gaming, Audio, Monitory, Foto, Akcesoria. delivery: shipping, pickup, both. Prices use the market currency; separate image URLs with |. Manufacturer code: productCode; inventory code: sku. JSON: an array of objects with the same field names.', errors: { size: 'File too large (maximum 1 MB).', count: 'Use 1–50 products.', format: 'Check file format, quotes and delimiters.', columns: 'Unknown or duplicate columns. Use the template.', value: 'Invalid value.', required: 'Complete the required field.', duplicate: 'Duplicate SKU and batch in the file.', server: 'Import could not finish. Check your connection and retry.' } },
};

export default function CatalogImport({ region, language, formatPrice, onImported }) {
  const c = copy[language] || copy.pl;
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const gate = useRef(false);
  const requestId = useRef('');
  const select = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || gate.current) return;
    gate.current = true; setBusy(true); setRows([]); setResults(null); setError('');
    try {
      if (file.size > 1_000_000) throw new Error('size');
      const parsed = parseCatalogImport(await file.text(), file.name);
      requestId.current = crypto.randomUUID(); setRows(parsed);
    } catch (failure) { setError(`${failure.row ? `${c.row} ${failure.row}: ` : ''}${c.errors[failure.message] || c.errors.format}${failure.field ? ` (${failure.field})` : ''}`); }
    finally { gate.current = false; setBusy(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([catalogImportTemplate()], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nashary-inventory-template.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = async () => {
    if (gate.current || !rows.length) return;
    gate.current = true; setBusy(true); setError('');
    try {
      const response = await api('/products/import', { method: 'POST', body: JSON.stringify({ requestId: requestId.current, region, rows }) });
      setResults(response.results); onImported();
    } catch (failure) {
      const fields = (failure.details || []).map(item => item.field).filter(Boolean).join(', ');
      setError(`${c.errors.server}${fields ? ` (${fields})` : ''}`);
    } finally { gate.current = false; setBusy(false); }
  };
  const completed = results && results.every(item => item.state !== 'failed');
  return <details className="catalog-import"><summary>{c.title}</summary><div className="catalog-import__body" aria-busy={busy}>
    <p>{c.hint}</p><p><b>{c.market}: {region.toUpperCase()}</b></p>
    <div className="catalog-import__actions"><button type="button" className="quiet-button" onClick={download}>{c.template}</button><label className="quiet-button">{c.file}<input type="file" accept=".csv,.json,text/csv,application/json" disabled={busy} onChange={select}/></label></div>
    <details><summary>{language === 'uk' ? 'Формат файлу' : language === 'en' ? 'File format' : 'Format pliku'}</summary><p>{c.required}</p></details>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!!rows.length && <><div className="catalog-import__table"><table><thead><tr>{[c.row,c.titleCol,c.price,c.stock,c.status].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((item, index) => {
      const result = results?.find(value => value.row === index + 1);
      return <tr key={index}><td>{index + 1}</td><td><b>{item.title}</b><small>{item.supplyDetails.sku}{item.supplyDetails.batch ? ` / ${item.supplyDetails.batch}` : ''}</small></td><td>{formatPrice(item.price, { pl:'PLN', ua:'UAH', eu:'EUR' }[region])}</td><td>{item.stock}</td><td>{result ? result.code === 'INVENTORY_CODE_CONFLICT' ? c.conflict : c[result.state] : c.ready}{result?.id && <Link to={`/account?tab=listings&edit=${result.id}`}>{c.review} →</Link>}</td></tr>;
    })}</tbody></table></div><p>{c.manual}</p><p>{c.partial}</p><button type="button" className="primary-button" disabled={busy || completed} onClick={save}>{busy ? c.busy : completed ? c.done : results ? c.retry : c.save}</button></>}
  </div></details>;
}
