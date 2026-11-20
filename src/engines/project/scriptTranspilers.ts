export type ScriptLanguage = 'javascript' | 'python' | 'cpp';

/**
 * Automatically detects whether the user's engineering script is written in
 * Python, C++ / Arduino (.cpp / .ino), or JavaScript (ES6+).
 */
export function detectScriptLanguage(code: string): ScriptLanguage {
  const src = code.trim();

  // C++ / Arduino indicators
  if (
    /#include\s*[<"]/m.test(src) ||
    /\bvoid\s+(setup|loop|onStep)\s*\(/m.test(src) ||
    /\b(outerflow|design|bench|std)::[a-zA-Z_]/m.test(src) ||
    /\b(Serial\.(begin|print|println)|pinMode|digitalWrite|analogWrite)\s*\(/m.test(src)
  ) {
    return 'cpp';
  }

  // Python indicators
  if (
    /^\s*(import\s+outerflow|import\s+math|from\s+outerflow\s+import)/m.test(src) ||
    /^\s*def\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:/m.test(src) ||
    /^\s*for\s+[a-zA-Z_]\w*\s+in\s+range\s*\([^)]*\)\s*:/m.test(src) ||
    /^\s*(elif\s+.*:|else\s*:)/m.test(src) ||
    (/\bouterflow\.(spawn_box|spawn_sphere|spawn_cylinder|spawn_part|add_hardware|add_joint|set_gravity|on_step)\b/.test(
      src
    ) &&
      !/[;{]/.test(src))
  ) {
    return 'python';
  }

  return 'javascript';
}

const SNAKE_TO_CAMEL_IDENTIFIERS: Record<string, string> = {
  set_gravity: 'setGravity',
  set_mode: 'setMode',
  spawn_box: 'spawnBox',
  spawn_sphere: 'spawnSphere',
  spawn_cylinder: 'spawnCylinder',
  spawn_part: 'spawnPart',
  spawn_mesh: 'spawnMesh',
  spawn_body: 'spawnBody',
  add_part: 'addPart',
  add_hardware: 'addHardware',
  add_joint: 'addJoint',
  add_parameter: 'addParameter',
  on_step: 'onStep',
  set_board: 'setBoard',
  clear_modules: 'clearModules',
  clear_wires: 'clearWires',
  set_exploded: 'setExploded',
  add_module: 'addModule',
  extrude_2d: 'extrude2D',
  lathe_2d: 'lathe2D',
  get_state: 'getState',
  apply_force: 'applyForce',
  apply_impulse: 'applyImpulse',
  set_motor: 'setMotor',
  log_metric: 'logMetric',
  record_metric: 'logMetric',
  body_type: 'bodyType',
  body_a: 'bodyA',
  body_b: 'bodyB',
  anchor_a: 'anchorA',
  anchor_b: 'anchorB',
  motor_speed: 'motorSpeed',
  motor_max_force: 'motorMaxForce',
  rest_length: 'restLength',
  rot_y: 'rotY',
  is_calculated: 'isCalculated',
  target_entity_id: 'targetEntityId',
  target_field: 'targetField',
  target_joint_id: 'targetJointId',
  target_joint_field: 'targetJointField',
};

function replaceSnakeCaseTokens(expr: string): string {
  let out = expr;
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL_IDENTIFIERS)) {
    const re = new RegExp(`\\b${snake}\\b`, 'g');
    out = out.replace(re, camel);
  }
  return out;
}

/**
 * Converts Python keyword arguments inside a function call (e.g.
 * `outerflow.spawn_box(id='pad', pos=[0, 1, 0], mass=2.5)`) into a JS options object
 * (`outerflow.spawnBox({ id: 'pad', pos: [0, 1, 0], mass: 2.5 })`).
 */
function convertPythonKeywordCalls(line: string): string {
  // Match `<callee>(<args>)` where args contain `key=value` (not `==`, `!=`, `<=`, `>=`)
  const callRegex =
    /\b((?:outerflow|design|world|bench|api)\.[a-zA-Z0-9_]+)\s*\(([\s\S]*)\)$/;
  const match = line.match(callRegex);
  if (!match) return line;

  const prefix = line.slice(0, match.index ?? 0);
  const callee = match[1];
  const rawArgs = match[2].trim();
  if (!rawArgs) return line;

  // Split top-level comma-separated arguments respecting brackets/parens/quotes
  const parts: string[] = [];
  let depth = 0;
  let inStr: string | null = null;
  let curr = '';

  for (let i = 0; i < rawArgs.length; i++) {
    const ch = rawArgs[i];
    if (inStr) {
      curr += ch;
      if (ch === inStr && rawArgs[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      curr += ch;
      continue;
    }
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(curr.trim());
      curr = '';
    } else {
      curr += ch;
    }
  }
  if (curr.trim()) parts.push(curr.trim());

  const positional: string[] = [];
  const kwPairs: string[] = [];

  for (const p of parts) {
    const kwMatch = p.match(/^([a-zA-Z_]\w*)\s*=\s*([^=][\s\S]*)$/);
    if (kwMatch) {
      const key = SNAKE_TO_CAMEL_IDENTIFIERS[kwMatch[1]] ?? kwMatch[1];
      kwPairs.push(`${key}: ${kwMatch[2].trim()}`);
    } else {
      positional.push(p);
    }
  }

  if (kwPairs.length === 0) return line;

  const finalArgs = [...positional, `{ ${kwPairs.join(', ')} }`].join(', ');
  return `${prefix}${callee}(${finalArgs})`;
}

/**
 * Joins multi-line bracketed/parenthesized expressions in Python so indentation
 * processing operates on logical statements.
 */
function joinMultilinePythonStatements(src: string): string[] {
  const rawLines = src.replace(/\r\n/g, '\n').split('\n');
  const logicalLines: string[] = [];
  let buffer = '';
  let depth = 0;

  for (const raw of rawLines) {
    // Strip trailing inline `#` comments outside quotes
    let cleaned = '';
    let inQuote: string | null = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (inQuote) {
        cleaned += ch;
        if (ch === inQuote && raw[i - 1] !== '\\') inQuote = null;
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
        cleaned += ch;
      } else if (ch === '#') {
        break;
      } else {
        cleaned += ch;
      }
    }

    if (!cleaned.trim()) {
      if (depth === 0) continue;
    }

    if (depth === 0) {
      buffer = cleaned;
    } else {
      buffer += ' ' + cleaned.trim();
    }

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    }

    if (depth === 0 && buffer.trim()) {
      logicalLines.push(buffer);
      buffer = '';
    }
  }

  if (buffer.trim()) {
    logicalLines.push(buffer);
  }
  return logicalLines;
}

/**
 * Transpiles Python engineering scripts (`def`, `for i in range(...)`, `if/elif/else`,
 * `math.*`, keyword arguments, snake_case Outerflow API) into executable Outerflow JS.
 */
export function transpilePythonToJS(pyCode: string): string {
  const lines = joinMultilinePythonStatements(pyCode);
  const indentStack: number[] = [0];
  const out: string[] = [
    '// [Transpiled from Python (.py)]',
    'const math = Object.assign(Object.create(Math), {',
    '  pi: Math.PI, e: Math.E, fabs: Math.abs,',
    '  radians: (d) => (d * Math.PI) / 180,',
    '  degrees: (r) => (r * 180) / Math.PI,',
    '});',
    'const len = (arr) => (arr && typeof arr.length === "number" ? arr.length : 0);',
    'const str = (v) => String(v);',
    'const int = (v) => Math.trunc(Number(v));',
    'const float = (v) => Number(v);',
    'const abs = Math.abs, min = Math.min, max = Math.max, round = Math.round;',
    'const print = (...args) => outerflow.print(...args);',
  ];

  let definedOnStep = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip pure Python imports
    if (/^(import\s+|from\s+\S+\s+import\s+)/.test(trimmed)) {
      continue;
    }

    const indent = rawLine.search(/\S/);
    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      out.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
    }

    let stmt = trimmed;

    // Python boolean / null / logical operators
    stmt = stmt
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!')
      .replace(/([a-zA-Z0-9_)\]])\s*\*\*\s*([a-zA-Z0-9_([\-.]+)/g, 'Math.pow($1, $2)')
      .replace(/\.append\s*\(/g, '.push(');

    stmt = replaceSnakeCaseTokens(stmt);

    const pad = ' '.repeat(indent);

    // 1. `def func_name(args):`
    const defMatch = stmt.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:\s*$/);
    if (defMatch) {
      const fnName = defMatch[1];
      const fnArgs = defMatch[2];
      if (fnName === 'on_step' || fnName === 'onStep') {
        definedOnStep = true;
      }
      out.push(`${pad}function ${fnName}(${fnArgs}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    // 2. `for i in range(...):`
    const rangeMatch = stmt.match(
      /^for\s+([a-zA-Z_]\w*)\s+in\s+range\s*\(([^)]+)\)\s*:\s*$/
    );
    if (rangeMatch) {
      const iterVar = rangeMatch[1];
      const rangeArgs = rangeMatch[2].split(',').map((s) => s.trim());
      if (rangeArgs.length === 1) {
        out.push(`${pad}for (let ${iterVar} = 0; ${iterVar} < ${rangeArgs[0]}; ${iterVar}++) {`);
      } else if (rangeArgs.length === 2) {
        out.push(
          `${pad}for (let ${iterVar} = ${rangeArgs[0]}; ${iterVar} < ${rangeArgs[1]}; ${iterVar}++) {`
        );
      } else {
        out.push(
          `${pad}for (let ${iterVar} = ${rangeArgs[0]}; ${iterVar} < ${rangeArgs[1]}; ${iterVar} += ${rangeArgs[2]}) {`
        );
      }
      indentStack.push(indent + 2);
      continue;
    }

    // 3. `for item in list:` or `for a, b in list:`
    const forInMatch = stmt.match(/^for\s+(.+?)\s+in\s+(.+)\s*:\s*$/);
    if (forInMatch) {
      const lhs = forInMatch[1].trim();
      const rhs = forInMatch[2].trim();
      const binding = lhs.includes(',') ? `[${lhs.replace(/^[()[\]]+|[()[\]]+$/g, '')}]` : lhs;
      out.push(`${pad}for (const ${binding} of ${rhs}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    // 4. `elif cond:`
    const elifMatch = stmt.match(/^elif\s+(.+)\s*:\s*$/);
    if (elifMatch) {
      // Replace the closing brace we just popped with `} else if (...) {`
      if (out[out.length - 1]?.trim() === '}') {
        out.pop();
      }
      out.push(`${pad}} else if (${elifMatch[1]}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    // 5. `else:`
    if (/^else\s*:\s*$/.test(stmt)) {
      if (out[out.length - 1]?.trim() === '}') {
        out.pop();
      }
      out.push(`${pad}} else {`);
      indentStack.push(indent + 2);
      continue;
    }

    // 6. `if cond:` / `while cond:`
    const condMatch = stmt.match(/^(if|while)\s+(.+)\s*:\s*$/);
    if (condMatch) {
      out.push(`${pad}${condMatch[1]} (${condMatch[2]}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    // 7. `global x, y` or `pass`
    if (/^(global\s+|pass\b)/.test(stmt)) {
      continue;
    }

    // Convert Python keyword args in function calls (`outerflow.spawnBox(id='a', pos=[0,1,0])`)
    // Handle both standalone calls and assignments (`box_id = outerflow.spawnBox(...)`)
    const assignMatch = stmt.match(/^([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const rhs = convertPythonKeywordCalls(assignMatch[2].trim());
      out.push(`${pad}var ${varName} = ${rhs};`);
    } else {
      out.push(`${pad}${convertPythonKeywordCalls(stmt)};`);
    }
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    out.push('}');
  }

  if (definedOnStep) {
    out.push(
      'if (typeof on_step === "function") { outerflow.onStep(on_step); } else if (typeof onStep === "function") { outerflow.onStep(onStep); }'
    );
  }

  return out.join('\n');
}

/**
 * Transpiles C++ / Arduino (`.cpp` / `.ino`) engineering & firmware scripts into
 * executable Outerflow JavaScript, wiring `setup()` to build time and `loop(float t)`
 * (or `loop()`) to the 60Hz `outerflow.onStep` simulation loop.
 */
export function transpileCppToJS(cppCode: string): string {
  let src = cppCode.replace(/\r\n/g, '\n');

  // 1. Strip preprocessor directives (`#include <...>`, `#define ...`, `#pragma ...`)
  src = src.replace(/^\s*#\s*define\s+([a-zA-Z_]\w*)\s+(.+)$/gm, 'const $1 = $2;');
  src = src.replace(/^\s*#\s*(include|pragma|ifdef|ifndef|endif).*$/gm, '');
  src = src.replace(/^\s*using\s+namespace\s+[a-zA-Z0-9_:]+\s*;/gm, '');

  // 2. Namespace resolution (`outerflow::` -> `outerflow.`, `design::` -> `design.`, `bench::` -> `bench.`, `std::` -> `Math.`)
  src = src
    .replace(/\b(outerflow|design|world|bench)::/g, '$1.')
    .replace(/\bstd::(sin|cos|tan|asin|acos|atan|atan2|sqrt|abs|pow|min|max|floor|ceil|round|hypot)\b/g, 'Math.$1')
    .replace(/\bM_PI\b/g, 'Math.PI');

  // 3. C++ vector / array initializer lists:
  //    `Vec3{1, 2, 3}` or `std::vector<float>{1, 2, 3}` -> `[1, 2, 3]`
  src = src.replace(
    /\b(?:std::vector<[^>]+>|Vec3|vec3|float3)\s*\{([^{}]*)\}/g,
    '[$1]'
  );

  // Convert C++ numeric initializer lists `{ 0.0f, 1.5f, -0.5f }` used as arguments/values into `[ ... ]`
  // when inside function calls or assignments and containing only numbers/expressions (no `:` key-value pairs)
  src = src.replace(/\{([^{}:;]+)\}/g, (full, inner: string) => {
    const trimmed = inner.trim();
    if (!trimmed) return full;
    // Check if it looks like a comma-separated list of 2..4 numeric expressions (Vec2/Vec3)
    const parts = trimmed.split(',');
    if (
      parts.length >= 2 &&
      parts.length <= 4 &&
      parts.every((p) => /^[\s0-9.+\-*/a-zA-Z_()[\]]+$/.test(p.trim())) &&
      !parts.some((p) => /\b(return|const|let|var|if|for)\b/.test(p))
    ) {
      return `[${trimmed}]`;
    }
    return full;
  });

  // 4. Strip trailing `f` from float literals (`1.25f` -> `1.25`, `0.5F` -> `0.5`)
  src = src.replace(/\b(\d+\.\d+|\d+\.)[fF]\b/g, '$1');

  // 5. Convert C++ function declarations:
  //    `void setup()` -> `function setup()`
  //    `void loop(float t, StepApi& api)` -> `function loop(t, api)`
  src = src.replace(
    /\b(?:void|int|float|double|bool|auto|std::string|String|Geometry)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/g,
    (_m, fnName: string, rawParams: string) => {
      const cleanedParams = rawParams
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          // Strip C++ parameter type (`const Vec3& pos` -> `pos`, `float t = 0` -> `t = 0`)
          const defaultParts = p.split('=');
          const decl = defaultParts[0].trim();
          const tokens = decl.replace(/[&*]/g, ' ').trim().split(/\s+/);
          const paramName = tokens[tokens.length - 1];
          return defaultParts.length > 1
            ? `${paramName} = ${defaultParts[1].trim()}`
            : paramName;
        })
        .join(', ');
      return `function ${fnName}(${cleanedParams}) {`;
    }
  );

  // 6. Convert C++ lambda expressions `[&](float t, auto& api) {` -> `(t, api) => {`
  src = src.replace(
    /\[[^\]]*\]\s*\(([^)]*)\)\s*\{/g,
    (_m, rawParams: string) => {
      const cleanedParams = rawParams
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const tokens = p.replace(/[&*]/g, ' ').trim().split(/\s+/);
          return tokens[tokens.length - 1];
        })
        .join(', ');
      return `(${cleanedParams}) => {`;
    }
  );

  // 7. Convert C++ typed variable declarations (with or without initializer):
  //    `const float Kp = 48.0;` -> `let Kp = 48.0;`
  //    `EntityId baseId;` -> `let baseId;`
  //    `auto gear = design.gear(...);` -> `let gear = design.gear(...);`
  src = src.replace(
    /\b(?:const\s+)?(?:auto|float|double|int|long|bool|String|std::string|Vec3|Geometry|EntityId|JointId)\s+(?:[&*]\s*)?([a-zA-Z_]\w*)\s*(=|;)/g,
    'let $1 $2'
  );

  // 8. Convert C++ C-style casts like `(int)map(...)` or `(float)x`
  src = src.replace(/\(\s*(?:int|float|double)\s*\)\s*/g, '');

  // 9. Convert C++ `for (int i = 0; ...)`
  src = src.replace(/\bfor\s*\(\s*(?:int|size_t|auto)\s+/g, 'for (let ');

  src = replaceSnakeCaseTokens(src);

  const preamble = `// [Transpiled from C++ / Arduino (.cpp / .ino)]
const HIGH = 1, LOW = 0, INPUT = 0, OUTPUT = 1, INPUT_PULLUP = 2;
const PI = Math.PI, HALF_PI = Math.PI / 2, TWO_PI = Math.PI * 2;
const sin = Math.sin, cos = Math.cos, tan = Math.tan, sqrt = Math.sqrt, abs = Math.abs, pow = Math.pow, min = Math.min, max = Math.max, hypot = Math.hypot;
const constrain = (x, a, b) => Math.max(a, Math.min(b, x));
const map = (x, inMin, inMax, outMin, outMax) => ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
const millis = () => Math.round((typeof __cppSimTime === 'number' ? __cppSimTime : 0) * 1000);
let __cppSimTime = 0;
let __cppStepApi = null;
const __pinStates = {};
const Serial = {
  begin: (baud) => outerflow.print('[Serial] Initialized @ ' + baud + ' baud'),
  print: (...a) => outerflow.print(...a),
  println: (...a) => outerflow.print(...a),
};
function pinMode(pin, mode) {
  __pinStates[pin] = { mode, value: 0 };
}
function digitalWrite(pin, val) {
  __pinStates[pin] = { ...(__pinStates[pin] || {}), value: val ? 1 : 0 };
  if (__cppStepApi) __cppStepApi.logMetric('pin_D' + pin, val ? 5.0 : 0.0);
}
function analogWrite(pin, pwm) {
  const clamped = constrain(pwm, 0, 255);
  __pinStates[pin] = { ...(__pinStates[pin] || {}), value: clamped };
  if (__cppStepApi) __cppStepApi.logMetric('pwm_D' + pin, clamped);
}
function digitalRead(pin) {
  return (__pinStates[pin] && __pinStates[pin].value) ? 1 : 0;
}
function analogRead(pin) {
  return Math.round(512 + 511 * Math.sin(__cppSimTime * 2.5 + Number(String(pin).replace(/\\D/g, '') || 0)));
}
function delay(_ms) {}
`;

  const epilogue = `
if (typeof setup === 'function') {
  setup();
}
if (typeof loop === 'function') {
  outerflow.onStep((t, api) => {
    __cppSimTime = t;
    __cppStepApi = api;
    loop(t, api);
  });
} else if (typeof onStep === 'function') {
  outerflow.onStep((t, api) => {
    __cppSimTime = t;
    __cppStepApi = api;
    onStep(t, api);
  });
}
`;

  return `${preamble}\n${src}\n${epilogue}`;
}

export function transpileToOuterflowJS(
  code: string,
  language?: ScriptLanguage | 'auto'
): { jsCode: string; detectedLanguage: ScriptLanguage } {
  const detectedLanguage: ScriptLanguage =
    !language || language === 'auto' ? detectScriptLanguage(code) : language;

  if (detectedLanguage === 'python') {
    return { jsCode: transpilePythonToJS(code), detectedLanguage };
  }
  if (detectedLanguage === 'cpp') {
    return { jsCode: transpileCppToJS(code), detectedLanguage };
  }
  return { jsCode: code, detectedLanguage: 'javascript' };
}
