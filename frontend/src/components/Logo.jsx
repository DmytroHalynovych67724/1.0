import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function Logo({ compact = false }) {
  return (
    <Link
      className={`brand-logo${compact ? ' brand-logo--compact' : ''}`}
      to="/"
      aria-label="NaShary"
    >
      <BrandMark />
      <span className="brand-wordmark">NaShary</span>
    </Link>
  );
}
