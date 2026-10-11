import { defineConfig } from 'vitest/config';

// Agents' worktrees live under .claude/; their tests are theirs.
export default defineConfig({ test: { exclude: ['**/node_modules/**', '.claude/**', 'dist/**'] } });
