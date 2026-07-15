import { Link } from 'react-router-dom';

export default function Logo({ compact = false }) {
  return (
    <Link
      className={`brand-logo${compact ? ' brand-logo--compact' : ''}`}
      to="/"
      aria-label="NaShary"
    >
      <span className="brand-logo__frame">
        <span>Na</span>
        <b>Shary</b>
      </span>
    </Link>
  );
}
