import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { accountWords, ListingForm } from './Account';

export default function Sell() {
  const { user, language, region, flash } = useStore();
  const navigate = useNavigate();
  const c = accountWords[language] || accountWords.pl;
  if (!user) return <Navigate to="/auth" replace state={{ from: '/sell' }} />;
  return (
    <ListingForm
      page
      region={region}
      language={language}
      c={c}
      onClose={() => navigate(-1)}
      onSaved={(saved) => {
        flash(language === 'pl' ? 'Ogłoszenie opublikowane.' : language === 'uk' ? 'Оголошення опубліковано.' : 'Listing published.');
        navigate(`/product/${saved.id}`);
      }}
    />
  );
}
