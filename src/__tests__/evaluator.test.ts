import { describe, expect, it } from 'vitest';
import { clearMathExprCache, compileMathExpr, evalSafe } from '../engines/math/evaluator';

describe('Math Expression Evaluator', () => {
  it('compiles and evaluates valid multi-variable expressions', () => {
    clearMathExprCache();
    const res = compileMathExpr('sin(u) * cos(v) + 2 * t');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const val = evalSafe(res.fn, { u: Math.PI / 2, v: 0, t: 1.5 });
    expect(val).toBeCloseTo(4.0, 6);
  });

  it('rejects empty or syntactically invalid expressions gracefully', () => {
    expect(compileMathExpr('   ').ok).toBe(false);
    const bad = compileMathExpr('sin((x + )');
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.length).toBeGreaterThan(0);
    }
  });

  it('returns fallback on NaN or Infinity division by zero', () => {
    const res = compileMathExpr('1 / x');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const val = evalSafe(res.fn, { x: 0 }, -1, 500);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBe(-1);
  });
});
