import { supplyCopy, supplyOrigin } from '../supplyDetails.mjs';

const generalFields = { sku: 80, batch: 80, packageContents: 300, warrantyTerms: 300 };
const chinaFields = { firmware: 120, languages: 160, networkBands: 240 };

export default function SupplyFields({ value = {}, onChange, language }) {
  const c = supplyCopy[language] || supplyCopy.pl;
  const origin = supplyOrigin(value);
  const change = (key, next) => onChange({ ...value, [key]: next });
  const renderField = ([key, max]) => <label key={key}>{c[key]}<input maxLength={max} value={value[key] || ''} onChange={event => change(key, event.target.value)} /></label>;
  return <fieldset className="span-2 supply-fields"><legend>{c.offerTitle}</legend>
    <label>{c.availability}<select value={value.availability || 'in_stock'} onChange={event => change('availability', event.target.value)}>{['in_stock', 'on_order', 'expected', 'unavailable'].map(key => <option key={key} value={key}>{c[key]}</option>)}</select></label>
    <label>{c.origin}<select value={origin} onChange={event => change('origin', event.target.value)}><option value="">{c.unknown}</option><option value="local">{c.local}</option><option value="china">{c.china}</option><option value="other">{c.otherOrigin}</option></select></label>
    {origin === 'china' && <fieldset className="span-2 supply-fields"><legend>{c.title}</legend><p className="span-2">{c.hint}</p><label>{c.marketVersion}<select value={value.marketVersion || ''} onChange={event => change('marketVersion', event.target.value)}><option value="">{c.unknown}</option>{['CN', 'Global', 'EU', 'US', 'UK', 'JP', 'KR', 'Other'].map(key => <option key={key} value={key}>{key === 'Other' ? c.other : key}</option>)}</select></label>{Object.entries(chinaFields).map(renderField)}</fieldset>}
    <details className="span-2 supply-optional"><summary>{c.optionalDetails}</summary><p>{c.inventoryHint}</p><div className="form-grid-react">{Object.entries(generalFields).map(renderField)}</div></details>
    {['on_order', 'expected'].includes(value.availability) && <><label className="span-2">{c.leadTime}<input maxLength={120} value={value.leadTime || ''} onChange={event => change('leadTime', event.target.value)} /></label><p className="span-2 supply-notice">{c.checkoutHint}</p></>}
  </fieldset>;
}
