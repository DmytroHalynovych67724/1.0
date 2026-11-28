import { Link } from 'react-router-dom';
import { imageUrl } from '../api';
import { useStore } from '../store';
import { ownsListing, canBuyListing, ownerCopy } from '../listingPolicy.mjs';
import { batteryState, conditionCopy, defectsState } from '../deviceCondition.mjs';
import { availabilityFor, supplyCopy } from '../supplyDetails.mjs';
const delivery = { shipping: { uk: 'Доставка', pl: 'Wysyłka', en: 'Shipping' }, pickup: { uk: 'Самовивіз', pl: 'Odbiór osobisty', en: 'Collection' }, both: { uk: 'Доставка або самовивіз', pl: 'Wysyłka lub odbiór', en: 'Shipping or collection' } };

export default function ModelOffer({ offer, words: c }) {
  const { language, formatPrice, user, addToCart, t } = useStore();
  const dc = conditionCopy[language] || conditionCopy.pl;
  const sc = supplyCopy[language] || supplyCopy.pl;
  const details = offer.deviceDetails || {};
  const supply = offer.supplyDetails || {};
  const health = batteryState(details) === 'reported' && Number.isInteger(details.batteryHealth) ? `${details.batteryHealth}%` : dc[batteryState(details) === 'reported' ? 'unknown' : batteryState(details)];
  const defectState = defectsState(details);
  const rows = offer.condition === 'used'
    ? [[dc.battery, health], [dc.display, details.display || dc.unknown], [dc.completeness, details.completeness || dc.unknown], [dc.defects, defectState === 'reported' ? details.defects : defectState === 'none' ? dc.none : dc.unknown]]
    : [[sc.availability, sc[availabilityFor(offer)]], [sc.marketVersion, supply.marketVersion || sc.unknown], [sc.packageContents, supply.packageContents || sc.unknown], [sc.warrantyTerms, supply.warrantyTerms || sc.unknown]];
  return <article className="model-offer-card">
    <Link className="model-offer-image" to={`/product/${offer.id}`} aria-label={offer.title}><img src={imageUrl(offer.images?.[0])} alt=""/></Link>
    <div className="offer-core"><span className={`condition condition--${offer.condition}`}>{t(offer.condition === 'new' ? 'new' : 'used')}</span><h3><Link to={`/product/${offer.id}`}>{offer.title}</Link></h3>
      <p>{offer.location} · {delivery[offer.delivery]?.[language] || offer.delivery}</p>
      <p>{[details.productCode, offer.specs?.processor, offer.specs?.gpu, offer.specs?.ram, offer.specs?.storage, offer.specs?.color].filter(Boolean).join(' · ')}</p>
      <small>{dc.source}</small><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    <div className="offer-seller"><small>{c.seller}</small><b>{offer.seller}</b>{offer.sellerVerified && <span title={dc.profileHint}>✓ {dc.profile}</span>}<strong>{formatPrice(offer.price, offer.currency)}</strong>
      {ownsListing(user, offer) ? <Link className="primary-button" to={`/account?tab=listings&edit=${offer.id}`}>{(ownerCopy[language] || ownerCopy.pl).edit}</Link> : <button className="primary-button" disabled={!canBuyListing(user, offer)} type="button" onClick={() => addToCart(offer)}>{c.add}</button>}
      <Link to={`/product/${offer.id}`}>{c.details}</Link>
    </div>
  </article>;
}
