/**
 * The sim and lingua stay pure: no Three.js, React, DOM, clock or global random, so they run headless, in Norn
 * and in CI's Latin checks.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Comments may name what's forbidden; only code counts.
const code = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('architecture', () => {
  it('the sim, the level, the art and the content import no renderer or UI, and never use Math.random or the clock', () => {
    for (const d of ['sim', 'level', 'art', 'content']) {
      const dir = join(__dirname, '../src', d);
      for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x))) {
        const src = code(join(dir, f));
        expect({ f, renderer: /from ['"](three|react|react-dom)['"]/.test(src) }).toEqual({ f, renderer: false });
        expect({ f, host: /from ['"]ymir\/(three|ui|platform|audio)/.test(src) }).toEqual({ f, host: false });
        expect({ f, clock: /Math\.random|Date\.now|performance\.now/.test(src) }).toEqual({ f, clock: false });
      }
    }
  });

  it('lingua is pure TypeScript: only its own modules; no DOM, clock or global random', () => {
    const dir = join(__dirname, '../src/lingua');
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.[cm]?[jt]sx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = code(join(dir, f));
      expect({ f, jsx: /x$/.test(f) }).toEqual({ f, jsx: false });
      // Words inside strings (meanings, messages) aren't code.
      const bare = src.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
      // Imports only from inside lingua: no three, react, ymir, SDK or node built-ins.
      for (const m of src.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g))
        expect({ f, imports: m[1] }).toEqual({ f, imports: expect.stringMatching(/^\.\/[\w-]+$/) });
      expect({ f, clockOrRandom: bare.match(/Math\.random|\bDate\b|performance\.now|setTimeout|setInterval|crypto/)?.[0] ?? null }).toEqual({
        f,
        clockOrRandom: null,
      });
      expect({ f, host: bare.match(/\b(window|document|localStorage|sessionStorage|navigator|globalThis|require|process)\b/)?.[0] ?? null }).toEqual({
        f,
        host: null,
      });
    }
  });
});
