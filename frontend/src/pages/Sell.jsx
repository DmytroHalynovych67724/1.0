import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { accountWords, ListingForm } from './Account';

export default function Sell() {
  const { user, language, region, flash } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const c = accountWords[language] || accountWords.pl;
  const requested = params.get('condition');
  const destination = requested === 'new' || requested === 'used' ? `/sell?condition=${requested}` : '/sell';
  if (!user) return <Navigate to="/auth" replace state={{ from: destination }} />;
  return (
    <ListingForm
      key={destination}
      page
      initialCondition={requested}
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
