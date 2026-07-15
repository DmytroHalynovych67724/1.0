import { Link } from 'react-router-dom';
import { useStore } from '../store';
export default function NotFound() {
  const { language, t } = useStore();
  const message = {
    pl: 'Ta strona gdzieś się zapodziała.',
    uk: 'Ця сторінка десь загубилася.',
    en: 'This page seems to have gone missing.',
  }[language];
  return (
    <div className="shell not-found">
      <b>404</b>
      <h1>{message}</h1>
      <Link className="primary-button" to="/">
        {t('home')}
      </Link>
    </div>
  );
}
