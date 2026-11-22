import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { catalogCategories } from '../catalogTaxonomy';
import { imageUrl } from '../api';
import { useStore } from '../store';

export default function CategoryMenu() {
  const { language, t } = useStore();
  const ref = useRef(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  return <details className="category-menu" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') { close(); ref.current.querySelector('summary').focus(); } }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
    <summary>☰ <span>{t('catalog')}</span></summary>
    <div className="category-menu-panel">
      <div>{catalogCategories.map(([key, image, labels]) => <Link key={key} to={'/catalog?category=' + encodeURIComponent(key)} onClick={close}><img src={imageUrl('/assets/products/' + image + '.svg')} alt="" /><span>{labels[language] || labels.pl}</span><span aria-hidden="true">↗</span></Link>)}</div>
      <aside><span className="section-label">NEW / PRE-OWNED</span><h3>{language === 'uk' ? 'Обирай свій стан' : language === 'pl' ? 'Wybierz stan sprzętu' : 'Find your condition'}</h3><Link to="/catalog?condition=new" onClick={close}>{t('new')} ↗</Link><Link to="/catalog?condition=used" onClick={close}>{t('used')} ↗</Link><Link to="/sell" onClick={close}>＋ {t('sell')}</Link></aside>
    </div>
  </details>;
}
