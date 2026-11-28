import { availabilityFor, supplyCopy } from '../supplyDetails.mjs';

export default function SupplySummary({ product, language }) {
  const c = supplyCopy[language] || supplyCopy.pl;
  const details = product.supplyDetails || {};
  const status = availabilityFor(product);
  const keys = ['origin', 'sku', 'marketVersion', 'firmware', 'languages', 'networkBands', 'packageContents', 'leadTime'].filter((key) => details[key]);
  if (!keys.length && !['on_order', 'expected'].includes(status)) return null;
  return <section className="supply-summary"><h2>{c.title}</h2><p><strong>{c[status]}</strong></p><dl>{keys.map((key) => <div key={key}><dt>{c[key]}</dt><dd>{key === 'origin' ? (details[key] === 'other' ? c.otherOrigin : c[details[key]]) : key === 'marketVersion' && details[key] === 'Other' ? c.other : details[key]}</dd></div>)}</dl>{['on_order', 'expected'].includes(status) && <p>{details.leadTime ? c.checkoutHint : `${c.termsUnknown} ${c.checkoutHint}`}</p>}</section>;
}
