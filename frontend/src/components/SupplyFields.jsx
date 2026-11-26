import { supplyCopy } from '../supplyDetails.mjs';

const fields = { sku: 80, batch: 80, firmware: 120, languages: 160, networkBands: 240, packageContents: 300, warrantyTerms: 300, leadTime: 120 };

export default function SupplyFields({ value = {}, onChange, language }) {
  const c = supplyCopy[language] || supplyCopy.pl;
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <fieldset className="span-2 supply-fields"><legend>{c.title}</legend><p className="span-2">{c.hint}</p>
    <label>{c.availability}<select value={value.availability || 'in_stock'} onChange={(e) => change('availability', e.target.value)}>{['in_stock', 'on_order', 'expected', 'unavailable'].map((key) => <option key={key} value={key}>{c[key]}</option>)}</select></label>
    <label>{c.marketVersion}<select value={value.marketVersion || ''} onChange={(e) => change('marketVersion', e.target.value)}><option value="">{c.unknown}</option>{['CN', 'Global', 'EU', 'US', 'UK', 'JP', 'KR', 'Other'].map((key) => <option key={key} value={key}>{key === 'Other' ? c.other : key}</option>)}</select></label>
    {Object.entries(fields).map(([key, max]) => <label key={key}>{c[key]}<input maxLength={max} value={value[key] || ''} onChange={(e) => change(key, e.target.value)} /></label>)}
    {['on_order', 'expected'].includes(value.availability) && <p className="span-2 supply-notice">{c.checkoutHint}</p>}
  </fieldset>;
}
