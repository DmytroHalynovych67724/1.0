import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';
import { accountCopy } from '../accountCopy';

const copy = {
  uk: { title: 'Роль і доступ', current: 'Поточна роль', refresh: 'Перевірити права', note: 'Модерація доступна модератору й адміністратору. Розділ «Користувачі» доступний лише адміністратору. Якщо вам щойно призначили роль — увійдіть повторно.', user: 'Власні оголошення, покупки, повідомлення й особисті дані.', moderator: 'Каталог модерації, приховування оголошень, скарги та журнал дій.', admin: 'Усі можливості модератора, призначення ролей і блокування користувачів.', open: 'Відкрити модерацію' },
  pl: { title: 'Rola i dostęp', current: 'Aktualna rola', refresh: 'Sprawdź uprawnienia', note: 'Moderacja jest dostępna moderatorom i administratorom. Sekcja Użytkownicy jest dostępna tylko administratorowi. Po zmianie roli zaloguj się ponownie.', user: 'Własne oferty, zakupy, wiadomości i dane osobowe.', moderator: 'Widoczność ofert, zgłoszenia i historia działań.', admin: 'Uprawnienia moderatora, role i blokowanie użytkowników.', open: 'Otwórz moderację' },
  en: { title: 'Role and access', current: 'Current role', refresh: 'Check permissions', note: 'Moderation is available to moderators and administrators. Only administrators can manage users. Sign in again after your role is changed.', user: 'Your listings, purchases, messages and personal details.', moderator: 'Listing visibility, reports and the activity log.', admin: 'Moderator permissions plus user roles and suspensions.', open: 'Open moderation' },
};
export default function AccountAccess() {
  const { user, language, updateProfile } = useStore();
  const c = copy[language] || copy.pl;
  const roles = (accountCopy[language] || accountCopy.pl).role;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    setBusy(true); setError('');
    try { const result = await api('/auth/me'); updateProfile(result.user); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="account-section account-settings account-access">
    <span className="section-label">NASHARY ID / ACCESS</span><h2>{c.title}</h2>
    <p>{c.current}: <b>{roles[user.role]}</b> · @{user.username}</p><p>{c.note}</p>
    <div className="access-role-grid">{Object.keys(roles).map((role) => <article key={role} className={role === user.role ? 'is-current' : ''}><h3>{roles[role]}</h3><p>{c[role]}</p></article>)}</div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button type="button" className="quiet-button" disabled={busy} onClick={refresh}>{busy ? '…' : c.refresh}</button>
    {['admin', 'moderator'].includes(user.role) && <Link className="primary-button" to="/account?tab=moderation">{c.open} →</Link>}
  </section>;
}

export function accessLabel(language) {
  return (copy[language] || copy.pl).title;
}
