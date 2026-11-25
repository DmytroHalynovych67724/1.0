import { useStore } from '../store';
import BrandMark from './BrandMark';

const copy = {
  uk: { title: 'Не вдалося відкрити сторінку', text: 'Можливо, сайт оновився, поки ця вкладка була відкрита, або перервалося з’єднання. Спробуй оновити сторінку.', reload: 'Оновити сторінку', home: 'На головну' },
  pl: { title: 'Nie udało się otworzyć strony', text: 'Witryna mogła zostać zaktualizowana, gdy karta była otwarta, lub połączenie zostało przerwane. Spróbuj odświeżyć stronę.', reload: 'Odśwież stronę', home: 'Strona główna' },
  en: { title: 'Could not open this page', text: 'The site may have been updated while this tab was open, or the connection was interrupted. Try refreshing the page.', reload: 'Refresh page', home: 'Home' },
};

export default function RouteError() {
  const { language } = useStore();
  const c = copy[language] || copy.pl;
  return <main className="shell route-error" role="alert"><BrandMark/><h1>{c.title}</h1><p>{c.text}</p><div><button type="button" className="primary-button" onClick={() => window.location.reload()}>{c.reload}</button><a className="quiet-button" href={import.meta.env.BASE_URL}>{c.home}</a></div></main>;
}
