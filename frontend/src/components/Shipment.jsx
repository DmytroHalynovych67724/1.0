import { useRef, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

const copy = {
  uk: { title:'Відправлення', carrier:'Перевізник', number:'Номер накладної', save:'Зберегти відправлення', saving:'Зберігаємо…', saved:'Дані відправлення збережено.', empty:'Продавець ще не додав номер накладної.', manual:'Номер указаний продавцем. Перевіряй статус у перевізника; NaShary не створює накладну й не підтверджує доставку автоматично.', history:'Історія виконання', shipment_updated:'Оновлено дані відправлення', created:'Замовлення створене', confirmed:'Замовлення прийняте', shipped:'Позначено відправленим', delivered:'Позначено переданим покупцю', completed:'Отримання підтверджене', cancelled:'Скасовано', changed:'Дані або статус уже змінилися. Онови список перед збереженням.', failed:'Не вдалося зберегти. Спробуй ще раз.', invalid:'Укажи перевізника та номер (2–80 латинських літер, цифр, пробілів або . _ / -), або очисти обидва поля.', hint:'Не вводь телефон, адресу чи інші дані одержувача. Збереження номера не змінює статус замовлення.', updated:'Оновлено' },
  pl: { title:'Przesyłka', carrier:'Przewoźnik', number:'Numer przesyłki', save:'Zapisz przesyłkę', saving:'Zapisywanie…', saved:'Dane przesyłki zapisano.', empty:'Sprzedawca nie dodał jeszcze numeru przesyłki.', manual:'Numer podaje sprzedawca. Sprawdź status u przewoźnika; NaShary nie tworzy etykiety ani nie potwierdza automatycznie dostawy.', history:'Historia realizacji', shipment_updated:'Zmieniono dane przesyłki', created:'Utworzono zamówienie', confirmed:'Zamówienie przyjęte', shipped:'Oznaczone jako wysłane', delivered:'Oznaczone jako przekazane', completed:'Potwierdzono odbiór', cancelled:'Anulowano', changed:'Dane lub status zmieniły się. Odśwież listę przed zapisem.', failed:'Nie udało się zapisać. Spróbuj ponownie.', invalid:'Podaj przewoźnika i numer (2–80 liter łacińskich, cyfr, spacji lub . _ / -), albo wyczyść oba pola.', hint:'Nie wpisuj telefonu, adresu ani danych odbiorcy. Zapis numeru nie zmienia statusu zamówienia.', updated:'Zaktualizowano' },
  en: { title:'Shipment', carrier:'Carrier', number:'Tracking number', save:'Save shipment', saving:'Saving…', saved:'Shipment details saved.', empty:'The seller has not provided a tracking number yet.', manual:'The seller provides this number. Check the carrier for updates; NaShary does not create labels or automatically confirm delivery.', history:'Fulfillment history', shipment_updated:'Shipment details updated', created:'Order created', confirmed:'Order accepted', shipped:'Marked as shipped', delivered:'Marked as handed over', completed:'Receipt confirmed', cancelled:'Cancelled', changed:'Details or status changed. Refresh the list before saving.', failed:'Could not save. Please try again.', invalid:'Enter a carrier and number (2–80 Latin letters, digits, spaces or . _ / -), or clear both fields.', hint:'Do not enter the recipient’s phone, address or personal details. Saving a number does not change the order status.', updated:'Updated' },
};
const stamp = (value, language) => new Date(value).toLocaleString({uk:'uk-UA',pl:'pl-PL',en:'en-GB'}[language] || 'en-GB');

export function FulfillmentHistory({ history = [], language }) {
  const c = copy[language] || copy.pl;
  if (!history.length) return null;
  return <details className="fulfillment-history"><summary>{c.history}</summary><ol>{history.map(item => <li key={item.id}><span>{c[item.status] || item.status}</span><time dateTime={new Date(item.createdAt).toISOString()}>{stamp(item.createdAt,language)}</time></li>)}</ol></details>;
}

export function ShipmentSummary({ shipment, language }) {
  const c = copy[language] || copy.pl;
  return <div className="shipment-summary"><b>{c.title}</b>{shipment?.trackingNumber ? <><dl><div><dt>{c.carrier}</dt><dd>{shipment.carrier}</dd></div><div><dt>{c.number}</dt><dd className="shipment-number">{shipment.trackingNumber}</dd></div></dl>{shipment.updatedAt && <small>{c.updated}: {stamp(shipment.updatedAt,language)}</small>}<p>{c.manual}</p></> : <p>{c.empty}</p>}</div>;
}

export default function ShipmentEditor({ sale, language, disabled, onBusy, onSaved }) {
  const { flash } = useStore();
  const c = copy[language] || copy.pl;
  const [carrier,setCarrier] = useState(sale.shipment?.carrier || '');
  const [number,setNumber] = useState(sale.shipment?.trackingNumber || '');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  const gate = useRef(false);
  const save = async event => {
    event.preventDefault();
    if (gate.current || disabled) return;
    gate.current = true; setBusy(true); onBusy(true); setError(''); setSaved(false);
    try {
      await api(`/orders/sales/${sale.orderId}/shipment`, {method:'PATCH',body:JSON.stringify({carrier,trackingNumber:number,revision:sale.shipment?.revision || 0})});
      setSaved(true); flash(c.saved); onSaved();
    } catch (failure) { setError(['SHIPMENT_CHANGED','SHIPMENT_NOT_EDITABLE'].includes(failure.code) ? c.changed : failure.code === 'VALIDATION_ERROR' ? c.invalid : c.failed); }
    finally { gate.current = false; setBusy(false); onBusy(false); }
  };
  return <details className="shipment-editor"><summary>{c.title}</summary><form onSubmit={save}><div className="shipment-fields"><label>{c.carrier}<input maxLength={60} value={carrier} disabled={disabled || busy} onChange={event=>setCarrier(event.target.value)}/></label><label>{c.number}<input maxLength={80} value={number} disabled={disabled || busy} onChange={event=>setNumber(event.target.value)}/></label></div><p>{c.hint}</p>{error && <p role="alert" className="form-error">{error}</p>}{saved && <p role="status">{c.saved}</p>}<button type="submit" className="quiet-button" disabled={disabled || busy}>{busy ? c.saving : c.save}</button></form></details>;
}
