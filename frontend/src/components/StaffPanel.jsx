import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';
import { accountCopy } from '../accountCopy';
import { newSellerCopy } from '../supplyDetails.mjs';

export default function StaffPanel({ onEdit }) {
  const { user, language, flash, formatPrice } = useStore();
  const c = accountCopy[language] || accountCopy.pl;
  const sellerCopy = newSellerCopy[language] || newSellerCopy.pl;
  const [tab, setTab] = useState('products');
  const [data, setData] = useState([]);
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const endpoint = tab === 'reports' ? '/marketplace/reports' : '/staff/' + tab;
  const load = useCallback(async () => {
    const result = await api(endpoint);
    setData(result);
  }, [endpoint]);
  useEffect(() => {
    let active = true;
    api(endpoint).then((result) => { if (active) { setData(result); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, attempt]);
  const chooseTab = (value) => { setTab(value); setLoading(true); setData([]); setError(''); setAction(null); setReason(''); };
  const apply = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api(action.path, { method: 'PATCH', body: JSON.stringify({ ...action.body, reason }) });
      setAction(null); setReason(''); await load(); flash(c.changed);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const begin = (path, body) => {
    const target = data.find((item) => path.split('/').includes(item.id));
    setAction({ path, body, label: target?.title || target?.username, value: body.canSellNew !== undefined ? (body.canSellNew ? sellerCopy.approve : sellerCopy.revoke) : c.role[body.role] || c[body.accountStatus || body.status] });
    setReason('');
  };
  const filtered = data.filter((item) => [item.title, item.username, item.action, item.actorName].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  return <section className="account-section staff-panel">
    <span className="section-label">NASHARY / STAFF</span><h2>{c.staff}</h2><p>{c.staffHint}</p>
    <div className="staff-tabs">{[['products', c.catalog], ['reports', c.reports], ...(user.role === 'admin' ? [['users', c.users]] : []), ['log', c.log]].map(([key, label]) => <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => chooseTab(key)}>{label}</button>)}</div>
    <input className="staff-search" aria-label={c.search} placeholder={c.search} value={query} onChange={(e) => setQuery(e.target.value)} />
    {error && <div role="alert" className="form-error">{error} <button type="button" onClick={() => { setLoading(true); setAttempt((n) => n + 1); }}>{c.retry}</button></div>}
    {action && <form className="staff-confirm" onSubmit={apply}><b>{action.label} → {action.value}</b><label>{c.reason}<textarea required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label><button className="primary-button" disabled={busy || reason.trim().length < 5}>{c.save}</button><button type="button" className="quiet-button" disabled={busy} onClick={() => setAction(null)}>×</button></form>}
    {loading ? <p role="status">{c.loading}</p> : !filtered.length ? <p className="soft-empty">{c.empty}</p> : <div className="staff-list">{filtered.map((item) => <article key={item.id}>
      {tab === 'products' && <><img src={imageUrl(item.images?.[0])} alt="" /><div><Link to={'/product/' + item.id}><b>{item.title}</b></Link><small>{item.region.toUpperCase()} · {formatPrice(item.price, item.currency)} · {item.seller}</small><span className="role-badge">{item.isDemo ? c.demo : c[item.moderationStatus]}</span>{item.moderationReason && <p>{item.moderationReason}</p>}</div>{user.role === 'admin' && <button type="button" onClick={() => onEdit(item)}>{language === 'uk' ? 'Редагувати' : language === 'pl' ? 'Edytuj' : 'Edit'}</button>}<button type="button" onClick={() => begin('/staff/products/' + item.id + '/moderation', { status: item.moderationStatus === 'hidden' ? 'approved' : 'hidden' })}>{item.moderationStatus === 'hidden' ? c.approve : c.hide}</button></>}
      {tab === 'reports' && <><div><Link to={'/product/' + item.productId}><b>{item.title}</b></Link><small>{item.username} · {item.reason}</small><p>{item.details}</p></div><select aria-label={c.reports} value={item.status} onChange={(e) => begin('/marketplace/reports/' + item.id, { status: e.target.value })}>{['new','reviewing','resolved','rejected'].map((status) => <option key={status} value={status}>{c[status]}</option>)}</select></>}
      {tab === 'users' && <><div><b>{item.displayName || item.username}</b><small>@{item.username} · {c[item.accountStatus]}</small><small>{item.role === 'admin' || item.canSellNew ? sellerCopy.allowed : sellerCopy.denied}</small></div>{item.role === 'admin' ? <span className="role-badge">{c.protected}</span> : <><button type="button" onClick={() => begin('/staff/users/' + item.id, { canSellNew: !item.canSellNew })}>{item.canSellNew ? sellerCopy.revoke : sellerCopy.approve}</button><select aria-label={c.users + ' / ' + item.username} value={item.role} onChange={(e) => begin('/staff/users/' + item.id, { role: e.target.value })}>{['user', 'moderator'].map((role) => <option key={role} value={role}>{c.role[role]}</option>)}</select><button type="button" onClick={() => begin('/staff/users/' + item.id, { accountStatus: item.accountStatus === 'active' ? 'suspended' : 'active' })}>{item.accountStatus === 'active' ? c.block : c.unblock}</button></>}</>}
      {tab === 'log' && <><div><b>{item.action}</b><small>{item.actorName} · {new Date(item.createdAt).toLocaleString()} · {item.targetId}</small><p>{item.reason}</p></div></>}
    </article>)}</div>}
  </section>;
}
