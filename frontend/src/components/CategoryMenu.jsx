import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { catalogCategories } from '../catalogTaxonomy';
import { imageUrl } from '../api';
import { useStore } from '../store';
import { sectionCopy } from '../catalogSections.mjs';

export default function CategoryMenu() {
  const { language, t } = useStore();
  const location = useLocation();
  const path = location.pathname === '/marketplace' ? '/marketplace' : '/catalog';
  const c = sectionCopy[language] || sectionCopy.pl;
  const ref = useRef(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  return <details className="category-menu" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') { close(); ref.current.querySelector('summary').focus(); } }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
    <summary>☰ <span>{t('catalog')}</span></summary>
    <div className="category-menu-panel">
      <div>{catalogCategories.map(([key, image, labels]) => <Link key={key} to={path + '?category=' + encodeURIComponent(key)} onClick={close}><img src={imageUrl('/assets/products/' + image + '.svg')} alt="" /><span>{labels[language] || labels.pl}</span><span aria-hidden="true">↗</span></Link>)}</div>
      <aside><span className="section-label">NaShary</span><h3>{c.new}</h3><Link to="/catalog" onClick={close}>{c.new} ↗</Link><Link to="/marketplace" onClick={close}>{c.used} ↗</Link><Link to="/sell" onClick={close}>＋ {t('sell')}</Link></aside>
    </div>
  </details>;
}
