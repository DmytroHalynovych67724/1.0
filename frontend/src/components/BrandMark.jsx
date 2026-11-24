export default function BrandMark({ className = '' }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="15" fill="currentColor" />
    <path d="M13 46V18L30 46V18M52 19H43C33 19 33 31 43 31H44C54 31 54 45 44 45H35" stroke="white" strokeWidth="6" strokeLinejoin="round" />
  </svg>;
}
