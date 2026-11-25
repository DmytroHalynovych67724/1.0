import { Link } from 'react-router-dom';
import { batteryState, conditionCopy, defectsState, inspectionKeys } from '../deviceCondition.mjs';

export default function UsedConditionSummary({ product, language }) {
  if (product.condition !== 'used') return null;
  const c = conditionCopy[language] || conditionCopy.pl;
  const value = product.deviceDetails || {};
  const battery = batteryState(value);
  const defects = defectsState(value);
  const health = battery === 'reported' && Number.isInteger(value.batteryHealth) && value.batteryHealth >= 0 && value.batteryHealth <= 100 ? `${value.batteryHealth}%` : c[battery === 'reported' ? 'unknown' : battery];
  return <section className="shell used-condition-summary" id="listing-condition">
    <header><span className="section-label">{c.source}</span><h2>{c.title}</h2><p>{c.hint}</p></header>
    <dl>
      <div><dt>{c.battery}</dt><dd>{health}</dd></div>
      {['batteryRuntime', 'display', 'body', 'completeness', 'repairs'].map((key) => <div key={key}><dt>{c[key]}</dt><dd>{value[key] || c.unknown}</dd></div>)}
      <div className={defects === 'reported' ? 'has-defects' : ''}><dt>{c.defects}</dt><dd>{defects === 'reported' ? value.defects : defects === 'none' ? c.none : c.unknown}</dd></div>
      {value.grade && <div><dt>{c.grade}</dt><dd>{value.grade}<small>{c.gradeHint}</small></dd></div>}
    </dl>
    <h3>{c.inspection}</h3><p>{c.inspectionHint}</p>
    <ul>{inspectionKeys.map((key) => <li key={key}><span>{c[key]}</span><strong>{product.inspection?.[key] === true || (key === 'serialNumber' && value.serialChecked === true) ? c.checked : c.notChecked}</strong></li>)}</ul>
    <Link to="/guides#used">{language === 'uk' ? 'Як перевірити б/в пристрій' : language === 'en' ? 'How to inspect a used device' : 'Jak sprawdzić używane urządzenie'}</Link>
  </section>;
}
