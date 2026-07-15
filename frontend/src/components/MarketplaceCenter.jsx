import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';

const words = {
  pl: { saved: 'Zapisane wyszukiwania', alerts: 'Obserwowane ceny', trade: 'Wyceny Trade-In', empty: 'Tutaj pojawią się zapisane elementy.', matches: 'pasujących ofert', target: 'Cel', remove: 'Usuń', reports: 'Zgłoszenia użytkowników', resolve: 'Rozwiązane', open: 'Otwórz katalog' },
  uk: { saved: 'Збережені пошуки', alerts: 'Відстеження цін', trade: 'Оцінки Trade‑In', empty: 'Тут з’являться збережені елементи.', matches: 'відповідних оголошень', target: 'Ціль', remove: 'Видалити', reports: 'Скарги користувачів', resolve: 'Вирішено', open: 'Відкрити каталог' },
  en: { saved: 'Saved searches', alerts: 'Price watches', trade: 'Trade-In estimates', empty: 'Saved items will appear here.', matches: 'matching listings', target: 'Target', remove: 'Remove', reports: 'User reports', resolve: 'Resolved', open: 'Open catalog' },
};

export default function MarketplaceCenter({ admin = false }) {
  const { language, formatPrice } = useStore();
  const c = words[language] || words.pl;
  const [data, setData] = useState({ searches: [], alerts: [], trade: [], reports: [] });
  const load = useCallback(() => Promise.all([api('/marketplace/searches'), api('/marketplace/alerts'), api('/marketplace/trade-in'), admin ? api('/marketplace/reports') : Promise.resolve([])]).then(([searches, alerts, trade, reports]) => setData({ searches, alerts, trade, reports })), [admin]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const removeSearch = async (id) => { await api(`/marketplace/searches/${id}`, { method: 'DELETE' }); load(); };
  const removeAlert = async (id) => { await api(`/marketplace/alerts/${id}`, { method: 'DELETE' }); load(); };
  const resolve = async (id) => { await api(`/marketplace/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) }); load(); };
  return <div className="marketplace-center">
    <section><header><h2>{c.saved}</h2><Link to="/catalog">{c.open}</Link></header>{data.searches.length ? <div className="saved-search-list">{data.searches.map((item) => <article key={item.id}><div><b>{item.name}</b><small>{item.region.toUpperCase()} · {item.matches} {c.matches}</small></div><Link to={`/catalog?${new URLSearchParams(item.query)}`}>→</Link><button type="button" onClick={() => removeSearch(item.id)}>×</button></article>)}</div> : <p className="soft-empty">{c.empty}</p>}</section>
    <section><header><h2>{c.alerts}</h2></header>{data.alerts.length ? <div className="watch-list">{data.alerts.map((item) => <article key={item.id}><img src={imageUrl(item.images?.[0])} alt="" /><div><Link to={`/product/${item.productId}`}>{item.title}</Link><b>{formatPrice(item.price, item.currency)}</b>{item.targetPrice && <small>{c.target}: {formatPrice(item.targetPrice, item.currency)}</small>}</div><button type="button" onClick={() => removeAlert(item.productId)}>×</button></article>)}</div> : <p className="soft-empty">{c.empty}</p>}</section>
    <section><header><h2>{c.trade}</h2><Link to="/trade-in">Trade-In</Link></header>{data.trade.length ? <div className="trade-history">{data.trade.map((item) => <article key={item.id}><span>{item.brand}</span><b>{item.model}</b><strong>{formatPrice(item.estimate, item.currency)}</strong><small>{item.condition} · {item.status}</small></article>)}</div> : <p className="soft-empty">{c.empty}</p>}</section>
    {admin && <section><header><h2>{c.reports}</h2></header><div className="report-admin-list">{data.reports.map((item) => <article key={item.id}><div><b>{item.title}</b><small>{item.username} · {item.reason}</small><p>{item.details}</p></div><span>{item.status}</span>{item.status !== 'resolved' && <button type="button" onClick={() => resolve(item.id)}>{c.resolve}</button>}</article>)}</div></section>}
  </div>;
}
