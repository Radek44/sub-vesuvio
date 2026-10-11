/** The sim stays pure: no Three.js, React, DOM or global random, so it can run headless and in Norn. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('architecture', () => {
  it('the sim imports no renderer or UI, and never uses Math.random or the clock', () => {
    // Comments may name what's forbidden; only code counts.
    const src = readFileSync(join(__dirname, '../src/sim.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(src).not.toMatch(/from ['"](three|react|react-dom)['"]/);
    expect(src).not.toMatch(/from ['"]ymir\/(three|ui|platform|audio)/);
    expect(src).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });
});
