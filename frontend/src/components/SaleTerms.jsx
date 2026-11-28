import { saleTermFields, saleTermRows, saleTermsCopy } from '../saleTerms.mjs';

export function SaleTermsFields({ value = {}, onChange, language }) {
  const c = saleTermsCopy[language] || saleTermsCopy.pl;
  return <details className="span-2 listing-options sale-terms-fields"><summary>{c.optional}</summary><p>{c.hint}</p><div className="form-grid-react">{Object.entries(saleTermFields).map(([key, max]) => <label key={key} className={key === 'returnTerms' ? 'span-2' : ''}>{c[key]}<textarea rows="3" maxLength={max} value={value[key] || ''} onChange={event => onChange({ ...value, [key]: event.target.value })}/></label>)}</div></details>;
}

export default function SaleTerms({ product, language, compact = false, snapshot = false }) {
  const c = saleTermsCopy[language] || saleTermsCopy.pl;
  const rows = saleTermRows(product);
  if (compact && !rows.some(([,value]) => value)) return null;
  const content = <><small>{snapshot ? c.snapshot : c.source}</small><dl>{rows.map(([key, value]) => <div key={key}><dt>{c[key]}</dt><dd>{value || c.unknown}</dd></div>)}</dl>{!snapshot && <p>{c.checkout}</p>}</>;
  return compact ? <details className="sale-terms sale-terms--compact"><summary>{c.title}</summary>{content}</details> : <section className="shell sale-terms"><h2>{c.title}</h2>{content}</section>;
}
