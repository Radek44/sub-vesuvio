/**
 * Funnels: where players drop off, and where the Latin is hard. Call `analytics.step` and `analytics.track`
 * from the controller, never a sink directly. Payloads hold no free text (never the hero's name); each event
 * is capped per session (ymir/analytics).
 */
import { createAnalytics } from 'ymir/analytics';

export const FUNNELS = {
  boot: { scope: 'session', steps: ['load_started', 'load_finished', 'title_shown', 'first_move'] },
  ftue: { scope: 'player', steps: ['named', 'first_talk', 'first_latin', 'passed_gate', 'found_house', 'ferox_follows', 'found_tablet'] },
} as const;

export const analytics = createAnalytics(FUNNELS);
