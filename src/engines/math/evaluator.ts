import { compile, type EvalFunction } from 'mathjs';

export type CompileResult =
  | { ok: true; fn: EvalFunction }
  | { ok: false; error: string };

const exprCache = new Map<string, CompileResult>();
const MAX_CACHE_ENTRIES = 250;

export function compileMathExpr(expr: string): CompileResult {
  const key = expr.trim();
  if (!key) {
    return { ok: false, error: 'Expression cannot be empty' };
  }

  const cached = exprCache.get(key);
  if (cached) {
    return cached;
  }

  try {
    const fn = compile(key);
    // Smoke-test evaluation with common math scope vars to catch undefined symbols early if needed?
    // No — equations use different variables (u,v or x,y,z,t), so compile check + runtime evalSafe handles it cleanly.
    const result: CompileResult = { ok: true, fn };
    if (exprCache.size > MAX_CACHE_ENTRIES) {
      exprCache.clear();
    }
    exprCache.set(key, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const result: CompileResult = { ok: false, error: message };
    exprCache.set(key, result);
    return result;
  }
}

export function evalSafe(
  fn: EvalFunction,
  scope: Record<string, number>,
  fallback = 0,
  clampAbs = 1e4
): number {
  try {
    const val = fn.evaluate(scope);
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) {
      return fallback;
    }
    if (num > clampAbs) return clampAbs;
    if (num < -clampAbs) return -clampAbs;
    return num;
  } catch {
    return fallback;
  }
}

export function clearMathExprCache(): void {
  exprCache.clear();
}
