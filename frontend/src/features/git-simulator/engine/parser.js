// Shell-ish tokenizer for the simulator. Handles quotes, backslash escapes and
// output redirection (`> file`, `>> file`) so commands like
// `echo "halo dunia" > catatan.txt` work.

export function tokenize(input) {
  const text = String(input ?? '');
  const tokens = [];
  let current = '';
  let hasCurrent = false;
  let quote = null;

  const push = () => {
    if (hasCurrent) {
      tokens.push(current);
      current = '';
      hasCurrent = false;
    }
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === '\\' && quote === '"' && i + 1 < text.length) {
        const next = text[++i];
        if (next === '"' || next === '\\' || next === '$' || next === '`') current += next;
        else current += `\\${next}`;
      } else {
        current += char;
      }
      hasCurrent = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasCurrent = true;
      continue;
    }
    if (char === '\\' && i + 1 < text.length) {
      current += text[++i];
      hasCurrent = true;
      continue;
    }
    if (char === '>' || char === '<') {
      push();
      if (char === '>' && text[i + 1] === '>') {
        tokens.push('>>');
        i++;
      } else if (char === '>' && text[i + 1] === '&') {
        // `2>&1` style: keep it as a harmless token
        let value = '>&';
        i++;
        while (i + 1 < text.length && /[0-9]/.test(text[i + 1])) value += text[++i];
        tokens.push(value);
      } else if (char === '>') {
        tokens.push('>');
      } else if (text[i + 1] === '<') {
        tokens.push('<<');
        i++;
      } else {
        tokens.push('<');
      }
      continue;
    }
    if (/\s/.test(char)) {
      push();
      continue;
    }
    current += char;
    hasCurrent = true;
  }
  if (quote) {
    // Unterminated quote: keep what we have instead of throwing. The command
    // layer reports a friendly error.
  }
  push();
  return tokens;
}

export function parseCommand(input) {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return { raw, tokens: [], argv: [], command: null, args: [], redirect: null, parseError: null };
  }

  const tokens = tokenize(raw);
  let argv = tokens;
  if (argv[0] === 'git') argv = argv.slice(1);

  let redirect = null;
  const clean = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '>' || token === '>>' || token === '<') {
      const file = argv[i + 1];
      redirect = { mode: token, file: file === undefined ? null : file };
      i++;
      continue;
    }
    clean.push(token);
  }

  const command = clean[0] || null;
  const args = clean.slice(1);

  let parseError = null;
  if (redirect && !redirect.file) parseError = `sintaks tidak valid: file tujuan setelah '${redirect.mode}' tidak ditemukan.`;
  if (redirect && redirect.mode === '<') parseError = 'input dari file belum didukung simulator.';

  return { raw, tokens, argv: clean, command, args, redirect, parseError };
}

// Shared flag parser used by commands.js.
// valueFlags lists flags that consume a value, e.g. ['m', 'n', 'message'].
export function parseArgs(args, valueFlags = []) {
  const wantsValue = new Set(valueFlags.map((flag) => flag.replace(/^-+/, '')));
  const result = { flags: new Set(), values: {}, positionals: [], separator: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      result.separator = true;
      result.positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        const name = body.slice(0, eq);
        result.flags.add(name);
        result.values[name] = body.slice(eq + 1);
      } else if (wantsValue.has(body)) {
        result.values[body] = args[++i];
      } else {
        result.flags.add(body);
      }
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      const chars = arg.slice(1);
      for (let j = 0; j < chars.length; j++) {
        const char = chars[j];
        if (wantsValue.has(char)) {
          const rest = chars.slice(j + 1);
          result.values[char] = rest || args[++i];
          break;
        }
        result.flags.add(char);
      }
      continue;
    }
    result.positionals.push(arg);
  }
  return result;
}
