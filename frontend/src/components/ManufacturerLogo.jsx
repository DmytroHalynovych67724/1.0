import { useState } from 'react';
import apple from '../../assets/manufacturers/apple.svg';
import samsung from '../../assets/manufacturers/samsung.svg';
import google from '../../assets/manufacturers/google.svg';
import sony from '../../assets/manufacturers/sony.svg';
import lenovo from '../../assets/manufacturers/lenovo.svg';
import asus from '../../assets/manufacturers/asus.svg';

const logos = {
  apple: { src: apple, mono: true }, samsung: { src: samsung, mono: true },
  google: { src: google }, sony: { src: sony, mono: true },
  lenovo: { src: lenovo }, asus: { src: asus, mono: true },
};

export default function ManufacturerLogo({ brand }) {
  const [failedSource, setFailedSource] = useState(null);
  const logo = logos[String(brand || '').trim().toLowerCase()];
  return <span className={`manufacturer-logo${logo?.mono ? ' manufacturer-logo--mono' : ''}`}>
    {logo && failedSource !== logo.src ? <img src={logo.src} alt={brand} loading="lazy" decoding="async" onError={() => setFailedSource(logo.src)} /> : <span className="manufacturer-logo__fallback">{brand}</span>}
  </span>;
}
