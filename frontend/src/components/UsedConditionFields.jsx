import { batteryState, conditionCopy, defectsState, inspectionKeys } from '../deviceCondition.mjs';

export default function UsedConditionFields({ value = {}, inspection = {}, onChange, onInspectionChange, language }) {
  const c = conditionCopy[language] || conditionCopy.pl;
  const battery = batteryState(value);
  const defects = defectsState(value);
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <>
    <fieldset className="span-2 device-details-form used-condition-fields"><legend>{c.title}</legend>
      <p className="span-2">{c.formHint}</p>
      <label>{c.battery}<select value={battery} onChange={(e) => onChange({ ...value, batteryHealthStatus: e.target.value, batteryHealth: '' })}>{['unknown', 'reported', 'unavailable', 'not_applicable'].map((key) => <option value={key} key={key}>{c[key]}</option>)}</select></label>
      {battery === 'reported' && <label>{c.percent}<input type="number" min="0" max="100" step="1" required value={value.batteryHealth ?? ''} onChange={(e) => change('batteryHealth', e.target.value === '' ? '' : Number(e.target.value))}/></label>}
      <p className="span-2">{c.batteryHint}</p>
      {battery !== 'not_applicable' && <label className="span-2">{c.batteryRuntime}<input maxLength="300" placeholder={c.runtimeHint} value={value.batteryRuntime || ''} onChange={(e) => change('batteryRuntime', e.target.value)}/></label>}
      {['display', 'body', 'completeness', 'repairs'].map((key) => <label key={key}>{c[key]}<textarea maxLength="300" rows="2" value={value[key] || ''} onChange={(e) => change(key, e.target.value)}/></label>)}
      <label>{c.defectsStatus}<select value={defects} onChange={(e) => onChange({ ...value, defectsStatus: e.target.value, defects: e.target.value === 'reported' ? value.defects || '' : '' })}><option value="unknown">{c.unknown}</option><option value="none">{c.none}</option><option value="reported">{c.defectsReported}</option></select></label>
      {defects === 'reported' && <label>{c.defects}<textarea required maxLength="300" rows="3" value={value.defects || ''} onChange={(e) => change('defects', e.target.value)}/></label>}
      <p className="span-2">{c.defectsHint}</p>
      <label>{c.grade}<select value={value.grade || ''} onChange={(e) => change('grade', e.target.value)}><option value="">{c.unknown}</option>{['A+', 'A', 'B', 'C', 'D'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <p>{c.gradeHint}</p>
    </fieldset>
    <fieldset className="span-2 inspection-form"><legend>{c.inspection}</legend><p>{c.inspectionHint}</p>{inspectionKeys.map((key) => <label className="check-filter" key={key}><input type="checkbox" checked={inspection[key] === true} onChange={(e) => onInspectionChange({ ...inspection, [key]: e.target.checked })}/><span>{c[key]}</span></label>)}</fieldset>
  </>;
}
