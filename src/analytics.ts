/**
 * Funnels: where players drop off. Call `analytics.step` and `analytics.track` from the controller, never
 * a sink directly. Payloads hold no free text; each event is capped per session (ymir/analytics).
 */
import { createAnalytics } from 'ymir/analytics';

export const FUNNELS = {
  boot: { scope: 'session', steps: ['load_started', 'load_finished', 'first_move'] },
  ftue: { scope: 'player', steps: ['first_run', 'first_coin', 'first_win', 'second_run'] },
  run: { scope: 'run', steps: ['run_start', 'coin_5', 'won'] },
} as const;

export const analytics = createAnalytics(FUNNELS);
