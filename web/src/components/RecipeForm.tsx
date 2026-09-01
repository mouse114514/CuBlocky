import type { RecipeEntry, RecipeIngredient } from '../types';
import { useI18n } from '../i18n';

const CATEGORIES = ['Materials', 'Tools', 'Medicine', 'Utilities', 'Food'];

interface Props {
  recipe: RecipeEntry;
  onChange: (next: RecipeEntry) => void;
  onDelete: () => void;
}

export function RecipeForm({ recipe, onChange, onDelete }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof RecipeEntry>(k: K, v: RecipeEntry[K]) =>
    onChange({ ...recipe, [k]: v });

  const updateIng = (i: number, patch: Partial<RecipeIngredient>) => {
    const list = recipe.ingredients.map((ing, idx) =>
      idx === i ? { ...ing, ...patch } : ing
    );
    set('ingredients', list);
  };

  const addIng = () => {
    set('ingredients', [
      ...recipe.ingredients,
      { mode: 'specific', id: 'glass', amount: 1, isLiquid: false, destroyItem: true },
    ]);
  };

  const removeIng = (i: number) => {
    set('ingredients', recipe.ingredients.filter((_, idx) => idx !== i));
  };

  return (
    <div className="form">
      <div className="form-row">
        <label>{t('recipe.result')}<input value={recipe.resultId} onChange={e => set('resultId', e.target.value)} /></label>
        <label>{t('recipe.category')}
          <select value={recipe.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>{t('recipe.int')}<input type="number" value={recipe.intRequirement} onChange={e => set('intRequirement', parseInt(e.target.value) || 0)} /></label>
        <label>{t('recipe.amount')}<input type="number" value={recipe.resultAmount} onChange={e => set('resultAmount', parseInt(e.target.value) || 1)} /></label>
        <label>{t('recipe.condition')}<input type="number" step="0.05" value={recipe.resultCondition} onChange={e => set('resultCondition', parseFloat(e.target.value) || 0)} /></label>
        <label><input type="checkbox" checked={recipe.isLiquidResult} onChange={e => set('isLiquidResult', e.target.checked)} />{t('recipe.liquid')}</label>
      </div>

      <h3>{t('recipe.ingredients')}</h3>
      {recipe.ingredients.map((ing, i) => (
        <div key={i} className="ingredient-card">
          <div className="form-row">
            <label>{t('recipe.mode')}
              <select value={ing.mode} onChange={e => updateIng(i, { mode: e.target.value as RecipeIngredient['mode'] })}>
                <option value="specific">{t('recipe.specific')}</option>
                <option value="quality">{t('recipe.quality')}</option>
              </select>
            </label>
            <label>{t('recipe.id')}<input value={ing.id} onChange={e => updateIng(i, { id: e.target.value })} /></label>
            <label>{t('recipe.amount2')}<input type="number" step="0.1" value={ing.amount} onChange={e => updateIng(i, { amount: parseFloat(e.target.value) || 0 })} /></label>
            <label><input type="checkbox" checked={ing.isLiquid} onChange={e => updateIng(i, { isLiquid: e.target.checked })} />{t('recipe.isLiquid')}</label>
            <label><input type="checkbox" checked={ing.destroyItem} onChange={e => updateIng(i, { destroyItem: e.target.checked })} />{t('recipe.consume')}</label>
            <button className="danger small" onClick={() => removeIng(i)}>X</button>
          </div>
        </div>
      ))}
      <button onClick={addIng}>{t('recipe.add')}</button>
      <div className="form-actions">
        <button className="danger" onClick={onDelete}>{t('recipe.delete')}</button>
      </div>
    </div>
  );
}
